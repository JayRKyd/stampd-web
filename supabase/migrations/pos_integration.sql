-- Applied 2026-09-06/07 across several migrations (pos_integration_foundation,
-- pos_event_processor, pos_stamp_issued_by_fix, pos_poll_cursor,
-- pos_connections_owner_visibility). This file is the consolidated FINAL state.
--
-- Lightspeed X-Series POS integration: sales rung on a merchant's register
-- with a customer's 6-digit Stampd PIN in the sale note become stamps,
-- automatically, through the same issue_stamp_by_personal_pin pipeline as
-- counter stamps (rewards, pushes, auto-join all inherited).
--
-- Companion edge functions (supabase/functions/):
--   lightspeed-oauth-callback  code->tokens, auto-link via signed state, webhook registration
--   lightspeed-webhook         receives sale.update (form-encoded, JSON in `payload` field)
--   lightspeed-token-refresh   hourly; Lightspeed ROTATES the refresh token on every use
--   lightspeed-poller          5-min sweep of /api/2.0/sales?after={cursor} (webhooks not guaranteed)
--   pos-connect-start          dashboard button -> authorize URL with HMAC-signed state

-- ── Connections ───────────────────────────────────────────────────────
create table if not exists public.pos_connections (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants(id),
  provider text not null default 'lightspeed_xseries',
  domain_prefix text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  oauth_state text,
  status text not null default 'connected',  -- connected | needs_reconnect
  poll_cursor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, domain_prefix)
);

alter table public.pos_connections enable row level security;

-- Owners may see THAT their store is connected, never the tokens.
revoke select on table public.pos_connections from authenticated, anon;
grant select (id, merchant_id, provider, domain_prefix, status, created_at, updated_at)
  on public.pos_connections to authenticated;

create policy "Owners see their own POS connections"
on public.pos_connections for select
to authenticated
using (
  merchant_id in (select id from public.merchants where owner_id = auth.uid())
);

-- ── Raw event log ─────────────────────────────────────────────────────
create table if not exists public.pos_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'lightspeed_xseries',
  event_type text,            -- 'sale.update' (webhook) | 'poll.sale' (backstop)
  domain_prefix text,
  sale_id text,
  sale_status text,
  note text,
  extracted_pin text,
  payload jsonb,
  raw_body text,
  processed boolean not null default false,
  processing_result text,     -- stamped:N | duplicate | ignored_status:X | no_pin | no_merchant_link | stamp_failed:X
  created_at timestamptz not null default now()
);

create index if not exists pos_events_sale_idx on public.pos_events (provider, sale_id);
create index if not exists pos_events_unprocessed_idx on public.pos_events (processed) where not processed;

alter table public.pos_events enable row level security;
-- no policies: edge functions only

-- ── Service-context detection ─────────────────────────────────────────
create or replace function public.pos_caller_is_service()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt()->>'role', '') = 'service_role';
$$;

-- ── Stamp issuer (final version) ──────────────────────────────────────
-- Changes vs the original: (1) service_role callers allowed alongside the
-- signed-in merchant owner; (2) issued_by falls back to the merchant owner
-- for POS stamps (auth.uid() is null in service context; column is NOT NULL).
create or replace function public.issue_stamp_by_personal_pin(
  p_pin text, p_merchant_id uuid, p_staff_id uuid default null,
  p_quantity integer default 1, p_override_cooldown boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_merchant            record;
  v_user                record;
  v_card                record;
  v_membership          record;
  v_staff               record;
  v_last_stamp_at       timestamptz;
  v_qty                 int;
  v_stamp_number        int;
  v_rewards_before      int;
  v_reward_earned       boolean;
  v_cycle_completed     boolean;
begin
  v_qty := least(greatest(coalesce(p_quantity, 1), 1), 10);

  select owner_id, stamp_cooldown_minutes, is_active into v_merchant
  from public.merchants
  where id = p_merchant_id;

  if v_merchant.owner_id is distinct from auth.uid()
     and not public.pos_caller_is_service() then
    return jsonb_build_object('success', false, 'error', 'unauthorized');
  end if;

  if not coalesce(v_merchant.is_active, false) then
    return jsonb_build_object('success', false, 'error', 'merchant_not_approved');
  end if;

  if p_staff_id is not null then
    select id into v_staff
    from public.staff
    where id = p_staff_id
      and merchant_id = p_merchant_id
      and is_active = true;

    if not found then
      return jsonb_build_object('success', false, 'error', 'invalid_staff');
    end if;
  end if;

  select id, first_name, last_name
  into v_user
  from public.users
  where personal_pin = p_pin
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'pin_not_found');
  end if;

  select id
  into v_card
  from public.loyalty_cards
  where merchant_id = p_merchant_id
    and is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'no_active_card');
  end if;

  insert into public.memberships (user_id, merchant_id, loyalty_card_id, current_stamps)
  values (v_user.id, p_merchant_id, v_card.id, 0)
  on conflict (user_id, merchant_id) do nothing;

  select id, current_stamps, total_rewards_earned, cycles_completed
  into v_membership
  from public.memberships
  where user_id = v_user.id
    and merchant_id = p_merchant_id;

  if not p_override_cooldown and coalesce(v_merchant.stamp_cooldown_minutes, 0) > 0 then
    select max(created_at) into v_last_stamp_at
    from public.stamp_events
    where membership_id = v_membership.id;

    if v_last_stamp_at is not null
       and v_last_stamp_at > now() - make_interval(mins => v_merchant.stamp_cooldown_minutes) then
      return jsonb_build_object(
        'success', false,
        'error', 'cooldown',
        'minutes_ago', floor(extract(epoch from (now() - v_last_stamp_at)) / 60),
        'seconds_ago', floor(extract(epoch from (now() - v_last_stamp_at)))
      );
    end if;
  end if;

  v_rewards_before := v_membership.total_rewards_earned;
  v_stamp_number   := v_membership.current_stamps + 1;

  insert into public.stamp_events (
    user_id, merchant_id, membership_id,
    issued_by, staff_id, method, stamp_number, quantity
  ) values (
    v_user.id, p_merchant_id, v_membership.id,
    coalesce(auth.uid(), v_merchant.owner_id), p_staff_id, 'personal_pin', v_stamp_number, v_qty
  );

  update public.users
    set total_stamps_all_time = total_stamps_all_time + v_qty
    where id = v_user.id;

  select current_stamps, total_rewards_earned, cycles_completed
  into v_membership
  from public.memberships
  where id = v_membership.id;

  v_reward_earned   := v_membership.total_rewards_earned > v_rewards_before;
  v_cycle_completed := v_membership.cycles_completed > 0 and v_reward_earned and v_membership.current_stamps < v_stamp_number;

  return jsonb_build_object(
    'success',           true,
    'current_stamps',    v_membership.current_stamps,
    'total_rewards_earned', v_membership.total_rewards_earned,
    'cycles_completed',  v_membership.cycles_completed,
    'reward_earned',     v_reward_earned,
    'cycle_completed',   v_cycle_completed
  );
end;
$function$;

-- ── Event processor ───────────────────────────────────────────────────
-- One stamp per sale, ever: Lightspeed delivers at-least-once (double
-- delivery observed live), so dedupe by sale_id under an advisory lock.
create or replace function public.process_pos_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_event record;
  v_conn record;
  v_result jsonb;
begin
  if not public.pos_caller_is_service() then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_event from public.pos_events where id = p_event_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'event_not_found'); end if;
  if v_event.processed then return jsonb_build_object('ok', true, 'result', v_event.processing_result); end if;

  perform pg_advisory_xact_lock(hashtext(v_event.provider || ':' || coalesce(v_event.sale_id, v_event.id::text)));

  if v_event.sale_id is not null and exists (
    select 1 from public.pos_events
    where provider = v_event.provider and sale_id = v_event.sale_id
      and processed and processing_result like 'stamped%'
  ) then
    update public.pos_events set processed = true, processing_result = 'duplicate' where id = p_event_id;
    return jsonb_build_object('ok', true, 'result', 'duplicate');
  end if;

  if v_event.sale_status is distinct from 'CLOSED' then
    update public.pos_events set processed = true, processing_result = 'ignored_status:' || coalesce(v_event.sale_status, 'null') where id = p_event_id;
    return jsonb_build_object('ok', true, 'result', 'ignored_status');
  end if;

  if v_event.extracted_pin is null then
    update public.pos_events set processed = true, processing_result = 'no_pin' where id = p_event_id;
    return jsonb_build_object('ok', true, 'result', 'no_pin');
  end if;

  select * into v_conn from public.pos_connections
  where provider = v_event.provider and domain_prefix = v_event.domain_prefix and status = 'connected';
  if not found or v_conn.merchant_id is null then
    -- NOT marked processed: poller retries every 5 minutes until the store
    -- is linked to a merchant, then this event stamps automatically.
    update public.pos_events set processing_result = 'awaiting_merchant_link' where id = p_event_id;
    return jsonb_build_object('ok', true, 'result', 'awaiting_merchant_link');
  end if;

  -- A completed sale backs this stamp, so the anti-double-tap cooldown
  -- doesn't apply; sale-level dedupe above is the real guard.
  v_result := public.issue_stamp_by_personal_pin(
    v_event.extracted_pin, v_conn.merchant_id, null, 1, true);

  if coalesce((v_result->>'success')::boolean, false) then
    update public.pos_events set processed = true,
      processing_result = 'stamped:' || coalesce(v_result->>'current_stamps', '?')
      where id = p_event_id;
  else
    update public.pos_events set processed = true,
      processing_result = 'stamp_failed:' || coalesce(v_result->>'error', 'unknown')
      where id = p_event_id;
  end if;

  return jsonb_build_object('ok', true, 'result', v_result);
end;
$$;

-- ── Schedules (pg_cron + pg_net) ──────────────────────────────────────
-- Applied via cron.schedule; recorded here for reference:
--   select cron.schedule('lightspeed-token-refresh-hourly', '23 * * * *',
--     $$select net.http_post(url := 'https://ydffxgnuljyvtbpexkkv.supabase.co/functions/v1/lightspeed-token-refresh') $$);
--   select cron.schedule('lightspeed-poller-5min', '*/5 * * * *',
--     $$select net.http_post(url := 'https://ydffxgnuljyvtbpexkkv.supabase.co/functions/v1/lightspeed-poller') $$);

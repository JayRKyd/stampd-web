-- Applied 2026-08-30.
-- ── Part 1: staff PIN hashing ─────────────────────────────────────────
-- Staff PINs were stored (and shipped to the browser) in plaintext; the
-- Stamp page compared them client-side. PINs are now bcrypt-hashed at
-- rest, verified server-side, and the hash never leaves the database.

create extension if not exists pgcrypto with schema extensions;

alter table public.staff add column if not exists pin_hash text;

-- hash existing plaintext PINs
update public.staff
set pin_hash = extensions.crypt(pin, extensions.gen_salt('bf'))
where pin is not null;

-- presence flag for UIs (badge, "who can stamp" gating) without exposing the hash
alter table public.staff add column if not exists has_pin boolean
  generated always as (pin_hash is not null) stored;

-- clients keep writing plaintext to `pin`; it is hashed and nulled before
-- it ever lands on disk, so existing insert paths need no change
create or replace function public.hash_staff_pin()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.pin is not null then
    new.pin_hash := extensions.crypt(new.pin, extensions.gen_salt('bf'));
    new.pin := null;
  end if;
  return new;
end;
$$;

drop trigger if exists hash_staff_pin_before_write on public.staff;
create trigger hash_staff_pin_before_write
before insert or update on public.staff
for each row execute function public.hash_staff_pin();

-- wipe the plaintext now that hashes exist
update public.staff set pin = null where pin is not null;

-- server-side PIN check; only the merchant owner's session can verify their own staff
create or replace function public.verify_staff_pin(p_staff_id uuid, p_pin text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.staff s
    join public.merchants m on m.id = s.merchant_id
    where s.id = p_staff_id
      and m.owner_id = auth.uid()
      and s.is_active
      and s.pin_hash is not null
      and s.pin_hash = extensions.crypt(p_pin, s.pin_hash)
  );
$$;

-- column-level lockdown: pin_hash is not selectable by clients. `pin` stays
-- selectable (it is always null now) so already-deployed pages don't error
-- during the deploy window.
revoke select on table public.staff from authenticated, anon;
grant select (id, merchant_id, name, pin, is_active, created_at, has_pin)
  on public.staff to authenticated;

-- ── Part 2: record which staff member redeemed a reward ───────────────
alter table public.rewards add column if not exists redeemed_by_staff_id uuid references public.staff(id);

drop function if exists public.redeem_customer_reward(uuid);

create or replace function public.redeem_customer_reward(p_reward_id uuid, p_staff_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward rewards%rowtype;
  v_merchant merchants%rowtype;
  v_title text;
  v_body text;
begin
  select * into v_reward from rewards where id = p_reward_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  select * into v_merchant from merchants where id = v_reward.merchant_id and owner_id = auth.uid();
  if not found then return jsonb_build_object('ok', false, 'error', 'not_authorized'); end if;

  if not coalesce(v_merchant.is_active, false) then
    return jsonb_build_object('ok', false, 'error', 'merchant_not_approved');
  end if;

  if v_reward.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'not_pending'); end if;

  if p_staff_id is not null and not exists (
    select 1 from staff
    where id = p_staff_id and merchant_id = v_reward.merchant_id and is_active
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_staff');
  end if;

  update rewards
  set status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid(), redeemed_by_staff_id = p_staff_id
  where id = p_reward_id;

  v_title := 'Reward redeemed';
  v_body := format('Your %s at %s has been confirmed.', v_reward.reward_title, v_merchant.business_name);

  insert into notifications (user_id, merchant_id, type, channel, title, body, sent_at)
  values (v_reward.user_id, v_reward.merchant_id, 'reward_redeemed', 'push', v_title, v_body, now());

  perform public.queue_consumer_push(v_reward.user_id, v_title, v_body);
  return jsonb_build_object('ok', true, 'reward_id', p_reward_id);
end;
$$;

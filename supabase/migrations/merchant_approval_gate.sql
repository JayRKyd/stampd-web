-- Gate customer-facing merchant operations until merchants.is_active = true

-- issue_stamp_by_personal_pin
CREATE OR REPLACE FUNCTION public.issue_stamp_by_personal_pin(
  p_pin text,
  p_merchant_id uuid,
  p_staff_id uuid DEFAULT NULL::uuid,
  p_quantity integer DEFAULT 1,
  p_override_cooldown boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

  if v_merchant.owner_id is distinct from auth.uid() then
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
    auth.uid(), p_staff_id, 'personal_pin', v_stamp_number, v_qty
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

-- generate_merchant_pin
CREATE OR REPLACE FUNCTION public.generate_merchant_pin(p_merchant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_code       varchar(6);
  v_expires_at timestamptz;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM merchants WHERE id = p_merchant_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM merchants WHERE id = p_merchant_id AND owner_id = auth.uid() AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'merchant_not_approved');
  END IF;

  UPDATE generated_pins
  SET expires_at = now()
  WHERE merchant_id = p_merchant_id
    AND used_at IS NULL
    AND expires_at > now();

  v_code       := lpad((floor(random() * 1000000))::int::text, 6, '0');
  v_expires_at := now() + interval '2 minutes';

  INSERT INTO generated_pins (merchant_id, code, expires_at)
  VALUES (p_merchant_id, v_code, v_expires_at);

  RETURN json_build_object('code', v_code, 'expires_at', v_expires_at);
END;
$function$;

-- redeem_customer_reward
CREATE OR REPLACE FUNCTION public.redeem_customer_reward(p_reward_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reward rewards%rowtype;
  v_merchant merchants%rowtype;
  v_title text;
  v_body text;
BEGIN
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  SELECT * INTO v_merchant FROM merchants WHERE id = v_reward.merchant_id AND owner_id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authorized'); END IF;

  IF NOT coalesce(v_merchant.is_active, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'merchant_not_approved');
  END IF;

  IF v_reward.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'error', 'not_pending'); END IF;

  UPDATE rewards SET status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid()
  WHERE id = p_reward_id;

  v_title := 'Reward redeemed';
  v_body := format('Your %s at %s has been confirmed.', v_reward.reward_title, v_merchant.business_name);

  INSERT INTO notifications (user_id, merchant_id, type, channel, title, body, sent_at)
  VALUES (v_reward.user_id, v_reward.merchant_id, 'reward_redeemed', 'push', v_title, v_body, now());

  PERFORM public.queue_consumer_push(v_reward.user_id, v_title, v_body);
  RETURN jsonb_build_object('ok', true, 'reward_id', p_reward_id);
END;
$function$;

-- send_customer_nudge
CREATE OR REPLACE FUNCTION public.send_customer_nudge(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_merchant merchants%rowtype;
  v_membership memberships%rowtype;
  v_card loyalty_cards%rowtype;
  v_tier record;
  v_last timestamptz;
  v_title text;
  v_body text;
  v_remaining int;
  v_label text;
begin
  select * into v_merchant from merchants where owner_id = auth.uid() limit 1;
  if v_merchant.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_merchant');
  end if;

  if not coalesce(v_merchant.is_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'merchant_not_approved');
  end if;

  select * into v_membership
  from memberships
  where merchant_id = v_merchant.id and user_id = p_user_id
  limit 1;
  if v_membership.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_membership');
  end if;

  select max(sent_at) into v_last
  from notifications
  where merchant_id = v_merchant.id
    and user_id = p_user_id
    and type = 'lapsed_reminder';

  if v_last is not null and v_last > now() - interval '14 days' then
    return jsonb_build_object(
      'ok', false,
      'reason', 'cooldown',
      'next_allowed_at', v_last + interval '14 days'
    );
  end if;

  select * into v_card from loyalty_cards where merchant_id = v_merchant.id limit 1;
  v_label := coalesce(nullif(v_card.visit_label, ''), 'stamp');

  select rt.stamp_threshold, rt.reward_title into v_tier
  from reward_tiers rt
  where rt.loyalty_card_id = v_card.id
    and rt.stamp_threshold > coalesce(v_membership.current_stamps, 0)
  order by rt.stamp_threshold
  limit 1;

  v_title := coalesce(v_merchant.business_name, 'Your favorite spot') || ' misses you!';
  if v_tier.stamp_threshold is not null then
    v_remaining := v_tier.stamp_threshold - coalesce(v_membership.current_stamps, 0);
    v_body := 'You''re only ' || v_remaining || ' ' || v_label
      || case when v_remaining = 1 then '' else 's' end
      || ' away from ' || v_tier.reward_title || '. Come see us soon!';
  else
    v_body := 'It''s been a while — come back and keep earning rewards!';
  end if;

  insert into notifications (user_id, merchant_id, type, channel, title, body, sent_at)
  values (p_user_id, v_merchant.id, 'lapsed_reminder', 'push', v_title, v_body, now());

  return jsonb_build_object('ok', true, 'title', v_title, 'body', v_body);
end;
$function$;

-- merchant_customer_notes: require active merchant for writes
DROP POLICY IF EXISTS "Merchants manage their own customer notes" ON public.merchant_customer_notes;

CREATE POLICY "Merchants manage their own customer notes"
  ON public.merchant_customer_notes
  FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM merchants
      WHERE owner_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants
      WHERE owner_id = auth.uid() AND is_active = true
    )
  );

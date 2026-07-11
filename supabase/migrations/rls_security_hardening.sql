-- Security hardening from merchant isolation audit (2026-07-08)

-- ---------------------------------------------------------------------------
-- 1. redeem_generated_pin: enforce caller identity (C5 fix)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.redeem_generated_pin(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pin          record;
  v_card         record;
  v_membership   record;
  v_stamp_number int;
  v_new_stamps   int;
  v_reward_earned boolean := false;
  v_reward_id     uuid;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_pin
  FROM generated_pins
  WHERE code     = p_code
    AND used_at  IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_or_expired_pin');
  END IF;

  SELECT * INTO v_card
  FROM loyalty_cards
  WHERE merchant_id = v_pin.merchant_id
    AND is_active   = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_active_card');
  END IF;

  SELECT * INTO v_membership
  FROM memberships
  WHERE user_id   = p_user_id
    AND merchant_id = v_pin.merchant_id;

  IF NOT FOUND THEN
    INSERT INTO memberships (
      user_id, merchant_id, loyalty_card_id,
      current_stamps, total_stamps_earned, total_rewards_earned
    ) VALUES (
      p_user_id, v_pin.merchant_id, v_card.id,
      0, 0, 0
    )
    RETURNING * INTO v_membership;
  END IF;

  v_stamp_number := v_membership.total_stamps_earned + 1;
  v_new_stamps   := v_membership.current_stamps + 1;

  IF v_new_stamps >= v_card.stamp_count_required THEN
    v_reward_earned := true;
    v_new_stamps    := 0;

    INSERT INTO rewards (
      user_id, merchant_id, membership_id,
      reward_title, status, expires_at
    ) VALUES (
      p_user_id, v_pin.merchant_id, v_membership.id,
      v_card.reward_title, 'pending',
      now() + interval '30 days'
    )
    RETURNING id INTO v_reward_id;
  END IF;

  UPDATE memberships SET
    current_stamps       = v_new_stamps,
    total_stamps_earned  = v_stamp_number,
    total_rewards_earned = total_rewards_earned + (CASE WHEN v_reward_earned THEN 1 ELSE 0 END),
    last_stamp_at        = now()
  WHERE id = v_membership.id;

  INSERT INTO stamp_events (membership_id, merchant_id, user_id, method, stamp_number)
  VALUES (v_membership.id, v_pin.merchant_id, p_user_id, 'generated_pin', v_stamp_number);

  UPDATE generated_pins
  SET used_at = now(), used_by = p_user_id
  WHERE id = v_pin.id;

  RETURN jsonb_build_object(
    'success',       true,
    'reward_earned', v_reward_earned,
    'reward_id',     v_reward_id,
    'current_stamps', v_new_stamps
  );
END;
$function$;

-- Legacy pins-table overload (if still deployed)
CREATE OR REPLACE FUNCTION public.redeem_generated_pin(p_code character varying, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pin         public.pins%rowtype;
  v_card        public.loyalty_cards%rowtype;
  v_membership  public.memberships%rowtype;
  v_stamp_number int;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_pin
  FROM public.pins
  WHERE code = p_code
    AND is_used = false
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'invalid_or_expired_pin');
  END IF;

  SELECT * INTO v_card
  FROM public.loyalty_cards WHERE id = v_pin.loyalty_card_id;

  INSERT INTO public.memberships (user_id, merchant_id, loyalty_card_id)
  VALUES (p_user_id, v_pin.merchant_id, v_card.id)
  ON CONFLICT (user_id, merchant_id) DO NOTHING;

  SELECT * INTO v_membership
  FROM public.memberships
  WHERE user_id = p_user_id AND merchant_id = v_pin.merchant_id;

  v_stamp_number := v_membership.current_stamps + 1;

  UPDATE public.pins SET
    is_used = true,
    used_by = p_user_id,
    used_at = now()
  WHERE id = v_pin.id;

  INSERT INTO public.stamp_events (
    membership_id, user_id, merchant_id,
    issued_by, method, pin_id, stamp_number
  ) VALUES (
    v_membership.id, p_user_id, v_pin.merchant_id,
    auth.uid(), 'generated_pin', v_pin.id, v_stamp_number
  );

  SELECT * INTO v_membership
  FROM public.memberships WHERE id = v_membership.id;

  RETURN json_build_object(
    'success',        true,
    'merchant_id',    v_pin.merchant_id,
    'current_stamps', v_membership.current_stamps,
    'total_required', v_card.stamp_count_required,
    'reward_earned',  v_membership.current_stamps = 0
                      AND v_stamp_number >= v_card.stamp_count_required
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. queue_consumer_push: service-role only (was callable by anon)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.queue_consumer_push(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.queue_consumer_push(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.queue_consumer_push(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.queue_consumer_push(uuid, text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Admin RPCs: authenticated only (internal app_admins check remains)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.admin_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_merchants() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_merchants() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_merchants() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_merchant_active(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_merchant_active(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_merchant_active(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Trigger-only notify functions: not callable via PostgREST RPC
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.notify_merchant_signup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_merchant_signup() FROM anon;
REVOKE ALL ON FUNCTION public.notify_merchant_signup() FROM authenticated;

REVOKE ALL ON FUNCTION public.notify_stamp_received() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_stamp_received() FROM anon;
REVOKE ALL ON FUNCTION public.notify_stamp_received() FROM authenticated;

REVOKE ALL ON FUNCTION public.notify_reward_earned() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_reward_earned() FROM anon;
REVOKE ALL ON FUNCTION public.notify_reward_earned() FROM authenticated;

-- ---------------------------------------------------------------------------
-- 5. Merchants: scoped read of customer profiles (dashboard joins + CRM)
--    Not a blanket users SELECT — only users with a membership at owned merchant
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view their customers profiles" ON public.users;

CREATE POLICY "Merchants can view their customers profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ms.user_id
      FROM memberships ms
      WHERE ms.merchant_id IN (
        SELECT m.id FROM merchants m WHERE m.owner_id = auth.uid()
      )
    )
  );

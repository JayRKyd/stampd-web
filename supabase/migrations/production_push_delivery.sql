-- Apply in Supabase SQL editor after setting NOTIFY_INTERNAL_SECRET on edge functions
-- to match: SELECT value FROM app_internal_config WHERE key = 'notify_secret';

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.app_internal_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO public.app_internal_config (key, value)
VALUES ('notify_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_internal_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.queue_consumer_push(p_user_id uuid, p_title text, p_body text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT value INTO v_secret FROM app_internal_config WHERE key = 'notify_secret';
  IF v_secret IS NULL THEN RETURN; END IF;

  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-consumer-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body
    )
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Re-create triggers to queue push after in-app notification insert
CREATE OR REPLACE FUNCTION public.notify_stamp_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merchant_name text;
  v_required int;
  v_current int;
  v_reward_title text;
  v_title text;
  v_body text;
BEGIN
  SELECT m.business_name, lc.stamp_count_required, lc.reward_title
  INTO v_merchant_name, v_required, v_reward_title
  FROM merchants m
  JOIN loyalty_cards lc ON lc.merchant_id = m.id AND lc.is_active = true
  WHERE m.id = NEW.merchant_id
  LIMIT 1;

  SELECT current_stamps INTO v_current
  FROM memberships WHERE id = NEW.membership_id;

  v_title := format('Stamp at %s', coalesce(v_merchant_name, 'a business'));
  v_body := format(
    '%s of %s — %s more for %s',
    coalesce(v_current, 0),
    coalesce(v_required, 10),
    greatest(coalesce(v_required, 10) - coalesce(v_current, 0), 0),
    coalesce(v_reward_title, 'your reward')
  );

  INSERT INTO notifications (user_id, merchant_id, type, channel, title, body, sent_at)
  VALUES (NEW.user_id, NEW.merchant_id, 'stamp_received', 'push', v_title, v_body, now());

  PERFORM public.queue_consumer_push(NEW.user_id, v_title, v_body);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_reward_earned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merchant_name text;
  v_title text;
  v_body text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN RETURN NEW; END IF;

  SELECT business_name INTO v_merchant_name FROM merchants WHERE id = NEW.merchant_id;

  v_title := format('Reward earned at %s!', coalesce(v_merchant_name, 'a business'));
  v_body := format('You unlocked %s — show it at the counter to redeem.', coalesce(NEW.reward_title, 'a reward'));

  INSERT INTO notifications (user_id, merchant_id, type, channel, title, body, sent_at)
  VALUES (NEW.user_id, NEW.merchant_id, 'reward_earned', 'push', v_title, v_body, now());

  PERFORM public.queue_consumer_push(NEW.user_id, v_title, v_body);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_customer_reward(p_reward_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.notify_merchant_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT value INTO v_secret FROM app_internal_config WHERE key = 'notify_secret';
  IF v_secret IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-admin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'business_name', NEW.business_name,
        'merchant_type', NEW.merchant_type,
        'category', NEW.category
      )
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_merchant_signup ON public.merchants;
CREATE TRIGGER trg_notify_merchant_signup
  AFTER INSERT ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.notify_merchant_signup();

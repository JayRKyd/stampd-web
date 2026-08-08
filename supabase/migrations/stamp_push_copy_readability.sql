-- Stamp push copy: "You're at 5 of 7. 2 more to go…" scanned as "7.2" on a
-- lock screen. Insert "You have" so the remaining count doesn't collide with
-- the goal number (tester feedback, 2026-08-06).
create or replace function public.notify_stamp_received()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_merchant_name text;
  v_required int;
  v_current int;
  v_reward_title text;
  v_remaining int;
  v_title text;
  v_body text;
begin
  select current_stamps into v_current
  from memberships where id = new.membership_id;

  -- current_stamps resets to 0 the instant a card completes; the reward
  -- notification covers that moment, so don't also send a stamp one
  if coalesce(v_current, 0) = 0 then
    return new;
  end if;

  select m.business_name, lc.stamp_count_required, lc.reward_title
  into v_merchant_name, v_required, v_reward_title
  from merchants m
  join loyalty_cards lc on lc.merchant_id = m.id and lc.is_active = true
  where m.id = new.merchant_id
  limit 1;

  v_required := coalesce(v_required, 10);
  v_reward_title := coalesce(v_reward_title, 'your reward');
  v_remaining := greatest(v_required - v_current, 0);

  v_title := format('You got a stamp at %s', coalesce(v_merchant_name, 'a local spot'));

  if v_remaining = 1 then
    v_body := format('You''re at %s of %s. Just one more and %s is yours!', v_current, v_required, v_reward_title);
  else
    v_body := format('You''re at %s of %s. You have %s more to go for %s.', v_current, v_required, v_remaining, v_reward_title);
  end if;

  insert into notifications (user_id, merchant_id, type, channel, title, body, sent_at)
  values (new.user_id, new.merchant_id, 'stamp_received', 'push', v_title, v_body, now());

  perform public.queue_consumer_push(new.user_id, v_title, v_body);
  return new;
end;
$function$;

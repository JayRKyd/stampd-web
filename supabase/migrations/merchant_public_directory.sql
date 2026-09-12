-- Public "Now on Stampd" directory for the marketing site.
--
-- SECURITY DEFINER so it can read across RLS, but it returns ONLY
-- non-sensitive display columns and ONLY for approved/live merchants
-- (merchants.is_active = true, the same gate as merchant_approval_gate.sql)
-- that have an active loyalty card. No owner_id, phone, subscription, or
-- PIN data ever leaves the table. Safe to call from the anon (logged-out)
-- web client.

create or replace function public.get_public_directory()
returns table (
  business_name        text,
  category             text,
  description          text,
  logo_url             text,
  card_color           text,
  stamp_icon           text,
  stamp_count_required int,
  reward_title         text
)
language sql
security definer
set search_path to 'public', 'pg_temp'
stable
as $$
  select
    m.business_name,
    m.category,
    m.description,
    m.logo_url,
    coalesce(lc.card_color, '#00605A')    as card_color,
    coalesce(lc.stamp_icon, 'star')       as stamp_icon,
    coalesce(lc.stamp_count_required, 10) as stamp_count_required,
    lc.reward_title
  from public.merchants m
  join public.loyalty_cards lc
    on lc.merchant_id = m.id
   and lc.is_active = true
  where m.is_active = true
  order by m.business_name;
$$;

grant execute on function public.get_public_directory() to anon, authenticated;

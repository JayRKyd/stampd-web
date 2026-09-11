-- Applied 2026-09-11 (incident fix). HomeScreen crashed with
-- "Cannot read property 'business_name' of null" for any customer holding a
-- card at a merchant that wasn't Discover-active (pending, paused, or test):
-- the merchants RLS only exposed active merchants, so the embedded join
-- returned null and the screen threw.
--
-- Fix: let a customer see any merchant they hold a membership with. The
-- membership check goes through a SECURITY DEFINER function so it does NOT
-- re-apply memberships' own RLS (which references merchants) -- a direct
-- subquery here caused infinite RLS recursion.

create or replace function public.user_holds_card_with(p_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where merchant_id = p_merchant_id and user_id = auth.uid()
  );
$$;

drop policy if exists "Customers can view merchants they hold a card with" on public.merchants;
create policy "Customers can view merchants they hold a card with"
on public.merchants for select
to authenticated
using (public.user_holds_card_with(id));

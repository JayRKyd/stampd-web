-- Applied 2026-08-28 as claim_push_token_on_insert.
-- A device's Expo push token is unique per install, not per account. When a
-- different account signs in on the same device, its insert used to collide
-- with the previous owner's row (unique constraint on token) and RLS blocked
-- deleting that row client-side. This trigger reassigns the token to the
-- newest registrant.
create or replace function public.claim_push_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_tokens where token = new.token;
  return new;
end;
$$;

drop trigger if exists claim_push_token_before_insert on public.push_tokens;
create trigger claim_push_token_before_insert
before insert on public.push_tokens
for each row execute function public.claim_push_token();

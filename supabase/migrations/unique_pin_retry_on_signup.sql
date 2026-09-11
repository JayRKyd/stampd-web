-- Applied 2026-09-11. Generate a unique 6-digit PIN on signup, retrying on
-- the (rare now, inevitable at scale) collision instead of failing the
-- signup. The prior version inserted a single random PIN and let a
-- personal_pin unique violation abort account creation entirely.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_first text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  v_last  text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  v_attempts int := 0;
begin
  if (new.raw_user_meta_data->>'role') = 'merchant' then
    return new;
  end if;

  loop
    begin
      insert into public.users (id, personal_pin, first_name, last_name)
      values (new.id, lpad(floor(random() * 1000000)::text, 6, '0'), v_first, v_last)
      on conflict (id) do nothing;   -- idempotent on the user row
      exit;                          -- success (or the user row already existed)
    exception when unique_violation then
      -- the personal_pin collided with an existing one; try another
      v_attempts := v_attempts + 1;
      if v_attempts > 100 then
        raise exception 'could not allocate a unique personal_pin after % attempts', v_attempts;
      end if;
    end;
  end loop;

  return new;
end;
$function$;

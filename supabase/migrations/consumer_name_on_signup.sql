-- Persist consumer first/last name from auth metadata on sign-up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF (new.raw_user_meta_data->>'role') = 'merchant' THEN
    RETURN new;
  END IF;

  INSERT INTO public.users (id, personal_pin, first_name, last_name)
  VALUES (
    new.id,
    lpad(floor(random() * 1000000)::text, 6, '0'),
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'last_name'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$function$;

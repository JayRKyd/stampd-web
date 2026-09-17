-- Precise, admin-set merchant coordinates for the app's Directions button.
-- The merchant's typed address stays as the fallback; when lat/lng are present
-- the app drops an exact pin instead of a fuzzy text search.
alter table public.merchants
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;

-- Admin sets or clears the coordinates (pass null,null to clear).
create or replace function public.admin_set_merchant_location(
  p_merchant_id uuid,
  p_lat double precision,
  p_lng double precision
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.admin_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  if p_lat is not null and (p_lat < -90 or p_lat > 90) then
    return jsonb_build_object('ok', false, 'error', 'bad_latitude');
  end if;
  if p_lng is not null and (p_lng < -180 or p_lng > 180) then
    return jsonb_build_object('ok', false, 'error', 'bad_longitude');
  end if;

  update public.merchants
    set latitude = p_lat, longitude = p_lng, updated_at = now()
  where id = p_merchant_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'latitude', p_lat, 'longitude', p_lng);
end;
$$;

grant execute on function public.admin_set_merchant_location(uuid, double precision, double precision) to authenticated;

-- Expose lat/lng in the admin setup loader so the drawer can pre-fill them.
create or replace function public.admin_get_merchant_setup(p_merchant_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_merchant record;
  v_card record;
  v_tiers jsonb;
begin
  if not public.admin_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  select id, business_name, merchant_type, category, description, address, phone, website,
         logo_url, cover_image_url, is_active, latitude, longitude
  into v_merchant from merchants where id = p_merchant_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  select id, stamp_count_required, reward_title, reward_description, card_color, stamp_icon, visit_label
  into v_card from loyalty_cards where merchant_id = p_merchant_id and is_active = true limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
           'stamp_threshold', stamp_threshold, 'reward_title', reward_title
         ) order by stamp_threshold), '[]'::jsonb)
  into v_tiers from reward_tiers where loyalty_card_id = v_card.id;

  return jsonb_build_object(
    'ok', true,
    'merchant', jsonb_build_object(
      'id', v_merchant.id, 'business_name', v_merchant.business_name,
      'merchant_type', v_merchant.merchant_type, 'category', v_merchant.category,
      'description', v_merchant.description, 'address', v_merchant.address,
      'phone', v_merchant.phone, 'website', v_merchant.website,
      'logo_url', v_merchant.logo_url, 'cover_image_url', v_merchant.cover_image_url,
      'is_active', v_merchant.is_active,
      'latitude', v_merchant.latitude, 'longitude', v_merchant.longitude
    ),
    'card', case when v_card.id is null then null else jsonb_build_object(
      'stamp_count_required', v_card.stamp_count_required,
      'reward_title', v_card.reward_title,
      'card_color', v_card.card_color,
      'stamp_icon', v_card.stamp_icon,
      'visit_label', v_card.visit_label,
      'tiers', v_tiers
    ) end
  );
end;
$function$;

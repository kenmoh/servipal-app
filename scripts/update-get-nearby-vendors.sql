CREATE OR REPLACE FUNCTION public.get_nearby_vendors_new(
  p_user_type text,
  max_distance_km integer DEFAULT 20,
  page_size integer DEFAULT 20,
  page_offset integer DEFAULT 0,
  min_rating numeric DEFAULT NULL,
  p_search_query text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  result jsonb;
  user_loc geography;
  current_user_id uuid;
  v_user_type user_type;
BEGIN
  v_user_type := p_user_type::user_type;

  if v_user_type not in ('RESTAURANT_VENDOR', 'LAUNDRY_VENDOR') then
    raise exception 'Invalid user_type. Must be RESTAURANT_VENDOR or LAUNDRY_VENDOR';
  end if;

  current_user_id := auth.uid();

  -- Use passed coordinates if available, else fall back to stored profile location
  if p_lat is not null and p_lng is not null then
    user_loc := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  else
    select location_coordinates::geography into user_loc
    from profiles
    where id = current_user_id;
  end if;

  if user_loc is null then
    return jsonb_build_object(
      'vendors', '[]'::jsonb,
      'pagination', jsonb_build_object(
        'page_size', page_size,
        'page_offset', page_offset,
        'total_count', 0,
        'has_more', false
      ),
      'error', 'User location not set. Please update your location first.',
      'filters', jsonb_build_object(
        'user_type', p_user_type,
        'max_distance_km', max_distance_km,
        'min_rating', min_rating,
        'search_query', p_search_query,
        'user_location', null
      )
    );
  end if;

  with vendor_base as (
    select
      pr.id,
      pr.created_at,
      pr.updated_at,
      pr.full_name,
      pr.business_name,
      pr.phone_number,
      pr.email,
      pr.user_type,
      pr.state,
      pr.bank_name,
      pr.store_name,
      pr.bank_account_number,
      pr.profile_image_url,
      pr.backdrop_image_url,
      pr.business_address,
      pr.opening_hour,
      pr.closing_hour,
      pr.can_pickup_and_dropoff,
      pr.business_registration_number,
      pr.pickup_and_delivery_charge,
      pr.average_rating,
      pr.review_count,
      COALESCE(pr.business_location_coordinates, pr.location_coordinates) as vendor_loc,
      round(
        (ST_Distance(user_loc, COALESCE(pr.business_location_coordinates, pr.location_coordinates)::geography) / 1000.0)::numeric,
        2
      ) as distance_km
    from profiles pr
    where pr.user_type = v_user_type
      and pr.is_blocked = false
      and pr.business_name is not null
      and btrim(pr.business_name) <> ''
      and pr.business_address is not null
      and btrim(pr.business_address) <> ''
      and (
        (pr.profile_image_url is not null and btrim(pr.profile_image_url) <> '')
        or (pr.backdrop_image_url is not null and btrim(pr.backdrop_image_url) <> '')
      )
      and COALESCE(pr.business_location_coordinates, pr.location_coordinates) is not null
      and ST_DWithin(
        user_loc,
        COALESCE(pr.business_location_coordinates, pr.location_coordinates)::geography,
        max_distance_km * 1000
      )
      and (min_rating is null or pr.average_rating >= min_rating)
      and (
        p_search_query is null
        or p_search_query = ''
        or pr.business_name ilike '%' || p_search_query || '%'
        or pr.store_name ilike '%' || p_search_query || '%'
        or pr.full_name ilike '%' || p_search_query || '%'
        or (
          v_user_type = 'RESTAURANT_VENDOR'::user_type
          and exists (
            select 1
            from food_items fi
            where fi.vendor_id = pr.id
              and fi.is_deleted = false
              and (
                fi.name ilike '%' || p_search_query || '%'
                or fi.description ilike '%' || p_search_query || '%'
              )
          )
        )
        or (
          v_user_type = 'LAUNDRY_VENDOR'::user_type
          and exists (
            select 1
            from laundry_items li
            where li.vendor_id = pr.id
              and li.is_deleted = false
              and (
                li.name ilike '%' || p_search_query || '%'
                or li.description ilike '%' || p_search_query || '%'
              )
          )
        )
      )
    order by COALESCE(pr.business_location_coordinates, pr.location_coordinates)::geography <-> user_loc
    limit page_size
    offset page_offset
  ),
  vendor_review_stats as (
    select
      vb.id as vendor_id,
      coalesce(round(avg(r.rating)::numeric, 2), 0) as avg_rating,
      count(r.id) as total_reviews,
      jsonb_build_object(
        '5', count(*) filter (where r.rating = 5),
        '4', count(*) filter (where r.rating = 4),
        '3', count(*) filter (where r.rating = 3),
        '2', count(*) filter (where r.rating = 2),
        '1', count(*) filter (where r.rating = 1)
      ) as rating_distribution
    from vendor_base vb
    left join reviews r on r.reviewee_id = vb.id
    group by vb.id
  ),
  vendors_with_reviews as (
    select
      jsonb_agg(
        jsonb_build_object(
          'id', vb.id::text,
          'created_at', vb.created_at,
          'updated_at', vb.updated_at,
          'full_name', vb.full_name,
          'business_name', vb.business_name,
          'phone_number', vb.phone_number,
          'email', vb.email,
          'user_type', vb.user_type::text,
          'state', vb.state,
          'bank_name', vb.bank_name,
          'store_name', vb.store_name,
          'bank_account_number', vb.bank_account_number,
          'profile_image_url', vb.profile_image_url,
          'backdrop_image_url', vb.backdrop_image_url,
          'business_address', vb.business_address,
          'opening_hour', vb.opening_hour,
          'closing_hour', vb.closing_hour,
          'can_pickup_and_dropoff', vb.can_pickup_and_dropoff,
          'business_registration_number', vb.business_registration_number,
          'pickup_and_delivery_charge', vb.pickup_and_delivery_charge,
          'distance_km', vb.distance_km,
          'reviews', jsonb_build_object(
            'stats', jsonb_build_object(
              'average_rating', coalesce(vrs.avg_rating, vb.average_rating, 0),
              'total_reviews', coalesce(vrs.total_reviews, vb.review_count, 0),
              'rating_distribution', coalesce(
                vrs.rating_distribution,
                jsonb_build_object('5',0,'4',0,'3',0,'2',0,'1',0)
              )
            ),
            'reviews', '[]'::jsonb
          )
        )
        order by vb.distance_km asc
      ) as vendors
    from vendor_base vb
    left join vendor_review_stats vrs on vrs.vendor_id = vb.id
  ),
  total_count as (
    select count(*) as count
    from profiles pr
    where pr.user_type = v_user_type
      and pr.is_blocked = false
      and pr.business_name is not null
      and btrim(pr.business_name) <> ''
      and pr.business_address is not null
      and btrim(pr.business_address) <> ''
      and (
        (pr.profile_image_url is not null and btrim(pr.profile_image_url) <> '')
        or (pr.backdrop_image_url is not null and btrim(pr.backdrop_image_url) <> '')
      )
      and COALESCE(pr.business_location_coordinates, pr.location_coordinates) is not null
      and ST_DWithin(
        user_loc,
        COALESCE(pr.business_location_coordinates, pr.location_coordinates)::geography,
        max_distance_km * 1000
      )
      and (min_rating is null or pr.average_rating >= min_rating)
      and (
        p_search_query is null
        or p_search_query = ''
        or pr.business_name ilike '%' || p_search_query || '%'
        or pr.store_name ilike '%' || p_search_query || '%'
        or pr.full_name ilike '%' || p_search_query || '%'
        or (
          v_user_type = 'RESTAURANT_VENDOR'::user_type
          and exists (
            select 1
            from food_items fi
            where fi.vendor_id = pr.id
              and fi.is_deleted = false
              and (
                fi.name ilike '%' || p_search_query || '%'
                or fi.description ilike '%' || p_search_query || '%'
              )
          )
        )
        or (
          v_user_type = 'LAUNDRY_VENDOR'::user_type
          and exists (
            select 1
            from laundry_items li
            where li.vendor_id = pr.id
              and li.is_deleted = false
              and (
                li.name ilike '%' || p_search_query || '%'
                or li.description ilike '%' || p_search_query || '%'
              )
          )
        )
      )
  )
  select jsonb_build_object(
    'vendors', coalesce(vwr.vendors, '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page_size', page_size,
      'page_offset', page_offset,
      'total_count', tc.count,
      'has_more', tc.count > (page_offset + page_size)
    ),
    'filters', jsonb_build_object(
      'user_type', p_user_type,
      'max_distance_km', max_distance_km,
      'min_rating', min_rating,
      'search_query', p_search_query,
      'user_location', ST_AsText(user_loc)
    )
  ) into result
  from vendors_with_reviews vwr
  cross join total_count tc;

  return result;
end;
$function$;

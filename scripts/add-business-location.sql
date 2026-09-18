-- 1. Add dedicated column for vendor business location (static)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS business_location_coordinates geography(POINT, 4326);

-- 2. RPC for vendors to save business location (only from profile screen)
CREATE OR REPLACE FUNCTION public.update_business_location(
  user_id uuid,
  latitude double precision,
  longitude double precision
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  caller_id uuid;
BEGIN
  caller_id := auth.uid();

  IF caller_id IS NULL OR caller_id != user_id THEN
    RAISE EXCEPTION 'You can only update your own location';
  END IF;

  UPDATE profiles
  SET
    business_location_coordinates = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
    updated_at = NOW()
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  RETURN json_build_object(
    'success', true,
    'latitude', latitude,
    'longitude', longitude
  );
END;
$function$;

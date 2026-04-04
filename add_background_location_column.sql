-- Add location permission columns to profiles table
-- This tracks both foreground and background permission statuses

-- Foreground permission: "Allow while using the app"
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS foreground_location_permission TEXT CHECK (foreground_location_permission IN ('granted', 'denied', 'undetermined'));

-- Background permission: "Allow all the time"
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS background_location_permission TEXT CHECK (foreground_location_permission IN ('granted', 'denied', 'undetermined'));

-- Add comments to document the columns
COMMENT ON COLUMN profiles.foreground_location_permission IS 'Foreground location permission status: "granted" = Allow while using the app, "denied" = permission denied, "undetermined" = not yet requested';

COMMENT ON COLUMN profiles.background_location_permission IS 'Background location permission status: "granted" = Allow all the time (required for RIDER), "denied" = permission denied or only foreground granted, "undetermined" = not yet requested';

-- Create index for faster queries on riders with proper permissions
CREATE INDEX IF NOT EXISTS idx_profiles_location_permissions 
ON profiles(user_type, foreground_location_permission, background_location_permission) 
WHERE user_type = 'RIDER';

-- Optional: Set to 'granted' for existing riders who might already have it enabled
-- UPDATE profiles 
-- SET foreground_location_permission = 'granted', background_location_permission = 'granted' 
-- WHERE user_type = 'RIDER';

/*
Permission Combinations:

1. foreground='granted' + background='granted' = "Allow all the time" ✅ (Required for RIDER)
2. foreground='granted' + background='denied' = "Allow while using the app" ⚠️ (Not enough for RIDER)
3. foreground='denied' + background='denied' = "Don't allow" ❌
4. foreground='undetermined' + background='undetermined' = Not yet requested

Query examples:

-- Find riders with proper permissions (Allow all the time)
SELECT * FROM profiles 
WHERE user_type = 'RIDER' 
AND foreground_location_permission = 'granted' 
AND background_location_permission = 'granted';

-- Find riders without proper permissions
SELECT * FROM profiles 
WHERE user_type = 'RIDER' 
AND (background_location_permission IS NULL 
     OR background_location_permission != 'granted');

-- Find users with "Allow while using the app" only
SELECT * FROM profiles 
WHERE foreground_location_permission = 'granted' 
AND (background_location_permission IS NULL 
     OR background_location_permission != 'granted');
*/

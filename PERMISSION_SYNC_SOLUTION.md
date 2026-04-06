# Background Location Permission Sync Solution

## Problem:
When a rider logs in on Device A and enables background location, the database stores `background_location_permission = 'granted'`. When they log in on Device B, the toggle shows "OFF" because Device B hasn't granted permission yet. When they try to enable it and it's already granted in the database, they get "already enabled" message. But when accepting orders, the app redirects them to enable tracking because Device B's local permission is not granted.

## Root Cause:
- **Toggle UI** is based on **device's local permission status** (from `Location.getBackgroundPermissionsAsync()`)
- **Database** stores permission status from **last device that changed it**
- **No sync** between database and current device's actual permission status

## Solution Implemented:

### 1. **Auto-Sync on Permission Check** (`userStore.ts`)
Modified `checkLocationPermission()` to:
- Check current device's foreground and background permission status
- **Automatically sync** the current device's permission status to database
- Update local state to reflect current device permissions

```typescript
// After checking permissions
const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();

// Sync with database
if (userId) {
  await updateBackgroundLocationStatus(fgStatus, bgStatus);
}
```

### 2. **Permission Status Tracking**
Database now tracks:
- `foreground_location_permission`: "granted" | "denied" | "undetermined"
- `background_location_permission`: "granted" | "denied" | "undetermined"

This allows you to know:
- **Both granted** = User selected "Allow all the time" ✅
- **Only foreground granted** = User selected "Allow while using the app" ⚠️
- **Both denied** = User denied permission ❌

### 3. **How It Works Now:**

#### **Device A (First Login):**
1. Rider enables background location → Device grants "Allow all the time"
2. `checkLocationPermission()` runs → Syncs to DB: `fg='granted'`, `bg='granted'`
3. Toggle shows ON ✅
4. Can accept orders ✅

#### **Device B (Second Login):**
1. Rider logs in → `checkLocationPermission()` runs automatically
2. Device B hasn't granted permission yet → Syncs to DB: `fg='denied'`, `bg='denied'`
3. Toggle shows OFF (correct!) ❌
4. Rider taps toggle → Requests permission → Device grants "Allow all the time"
5. `checkLocationPermission()` runs → Syncs to DB: `fg='granted'`, `bg='granted'`
6. Toggle shows ON ✅
7. Can accept orders ✅

### 4. **When Permission Check Runs:**
- On app start (during hydration)
- When user taps location toggle
- After granting/denying permission
- When starting location tracking

## Benefits:

✅ **Always accurate** - Database reflects current device's actual permission status
✅ **Multi-device support** - Each device syncs its own permission status
✅ **No false positives** - Can't accept orders without actual device permission
✅ **Server-side enforcement** - Backend can check if rider has proper permissions before assigning orders

## Server-Side Enforcement (Recommended):

Add this check in your order assignment API:

```sql
-- Check if rider has proper permissions before assigning
SELECT * FROM profiles 
WHERE id = 'rider_id' 
AND user_type = 'RIDER'
AND foreground_location_permission = 'granted' 
AND background_location_permission = 'granted';
```

If the check fails, return error:
```json
{
  "error": "Rider must enable 'Allow all the time' background location permission to accept orders"
}
```

## Migration:

Run the SQL migration file: `add_background_location_column.sql`

This adds:
- `foreground_location_permission` column
- `background_location_permission` column
- Index for fast queries on riders
- CHECK constraints to ensure valid values

## Testing:

1. **Single Device:**
   - Enable location → Check DB shows "granted"
   - Disable in settings → Reopen app → Check DB shows "denied"

2. **Multiple Devices:**
   - Device A: Enable location → Check DB
   - Device B: Login → Check toggle is OFF → Enable → Check DB
   - Both devices should work independently

3. **Order Acceptance:**
   - Try accepting order without permission → Should fail
   - Enable permission → Try again → Should succeed

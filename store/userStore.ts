// @/stores/user-store.ts
import { updatecurrentUserLocation } from "@/api/user";
import authStorage from "@/storage/auth-storage";
import {
  AuthUser,
  LocationCoordinates,
  UserProfile,
  toAuthUser,
} from "@/types/user-types";
import { supabase } from "@/utils/supabase";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { create } from "zustand";

// 🔑 CRITICAL: Define background task AT MODULE LEVEL (before store creation)
// Must execute during JS bundle initialization, NOT inside React/store lifecycle
const LOCATION_TASK_NAME = "background-location-task";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("❌ [BG Location Task] Error:", error);
    return;
  }

  // @ts-ignore - Expo types don't fully support this yet
  const locations = (data as any)?.locations as Location.LocationObject[];
  if (!locations?.length) {
    console.warn("⚠️ [BG Location Task] No locations in payload");
    return;
  }

  const { latitude, longitude } = locations[locations.length - 1].coords;
  console.log(
    `📍 [BG Task] Location received: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
  );

  try {
    await updatecurrentUserLocation({ latitude, longitude });
    console.log("✅ [BG Task] Location updated to server");
  } catch (err) {
    console.error("❌ [BG Task] Failed to update server:", err);
  }
});

const FIRST_LAUNCH_KEY = "hasLaunched";

// Haversine distance calculation (meters)
const getDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

interface UserStore {
  // Auth State
  user: AuthUser | null;

  // Profile State
  profile: UserProfile | null;
  profileImageUrl: string | null;
  backdropImageUrl: string | null;

  // App State
  storeId: string | null;
  riderId: string | null;
  isReassign: boolean;
  storeAddress: string | null;
  isFirstLaunch: boolean;

  // Loading States
  hasHydrated: boolean;
  isLoading: boolean;
  isProfileLoading: boolean;

  // Error State
  profileError: string | null;

  // 🔑 Location State
  currentLocation: { lat: number; lng: number } | null;
  locationPermissionGranted: boolean | null;
  locationTrackingActive: boolean;
  locationWatcher: Location.LocationSubscription | null;
  lastSentLocation: { lat: number; lng: number } | null;
  lastLocationUpdate: number | null;
  vendorLocationCaptured: boolean; // Tracks if vendor's one-time location was captured

  // Auth Setters
  setUser: (user: AuthUser | null) => void;

  // Profile Setters
  setProfile: (profile: UserProfile | null) => void;
  setProfileImageUrl: (url: string | null) => void;
  setBackdropImageUrl: (url: string | null) => void;

  // App Setters
  setStoreId: (storeId: string | null) => void;
  setRiderId: (riderId: string | null) => void;
  setIsReassign: (isReassign: boolean) => void;
  setStoreAddress: (storeAddress: string | null) => void;

  // 🔑 Location Setters
  setCurrentLocation: (location: { lat: number; lng: number } | null) => void;
  setLocationPermissionGranted: (granted: boolean) => void;
  setLocationTrackingActive: (active: boolean) => void;
  setVendorLocationCaptured: (captured: boolean) => void;

  // Actions
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
  checkFirstLaunch: () => Promise<boolean>;
  setFirstLaunchComplete: () => Promise<void>;
  refreshSession: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  initialize: () => () => void;

  // 🔑 Location Actions
  checkLocationPermission: () => Promise<boolean>;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => void;
  checkCustomerHasActiveOrder: (userId: string) => Promise<boolean>;
  shouldUpdateServerLocation: () => Promise<boolean>;
  captureVendorLocationOnce: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  // Initial State (existing)
  user: null,
  profile: null,
  profileImageUrl: null,
  backdropImageUrl: null,
  storeId: null,
  riderId: null,
  isReassign: false,
  storeAddress: null,
  isFirstLaunch: true,
  hasHydrated: false,
  isLoading: false,
  isProfileLoading: false,
  profileError: null,

  // 🔑 Location Initial State
  currentLocation: null,
  locationPermissionGranted: null,
  locationTrackingActive: false,
  locationWatcher: null,
  lastSentLocation: null,
  lastLocationUpdate: null,
  vendorLocationCaptured: false,

  // Auth & Profile Setters (existing)
  setUser: (user) => set({ user }),
  setProfile: (profile) =>
    set({
      profile,
      profileImageUrl: profile?.profile_image_url ?? null,
      backdropImageUrl: profile?.backdrop_image_url ?? null,
    }),
  setProfileImageUrl: (url) => set({ profileImageUrl: url }),
  setBackdropImageUrl: (url) => set({ backdropImageUrl: url }),
  setStoreId: (storeId) => set({ storeId }),
  setRiderId: (riderId) => set({ riderId }),
  setIsReassign: (isReassign) => set({ isReassign }),
  setStoreAddress: (storeAddress) => set({ storeAddress }),

  // 🔑 Location Setters
  setCurrentLocation: (location) => {
    set({ currentLocation: location, lastLocationUpdate: Date.now() });
    console.log(
      `📍 Location updated locally: ${location?.lat.toFixed(4)}, ${location?.lng.toFixed(4)}`,
    );
  },
  setLocationPermissionGranted: (granted) => {
    set({ locationPermissionGranted: granted });
    console.log(
      granted
        ? "✅ Location permission granted"
        : "❌ Location permission denied",
    );
  },
  setLocationTrackingActive: (active) => {
    set({ locationTrackingActive: active });
    console.log(
      active ? "✅ Location tracking ACTIVE" : "⏸️ Location tracking INACTIVE",
    );
  },
  setVendorLocationCaptured: (captured) => {
    set({ vendorLocationCaptured: captured });
    console.log(
      captured
        ? "✅ Vendor location captured"
        : "🔄 Vendor location not yet captured",
    );
  },

  // First Launch Management (existing)
  checkFirstLaunch: async () => {
    try {
      const hasLaunched = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
      const isFirst = hasLaunched === null;
      set({ isFirstLaunch: isFirst });
      return isFirst;
    } catch (error) {
      console.error("❌ Error checking first launch:", error);
      set({ isFirstLaunch: true });
      return true;
    }
  },

  setFirstLaunchComplete: async () => {
    try {
      await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, "true");
      set({ isFirstLaunch: false });
    } catch (error) {
      console.error("❌ Error setting first launch complete:", error);
    }
  },

  // 🔑 Location Permission Check
  checkLocationPermission: async () => {
    console.log("🔄 Checking location permissions...");

    try {
      // Check foreground permission first
      const { status: fgStatus } =
        await Location.getForegroundPermissionsAsync();
      const isLocationEnabled = await Location.hasServicesEnabledAsync();

      if (fgStatus !== "granted" || !isLocationEnabled) {
        console.warn(
          "⚠️ Location services not enabled or permission not granted",
        );

        // Request permission if not granted
        if (fgStatus !== "granted") {
          const { status: newStatus } =
            await Location.requestForegroundPermissionsAsync();
          if (newStatus !== "granted") {
            set({ locationPermissionGranted: false });
            return false;
          }
        }

        if (!isLocationEnabled) {
          set({ locationPermissionGranted: false });
          return false;
        }
      }

      // For riders: check/request background permission
      const { user, profile } = get();
      const isRider =
        user?.user_metadata?.user_type === "RIDER" ||
        profile?.user_type === "RIDER";

      if (isRider) {
        const { status: bgStatus } =
          await Location.getBackgroundPermissionsAsync();

        if (bgStatus !== "granted") {
          console.log(
            "🔄 Requesting background location permission for rider...",
          );
          const { status: newBgStatus } =
            await Location.requestBackgroundPermissionsAsync();

          if (newBgStatus !== "granted") {
            console.warn(
              "⚠️ Background location permission denied (rider will only update in foreground)",
            );
            // Still allow foreground tracking
            set({ locationPermissionGranted: true });
            return true;
          }
        }
      }

      set({ locationPermissionGranted: true });
      console.log("✅ Location permissions granted");
      return true;
    } catch (error) {
      console.error("❌ Error checking location permissions:", error);
      set({ locationPermissionGranted: false });
      return false;
    }
  },

  // 🔑 Check if customer has active order requiring location updates
  checkCustomerHasActiveOrder: async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("delivery_orders")
        .select("id, delivery_status")
        .eq("sender_id", userId)
        .in("delivery_status", [
          "PENDING",
          "PAID_NEEDS_RIDER",
          "PICKED_UP",
          "IN_TRANSIT",
        ])
        .limit(1);

      if (error) throw error;

      const hasActive = !!data?.length;
      console.log(
        `ℹ️ Customer active order check: ${hasActive ? "YES" : "NO"} (${data?.[0]?.delivery_status || "none"})`,
      );
      return hasActive;
    } catch (error) {
      console.error("❌ Error checking active orders:", error);
      return false;
    }
  },

  // 🔑 Determine if we should send location to server based on user type & context
  shouldUpdateServerLocation: async (): Promise<boolean> => {
    const { user, profile, currentLocation, vendorLocationCaptured } = get();

    if (!currentLocation) return false;

    const userType = user?.user_metadata?.user_type || profile?.user_type;
    const userId = user?.id || profile?.id;

    if (!userType || !userId) return false;

    // Riders: ALWAYS update server location
    if (userType === "RIDER") {
      console.log("📍 Rider location update: ALWAYS (active rider)");
      return true;
    }

    // Vendors: Update ONLY once (first time) or if location never captured
    if (
      ["RESTAURANT_VENDOR", "LAUNDRY_VENDOR", "DISPATCH"].includes(userType)
    ) {
      if (!vendorLocationCaptured) {
        console.log(
          `📍 Vendor (${userType}) location update: YES (first-time capture)`,
        );
        return true;
      }
      console.log(
        `📍 Vendor (${userType}) location update: NO (already captured)`,
      );
      return false;
    }

    // Customers: ONLY update when has active order
    if (userType === "CUSTOMER") {
      const hasActive = await get().checkCustomerHasActiveOrder(userId);
      console.log(
        `📍 Customer location update: ${hasActive ? "YES (active order)" : "NO (no active order)"}`,
      );
      return hasActive;
    }

    // Other user types: never update
    console.log(`📍 Location update skipped for user type: ${userType}`);
    return false;
  },

  // 🔑 Capture vendor location ONCE (on first sign-in or when missing)
  captureVendorLocationOnce: async () => {
    const { user, profile, vendorLocationCaptured, currentLocation } = get();
    const userType = user?.user_metadata?.user_type || profile?.user_type;

    // Only for vendors
    if (
      !["RESTAURANT_VENDOR", "LAUNDRY_VENDOR", "DISPATCH"].includes(userType!)
    ) {
      return;
    }

    // Skip if already captured
    if (vendorLocationCaptured) {
      console.log("ℹ️ Vendor location already captured - skipping");
      return;
    }

    // Skip if no location available
    if (!get().currentLocation) {
      console.warn(
        "⚠️ Cannot capture vendor location: No current location available",
      );
      return;
    }

    console.log(`🔄 Capturing vendor location ONCE for ${userType}...`);

    try {
      const lat = currentLocation?.lat;
      const lng = currentLocation?.lng;

      const coordinate: LocationCoordinates = {
        latitude: lat!,
        longitude: lng!,
      };

      // Update server location
      await updatecurrentUserLocation(coordinate);

      // Mark as captured
      set({ vendorLocationCaptured: true });

      console.log(`✅ Vendor location captured ONCE: ${lat}, ${lng}`);
    } catch (error) {
      console.error("❌ Failed to capture vendor location:", error);
    }
  },

  // 🔑 Start location tracking (context-aware per user type)
  startLocationTracking: async () => {
    const {
      user,
      profile,
      locationTrackingActive,
      locationWatcher,
      vendorLocationCaptured,
    } = get();

    // Skip if already tracking
    if (locationTrackingActive || locationWatcher) {
      console.log("⚠️ Location tracking already active - skipping start");
      return;
    }

    // Skip if no authenticated user
    if (!user?.id && !profile?.id) {
      console.warn("⚠️ Cannot start location tracking: No authenticated user");
      return;
    }

    const userType = user?.user_metadata?.user_type || profile?.user_type;
    const userId = user?.id || profile?.id;

    // Only track relevant user types
    if (
      ![
        "RIDER",
        "CUSTOMER",
        "RESTAURANT_VENDOR",
        "LAUNDRY_VENDOR",
        "DISPATCH",
      ].includes(userType!)
    ) {
      console.log(`ℹ️ Skipping location tracking for user type: ${userType}`);
      return;
    }

    console.log(`🔄 Starting location tracking for ${userType} (${userId})...`);

    // Check permissions
    const hasPermission = await get().checkLocationPermission();
    if (!hasPermission) {
      console.warn("⚠️ Location tracking skipped: Permission not granted");
      return;
    }

    try {
      // ✅ VALID LocationOptions (no invalid properties)
      const config: Location.LocationOptions = {
        accuracy: Location.Accuracy.High,
        // Riders: frequent updates (every 60s or 30m movement)
        // Others: less frequent (every 5min or 200m movement)
        timeInterval: userType === "RIDER" ? 60000 : 300000, // Android only
        distanceInterval: userType === "RIDER" ? 30 : 200,
      };

      // 🔑 For riders: enable background location task
      if (userType === "RIDER") {
        console.log("🔄 Registering background location task for rider...");

        const isTaskRegistered =
          await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (!isTaskRegistered) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 60000,
            distanceInterval: 30,
            foregroundService: {
              notificationTitle: "Rider Location Tracking",
              notificationBody: "Required for dispatch and delivery tracking",
              notificationColor: "#0066ff",
            },
          });
          console.log("✅ Background location task registered for rider");
        } else {
          console.log("ℹ️ Background location task already registered");
        }
      }

      // Start foreground watcher (works for all user types)
      const watcher = await Location.watchPositionAsync(config, (location) => {
        const { latitude, longitude } = location.coords;
        const newLocation = { lat: latitude, lng: longitude };

        // Update local state immediately
        get().setCurrentLocation(newLocation);

        // Skip if location hasn't changed significantly (50m threshold)
        const { lastSentLocation } = get();
        if (lastSentLocation) {
          const distance = getDistanceMeters(
            lastSentLocation.lat,
            lastSentLocation.lng,
            latitude,
            longitude,
          );

          if (distance < 50) {
            console.log(
              `📍 Location change too small (${distance.toFixed(1)}m) - skipping server update`,
            );
            return;
          }
        }

        // Determine if we should send to server based on user type & context
        get()
          .shouldUpdateServerLocation()
          .then(async (shouldUpdate) => {
            if (!shouldUpdate) {
              console.log(
                "📍 Skipping server update (context doesn't require it)",
              );
              return;
            }

            // Update server location
            try {
              await updatecurrentUserLocation({ latitude, longitude });
              set({ lastSentLocation: newLocation });
              console.log(
                `✅ Location updated to server: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              );

              // If vendor and we just updated, mark as captured
              const vendorTypes = [
                "RESTAURANT_VENDOR",
                "LAUNDRY_VENDOR",
                "DISPATCH",
              ];
              const currentUserType =
                user?.user_metadata?.user_type || profile?.user_type;
              if (
                vendorTypes.includes(currentUserType!) &&
                !vendorLocationCaptured
              ) {
                set({ vendorLocationCaptured: true });
                console.log(
                  `✅ Vendor location captured ONCE for ${currentUserType}`,
                );
              }
            } catch (error) {
              console.error("❌ Failed to update location to server:", error);
            }
          });
      });

      set({
        locationWatcher: watcher,
        locationTrackingActive: true,
        lastLocationUpdate: Date.now(),
      });

      console.log(`✅ Location tracking STARTED for ${userType}`);
      console.log(
        `   Config: ${config.timeInterval ? config.timeInterval / 1000 : "N/A"}s interval, ${config.distanceInterval}m distance`,
      );
    } catch (error) {
      console.error("❌ Error starting location tracking:", error);
      set({ locationTrackingActive: false });
    }
  },

  // 🔑 Stop location tracking (cleanup)
  stopLocationTracking: () => {
    const { locationWatcher, locationTrackingActive, user, profile } = get();

    if (!locationTrackingActive && !locationWatcher) {
      console.log("ℹ️ Location tracking already stopped");
      return;
    }

    console.log("🔄 Stopping location tracking...");

    // Stop foreground watcher
    if (locationWatcher) {
      locationWatcher.remove();
      console.log("✅ Foreground location watcher stopped");
    }

    // Stop background task for riders
    const userType = user?.user_metadata?.user_type || profile?.user_type;
    if (userType === "RIDER") {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
        .then(() => console.log("✅ Background location task stopped"))
        .catch((err) =>
          console.error("❌ Error stopping background task:", err),
        );
    }

    set({
      locationWatcher: null,
      locationTrackingActive: false,
      currentLocation: null,
      lastSentLocation: null,
      lastLocationUpdate: null,
      // Don't reset vendorLocationCaptured - it's persistent state
    });

    console.log("✅ Location tracking STOPPED");
  },

  // Fetch User Profile (enhanced with vendor location capture)
  fetchProfile: async () => {
    const { user } = get();

    if (!user) {
      console.warn("⚠️ Cannot fetch profile: No authenticated user");
      return;
    }

    try {
      set({ isProfileLoading: true, profileError: null });
      console.log("🔄 Fetching user profile...");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        throw new Error(error.message || "Failed to fetch profile");
      }

      if (!data) {
        throw new Error("Profile not found");
      }

      const profile = data as UserProfile;

      // Check if vendor location was previously captured
      const vendorTypes = ["RESTAURANT_VENDOR", "LAUNDRY_VENDOR", "DISPATCH"];
      const isVendor = vendorTypes.includes(profile.user_type);
      const locationCaptured = profile.metadata?.location_captured === true;

      set({
        profile,
        profileImageUrl: profile.profile_image_url ?? null,
        backdropImageUrl: profile.backdrop_image_url ?? null,
        vendorLocationCaptured: isVendor ? locationCaptured : true, // Non-vendors default to "captured"
        isProfileLoading: false,
        profileError: null,
      });

      console.log("✅ Profile fetched successfully");
      console.log(`   User type: ${profile.user_type}`);
      console.log(
        `   Vendor location captured: ${isVendor ? (locationCaptured ? "YES" : "NO") : "N/A"}`,
      );

      // 🔑 START LOCATION TRACKING AFTER PROFILE FETCH
      // (We need profile to determine user_type for proper config)
      setTimeout(() => {
        get().startLocationTracking();

        // For vendors without captured location, attempt one-time capture
        if (isVendor && !locationCaptured) {
          console.log(
            "🔄 Vendor location not yet captured - will capture on first location update",
          );
          // Location will be captured automatically in watchPositionAsync callback
          // when shouldUpdateServerLocation() returns true and update succeeds
        }
      }, 1000);
    } catch (error: any) {
      console.error("❌ Error fetching profile:", error);
      set({
        profileError: error?.message || "Failed to load profile",
        isProfileLoading: false,
      });
    }
  },

  // Session Hydration (enhanced with location stop on sign out)
  hydrate: async () => {
    set({ isLoading: true });

    try {
      console.log("🔄 Hydrating user session...");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("❌ Session error:", sessionError);
        // Stop location tracking on auth failure
        get().stopLocationTracking();
        set({ user: null });
        return;
      }

      if (session?.user) {
        console.log("✅ Active session found:", session.user.id);

        const storedUser = await authStorage.getUser();

        if (storedUser && storedUser.id === session.user.id) {
          console.log("✅ Using stored user data");
          set({ user: storedUser });
        } else {
          console.log("🔄 Converting session user to AuthUser");
          const authUser = toAuthUser(session.user);
          await authStorage.storeUser(authUser);
          set({ user: authUser });
        }

        // Fetch user profile after setting user
        await get().fetchProfile();
      } else {
        console.log("ℹ️ No active session found");
        // Stop location tracking when no session
        get().stopLocationTracking();
        set({ user: null, profile: null });
      }

      const hasLaunched = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
      set({ isFirstLaunch: hasLaunched === null });

      console.log("✅ Hydration complete");
    } catch (error) {
      console.error("❌ Error during hydration:", error);
      // Stop location tracking on error
      get().stopLocationTracking();
      set({ user: null, profile: null });
    } finally {
      set({ hasHydrated: true, isLoading: false });
    }
  },

  // Refresh Session (enhanced)
  refreshSession: async () => {
    try {
      console.log("🔄 Refreshing session...");

      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error("❌ Error refreshing session:", error);
        // Stop location on session error
        get().stopLocationTracking();
        set({ user: null, profile: null });
        return;
      }

      if (session?.user) {
        const authUser = toAuthUser(session.user);
        await authStorage.storeUser(authUser);
        set({ user: authUser });

        // Refresh profile as well
        await get().fetchProfile();

        console.log("✅ Session refreshed successfully");
      }
    } catch (error) {
      console.error("❌ Error refreshing session:", error);
      // Stop location on error
      get().stopLocationTracking();
    }
  },

  // Sign Out (enhanced with location stop)
  signOut: async () => {
    try {
      console.log("🔄 Signing out...");
      set({ isLoading: true });

      // STOP LOCATION TRACKING BEFORE SIGNING OUT
      get().stopLocationTracking();

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("❌ Error during sign out:", error);
        throw error;
      }

      await authStorage.removeUser();

      set({
        user: null,
        profile: null,
        profileImageUrl: null,
        backdropImageUrl: null,
        storeId: null,
        riderId: null,
        isReassign: false,
        storeAddress: null,
        profileError: null,
        // Reset location state (but keep vendorLocationCaptured for next session)
        currentLocation: null,
        locationPermissionGranted: null,
        locationTrackingActive: false,
        locationWatcher: null,
        lastSentLocation: null,
        lastLocationUpdate: null,
      });

      console.log("✅ Sign out successful");
    } catch (error) {
      console.error("❌ Error signing out:", error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Initialize Auth State Listener (enhanced)
  initialize: () => {
    console.log("🔄 Initializing auth state listener...");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log("🔔 Auth state changed:", event);

        switch (event) {
          case "SIGNED_IN":
            if (session?.user) {
              const authUser = toAuthUser(session.user);
              await authStorage.storeUser(authUser);
              set({ user: authUser });
              // Fetch profile on sign in
              await get().fetchProfile();
              console.log("✅ User signed in");
            }
            break;

          case "SIGNED_OUT":
            // Stop location tracking on sign out
            get().stopLocationTracking();

            await authStorage.removeUser();
            set({
              user: null,
              profile: null,
              profileImageUrl: null,
              backdropImageUrl: null,
              storeId: null,
              riderId: null,
              isReassign: false,
              storeAddress: null,
              profileError: null,
              currentLocation: null,
              locationPermissionGranted: null,
              locationTrackingActive: false,
              locationWatcher: null,
              lastSentLocation: null,
              lastLocationUpdate: null,
              // Don't reset vendorLocationCaptured - it's stored in profile
            });
            console.log("✅ User signed out");
            break;

          case "TOKEN_REFRESHED":
            if (session?.user) {
              const authUser = toAuthUser(session.user);
              await authStorage.storeUser(authUser);
              set({ user: authUser });
              console.log("✅ Token refreshed");
            }
            break;

          case "USER_UPDATED":
            if (session?.user) {
              const authUser = toAuthUser(session.user);
              await authStorage.storeUser(authUser);
              set({ user: authUser });
              // Refetch profile on user update
              await get().fetchProfile();
              console.log("✅ User updated");
            }
            break;

          default:
            break;
        }
      },
    );

    return () => {
      subscription.unsubscribe();
      // Stop location tracking on cleanup
      get().stopLocationTracking();
      console.log("🧹 Auth state listener cleaned up");
    };
  },
}));

// // @/stores/user-store.ts
// import authStorage from "@/storage/auth-storage";
// import { AuthUser, UserProfile, toAuthUser } from "@/types/user-types";
// import { supabase } from "@/utils/supabase";
// import { AuthChangeEvent, Session } from "@supabase/supabase-js";
// import * as SecureStore from "expo-secure-store";
// import { create } from "zustand";

// const FIRST_LAUNCH_KEY = "hasLaunched";

// interface UserStore {
//   // Auth State
//   user: AuthUser | null;

//   // Profile State
//   profile: UserProfile | null;
//   profileImageUrl: string | null;
//   backdropImageUrl: string | null;

//   // App State
//   storeId: string | null;
//   riderId: string | null;
//   isReassign: boolean;
//   storeAddress: string | null;
//   isFirstLaunch: boolean;

//   // Loading States
//   hasHydrated: boolean;
//   isLoading: boolean;
//   isProfileLoading: boolean;

//   // Error State
//   profileError: string | null;

//   // Auth Setters
//   setUser: (user: AuthUser | null) => void;

//   // Profile Setters
//   setProfile: (profile: UserProfile | null) => void;
//   setProfileImageUrl: (url: string | null) => void;
//   setBackdropImageUrl: (url: string | null) => void;

//   // App Setters
//   setStoreId: (storeId: string | null) => void;
//   setRiderId: (riderId: string | null) => void;
//   setIsReassign: (isReassign: boolean) => void;
//   setStoreAddress: (storeAddress: string | null) => void;

//   // Actions
//   hydrate: () => Promise<void>;
//   signOut: () => Promise<void>;
//   checkFirstLaunch: () => Promise<boolean>;
//   setFirstLaunchComplete: () => Promise<void>;
//   refreshSession: () => Promise<void>;
//   fetchProfile: () => Promise<void>;
//   initialize: () => () => void;
// }

// export const useUserStore = create<UserStore>((set, get) => ({
//   // Initial State
//   user: null,
//   profile: null,
//   profileImageUrl: null,
//   backdropImageUrl: null,
//   storeId: null,
//   riderId: null,
//   isReassign: false,
//   storeAddress: null,
//   isFirstLaunch: true,
//   hasHydrated: false,
//   isLoading: false,
//   isProfileLoading: false,
//   profileError: null,

//   // Auth Setters
//   setUser: (user) => set({ user }),

//   // Profile Setters
//   setProfile: (profile) =>
//     set({
//       profile,
//       profileImageUrl: profile?.profile_image_url ?? null,
//       backdropImageUrl: profile?.backdrop_image_url ?? null,
//     }),

//   setProfileImageUrl: (url) => set({ profileImageUrl: url }),
//   setBackdropImageUrl: (url) => set({ backdropImageUrl: url }),

//   // App Setters
//   setStoreId: (storeId) => set({ storeId }),
//   setRiderId: (riderId) => set({ riderId }),
//   setIsReassign: (isReassign) => set({ isReassign }),
//   setStoreAddress: (storeAddress) => set({ storeAddress }),

//   // First Launch Management
//   checkFirstLaunch: async () => {
//     try {
//       const hasLaunched = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
//       const isFirst = hasLaunched === null;
//       set({ isFirstLaunch: isFirst });
//       return isFirst;
//     } catch (error) {
//       console.error("❌ Error checking first launch:", error);
//       set({ isFirstLaunch: true });
//       return true;
//     }
//   },

//   setFirstLaunchComplete: async () => {
//     try {
//       await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, "true");
//       set({ isFirstLaunch: false });
//     } catch (error) {
//       console.error("❌ Error setting first launch complete:", error);
//     }
//   },

//   // Fetch User Profile
//   fetchProfile: async () => {
//     const { user } = get();

//     if (!user) {
//       console.warn("⚠️ Cannot fetch profile: No authenticated user");
//       return;
//     }

//     try {
//       set({ isProfileLoading: true, profileError: null });
//       console.log("🔄 Fetching user profile...");

//       const { data, error } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("id", user.id)
//         .single();

//       if (error) {
//         throw new Error(error.message || "Failed to fetch profile");
//       }

//       if (!data) {
//         throw new Error("Profile not found");
//       }

//       const profile = data as UserProfile;

//       set({
//         profile,
//         profileImageUrl: profile.profile_image_url ?? null,
//         backdropImageUrl: profile.backdrop_image_url ?? null,
//         isProfileLoading: false,
//         profileError: null,
//       });

//       console.log("✅ Profile fetched successfully");
//     } catch (error: any) {
//       console.error("❌ Error fetching profile:", error);
//       set({
//         profileError: error?.message || "Failed to load profile",
//         isProfileLoading: false,
//       });
//     }
//   },

//   // Session Hydration
//   hydrate: async () => {
//     set({ isLoading: true });

//     try {
//       console.log("🔄 Hydrating user session...");

//       const {
//         data: { session },
//         error: sessionError,
//       } = await supabase.auth.getSession();

//       if (sessionError) {
//         console.error("❌ Session error:", sessionError);
//         set({ user: null });
//         return;
//       }

//       if (session?.user) {
//         console.log("✅ Active session found:", session.user.id);

//         const storedUser = await authStorage.getUser();

//         if (storedUser && storedUser.id === session.user.id) {
//           console.log("✅ Using stored user data");
//           set({ user: storedUser });
//         } else {
//           console.log("🔄 Converting session user to AuthUser");
//           const authUser = toAuthUser(session.user);
//           await authStorage.storeUser(authUser);
//           set({ user: authUser });
//         }

//         // Fetch user profile after setting user
//         await get().fetchProfile();
//       } else {
//         console.log("ℹ️ No active session found");
//         set({ user: null, profile: null });
//       }

//       const hasLaunched = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
//       set({ isFirstLaunch: hasLaunched === null });

//       console.log("✅ Hydration complete");
//     } catch (error) {
//       console.error("❌ Error during hydration:", error);
//       set({ user: null, profile: null });
//     } finally {
//       set({ hasHydrated: true, isLoading: false });
//     }
//   },

//   // Refresh Session
//   refreshSession: async () => {
//     try {
//       console.log("🔄 Refreshing session...");

//       const {
//         data: { session },
//         error,
//       } = await supabase.auth.refreshSession();

//       if (error) {
//         console.error("❌ Error refreshing session:", error);
//         set({ user: null, profile: null });
//         return;
//       }

//       if (session?.user) {
//         const authUser = toAuthUser(session.user);
//         await authStorage.storeUser(authUser);
//         set({ user: authUser });

//         // Refresh profile as well
//         await get().fetchProfile();

//         console.log("✅ Session refreshed successfully");
//       }
//     } catch (error) {
//       console.error("❌ Error refreshing session:", error);
//     }
//   },

//   // Sign Out
//   signOut: async () => {
//     try {
//       console.log("🔄 Signing out...");
//       set({ isLoading: true });

//       const { error } = await supabase.auth.signOut();

//       if (error) {
//         console.error("❌ Error during sign out:", error);
//         throw error;
//       }

//       await authStorage.removeUser();

//       set({
//         user: null,
//         profile: null,
//         profileImageUrl: null,
//         backdropImageUrl: null,
//         storeId: null,
//         riderId: null,
//         isReassign: false,
//         storeAddress: null,
//         profileError: null,
//       });

//       console.log("✅ Sign out successful");
//     } catch (error) {
//       console.error("❌ Error signing out:", error);
//       throw error;
//     } finally {
//       set({ isLoading: false });
//     }
//   },

//   // Initialize Auth State Listener
//   initialize: () => {
//     console.log("🔄 Initializing auth state listener...");

//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
//       console.log("🔔 Auth state changed:", event);

//       switch (event) {
//         case "SIGNED_IN":
//           if (session?.user) {
//             const authUser = toAuthUser(session.user);
//             await authStorage.storeUser(authUser);
//             set({ user: authUser });
//             // Fetch profile on sign in
//             await get().fetchProfile();
//             console.log("✅ User signed in");
//           }
//           break;

//         case "SIGNED_OUT":
//           await authStorage.removeUser();
//           set({
//             user: null,
//             profile: null,
//             profileImageUrl: null,
//             backdropImageUrl: null,
//             storeId: null,
//             riderId: null,
//             isReassign: false,
//             storeAddress: null,
//             profileError: null,
//           });
//           console.log("✅ User signed out");
//           break;

//         case "TOKEN_REFRESHED":
//           if (session?.user) {
//             const authUser = toAuthUser(session.user);
//             await authStorage.storeUser(authUser);
//             set({ user: authUser });
//             console.log("✅ Token refreshed");
//           }
//           break;

//         case "USER_UPDATED":
//           if (session?.user) {
//             const authUser = toAuthUser(session.user);
//             await authStorage.storeUser(authUser);
//             set({ user: authUser });
//             // Refetch profile on user update
//             await get().fetchProfile();
//             console.log("✅ User updated");
//           }
//           break;

//         default:
//           break;
//       }
//     });

//     return () => {
//       subscription.unsubscribe();
//       console.log("🧹 Auth state listener cleaned up");
//     };
//   },
// }));

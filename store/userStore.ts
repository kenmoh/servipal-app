import {
  registerPushToken as syncPushToken,
  updatecurrentUserLocation,
} from "@/api/user";
import authStorage from "@/storage/auth-storage";
import {
  AuthUser,
  LocationCoordinates,
  UserProfile,
  toAuthUser,
} from "@/types/user-types";
import { registerForPushNotificationAsync } from "@/utils/registerForPushNotificationAsync";
import {
  BACKGROUND_LOCATION_TASK,
  GENERAL_LOCATION_TASK,
} from "@/utils/location-tracking";
import { supabase } from "@/utils/supabase";
import * as Sentry from "@sentry/react-native";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { create } from "zustand";

// Configure how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const LOCATION_TASK_NAME = GENERAL_LOCATION_TASK;

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

  //  Location State
  currentLocation: { lat: number; lng: number } | null;
  locationPermissionGranted: boolean | null;
  locationTrackingActive: boolean;
  locationWatcher: Location.LocationSubscription | null;
  lastSentLocation: { lat: number; lng: number } | null;
  lastLocationUpdate: number | null;
  vendorLocationCaptured: boolean; // Tracks if vendor's one-time location was captured
  isIosBackgroundLocationEnabled: boolean | null;
  isAndroidBackgroundLocationEnabled: boolean | null;
  locationAlwaysAndWhenInUsePermission: boolean | null;
  locationWhenInUsePermission: boolean | null;
  selectedUserType: string | null;

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

  //  Location Setters
  setCurrentLocation: (location: { lat: number; lng: number } | null) => void;
  setLocationPermissionGranted: (granted: boolean) => void;
  setLocationTrackingActive: (active: boolean) => void;
  setVendorLocationCaptured: (captured: boolean) => void;
  setSelectedUserType: (type: string | null) => void;

  // Actions
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
  checkFirstLaunch: () => Promise<boolean>;
  setFirstLaunchComplete: () => Promise<void>;
  refreshSession: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  registerPushToken: () => Promise<void>;
  initialize: () => () => void;

  //  Location Actions
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

  //  Location Initial State
  currentLocation: null,
  locationPermissionGranted: null,
  locationTrackingActive: false,
  locationWatcher: null,
  lastSentLocation: null,
  lastLocationUpdate: null,
  vendorLocationCaptured: false,
  isIosBackgroundLocationEnabled: null,
  isAndroidBackgroundLocationEnabled: null,
  locationAlwaysAndWhenInUsePermission: null,
  locationWhenInUsePermission: null,
  selectedUserType: null,

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

  //  Location Setters
  setCurrentLocation: (location) => {
    set({ currentLocation: location, lastLocationUpdate: Date.now() });

    Sentry.addBreadcrumb({
      category: "location",
      message: "Location updated locally",
      level: "debug",
      data: { lat: location?.lat, lng: location?.lng },
    });
  },
  setLocationPermissionGranted: (granted) => {
    set({ locationPermissionGranted: granted });

    Sentry.addBreadcrumb({
      category: "location",
      message: granted
        ? "Location permission granted"
        : "Location permission denied",
      level: granted ? "info" : "warning",
    });
  },
  setLocationTrackingActive: (active) => {
    set({ locationTrackingActive: active });

    Sentry.addBreadcrumb({
      category: "location",
      message: active
        ? "Location tracking ACTIVE"
        : "Location tracking INACTIVE",
      level: "info",
    });
  },
  setVendorLocationCaptured: (captured) => {
    set({ vendorLocationCaptured: captured });

    Sentry.addBreadcrumb({
      category: "location",
      message: captured
        ? "Vendor location captured"
        : "Vendor location not yet captured",
      level: "info",
    });
  },
  setSelectedUserType: (type) => set({ selectedUserType: type }),

  // First Launch Management (existing)
  checkFirstLaunch: async () => {
    try {
      const hasLaunched = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
      const isFirst = hasLaunched === null;
      set({ isFirstLaunch: isFirst });
      return isFirst;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { action: "check_first_launch" },
      });
      set({ isFirstLaunch: true });
      return true;
    }
  },

  setFirstLaunchComplete: async () => {
    try {
      await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, "true");
      set({ isFirstLaunch: false });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { action: "set_first_launch_complete" },
      });
    }
  },

  //  Location Permission Check
  checkLocationPermission: async () => {
    const userId = get().user?.id || get().profile?.id;
    const userType =
      get().user?.user_metadata?.user_type || get().profile?.user_type;

    try {
      // 1. Check if device location services are on at all
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        set({ locationPermissionGranted: false });
        return false;
      }

      // 2. Request Foreground Permissions first
      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (fgStatus !== "granted") {
        set({ locationPermissionGranted: false });
        return false;
      }

      // 3. Request Background Permissions for Riders (and Customers with active orders)
      let bgStatus = "denied";
      const needsBackground =
        userType === "RIDER" ||
        (userType === "CUSTOMER" &&
          (await get().checkCustomerHasActiveOrder(userId!)));

      if (needsBackground) {
        const { status: currentBgStatus } =
          await Location.getBackgroundPermissionsAsync();
        bgStatus = currentBgStatus;

        if (currentBgStatus !== "granted") {
          Sentry.logger.info(
            `[Location] Requesting background permissions for ${userType}`,
          );
          const { status: requestedBgStatus } =
            await Location.requestBackgroundPermissionsAsync();
          bgStatus = requestedBgStatus;
        }
      } else {
        // Just check current status if not explicitly needed right now
        const { status: currentBgStatus } =
          await Location.getBackgroundPermissionsAsync();
        bgStatus = currentBgStatus;
      }

      const isAlwaysGranted = bgStatus === "granted";

      set({
        locationPermissionGranted: true,
        isIosBackgroundLocationEnabled:
          Platform.OS === "ios" ? isAlwaysGranted : null,
        isAndroidBackgroundLocationEnabled:
          Platform.OS === "android" ? isAlwaysGranted : null,
        locationAlwaysAndWhenInUsePermission: isAlwaysGranted,
        locationWhenInUsePermission: true,
      });

      return true;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { action: "check_location_permission" },
      });
      set({ locationPermissionGranted: false });
      return false;
    }
  },

  //  Check if customer has active order requiring location updates
  checkCustomerHasActiveOrder: async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("delivery_orders")
        .select("id, delivery_status")
        .eq("sender_id", userId)
        .eq("is_deleted", false)
        .in("delivery_status", [
          "PENDING",
          "PAID_NEEDS_RIDER",
          "ASSIGNED",
          "PICKED_UP",
          "IN_TRANSIT",
        ])
        .limit(1);

      if (error) throw error;

      const hasActive = !!data?.length;

      Sentry.addBreadcrumb({
        category: "order",
        message: `Customer active order check: ${hasActive ? "YES" : "NO"}`,
        level: "info",
      });
      return hasActive;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { action: "check_active_order" },
      });
      return false;
    }
  },

  //  Determine if we should send location to server based on user type & context
  shouldUpdateServerLocation: async (): Promise<boolean> => {
    const { user, profile, currentLocation, lastSentLocation } = get();
    const userId = user?.id || profile?.id;
    const userType = user?.user_metadata?.user_type || profile?.user_type;

    if (!currentLocation || !userId || !userType) return false;

    // ── Rule 1: Always allow the first position update of the session ──
    if (!lastSentLocation) {
      Sentry.logger.info(
        `[Location] shouldUpdateServerLocation: Allowing FIRST position update for ${userType}`,
      );
      return true;
    }

    // ── Rule 2: Riders always update if active ───────────────────────
    if (userType === "RIDER") return true;

    // ── Rule 3: Customers ONLY update when has active order (after first) ──
    if (userType === "CUSTOMER") {
      const hasActive = await get().checkCustomerHasActiveOrder(userId);
      Sentry.logger.info(
        `[Location] Customer location update check: ${hasActive ? "YES" : "NO"}`,
      );
      return hasActive;
    }

    // ── Rule 4: Vendors/Others — usually only need a one-time capture ─
    const vendorTypes = ["RESTAURANT_VENDOR", "LAUNDRY_VENDOR", "DISPATCH"];
    if (vendorTypes.includes(userType)) {
      const { vendorLocationCaptured } = get();
      return !vendorLocationCaptured;
    }

    return false;
  },

  //  Capture vendor location ONCE (on first sign-in or when missing)
  captureVendorLocationOnce: async () => {
    const { user, profile, vendorLocationCaptured, currentLocation } = get();
    const userType = user?.user_metadata?.user_type || profile?.user_type;

    // Only for vendors
    if (
      !["RESTAURANT_VENDOR", "LAUNDRY_VENDOR", "DISPATCH"].includes(userType!)
    ) {
      Sentry.logger.info(`[Vendor] Not a vendor - skipping`);
      return;
    }

    // Skip if already captured
    if (vendorLocationCaptured) {
      Sentry.logger.info(
        `[Vendor] Vendor location already captured - skipping`,
      );
      Sentry.addBreadcrumb({
        category: "location",
        message: "Vendor location already captured - skipping",
        level: "debug",
      });
      return;
    }

    // Skip if no location available
    if (!get().currentLocation) {
      Sentry.logger.error(
        `[Vendor] Cannot capture vendor location: No current location`,
      );
      Sentry.addBreadcrumb({
        category: "location",
        message: "Cannot capture vendor location: No current location",
        level: "warning",
      });
      return;
    }

    Sentry.addBreadcrumb({
      category: "location",
      message: `Capturing vendor location ONCE for ${userType}`,
      level: "info",
    });

    try {
      const lat = currentLocation?.lat;
      const lng = currentLocation?.lng;

      const coordinate: LocationCoordinates = {
        latitude: lat!,
        longitude: lng!,
      };

      // Update server location
      Sentry.logger.info(
        `[Vendor] Capturing vendor location ONCE for ${userType}`,
      );

      Sentry.logger.info(
        `[Vendor] Capturing vendor location ONCE for ${coordinate}`,
      );

      await updatecurrentUserLocation(coordinate);

      // Mark as captured
      set({ vendorLocationCaptured: true });

      Sentry.addBreadcrumb({
        category: "location",
        message: "Vendor location captured",
        level: "info",
        data: { lat, lng },
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { action: "capture_vendor_location" },
      });
    }
  },

  //  Start location tracking (context-aware per user type)
  startLocationTracking: async () => {
    const {
      user,
      profile,
      locationTrackingActive,
      locationWatcher,
      vendorLocationCaptured,
    } = get();

    const userType = user?.user_metadata?.user_type || profile?.user_type;
    const userId = user?.id || profile?.id;

    // Skip if already tracking foreground — but we might still need to check background task
    if (locationTrackingActive || locationWatcher) {
      Sentry.logger.info(
        `[Location] startLocationTracking: foreground watch already active (userType=${userType})`,
      );
    }

    // Skip if no authenticated user
    if (!userId) {
      Sentry.logger.info(
        `[Location] startLocationTracking called with NO user — skipping`,
      );
      Sentry.captureMessage(
        "[Location] startLocationTracking called with NO user — skipping",
        "warning",
      );
      return;
    }

    // Only track relevant user types
    const TRACKED_TYPES = [
      "RIDER",
      "CUSTOMER",
      "RESTAURANT_VENDOR",
      "LAUNDRY_VENDOR",
      "DISPATCH",
    ];
    if (!TRACKED_TYPES.includes(userType!)) {
      Sentry.logger.info(
        `[Location] startLocationTracking: untracked userType="${userType}" — skipping`,
      );
      return;
    }

    Sentry.logger.info(
      `[Location] startLocationTracking ENTERED for userType=${userType} userId=${userId}`,
    );

    // Check permissions
    const hasPermission = await get().checkLocationPermission();
    if (!hasPermission) {
      Sentry.logger.error(
        `[Location] startLocationTracking: PERMISSION DENIED for ${userType}`,
      );
      Sentry.captureMessage(
        `[Location] startLocationTracking: PERMISSION DENIED for ${userType}`,
        "warning",
      );
      return;
    }

    Sentry.logger.info(
      `[Location] Permission granted — starting watchPositionAsync for ${userType}`,
    );

    try {
      const config: Location.LocationOptions = {
        accuracy: Location.Accuracy.High,
        timeInterval: userType === "RIDER" ? 60000 : 300000, // Android only
        distanceInterval: userType === "RIDER" ? 30 : 200,
      };

      Sentry.logger.info(
        `[Location] Location config for ${userType}: ${JSON.stringify(config)}`,
      );

      //  Background location task management (Riders and Customers with active orders)
      const hasActiveOrder =
        userType === "CUSTOMER"
          ? await get().checkCustomerHasActiveOrder(userId)
          : false;
      const needsBackgroundTask =
        userType === "RIDER" || (userType === "CUSTOMER" && hasActiveOrder);

      if (needsBackgroundTask) {
        // Check if task is ALREADY running (different from registered)
        const isTaskRunning =
          await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

        Sentry.logger.info(
          `[Location] Bg task check: userType=${userType} needsBg=${needsBackgroundTask} isRunning=${isTaskRunning}`,
        );

        if (!isTaskRunning) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy:
              userType === "RIDER"
                ? Location.Accuracy.BestForNavigation
                : Location.Accuracy.High,
            timeInterval: userType === "RIDER" ? 60000 : 180000,
            distanceInterval: userType === "RIDER" ? 30 : 100,
            foregroundService: {
              notificationTitle:
                userType === "RIDER"
                  ? "Rider Location Tracking"
                  : "Delivery Tracking",
              notificationBody:
                userType === "RIDER"
                  ? "Required for dispatch and delivery tracking"
                  : "Tracking your active delivery",
              notificationColor: "#0066ff",
            },
            pausesUpdatesAutomatically: userType !== "RIDER",
            showsBackgroundLocationIndicator: true,
          });
          Sentry.logger.info(
            `[Location] Background task STARTED for ${userType}`,
          );
        }
      }

      // Start foreground watcher (only if not already running)
      if (!locationWatcher) {
        const watcher = await Location.watchPositionAsync(
          config,
          (location) => {
            const { latitude, longitude, accuracy } = location.coords;
            const newLocation = { lat: latitude, lng: longitude };

            // Update local state immediately
            get().setCurrentLocation(newLocation);

            // ── First position received — log it ──────────────────────────────
            const { lastSentLocation } = get();
            const isFirst = !lastSentLocation;

            Sentry.logger.info(
              `[Location] Position received (first=${isFirst}) lat=${latitude.toFixed(4)} lng=${longitude.toFixed(4)} acc=${accuracy?.toFixed(0)}m`,
            );

            Sentry.addBreadcrumb({
              category: "location",
              message: `Position received (first=${isFirst}) lat=${latitude.toFixed(4)} lng=${longitude.toFixed(4)} acc=${accuracy?.toFixed(0)}m`,
              level: "debug",
            });

            // ── FIRST POSITION: Always send immediately ──────────────────────
            if (isFirst) {
              Sentry.logger.info(
                `[Location] 🎯 FIRST position detected — sending immediately to server (userType=${userType})`,
              );
              
              Sentry.addBreadcrumb({
                category: "location",
                message: `🎯 FIRST position — calling updatecurrentUserLocation`,
                level: "info",
                data: { latitude, longitude, userType, userId, isFirst: true },
              });
              
              updatecurrentUserLocation({ latitude, longitude })
                .then(() => {
                  set({ lastSentLocation: newLocation });
                  
                  Sentry.logger.info(
                    `[Location] ✅ FIRST position sent successfully to server`,
                  );
                  
                  Sentry.addBreadcrumb({
                    category: "location",
                    message: `✅ FIRST position update SUCCESS`,
                    level: "info",
                    data: { latitude, longitude, userType },
                  });
                  
                  // If vendor, mark as captured
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
                    Sentry.logger.info(
                      `[Location] 📍 Vendor location marked as captured`,
                    );
                  }
                })
                .catch((error: any) => {
                  Sentry.logger.error(
                    `[Location] ❌ FIRST position update FAILED: ${error?.message || error}`,
                  );
                  
                  Sentry.addBreadcrumb({
                    category: "location",
                    message: `❌ FIRST position update FAILED`,
                    level: "error",
                    data: { 
                      error: error?.message || String(error),
                      latitude, 
                      longitude, 
                      userType, 
                      userId 
                    },
                  });
                  
                  Sentry.captureException(error, {
                    tags: { action: "update_first_location", isFirst: "true" },
                    extra: { latitude, longitude, userType, userId },
                  });
                });
              return;
            }

            // Skip if location hasn't changed significantly (50m threshold)
            if (lastSentLocation) {
              const distance = getDistanceMeters(
                lastSentLocation.lat,
                lastSentLocation.lng,
                latitude,
                longitude,
              );

              Sentry.logger.info(
                `[Location] Distance from last sent: ${distance.toFixed(0)}m (threshold=50m)`,
              );

              if (distance < 50) {
                Sentry.addBreadcrumb({
                  category: "location",
                  message: `Position skipped — only ${distance.toFixed(0)}m from last sent (threshold=50m)`,
                  level: "debug",
                });
                return;
              }
            }

            // Determine if we should send to server based on user type & context
            get()
              .shouldUpdateServerLocation()
              .then(async (shouldUpdate) => {
                if (!shouldUpdate) {
                  Sentry.addBreadcrumb({
                    category: "location",
                    message: `shouldUpdateServerLocation=false for ${userType} — skipping server update`,
                    level: "debug",
                  });
                  return;
                }

                // ── Attempt server update ──────────────────────────────────────
                try {
                  await updatecurrentUserLocation({ latitude, longitude });
                  set({ lastSentLocation: newLocation });

                  Sentry.logger.info(
                    `[Location] Server updated lat=${latitude.toFixed(4)} lng=${longitude.toFixed(4)} userType=${userType}`,
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
                  }
                } catch (error: any) {
                  Sentry.captureException(error, {
                    tags: { action: "update_location_to_server" },
                    extra: {
                      errorMessage: error?.message,
                      latitude,
                      longitude,
                      userType,
                      userId,
                    },
                  });
                }
              })
              .catch((err) => {
                Sentry.captureException(err, {
                  tags: { action: "should_update_server_location" },
                });
              });
          },
        );

        set({
          locationWatcher: watcher,
          locationTrackingActive: true,
          lastLocationUpdate: Date.now(),
        });
      }

      Sentry.logger.info(`[Location] tracking setup COMPLETE for ${userType}`);
    } catch (error) {
      Sentry.logger.error(
        `[Location] watchPositionAsync FAILED for ${userType}: ${error}`,
      );
      Sentry.captureException(error, {
        tags: { action: "start_location_tracking" },
        extra: { userType, userId },
      });
      set({ locationTrackingActive: false });
    }
  },

  //  Stop location tracking (cleanup)
  stopLocationTracking: () => {
    const { locationWatcher, locationTrackingActive, user, profile } = get();

    if (!locationTrackingActive && !locationWatcher) {
      return;
    }

    // Stop foreground watcher
    if (locationWatcher) {
      locationWatcher.remove();
    }

    // Stop background task for riders
    const userType = user?.user_metadata?.user_type || profile?.user_type;
    if (userType === "RIDER") {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
        .then(() => {
          Sentry.logger.info("[Location] Background location task stopped");
        })
        .catch((err) => {
          Sentry.logger.error(
            `[Location] Background location task stop FAILED: ${err}`,
          );
          Sentry.captureException(err, {
            tags: { action: "stop_bg_location_task" },
          });
        });
    }

    set({
      locationWatcher: null,
      locationTrackingActive: false,
      currentLocation: null,
      lastSentLocation: null,
      lastLocationUpdate: null,
    });
  },

  // Fetch User Profile (enhanced with vendor location capture)
  fetchProfile: async () => {
    const { user } = get();

    if (!user) return;

    try {
      set({ isProfileLoading: true, profileError: null });

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

      // REGISTER PUSH TOKEN AFTER PROFILE FETCH
      setTimeout(() => {
        get().registerPushToken();
      }, 500);

      // START LOCATION TRACKING AFTER PROFILE FETCH
      // (We need profile to determine user_type for proper config)
      setTimeout(() => {
        get().startLocationTracking();

        // For vendors without captured location, attempt one-time capture
        if (isVendor && !locationCaptured) {
          Sentry.captureMessage(
            "Vendor location not yet captured - will capture on first location update",
          );
          // Location will be captured automatically in watchPositionAsync callback
          // when shouldUpdateServerLocation() returns true and update succeeds
        }
      }, 1000);
    } catch (error: any) {
      Sentry.captureException(error, { tags: { action: "fetch_profile" } });
      set({
        profileError: error?.message || "Failed to load profile",
        isProfileLoading: false,
      });
    }
  },

  //  Register Push Token
  registerPushToken: async () => {
    try {
      const token = await registerForPushNotificationAsync();

      if (token) {
        await syncPushToken(token, Platform.OS);
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { action: "register_push_token" },
      });
    }
  },

  // Session Hydration (enhanced with location stop on sign out)
  hydrate: async () => {
    set({ isLoading: true });

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        Sentry.captureException(sessionError, {
          tags: { action: "hydrate_session" },
        });
        // Stop location tracking on auth failure
        get().stopLocationTracking();
        set({ user: null });
        return;
      }

      if (session?.user) {
        const storedUser = await authStorage.getUser();

        if (storedUser && storedUser.id === session.user.id) {
          set({ user: storedUser });
        } else {
          const authUser = toAuthUser(session.user);
          await authStorage.storeUser(authUser);
          set({ user: authUser });
        }

        // Fetch user profile after setting user
        await get().fetchProfile();
      } else {
        // Stop location tracking when no session
        get().stopLocationTracking();
        set({ user: null, profile: null });
      }

      const hasLaunched = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
      set({ isFirstLaunch: hasLaunched === null });
    } catch (error) {
      Sentry.captureException(error, { tags: { action: "hydrate" } });
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
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        Sentry.captureException(error, { tags: { action: "refresh_session" } });
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
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { action: "refresh_session" } });
      // Stop location on error
      get().stopLocationTracking();
    }
  },

  // Sign Out (enhanced with location stop)
  signOut: async () => {
    try {
      Sentry.addBreadcrumb({
        category: "auth",
        message: "User signing out",
        level: "info",
      });
      set({ isLoading: true });

      // STOP LOCATION TRACKING BEFORE SIGNING OUT
      get().stopLocationTracking();

      const { error } = await supabase.auth.signOut();

      if (error) {
        Sentry.captureException(error, { tags: { action: "sign_out" } });
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
    } catch (error) {
      Sentry.captureException(error, { tags: { action: "sign_out" } });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Initialize Auth State Listener (enhanced)
  initialize: () => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        Sentry.addBreadcrumb({
          category: "auth",
          message: `Auth state changed: ${event}`,
          level: "info",
        });

        switch (event) {
          case "SIGNED_IN":
            if (session?.user) {
              const authUser = toAuthUser(session.user);
              await authStorage.storeUser(authUser);
              set({ user: authUser });
              // Small delay to ensure Supabase session is fully persisted
              // in its internal cache before we make authenticated API calls.
              // Without this, getSession() / getUser() in API functions can
              // still return null immediately after SIGNED_IN fires.
              await new Promise((resolve) => setTimeout(resolve, 300));
              // Fetch profile on sign in (triggers startLocationTracking)
              await get().fetchProfile();
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
            });
            break;

          case "TOKEN_REFRESHED":
            if (session?.user) {
              const authUser = toAuthUser(session.user);
              await authStorage.storeUser(authUser);
              set({ user: authUser });
            }
            break;

          case "USER_UPDATED":
            if (session?.user) {
              const authUser = toAuthUser(session.user);
              await authStorage.storeUser(authUser);
              set({ user: authUser });
              // Refetch profile on user update
              await get().fetchProfile();
            }
            break;

          default:
            break;
        }
      },
    );

    // Setup Push Notification Listeners
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        Sentry.addBreadcrumb({
          category: "notification",
          message: "Notification received in foreground",
          level: "info",
        });
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        Sentry.addBreadcrumb({
          category: "notification",
          message: "Notification tapped",
          level: "info",
        });
        // TODO: Handle navigation based on notification data
        // For example: router.push(response.notification.request.content.data.url)
      });

    return () => {
      subscription.unsubscribe();
      notificationListener.remove();
      responseListener.remove();
      // Stop location tracking on cleanup
      get().stopLocationTracking();
    };
  },
}));

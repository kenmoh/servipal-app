import { updateDeliveryCoords } from "@/api/delivery";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_UPDATE_TASK";

/**
 * Task Definition - must be called at top level of the app
 */
export const defineLocationTask = () => {
  TaskManager.defineTask(
    BACKGROUND_LOCATION_TASK,
    async ({ data, error }: any) => {
      if (error) {
        console.error("📍 Background location task error:", error);
        return;
      }

      if (data) {
        const { locations } = data;
        if (locations && locations.length > 0) {
          const { latitude, longitude } = locations[0].coords;
          console.log("📍 Background location update:", {
            latitude,
            longitude,
          });

          // Retrieve current delivery info from persistent storage if needed
          // For simplicity, we assume we have access to the current delivery context
          // in a production app, you might use SecureStore or a singleton
          if (LocationContext.deliveryId) {
            try {
              await updateDeliveryCoords(
                LocationContext.deliveryId,
                latitude,
                longitude,
              );
            } catch (err) {
              console.error("❌ Failed to update coords from bg task:", err);
            }
          }
        }
      }
    },
  );
};

/**
 * Simple singleton for holding data between the utility and the background task
 */
export const LocationContext = {
  deliveryId: null as string | null,
  riderId: null as string | null,
};

/**
 * Starts background location tracking
 */
export const startDeliveryTracking = async (
  deliveryId: string,
  riderId: string,
): Promise<void> => {
  if (!deliveryId || !riderId) {
    console.warn("🚫 Tracking not started: missing deliveryId or riderId");
    return;
  }

  LocationContext.deliveryId = deliveryId;
  LocationContext.riderId = riderId;

  // 1. Request permissions
  const { status: foregroundStatus } =
    await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== "granted") {
    console.error("Foreground location permission denied");
    return;
  }

  const { status: backgroundStatus } =
    await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== "granted") {
    console.warn(
      "Background location permission denied - tracking will stop when app closes",
    );
    // We proceed anyway, but it won't work in bg on some OSs without this
  }

  // 2. Start background updates
  try {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 30000, // 30 seconds
      distanceInterval: 50, // 50 meters
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "ServiPal Delivery",
        notificationBody: "Tracking your active delivery location",
        notificationColor: "#FF6B00",
      },
    });

    console.log("📍 Background delivery tracking started");
  } catch (error) {
    console.error("❌ Failed to start background tracking:", error);
  }
};

/**
 * Stops tracking immediately
 */
export const stopDeliveryTracking = async (): Promise<void> => {
  try {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    LocationContext.deliveryId = null;
    LocationContext.riderId = null;
    console.log("📍 Delivery tracking stopped");
  } catch (error) {
    console.error("❌ Failed to stop tracking:", error);
  }
};

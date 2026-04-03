import { updateDeliveryCoords } from "@/api/delivery";
import { updatecurrentUserLocation } from "@/api/user";
import * as Sentry from "@sentry/react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_UPDATE_TASK";
export const GENERAL_LOCATION_TASK = "background-location-task";

/**
 * Task Definition - must be called at top level of the app
 */
export const defineLocationTask = () => {
  // 1. Task for Active Delivery Tracking (Frequent)
  TaskManager.defineTask(
    BACKGROUND_LOCATION_TASK,
    async ({ data, error }: any) => {
      if (error) {
        Sentry.captureException(error, {
          tags: { action: "bg_delivery_location_task" },
        });
        return;
      }

      if (data) {
        const { locations } = data;
        if (locations && locations.length > 0) {
          const { latitude, longitude } = locations[0].coords;

          if (LocationContext.deliveryId) {
            try {
              await updateDeliveryCoords(
                LocationContext.deliveryId,
                latitude,
                longitude,
              );
            } catch (err) {
              Sentry.captureException(err, {
                tags: { action: "bg_delivery_coords_update" },
              });
            }
          }
        }
      }
    },
  );

  // 2. Task for General Profile Updates (Less frequent, base location)
  TaskManager.defineTask(
    GENERAL_LOCATION_TASK,
    async ({ data, error }: any) => {
      if (error) {
        Sentry.captureException(error, {
          tags: { action: "bg_general_location_task" },
        });
        return;
      }

      if (data) {
        const { locations } = data;
        if (locations && locations.length > 0) {
          const { latitude, longitude } = locations[0].coords;
          try {
            // Update the user's primary location in the profile
            await updatecurrentUserLocation({ latitude, longitude });
            Sentry.addBreadcrumb({
              category: "location",
              message: `[BG] General location updated: ${latitude}, ${longitude}`,
              level: "info",
            });
          } catch (err) {
            // Log but don't crash
            Sentry.captureException(err, {
              tags: { action: "bg_general_location_update" },
            });
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
    return;
  }

  LocationContext.deliveryId = deliveryId;
  LocationContext.riderId = riderId;

  // 1. Request permissions
  const { status: foregroundStatus } =
    await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== "granted") {
    return;
  }

  const { status: backgroundStatus } =
    await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== "granted") {
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
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "start_delivery_tracking" },
    });
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
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "stop_delivery_tracking" },
    });
  }
};

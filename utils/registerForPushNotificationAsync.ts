import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotificationAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      throw new Error(
        "Permission not granted to get push token for push notification!",
      );
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      throw new Error("Project ID not found");
    }
    try {
      const maxRetries = 3;
      let attempt = 0;
      let delay = 1000; // Start with 1s delay

      while (attempt < maxRetries) {
        try {
          console.log(
            `🔄 Expo push token attempt ${attempt + 1}/${maxRetries}...`,
          );
          const token = (
            await Notifications.getExpoPushTokenAsync({ projectId })
          ).data;
          console.log("✅ Expo push token obtained");
          return token;
        } catch (error: any) {
          attempt++;
          const errorMessage = error?.message || String(error);

          console.warn(
            `⚠️ Expo push token attempt ${attempt} failed:`,
            errorMessage,
          );

          if (attempt >= maxRetries) {
            throw error;
          }

          // Check if it's a transient error that warrants a retry
          const isTransient =
            errorMessage.includes("SERVICE_NOT_AVAILABLE") ||
            errorMessage.includes("ExecutionException") ||
            errorMessage.includes("IOException");

          if (!isTransient) {
            console.error(
              "❌ Non-transient error, aborting retries:",
              errorMessage,
            );
            throw error;
          }

          console.log(`⏱️ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    } catch (e: unknown) {
      const finalError = e instanceof Error ? e.message : String(e);
      console.error(
        "❌ Failed to get Expo push token after retries:",
        finalError,
      );
      Sentry.captureException(e, { tags: { action: "get_push_token" } });
      throw new Error(`Push token registration failed: ${finalError}`);
    }
  } else {
    throw new Error("Must use physical device for push notifications");
  }
}

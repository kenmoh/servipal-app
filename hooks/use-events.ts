import { usePostHog } from "posthog-react-native";
import analytics, {
  logEvent,
  setAnalyticsCollectionEnabled,
} from "@react-native-firebase/analytics";
import { useEffect } from "react";

(globalThis as any).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

export const useTrack = () => {
  const posthog = usePostHog();

  useEffect(() => {
    const analyticsInstance = analytics();
    setAnalyticsCollectionEnabled(analyticsInstance, false); // disables Advertising ID
    setAnalyticsCollectionEnabled(analyticsInstance, true); // enables analytics without Ad ID
  }, []);

  const track = (event: string, props = {}) => {
    // Send to PostHog
    posthog.capture(event, props);

    // Send to Firebase
    logEvent(analytics(), event, props);
  };

  return { track };
};

// export const useTrack = () => {
//   const posthog = usePostHog();

//   const track = (event: string, props = {}) => {
//     // Send to PostHog
//     posthog.capture(event, props);

//     analytics().setAnalyticsCollectionEnabled(false);
//     // Send to Firebase
//     analytics().logEvent(event, props);
//   };

//   return { track };
// };

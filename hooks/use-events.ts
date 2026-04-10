import { usePostHog } from "posthog-react-native";
import analytics from "@react-native-firebase/analytics";
import { useEffect } from "react";

export const useTrack = () => {
  const posthog = usePostHog();

  useEffect(() => {
    analytics().setAnalyticsCollectionEnabled(false); // disables Advertising ID
    analytics().setAnalyticsCollectionEnabled(true); // enables analytics without Ad ID
  }, []);

  const track = (event: string, props = {}) => {
    // Send to PostHog
    posthog.capture(event, props);

    // Send to Firebase
    analytics().logEvent(event, props);
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

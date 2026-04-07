import { useUserStore } from "@/store/userStore";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, isFirstLaunch, hasHydrated } = useUserStore();

  // Wait for store to hydrate
  // if (!hasHydrated) return null;

  // Wait for store to hydrate
  if (!hasHydrated) {
    return (
      <View
        className="flex-1 bg-background"
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator color={"#ccc"} size="large" />
      </View>
    );
  }

  // User exists - go to main app
  if (user?.id) {
    return <Redirect href="/(tabs)/delivery/(top-tabs)" />;
  }

  // // First launch - show onboarding
  if (isFirstLaunch === true) {
    return <Redirect href="/onboarding" />;
  }

  // No user - show sign-in
  return <Redirect href="/sign-in" />;
}

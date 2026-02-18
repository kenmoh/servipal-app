import ToastProvider from "@/components/ToastProvider";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import "@/global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUserStore } from "@/store/userStore";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { router, SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

Sentry.init({
  dsn: "https://945bccd1ed4b5bcb5eab8cf7e3c776fa@o4505603287023616.ingest.us.sentry.io/4510143988629504",

  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  spotlight: __DEV__,
});

export const unstable_settings = {
  anchor: "(tabs)",
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const BG_COLOR = colorScheme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const { user, hydrate, hasHydrated, isFirstLaunch, initialize } =
    useUserStore();

  const [loaded] = useFonts({
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Initialize auth state listener FIRST
    const cleanup = initialize();

    // Then hydrate the store
    hydrate();

    // Cleanup on unmount
    return cleanup;
  }, [hydrate, initialize]);

  useEffect(() => {
    // Handle deep links
    const handleDeepLink = (event: { url: string }) => {
      const url = Linking.parse(event.url);

      console.log("Deep link received:", url);

      // Handle password reset link
      // Format: servipal://reset-password?access_token=xxx&type=recovery
      if (url.hostname === "reset-password") {
        const accessToken = url.queryParams?.access_token as string;
        const type = url.queryParams?.type as string;

        if (accessToken && type === "recovery") {
          router.push({
            pathname: "/reset-password",
            params: { accessToken },
          });
        }
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View className="bg-background flex-1 w-full">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <ToastProvider>
                <Stack
                  screenOptions={{
                    headerTintColor:
                      colorScheme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
                    headerShadowVisible: false,
                    headerStyle: {
                      backgroundColor: BG_COLOR,
                    },
                    contentStyle: {
                      backgroundColor: BG_COLOR,
                    },
                  }}
                >
                  {/* Auth Screens */}
                  <Stack.Protected guard={!user?.id}>
                    <Stack.Screen
                      name="sign-in"
                      // options={{ headerShown: false }}
                    />
                    <Stack.Screen name="sign-up" options={{}} />
                    <Stack.Screen
                      name="forgot-password"
                      options={{ title: "Recover password" }}
                    />
                    <Stack.Screen
                      name="reset-password"
                      options={{ title: "Reset password" }}
                    />
                  </Stack.Protected>

                  {/* Protected Screens */}
                  <Stack.Protected guard={!!user?.id}>
                    <Stack.Screen
                      name="(tabs)"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="wallet"
                      options={{
                        headerShown: false,
                        animation: "fade_from_bottom",
                      }}
                    />
                    <Stack.Screen
                      name="wallet/transaction"
                      options={{
                        headerShown: false,
                        animation: "fade_from_bottom",
                      }}
                    />
                    <Stack.Screen
                      name="wallet/fund"
                      options={{
                        title: "",
                        headerTransparent: true,
                        headerShadowVisible: false,
                        animation: "fade_from_bottom",
                      }}
                    />
                    <Stack.Screen
                      name="payment/index"
                      options={{
                        title: "Order Sumary",
                        headerTransparent: true,
                        headerShadowVisible: false,
                        animation: "fade_from_bottom",
                        headerTintColor:
                          colorScheme === "dark"
                            ? HEADER_BG_LIGHT
                            : HEADER_BG_DARK,
                      }}
                    />
                    <Stack.Screen
                      name="wallet/transaction/[id]"
                      options={{
                        title: "",
                        headerTransparent: true,
                        headerShadowVisible: false,
                        animation: "fade_from_bottom",
                      }}
                    />
                    <Stack.Screen
                      name="receipt"
                      options={{
                        headerShown: false,
                      }}
                    />
                    <Stack.Screen
                      name="riders"
                      options={{
                        title: "Available Riders",
                        animation: "slide_from_right",
                        headerTintColor:
                          colorScheme === "dark"
                            ? HEADER_BG_LIGHT
                            : HEADER_BG_DARK,
                      }}
                    />
                    <Stack.Screen
                      name="messages"
                      options={{
                        headerShown: false,
                        headerTintColor:
                          colorScheme === "dark"
                            ? HEADER_BG_LIGHT
                            : HEADER_BG_DARK,
                        title: "Messages",
                        animation: "slide_from_right",
                      }}
                    />
                    <Stack.Screen
                      name="change-password"
                      options={{
                        title: "Change Password",
                        animation: "fade_from_bottom",
                      }}
                    />
                    <Stack.Screen
                      name="delivery-detail"
                      options={{
                        headerShown: false,
                        animation: "fade_from_bottom",
                      }}
                    />
                    <Stack.Screen
                      name="send-package"
                      options={{
                        headerShown: false,
                        animation: "slide_from_bottom",
                      }}
                    />
                    <Stack.Screen
                      name="product-detail"
                      options={{
                        headerShown: false,
                        animation: "fade_from_bottom",
                      }}
                    />
                    <Stack.Screen
                      name="store"
                      options={{
                        headerShown: false,
                        animation: "slide_from_right",
                      }}
                    />
                    <Stack.Screen
                      name="dispatch"
                      options={{
                        headerShown: false,
                        animation: "slide_from_right",
                      }}
                    />
                    <Stack.Screen
                      name="laundry-store/[storeId]"
                      options={{
                        headerShown: false,
                        animation: "slide_from_right",
                      }}
                    />
                    <Stack.Screen
                      name="cart"
                      options={{
                        title: "Review Order",
                        animation: "slide_from_right",
                        headerTintColor:
                          colorScheme === "dark"
                            ? HEADER_BG_LIGHT
                            : HEADER_BG_DARK,
                      }}
                    />
                    <Stack.Screen
                      name="update-profile"
                      options={{
                        headerTintColor:
                          colorScheme === "dark"
                            ? HEADER_BG_LIGHT
                            : HEADER_BG_DARK,
                        title: "Update Profile",
                        animation: "slide_from_right",
                      }}
                    />
                  </Stack.Protected>
                </Stack>
                <StatusBar style="auto" />
              </ToastProvider>
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </View>
  );
}

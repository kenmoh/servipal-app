import ToastProvider from "@/components/ToastProvider";
import { ThemeTransitionOverlay } from "@/components/ThemeTransitionOverlay";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import "@/global.css";
import { useTheme } from "@/hooks/theme-toggle";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUserStore } from "@/store/userStore";
import { useColorScheme as useNativeWind } from "nativewind";
import { defineLocationTask } from "@/utils/location-tracking";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { router, SplashScreen, Stack, usePathname, useGlobalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

function ScreenTracker() {
  const posthog = usePostHog();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  return null;
}

Sentry.init({
  dsn: "https://945bccd1ed4b5bcb5eab8cf7e3c776fa@o4505603287023616.ingest.us.sentry.io/4510143988629504",

  sendDefaultPii: true,
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  spotlight: __DEV__,
});

// Register background location task at module load
defineLocationTask();

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

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const { setColorScheme: setNWColorScheme } = useNativeWind();
  const { theme: currentTheme } = useTheme();

  const BG_COLOR = colorScheme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const { user, hydrate, initialize } = useUserStore();

  useEffect(() => {
    if (currentTheme) {
      setNWColorScheme(
        currentTheme === "unspecified" ? "system" : currentTheme,
      );
    }
  }, [currentTheme]);

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
      Sentry.addBreadcrumb({
        category: "navigation",
        message: `Deep link received: ${url.hostname}`,
        level: "info",
      });

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
            <PostHogProvider
              apiKey={process.env.EXPO_PUBLIC_POSTHOG_KEY!}
              options={{
                host: process.env.EXPO_PUBLIC_POSTHOG_HOST!,
              }}
            >
              <ScreenTracker />
              <BottomSheetModalProvider>
                <ToastProvider>
                  {/* <ThemeTransitionOverlay /> */}
                  <Stack
                    screenOptions={{
                      headerTintColor:
                        colorScheme === "dark"
                          ? HEADER_BG_LIGHT
                          : HEADER_BG_DARK,
                      headerShadowVisible: false,
                      headerStyle: {
                        backgroundColor: BG_COLOR,
                      },
                      contentStyle: {
                        backgroundColor: BG_COLOR,
                      },
                    }}
                  >
                    {/* Auth Screens — only shown when NOT logged in */}
                    <Stack.Protected guard={!user?.id}>
                      <Stack.Screen name="sign-in" />
                      <Stack.Screen name="sign-up" options={{}} />
                      <Stack.Screen
                        name="forgot-password"
                        options={{ title: "Recover password" }}
                      />
                      <Stack.Screen
                        name="onboarding"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="reset-password"
                        options={{ title: "Reset password" }}
                      />
                      {/* user-selection is part of the registration flow — hide after login */}
                      <Stack.Screen
                        name="user-selection"
                        options={{ headerShown: false }}
                      />
                    </Stack.Protected>

                    {/* Protected Screens */}
                    <Stack.Protected guard={!!user?.id}>
                      <Stack.Screen
                        name="index"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="wallet"
                        options={{
                          headerShown: false,
                          animation: "slide_from_bottom",
                        }}
                      />
                      <Stack.Screen
                        name="wallet/transaction"
                        options={{
                          headerShown: false,
                          animation: "slide_from_bottom",
                        }}
                      />

                      <Stack.Screen
                        name="restaurant-reservation"
                        options={{
                          headerShown: false,
                          animation: "slide_from_bottom",
                        }}
                      />
                      <Stack.Screen
                        name="wallet/add-payout-account"
                        options={{
                          headerShadowVisible: false,
                          presentation: "formSheet",
                          sheetAllowedDetents: [0.75],
                          sheetCornerRadius: 25,
                          sheetGrabberVisible: true,
                          sheetInitialDetentIndex: 0,
                        }}
                      />
                      <Stack.Screen
                        name="payment/index"
                        options={{
                          title: "Order Sumary",

                          headerShadowVisible: false,
                          animation: "fade_from_bottom",
                          headerTintColor:
                            colorScheme === "dark"
                              ? HEADER_BG_LIGHT
                              : HEADER_BG_DARK,
                        }}
                      />

                      <Stack.Screen
                        name="receipt"
                        options={{
                          headerShown: false,
                          animation: "slide_from_bottom",
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
                          animation: "slide_from_bottom",
                          headerShown: true,
                          headerShadowVisible: false,
                          headerTintColor:
                            colorScheme === "dark"
                              ? HEADER_BG_LIGHT
                              : HEADER_BG_DARK,
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
                          animation: "slide_from_bottom",
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
            </PostHogProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </View>
  );
});

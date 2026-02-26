import { ConfigContext, ExpoConfig } from "expo/config";

const PRODUCT_NAME = "ServiPal";

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: PRODUCT_NAME,
  slug: "servi-pal-mobile",
  version: "1.1.0",
  orientation: "portrait",
  icon: "./assets/images/android-icon.png",
  scheme: "servipal",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    googleServicesFile: "./GoogleService-Info.plist",
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAP_API_KEY,
    },
    bundleIdentifier: "com.kenmoh.servipal",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["location"],
    },
    associatedDomains: ["applinks:servipal.com"],
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/android-icon.png",
      backgroundColor: "#000000",
    },
    googleServicesFile: "./google-services.json",
    edgeToEdgeEnabled: true,
    softwareKeyboardLayoutMode: "pan",
    package: "com.kenmoh.servipal",
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAP_API_KEY,
      },
    },

    permissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_LOCATION",
      "android.permission.RECORD_AUDIO",
    ],
    blockedPermissions: [
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
    ],
    intentFilters: [
      {
        action: "VIEW",
        category: ["BROWSABLE", "DEFAULT"],
        data: {
          scheme: "servipal",
          host: "*",
        },
      },
    ],
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/android-icon.png",
        imageWidth: 150,
        resizeMode: "contain",
        backgroundColor: "#18191c",
        dark: {
          backgroundColor: "#18191c",
        },
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow $(PRODUCT_NAME) to access your location to find the best services and display riders closest to you",
        locationWhenInUsePermission:
          "Allow $(PRODUCT_NAME) to access your location to find the best services and display riders closest to you",
        backgroundLocationPermission:
          "Allow $(PRODUCT_NAME) to access your location in the background",
      },
    ],
    "expo-secure-store",
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: "#000000",
        defaultChannel: "default",
        enableBackgroundRemoteNotifications: false,
      },
    ],

    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "servipal-mobile-app",
        organization: "mohstack",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "c20ee5ab-649d-44f9-ba8a-df17ded1ae16",
    },
  },
  owner: "kenmoh",
  updates: {
    url: "https://u.expo.dev/c20ee5ab-649d-44f9-ba8a-df17ded1ae16",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
});

import { ImageData, uploadImage } from "@/api/user";
import HDivider from "@/components/HDivider";
import ProfileImagePicker from "@/components/ProfileImagePicker";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import {
  useToggleOnlineStatus,
  useTogglePickupAndDropoff,
} from "@/hooks/status-toggle";
import { useTheme } from "@/hooks/theme-toggle";
import { useUserStore } from "@/store/userStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Sentry from "@sentry/react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

const BACKDROP_IMAGE_HEIGHT = Dimensions.get("window").height * 0.18;
const BACKDROP_IMAGE_WIDTH = Dimensions.get("window").width;

const ProfileScreen = () => {
  const {
    user,
    signOut,
    profile,
    profileImageUrl,
    backdropImageUrl,
    isIosBackgroundLocationEnabled,
    isAndroidBackgroundLocationEnabled,

    locationWhenInUsePermission,
    checkLocationPermission,
  } = useUserStore();

  const [isOnline, setIsOnline] = useState(profile?.is_online ?? false);
  const [canPickup, setCanPickup] = useState(
    profile?.can_pickup_and_dropoff ?? false,
  );

  const { showSuccess, showError } = useToast();

  const togglePickupMutation = useTogglePickupAndDropoff();

  const toggleOnlineMutation = useToggleOnlineStatus();

  const { setThemeOption, theme } = useTheme();

  const queryClient = useQueryClient();

  // Sync with profile changes
  useEffect(() => {
    if (profile?.is_online !== undefined) {
      setIsOnline(profile.is_online);
    }
  }, [profile?.is_online]);

  const {
    mutate: uploadProfileImageMutation,
    isPending: isProfileUploading,
    data: profileImageData,
  } = useMutation({
    mutationFn: (imageData: ImageData) =>
      uploadImage(imageData, "profile_image_url"),
    onSuccess: (result) => {
      showSuccess("Success", "Profile picture updated!");
      queryClient.invalidateQueries({ queryKey: ["vendorProfile", user?.id] });
    },
    onError: (error: any) => {
      showError(
        "Upload Failed",
        error.message || "Failed to upload profile image",
      );
    },
  });

  // Backdrop Image Upload Mutation
  const {
    mutate: uploadBackdropImageMutation,
    isPending: isBackdropUploading,
    data: backdropImageData,
  } = useMutation({
    mutationFn: (imageData: ImageData) =>
      uploadImage(imageData, "backdrop_image_url"),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vendorProfile", user?.id] });
      showSuccess("Success", "Backdrop image updated!");
    },
    onError: (error: any) => {
      Sentry.captureException(error, { tags: { action: "upload_backdrop" } });
      showError(
        "Upload Failed",
        error.message || "Failed to upload backdrop image",
      );
    },
  });

  const handleProfileImageSelect = (imageData: ImageData) => {
    uploadProfileImageMutation(imageData);
  };

  const handleBackdropImageSelect = (imageData: ImageData) => {
    uploadBackdropImageMutation(imageData);
  };

  const handleToggle = () => {
    // Optimistic update
    const previousValue = isOnline;
    setIsOnline(!isOnline);

    toggleOnlineMutation.mutate(undefined, {
      onError: () => {
        // Revert on error
        setIsOnline(previousValue);
      },
    });
  };

  // Sync with profile changes
  useEffect(() => {
    if (profile?.can_pickup_and_dropoff !== undefined) {
      setCanPickup(profile.can_pickup_and_dropoff);
    }
  }, [profile?.can_pickup_and_dropoff]);

  const handlePickupToggle = () => {
    // Optimistic update
    const previousValue = canPickup;
    setCanPickup(!canPickup);

    togglePickupMutation.mutate(undefined, {
      onError: () => {
        // Revert on error
        setCanPickup(previousValue);
      },
    });
  };

  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  const handleForegroundToggle = async () => {
    try {
      const { status: initialStatus, canAskAgain } =
        await Location.getForegroundPermissionsAsync();
      console.log("Current foreground status:", { initialStatus, canAskAgain });

      if (initialStatus === "granted") {
        Alert.alert(
          "Location Enabled",
          "General location access is already enabled. You can manage this in your device settings.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "OK", style: "cancel" },
          ],
        );
        return;
      }

      if (initialStatus === "denied" && !canAskAgain) {
        Alert.alert(
          "Permission Required",
          "General location access is needed to find the best services. Please enable location access in your device settings.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel", style: "cancel" },
          ],
        );
        return;
      }

      // Explanatory alert before requesting (if not already granted/permanently denied)
      Alert.alert(
        "Location Access",
        "ServiPal needs your general location to find the best services and nearby vendors for you.",
        [
          {
            text: "Continue",
            onPress: async () => {
              try {
                console.log("🔄 Triggering native foreground request...");
                const { status: requestStatus } =
                  await Location.requestForegroundPermissionsAsync();
                console.log("Foreground request result:", requestStatus);

                if (requestStatus === "granted") {
                  showSuccess("Success", "General location enabled!");
                } else {
                  showError(
                    "Permission Denied",
                    "General location access is needed to find the best services.",
                  );
                }
                await checkLocationPermission();
              } catch (error) {
                console.error("Error in foreground request:", error);
                showError("Error", "Failed to request permission.");
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } catch (error) {
      console.error("Error in foreground toggle:", error);
      showError("Error", "Failed to check permission.");
    }
  };

  const handleBackgroundToggle = async () => {
    console.log("👆 Background toggle pressed");
    try {
      // 1. Check Foreground dependency first
      const { status: fgStatus } =
        await Location.getForegroundPermissionsAsync();
      if (fgStatus !== "granted") {
        Alert.alert(
          "Action Required",
          "Please enable 'General Location' first before enabling 'Delivery Tracking'.",
          [{ text: "OK" }],
        );
        return;
      }

      // 2. Check Background status
      const { status: bgStatus, canAskAgain } =
        await Location.getBackgroundPermissionsAsync();
      console.log("Current background status:", { bgStatus, canAskAgain });

      if (bgStatus === "granted") {
        Alert.alert(
          "Permission Enabled",
          "Delivery tracking is already enabled. You can manage this in your device settings.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "OK", style: "cancel" },
          ],
        );
        return;
      }

      if (bgStatus === "denied" && !canAskAgain) {
        const message =
          Platform.OS === "android"
            ? "Background location must be set to 'Allow all the time' in your system settings."
            : "Background location access must be set to 'Always' in your system settings.";

        Alert.alert("Action Required", message, [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ]);
        return;
      }

      // 3. Show explanation before background request
      Alert.alert(
        "Delivery Tracking",
        "Allow ServiPal to access your location even when the app is in the background? This is specifically used to display riders closest to you and provide faster delivery updates.",
        [
          {
            text: "Allow",
            onPress: async () => {
              try {
                console.log("🔄 Triggering native background request...");
                const { status: requestStatus } =
                  await Location.requestBackgroundPermissionsAsync();
                console.log("Background request result:", requestStatus);

                if (requestStatus === "granted") {
                  showSuccess("Success", "Delivery tracking enabled!");
                } else {
                  console.warn("Background permission denied:", requestStatus);
                  const message =
                    Platform.OS === "android"
                      ? "Background location must be set to 'Allow all the time'. Please update this in settings."
                      : "Background location permission must be set to 'Always' in your system settings.";

                  showError("Permission Denied", message);

                  Alert.alert("Action Required", message, [
                    {
                      text: "Open Settings",
                      onPress: () => Linking.openSettings(),
                    },
                    { text: "Cancel", style: "cancel" },
                  ]);
                }
                await checkLocationPermission();
              } catch (error) {
                console.error("Error in background request:", error);
                showError("Error", "Failed to request permission.");
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } catch (error) {
      console.error("Error in background toggle:", error);
      showError("Error", "Failed to check permission.");
    }
  };

  // useEffect(() => {
  //   const loadTheme = async () => {
  //     const storedTheme = await authStorage.getTheme();
  //     if (storedTheme) {
  //       setTheme(storedTheme);
  //       // @ts-ignore - nativewind supports 'system'
  //       if (storedTheme) setColorScheme(storedTheme);
  //     } else {
  //       setTheme("system");
  //       // @ts-ignore - nativewind supports 'system'
  //       setColorScheme("system");
  //     }
  //   };
  //   loadTheme();
  // }, [setColorScheme]);

  // const handleThemeChange = (newTheme: themeType) => {
  //   if (newTheme === theme) return;
  //   setTheme(newTheme);
  //   // @ts-ignore - nativewind supports 'system'
  //   if (newTheme) setColorScheme(newTheme);
  //   authStorage.storeTheme(newTheme);
  // };

  const handleStoreRedirect = () => {
    if (user?.user_metadata?.user_type === "RESTAURANT_VENDOR") {
      router.push({
        pathname: "/store/[storeId]",
        params: { storeId: user?.id },
      });
    }
    if (user?.user_metadata?.user_type === "LAUNDRY_VENDOR") {
      router.push({
        pathname: "/laundry-store/[storeId]",
        params: { storeId: user?.id },
      });
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      showsVerticalScrollIndicator={false}
    >
      <View className="w-full h-44">
        <View className="w-full">
          <ProfileImagePicker
            onImageSelect={handleBackdropImageSelect}
            width={BACKDROP_IMAGE_WIDTH}
            height={BACKDROP_IMAGE_HEIGHT}
            borderRadius={0}
            isBackdropImage
            initialImage={backdropImageUrl || profile?.backdrop_image_url}
          />
          {isBackdropUploading && (
            <View className="absolute top-0 left-0 right-0 bottom-0 justify-center items-center bg-black/30">
              <Text className="text-white">Uploading...</Text>
            </View>
          )}
        </View>
        <View className="absolute -bottom-10 left-0 right-0 items-center">
          {/* Profile Image picker */}
          <View className="items-center -mt-12 ml-4">
            <ProfileImagePicker
              onImageSelect={handleProfileImageSelect}
              width={100}
              height={100}
              borderRadius={50}
              initialImage={profileImageUrl || profile?.profile_image_url}
            />
            {isProfileUploading && (
              <View className="absolute top-0 left-0 right-0 bottom-0 justify-center items-center bg-black/50 rounded-full">
                <Text className="text-white text-xs">Uploading...</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="mt-12 px-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-poppins-semibold text-primary">
            {profile?.business_name || profile?.full_name}
          </Text>
          <View className="flex-row items-center">
            <Ionicons
              name="create-outline"
              size={20}
              color="gray"
              onPress={() => router.push("/update-profile")}
            />
          </View>
        </View>
        <View className="mt-3 gap-3">
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-input items-center justify-center">
              <Ionicons name="call-outline" size={18} color="gray" />
            </View>
            <Text className="text-secondary">{profile?.phone_number}</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-input items-center justify-center">
              <Ionicons name="mail-outline" size={18} color="gray" />
            </View>
            <Text className="text-secondary">{profile?.email}</Text>
          </View>
        </View>
      </View>

      <View className="mt-6 px-3">
        <View className="bg-profile-card rounded-2xl p-4 gap-3">
          <Text className="text-primary font-poppins-medium">Quick Links</Text>
          <View className="mt-2">
            <View className="gap-1">
              {["LAUNDRY_VENDOR", "RESTAURANT_VENDOR"].includes(
                user?.user_metadata?.user_type!,
              ) && (
                <>
                  <AppLink
                    onPress={handleStoreRedirect}
                    name="Store"
                    icon={
                      <Ionicons
                        name="storefront-outline"
                        size={18}
                        color="gray"
                      />
                    }
                  />
                  <HDivider />
                </>
              )}
              {user?.user_metadata?.user_type !== "RIDER" && (
                <AppLink
                  onPress={() => router.push("/wallet")}
                  name="Wallet"
                  icon={
                    <Ionicons name="wallet-outline" size={18} color="gray" />
                  }
                />
              )}

              <HDivider />
              <AppLink
                onPress={() => router.push("/update-profile")}
                name="Update Profile"
                icon={<Ionicons name="create-outline" size={18} color="gray" />}
              />
              <HDivider />
              <AppLink
                onPress={() => router.push("/change-password")}
                name="Change Password"
                icon={<Ionicons name="key-outline" size={18} color="gray" />}
              />
              {user?.user_metadata.user_type === "DISPATCH" && (
                <>
                  <HDivider />

                  <AppLink
                    onPress={() => router.push("/dispatch")}
                    name="Riders"
                    icon={
                      <Ionicons name="bicycle-outline" size={18} color="gray" />
                    }
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      <View className="mt-6 px-3">
        <View className="bg-surface-elevated rounded-2xl p-4 gap-4">
          <Text className="text-primary font-poppins-medium">Preferences</Text>
          <View className="gap-3">
            <Text className="text-secondary">Theme</Text>
            <View className="flex-row gap-3">
              <View
                className={`px-4 py-2 rounded-xl ${
                  theme === "unspecified" ? "bg-brand-primary" : "bg-input"
                }`}
              >
                <Text
                  className={`text-sm font-poppins-medium ${
                    theme === "unspecified" ? "text-white" : "text-muted"
                  }`}
                  onPress={() => setThemeOption("unspecified")}
                >
                  System
                </Text>
              </View>
              <View
                className={`px-4 py-2 rounded-xl ${
                  theme === "light" ? "bg-brand-primary" : "bg-input"
                }`}
              >
                <Text
                  className={`text-sm font-poppins-medium ${
                    theme === "light" ? "text-white" : "text-muted"
                  }`}
                  onPress={() => setThemeOption("light")}
                >
                  Light
                </Text>
              </View>
              <View
                className={`px-4 py-2 rounded-xl ${
                  theme === "dark" ? "bg-brand-primary" : "bg-input"
                }`}
              >
                <Text
                  className={`text-sm font-poppins-medium ${
                    theme === "dark" ? "text-white" : "text-muted"
                  }`}
                  onPress={() => setThemeOption("dark")}
                >
                  Dark
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Ionicons name="radio-outline" size={20} color="gray" />
              <Text className="text-muted">Online Status</Text>
            </View>
            <View className="flex-row gap-1">
              {toggleOnlineMutation.isPending && (
                <ActivityIndicator color={"#eee"} size={"small"} />
              )}
              <Switch value={isOnline} onValueChange={handleToggle} />
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Ionicons name="location-outline" size={20} color="gray" />
              <Text className="text-muted">General Location</Text>
            </View>
            <View className="flex-row gap-1">
              <Switch
                value={!!locationWhenInUsePermission}
                onValueChange={handleForegroundToggle}
              />
            </View>
          </View>

          {(user?.user_metadata?.user_type === "RIDER" ||
            profile?.user_type === "RIDER") && (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Ionicons name="navigate-outline" size={20} color="gray" />
                <Text className="text-muted">Delivery Tracking</Text>
              </View>
              <View className="flex-row gap-1">
                <Switch
                  value={
                    Platform.OS === "ios"
                      ? !!isIosBackgroundLocationEnabled
                      : !!isAndroidBackgroundLocationEnabled
                  }
                  onValueChange={handleBackgroundToggle}
                />
              </View>
            </View>
          )}

          {["RESTAURANT_VENDOR", "LAUNDRY_VENDOR"].includes(
            user?.user_metadata?.user_type!,
          ) && (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Ionicons name="cube-outline" size={20} color="gray" />
                <Text className="text-muted">
                  {user?.user_metadata?.user_type === "RESTAURANT_VENDOR"
                    ? "Delivery"
                    : "Pickup/Delivery"}
                </Text>
              </View>
              <View className="flex-row gap-1">
                {togglePickupMutation.isPending && (
                  <ActivityIndicator color={"#eee"} size={"small"} />
                )}
                <Switch value={canPickup} onValueChange={handlePickupToggle} />
              </View>
            </View>
          )}
          <View className="h-px bg-border-subtle my-2" />
          <View className="gap-3">
            <Text className="text-primary font-poppins-medium">Support</Text>
            <View className="flex-row items-center justify-between rounded-xl px-3 py-3">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-input items-center justify-center">
                  <Ionicons name="help-circle-outline" size={20} color="gray" />
                </View>
                <Text className="text-muted">Contact Support</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="gray"
                onPress={() => Linking.openURL("mailto:support@servipal.com")}
              />
            </View>
            <View className="flex-row items-center justify-between rounded-xl px-3 py-3">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-input items-center justify-center">
                  <Ionicons name="earth-outline" size={20} color="gray" />
                </View>
                <Text className="text-muted">Help Center</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="gray"
                onPress={() =>
                  WebBrowser.openBrowserAsync("https://serv-ipal.com/support")
                }
              />
            </View>
          </View>
          <View className="h-px bg-border-subtle my-2" />
          <View className="flex-row items-center justify-between">
            <Text className="text-secondary">App Version</Text>
            <Text className="text-muted">
              {Constants.expoConfig?.version ?? "1.0.0"}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-8 px-3 pb-8 flex-row ">
        <AppButton
          text="Logout"
          color={"#aaa"}
          width="50%"
          borderRadius={50}
          variant="ghost"
          icon={<Ionicons name="log-out-outline" size={20} color="#aaa" />}
          onPress={signOut}
        />
        <AppButton
          text="Delete Account"
          color="crimson"
          width="50%"
          borderRadius={50}
          variant="ghost"
          icon={<Ionicons name="trash-outline" size={20} color="crimson" />}
          onPress={() => console.log("Account deleted")}
        />
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;

const AppLink = ({
  icon,
  name,
  onPress,
}: {
  icon: React.ReactNode;
  name: string;
  onPress: () => void;
}) => {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl px-3 py-3"
      style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
    >
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-input items-center justify-center">
          {icon}
        </View>
        <Text className="text-muted">{name}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color="gray"
        onPress={() => router.push("/change-password")}
      />
    </Pressable>
  );
};

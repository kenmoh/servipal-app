import { requestOtp } from "@/api/auth";
import {
  fetchProfileImageUrls,
  ImageData,
  updateBackgroundLocationStatus,
  uploadImage,
} from "@/api/user";
import HDivider from "@/components/HDivider";
import ProfileImagePicker from "@/components/ProfileImagePicker";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import {
  useToggleEnableReservation,
  useToggleOnlineStatus,
  useTogglePickupAndDropoff,
} from "@/hooks/status-toggle";
import { useTheme } from "@/hooks/theme-toggle";
import { useUserStore } from "@/store/userStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Sentry from "@sentry/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
    startLocationTracking,
    stopLocationTracking,
  } = useUserStore();

  const [isOnline, setIsOnline] = useState(profile?.is_online ?? false);
  const [reservationEnabled, setReservationEnabled] = useState(
    profile?.enable_reservation,
  );
  const [canPickup, setCanPickup] = useState(
    profile?.can_pickup_and_dropoff ?? false,
  );
  const [pendingTheme, setPendingTheme] = useState<"light" | "dark" | null>(
    null,
  );

  const { data } = useQuery({
    queryKey: ["user-profile-image", user?.id],
    queryFn: fetchProfileImageUrls,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const { showSuccess, showError } = useToast();
  const togglePickupMutation = useTogglePickupAndDropoff();

  const toggleOnlineMutation = useToggleOnlineStatus();
  const toggleReservation = useToggleEnableReservation();

  const { setThemeOption, theme } = useTheme();

  const queryClient = useQueryClient();

  // Sync with profile changes
  useEffect(() => {
    if (profile?.is_online !== undefined) {
      setIsOnline(profile.is_online);
    }
  }, [profile?.is_online]);

  useEffect(() => {
    if (profile?.enable_reservation !== undefined) {
      setReservationEnabled(profile.enable_reservation);
    }
  }, [profile?.enable_reservation]);

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
    // If turning off online status while having active delivery
    if (isOnline && profile?.has_delivery) {
      Alert.alert(
        "Action Required",
        "You cannot go offline while you have an active delivery. Please complete your current delivery first.",
        [{ text: "OK" }],
      );
      return;
    }

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

  // Clear optimistic pending theme once the real theme has caught up
  useEffect(() => {
    if (pendingTheme !== null && theme === pendingTheme) {
      setPendingTheme(null);
    }
  }, [theme, pendingTheme]);

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

  const requestOtpMutation = useMutation({
    mutationFn: requestOtp,
    onSuccess: (data) => {
      if (data.status === "success") {
        showSuccess("Success", data.message);
        router.push("/verify-phone");
      }
    },
    onError: (error: any) => {
      Sentry.captureException(error, { tags: { action: "request_otp" } });
      showError("Error", error.message || "OTP request failed");
    },
  });

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
        "Allow ServiPal to access your location to find the best services and display riders closest to you.",
        [
          {
            text: "Continue",
            onPress: async () => {
              try {
                const { status: requestStatus } =
                  await Location.requestForegroundPermissionsAsync();

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
                showError("Error", "Failed to request permission.");
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } catch (error) {
      showError("Error", "Failed to check permission.");
    }
  };

  const handleBackgroundToggle = async (newValue: boolean) => {
    try {
      const isRider =
        user?.user_metadata?.user_type === "RIDER" ||
        profile?.user_type === "RIDER";

      if (!newValue) {
        if (profile?.has_delivery) {
          Alert.alert(
            "Active Delivery",
            "You cannot disable delivery tracking while you have an active delivery. Please complete your current delivery first.",
            [{ text: "Cancel", style: "cancel" }],
          );
        } else if (isRider) {
          Alert.alert(
            "Cannot Disable",
            "As a rider, background location tracking must remain enabled at all times to receive delivery assignments. This cannot be disabled.",
            [{ text: "OK" }],
          );
        } else {
          Alert.alert(
            "Disable Tracking",
            "If you disable delivery tracking, you won't be able to provide real-time updates for future deliveries. You can re-enable this anytime.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Disable in Settings",
                onPress: async () => {
                  stopLocationTracking();
                  const { status: fgStatus } =
                    await Location.getForegroundPermissionsAsync();
                  const { status: bgStatus } =
                    await Location.getBackgroundPermissionsAsync();
                  await updateBackgroundLocationStatus(fgStatus, bgStatus);
                  Linking.openSettings();
                },
                style: "destructive",
              },
            ],
          );
        }
        return;
      }

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

      const { status: bgStatus, canAskAgain } =
        await Location.getBackgroundPermissionsAsync();

      // For RIDERS: Check if already granted and verify it's "Allow all the time"
      if (bgStatus === "granted") {
        const message = isRider
          ? "Background location is set to 'Allow all the time'. This is required for receiving delivery assignments and providing real-time tracking."
          : "Delivery tracking is already enabled in your device settings.";

        Alert.alert("Delivery Tracking Enabled", message, [{ text: "OK" }]);
        await checkLocationPermission();
        await startLocationTracking();
        await updateBackgroundLocationStatus(fgStatus, "granted");
        return;
      }

      if (bgStatus === "denied" && !canAskAgain) {
        const message = isRider
          ? "As a rider, you MUST enable 'Allow all the time' for background location to receive delivery assignments and provide real-time tracking.\n\nWithout this permission, you cannot work as a rider. Please enable it in your device settings."
          : "Allow ServiPal to access your location in the background only during active deliveries to provide real-time tracking and faster updates. Please enable this in your device settings.";

        Alert.alert("Action Required", message, [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]);
        return;
      }

      const message = isRider
        ? "As a rider, you MUST enable 'Allow all the time' for background location.\n\nThis is required to:\n• Receive delivery assignments\n• Provide real-time tracking to customers\n• Work as a rider\n\n⚡ Please select 'Allow all the time' in the next screen."
        : "ServiPal collects location data to enable delivery tracking even when the app is closed or not in use. This helps customers track their assigned riders.\n\nPlease select 'Allow all the time' in the next screen.";

      Alert.alert("Delivery Tracking Permission", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            const { status: requestStatus } =
              await Location.requestBackgroundPermissionsAsync();

            if (requestStatus === "granted") {
              showSuccess("Success", "Delivery tracking enabled!");
              await checkLocationPermission();
              await startLocationTracking();
              await updateBackgroundLocationStatus(fgStatus, "granted");
            } else {
              await updateBackgroundLocationStatus(fgStatus, requestStatus);
              const errorMessage = isRider
                ? Platform.OS === "android"
                  ? "As a rider, background location MUST be set to 'Allow all the time'.\n\nWithout this permission, you cannot receive delivery assignments or work as a rider.\n\nPlease update this in settings."
                  : "As a rider, background location permission MUST be set to 'Always'.\n\nWithout this permission, you cannot receive delivery assignments or work as a rider.\n\nPlease update this in your system settings."
                : Platform.OS === "android"
                  ? "Background location must be set to 'Allow all the time'. Please update this in settings."
                  : "Background location permission must be set to 'Always' in your system settings.";

              Alert.alert("Action Required", errorMessage, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Open Settings",
                  onPress: () => Linking.openSettings(),
                },
              ]);
              await checkLocationPermission();
            }
          },
        },
      ]);
    } catch (error) {
      console.error("Error in background toggle:", error);
      showError("Error", "Failed to check permission.");
    }
  };

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
            initialImage={
              data?.backdrop_image_url ||
              backdropImageUrl ||
              profile?.backdrop_image_url
            }
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
              initialImage={
                data?.profile_image_url ||
                profileImageUrl ||
                profile?.profile_image_url
              }
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
              {user?.user_metadata?.user_type === "LAUNDRY_VENDOR" && (
                <>
                  <HDivider />
                  <AppLink
                    onPress={() =>
                      router.push("/laundry-store/vendor-availability")
                    }
                    name="Set Availibility"
                    icon={<EvilIcons name="calendar" size={24} color="gray" />}
                  />
                </>
              )}

              {user?.user_metadata.user_type === "RESTAURANT_VENDOR" &&
                profile?.enable_reservation && (
                  <>
                    <HDivider />
                    <AppLink
                      onPress={() => router.push("/restaurant-reservation")}
                      name="Reservation Settings"
                      icon={
                        <EvilIcons name="calendar" size={24} color="gray" />
                      }
                    />
                  </>
                )}

              <HDivider />
              <AppLink
                onPress={() => router.push("/change-password")}
                name="Change Password"
                icon={<Ionicons name="key-outline" size={18} color="gray" />}
              />
              {profile?.account_status !== "ACTIVE" && (
                <>
                  <HDivider />
                  <AppLink
                    onPress={() => requestOtpMutation.mutate()}
                    name={
                      requestOtpMutation.isPending
                        ? "Requesting OTP..."
                        : "Verify Phone Number"
                    }
                    icon={
                      <Ionicons name="call-outline" size={18} color="gray" />
                    }
                  />
                </>
              )}
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
          {/* <View className="gap-3">
            <Text className="text-secondary">Theme</Text>
            <View className="flex-row gap-3">
              <Pressable
                className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                  theme === "light" || pendingTheme === "light" ? "bg-brand-primary" : "bg-input"
                }`}
                onPress={(e) => {
                  const { pageX, pageY } = e.nativeEvent;
                  setPendingTheme("light");
                  setThemeOption("light", pageX, pageY);
                }}
                style={({ pressed }) => [{
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  opacity: pressed ? 0.8 : 1,
                }]}
              >
                <Text
                  className={`text-sm font-poppins-medium transition-colors duration-200 ${
                    theme === "light" || pendingTheme === "light" ? "text-white" : "text-muted"
                  }`}
                >
                  Light
                </Text>
              </Pressable>
              <Pressable
                className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                  theme === "dark" || pendingTheme === "dark" ? "bg-brand-primary" : "bg-input"
                }`}
                onPress={(e) => {
                  const { pageX, pageY } = e.nativeEvent;
                  setPendingTheme("dark");
                  setThemeOption("dark", pageX, pageY);
                }}
                style={({ pressed }) => [{
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  opacity: pressed ? 0.8 : 1,
                }]}
              >
                <Text
                  className={`text-sm font-poppins-medium transition-colors duration-200 ${
                    theme === "dark" || pendingTheme === "dark" ? "text-white" : "text-muted"
                  }`}
                >
                  Dark
                </Text>
              </Pressable>
            </View>
          </View> */}

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Ionicons name="radio-outline" size={20} color="gray" />
              <Text className="text-muted">Online Status</Text>
            </View>
            <View className="flex-row gap-1">
              {toggleOnlineMutation.isPending && (
                <ActivityIndicator color={"#eee"} size={"small"} />
              )}
              <Switch
                value={isOnline}
                onValueChange={handleToggle}
                trackColor={{ false: "#ccc", true: "#FF6600" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {profile?.user_type === "RESTAURANT_VENDOR" && (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Ionicons name="radio-outline" size={20} color="gray" />
                <Text className="text-muted">Enable Reservations</Text>
              </View>
              <View className="flex-row gap-1">
                {toggleReservation.isPending && (
                  <ActivityIndicator color={"#eee"} size={"small"} />
                )}
                <Switch
                  value={reservationEnabled}
                  onValueChange={() => toggleReservation.mutate()}
                  trackColor={{ false: "#ccc", true: "#FF6600" }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          )}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Ionicons name="location-outline" size={20} color="gray" />
              <Text className="text-muted">General Location</Text>
            </View>
            <View className="flex-row gap-1">
              <Switch
                value={!!locationWhenInUsePermission}
                onValueChange={handleForegroundToggle}
                trackColor={{ false: "#ccc", true: "#FF6600" }}
                thumbColor="#fff"
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
                  trackColor={{ false: "#ccc", true: "#FF6600" }}
                  thumbColor="#fff"
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
                <Switch
                  value={canPickup}
                  onValueChange={handlePickupToggle}
                  trackColor={{ false: "#ccc", true: "#FF6600" }}
                  thumbColor="#fff"
                />
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
                  WebBrowser.openBrowserAsync(
                    "https://www.servi-pal.com/support",
                  )
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

      <View className="mt-8 px-3 pb-8 flex-row">
        <AppButton
          text="Logout"
          color={"#aaa"}
          width="100%"
          borderRadius={50}
          variant="ghost"
          icon={<Ionicons name="log-out-outline" size={20} color="#aaa" />}
          onPress={signOut}
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

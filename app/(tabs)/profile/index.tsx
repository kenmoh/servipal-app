import { ImageData, uploadImage } from "@/api/user";
import HDivider from "@/components/HDivider";
import ProfileImagePicker from "@/components/ProfileImagePicker";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import {
  useToggleOnlineStatus,
  useTogglePickupAndDropoff,
} from "@/hooks/status-toggle";
import authStorage from "@/storage/auth-storage";
import { useUserStore } from "@/store/userStore";
import { ImageUrl } from "@/types/user-types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

type themeType = "dark" | "light" | "system";
const BACKDROP_IMAGE_HEIGHT = Dimensions.get("window").height * 0.2;
const BACKDROP_IMAGE_WIDTH = Dimensions.get("window").width;

const ProfileScreen = () => {
  const { setColorScheme } = useColorScheme();
  const { user, signOut, profile, profileImageUrl, backdropImageUrl } =
    useUserStore();
  const [theme, setTheme] = useState<themeType>("dark");
  const [isOnline, setIsOnline] = useState(profile?.is_online ?? false);
  const [canPickup, setCanPickup] = useState(
    profile?.can_pickup_and_dropoff ?? false,
  );
  const [profileUri, setProfileUri] = useState<ImageUrl | null | string>(null);
  const [backdropUri, setBackdropUri] = useState<ImageUrl | null | string>(
    null,
  );

  const { showSuccess, showError } = useToast();

  const togglePickupMutation = useTogglePickupAndDropoff();

  const toggleOnlineMutation = useToggleOnlineStatus();

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
      setProfileUri(result.publicUrl);
      showSuccess("Success", "Profile picture updated!");
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
      console.log("✅ Backdrop image uploaded:", result.publicUrl);
      setBackdropUri(result.publicUrl);
      showSuccess("Success", "Backdrop image updated!");
    },
    onError: (error: any) => {
      console.error("❌ Backdrop upload failed:", error);
      showError(
        "Upload Failed",
        error.message || "Failed to upload backdrop image",
      );
    },
  });

  const handleProfileImageSelect = (imageData: ImageData) => {
    setProfileUri(imageData.uri);
    uploadProfileImageMutation(imageData);
  };

  const handleBackdropImageSelect = (imageData: ImageData) => {
    setBackdropUri(imageData.uri);
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
    const loadTheme = async () => {
      const storedTheme = await authStorage.getTheme();
      if (storedTheme) {
        setTheme(storedTheme);
        setColorScheme(storedTheme);
      } else {
        setTheme("system");
        setColorScheme("system");
      }
    };
    loadTheme();
  }, []);

  const handleThemeChange = (newTheme: themeType) => {
    setTheme(newTheme);
    setColorScheme(newTheme);
    authStorage.storeTheme(newTheme);
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
    <ScrollView className="flex-1 bg-background">
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
              <AppLink
                onPress={() => router.push("/wallet")}
                name="Wallet"
                icon={<Ionicons name="wallet-outline" size={18} color="gray" />}
              />

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
                  theme === "system" ? "bg-brand-primary" : "bg-input"
                }`}
              >
                <Text
                  className={`text-sm font-poppins-medium ${
                    theme === "system" ? "text-white" : "text-muted"
                  }`}
                  onPress={() => handleThemeChange("system")}
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
                  onPress={() => handleThemeChange("light")}
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
                  onPress={() => handleThemeChange("dark")}
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
              <Ionicons name="cube-outline" size={20} color="gray" />
              <Text className="text-muted">Can Pickup</Text>
            </View>
            <View className="flex-row gap-1">
              {togglePickupMutation.isPending && (
                <ActivityIndicator color={"#eee"} size={"small"} />
              )}
              <Switch value={canPickup} onValueChange={handlePickupToggle} />
            </View>
          </View>
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

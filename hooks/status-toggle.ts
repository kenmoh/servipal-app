// @/hooks/useToggleOnlineStatus.ts
import { useToast } from "@/components/ToastProvider";
import { useUserStore } from "@/store/userStore";
import { ToggleOnlineResponse, TogglePickupResponse } from "@/types/user-types";
import { supabase } from "@/utils/supabase";
import * as Sentry from "@sentry/react-native";
import { useMutation } from "@tanstack/react-query";



export const useToggleOnlineStatus = () => {
  const { showSuccess, showError } = useToast();
  const { profile, setProfile } = useUserStore();

  return useMutation({
    mutationFn: async () => {
      console.log("🔄 Toggling online status...");

      const { data, error } = await supabase.rpc("toggle_online_status");

      if (error) {
        throw new Error(error.message || "Failed to toggle online status");
      }

      // Data is already parsed JSON
      return data as ToggleOnlineResponse;
    },

    onSuccess: (data) => {
      console.log("✅ Online status toggled:", data.is_online);

      if (profile) {
        setProfile({
          ...profile,
          is_online: data.is_online,
          last_seen_at: data.last_seen_at,
        });
      }

      showSuccess(
        "Success",
        `You are now ${data.is_online ? "online" : "offline"}`
      );
    },

    onError: (error: Error) => {
      console.error("❌ Error toggling online status:", error);
      Sentry.captureException(error, { tags: { action: "toggle_online_status" } });
      showError("Error", error.message || "Failed to update status");
    },
  });
};



export const useTogglePickupAndDropoff = () => {
  const { showSuccess, showError } = useToast();
  const { profile, setProfile } = useUserStore();

  return useMutation({
    mutationFn: async () => {
      console.log("🔄 Toggling pickup and dropoff...");

      const { data, error } = await supabase.rpc("toggle_pickup_and_dropoff");

      if (error) {
        throw new Error(error.message || "Failed to toggle pickup preference");
      }

      // Data is already parsed JSON
      return data as TogglePickupResponse;
    },

    onSuccess: (data) => {
      console.log("✅ Pickup preference toggled:", data.can_pickup_and_dropoff);

      if (profile) {
        setProfile({
          ...profile,
          can_pickup_and_dropoff: data.can_pickup_and_dropoff,
          updated_at: data.updated_at,
        });
      }

      showSuccess(
        "Success",
        `Pickup & delivery ${data.can_pickup_and_dropoff ? "enabled" : "disabled"}`
      );
    },

    onError: (error: Error) => {
      console.error("❌ Error toggling pickup preference:", error);
      Sentry.captureException(error, { tags: { action: "toggle_pickup" } });
      showError("Error", error.message || "Failed to update preference");
    },
  });
};
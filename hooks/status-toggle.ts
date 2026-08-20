import { useToast } from "@/components/ToastProvider";
import { useUserStore } from "@/store/userStore";
import {
  EnableReservationResponse,
  ToggleOnlineResponse,
  TogglePickupResponse,
} from "@/types/user-types";
import { supabase } from "@/utils/supabase";
import * as Sentry from "@sentry/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useToggleOnlineStatus = () => {
  const { showSuccess, showError } = useToast();
  const { profile, setProfile } = useUserStore();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("toggle_online_status");

      if (error) {
        throw new Error(error.message || "Failed to toggle online status");
      }

      // Data is already parsed JSON
      return data as ToggleOnlineResponse;
    },

    onSuccess: (data) => {
      if (profile) {
        setProfile({
          ...profile,
          is_online: data.is_online,
          last_seen_at: data.last_seen_at,
        });
      }

      showSuccess(
        "Success",
        `You are now ${data.is_online ? "online" : "offline"}`,
      );
    },

    onError: (error: Error) => {
      Sentry.captureException(error, {
        tags: { action: "toggle_online_status" },
      });
      showError("Error", error.message || "Failed to update status");
    },
  });
};

export const useToggleEnableReservation = () => {
  const { showSuccess, showError } = useToast();
  const { profile, setProfile } = useUserStore();
  const queryClient = useQueryClient();

  const { data: activeCount = 0 } = useQuery({
    queryKey: ["reservation-count", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_vendor_active_reservations_count",
      );

      if (error) throw new Error(error.message);
      return data as number;
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  });

  return useMutation({
    mutationFn: async () => {
      if (activeCount > 0) {
        throw new Error(
          `You have ${activeCount} uncompleted reservation(s). Please complete or cancel them first.`,
        );
      }

      const { data, error } = await supabase.rpc("toggle_enable_reservation");

      if (error) {
        throw new Error(
          error.message || "Failed to toggle reservation setting",
        );
      }

      return data as EnableReservationResponse;
    },

    onSuccess: (data) => {
      if (profile) {
        setProfile({
          ...profile,
          enable_reservation: data.enable_reservation,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["reservation-count"] });

      showSuccess(
        "Success",
        `Reservations ${data.enable_reservation ? "enabled" : "disabled"}`,
      );
    },

    onError: (error: Error) => {
      if (error.message.includes("uncompleted reservation")) {
        showError("Cannot Toggle", error.message);
      } else {
        Sentry.captureException(error, {
          tags: { action: "toggle_enable_reservation" },
        });
        showError(
          "Error",
          error.message || "Failed to update reservation status",
        );
      }
    },
  });
};

export const useTogglePickupAndDropoff = () => {
  const { showSuccess, showError } = useToast();
  const { profile, setProfile } = useUserStore();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("toggle_pickup_and_dropoff");

      if (error) {
        throw new Error(error.message || "Failed to toggle pickup preference");
      }

      // Data is already parsed JSON
      return data as TogglePickupResponse;
    },

    onSuccess: (data) => {
      if (profile) {
        setProfile({
          ...profile,
          can_pickup_and_dropoff: data.can_pickup_and_dropoff,
          updated_at: data.updated_at,
        });
      }

      showSuccess(
        "Success",
        `Pickup & delivery ${data.can_pickup_and_dropoff ? "enabled" : "disabled"}`,
      );
    },

    onError: (error: Error) => {
      Sentry.captureException(error, { tags: { action: "toggle_pickup" } });
      showError("Error", error.message || "Failed to update preference");
    },
  });
};

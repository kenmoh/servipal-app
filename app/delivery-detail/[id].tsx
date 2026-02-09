import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

import {
  acceptDeliveryOrder,
  cancelDeliveryByRider,
  cancelDeliveryBySender,
  declineDeliveryOrder,
  getDeliveryDetailsById,
  markDeliveryCompleted,
  markDeliveryDelivered,
  pickupDeliveryOrder,
} from "@/api/delivery";
import {
  startDeliveryTracking,
  stopDeliveryTracking,
} from "@/utils/location-tracking";
import { supabase } from "@/utils/supabase";
import Entypo from "@expo/vector-icons/Entypo";

import DeliveryWrapper from "@/components/DeliveryWrapper";
import LoadingIndicator from "@/components/LoadingIndicator";
import RiderProfile from "@/components/RiderProfile";
import { Status } from "@/components/Status";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useLocationStore } from "@/store/locationStore";
import { useUserStore } from "@/store/userStore";
import Feather from "@expo/vector-icons/Feather";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Sentry from "@sentry/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";

import { blurhash } from "@/constants/state";
import { Image } from "expo-image";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

const cancelSchema = z.object({
  orderId: z.string(),
  cancelReason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be less than 500 characters"),
});

type CancelFormData = z.infer<typeof cancelSchema>;

const ItemDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useColorScheme();
  const { user } = useUserStore();
  const { setOrigin, setDestination } = useLocationStore();
  const { showError, showSuccess, showInfo, showWarning } = useToast();
  const [modalVisible, setModalVisible] = React.useState(false);
  const isMountedRef = useRef(true);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const riderProfileRef = useRef<BottomSheet>(null);

  const HANDLE_INDICATOR_STYLE =
    theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK;
  const HANDLE_STYLE = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const TEXT = theme === "dark" ? "#fff" : "#aaa";

  const openSheet = () => bottomSheetRef.current?.snapToIndex(1);
  const closeSheet = () => bottomSheetRef.current?.close();
  const viewRiderProfile = () => riderProfileRef.current?.snapToIndex(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getDeliveryDetailsById(id as string),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!id && id !== "[id]",
  });

  // Coordinate normalization: ensure [lat, lng]
  const normalizeCoords = (coords: any): [number, number] | null => {
    if (!coords || !Array.isArray(coords) || coords.length < 2) return null;
    const [c1, c2] = coords;

    if (c1 < c2 && c2 > 5.5 && c1 < 5) {
      console.log("🔄 Swapping coordinates [lng, lat] -> [lat, lng]:", coords);
      return [c2, c1];
    }
    return [c1, c2];
  };

  useEffect(() => {
    if (data) {
      if (data.pickup_location && data.pickup_coordinates) {
        const normalized = normalizeCoords(data.pickup_coordinates);
        if (normalized) {
          setOrigin(data.pickup_location, normalized);
        }
      }

      if (data.destination && data.dropoff_coordinates) {
        const normalized = normalizeCoords(data.dropoff_coordinates);
        if (normalized) {
          setDestination(data.destination, normalized);
        }
      }
    }
  }, [data, setOrigin, setDestination]);

  const {
    control,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CancelFormData>({
    resolver: zodResolver(cancelSchema),
    mode: "onChange",
    defaultValues: {
      cancelReason: "",
      orderId: data?.id,
    },
  });

  const isPickedUp =
    data?.delivery_status === "PICKED_UP" ||
    data?.delivery_status === "IN_TRANSIT" ||
    data?.delivery_status === "DELIVERED" ||
    data?.delivery_status === "COMPLETED";

  const queryClient = useQueryClient();

  const confirmReceivedMutation = useMutation({
    mutationFn: () => markDeliveryCompleted(data?.tx_ref!),
    onSuccess: async () => {
      // Invalidate queries first
      await queryClient.invalidateQueries({
        queryKey: ["order", data?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", user?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", data?.sender_id],
      });
      await queryClient.invalidateQueries({ queryKey: ["riders", user?.id] });

      // Wait for refetch to complete
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["order", id] }),
        queryClient.refetchQueries({ queryKey: ["user-orders", user?.id] }),
      ]);
      refetch();

      // Then navigate and show success
      showSuccess("Success", "Delivery confirmed and received.");
      refetch();
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const acceptDeliveryMutation = useMutation({
    mutationFn: () => acceptDeliveryOrder(data?.tx_ref!),
    onSuccess: async (_, deliveryId) => {
      Sentry.addBreadcrumb({
        message: "Delivery accepted successfully",
        category: "delivery",
        level: "info",
        data: { orderId: data?.id },
      });

      // Invalidate queries first
      await queryClient.invalidateQueries({
        queryKey: ["order", data?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", user?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", data?.sender_id],
      });

      // Wait for refetch to complete
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["order", id] }),
        queryClient.refetchQueries({ queryKey: ["user-orders", user?.id] }),
        queryClient.refetchQueries({ queryKey: ["riders", user?.id] }),
      ]);
      refetch();

      // Start tracking
      await startDeliveryTracking(data?.id!, user?.id!);

      // Then navigate and show success
      showSuccess(
        "Success",
        "This order has been assigned to you. Drive carefully!",
      );
      // router.back();
    },
    onError: (error: Error) => {
      showError("Error", error.message);
      Sentry.captureException(error, {
        extra: {
          orderId: data?.id,
          action: "accept_delivery",
        },
        tags: {
          feature: "delivery-management",
        },
      });
    },
  });

  const pickupDeliveryMutation = useMutation({
    mutationFn: () => pickupDeliveryOrder(data?.tx_ref!),
    onSuccess: async (_, deliveryId) => {
      Sentry.addBreadcrumb({
        message: "Delivery pickup confirmed",
        category: "delivery",
        level: "info",
        data: { orderId: data?.id },
      });

      // Invalidate queries first
      await queryClient.invalidateQueries({
        queryKey: ["order", data?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", user?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", data?.sender_id],
      });

      // Wait for refetch to complete
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["order", id] }),
        queryClient.refetchQueries({ queryKey: ["user-orders", user?.id] }),
      ]);

      refetch();
      // Start tracking
      await startDeliveryTracking(data?.id!, user?.id!);

      // router.back();
    },
    onError: (error: Error) => {
      showError("Error", error.message);
      Sentry.captureException(error, {
        extra: {
          orderId: data?.id,
          action: "pickup_delivery",
        },
        tags: {
          feature: "delivery-management",
        },
      });
    },
  });

  const declineBookingMutation = useMutation({
    mutationFn: () => declineDeliveryOrder(data?.tx_ref!),
    onSuccess: async (_, orderId) => {
      Sentry.addBreadcrumb({
        message: "Booking declined",
        category: "delivery",
        level: "info",
        data: { orderId: data?.id },
      });

      // Invalidate queries first
      await queryClient.invalidateQueries({
        queryKey: ["order", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", user?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", data?.sender_id],
      });
      await queryClient.invalidateQueries({ queryKey: ["riders", user?.id] });

      // Wait for refetch to complete
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["order", id] }),
        queryClient.refetchQueries({ queryKey: ["user-orders", user?.id] }),
        queryClient.refetchQueries({ queryKey: ["riders", user?.id] }),
      ]);

      refetch();

      // Then navigate and show warning
      showWarning("Decline", "Booking declined!");
      // router.back();
    },
    onError: (error: Error) => {
      showError("Error", error.message);
      Sentry.captureException(error, {
        extra: {
          orderId: data?.id,
          action: "decline_booking",
        },
        tags: {
          feature: "delivery-management",
        },
      });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: () => markDeliveryDelivered(data?.tx_ref!),
    onSuccess: async (_, deliveryId) => {
      Sentry.addBreadcrumb({
        message: "Delivery marked as delivered",
        category: "delivery",
        level: "info",
        data: { orderId: data?.id },
      });

      // Invalidate queries first
      await queryClient.invalidateQueries({
        queryKey: ["order", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", user?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", data?.sender_id],
      });

      // Wait for refetch to complete
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["order", id] }),
        queryClient.refetchQueries({ queryKey: ["user-orders", user?.id] }),
      ]);
      refetch();

      // Stop tracking and clear location
      stopDeliveryTracking();
      useLocationStore.getState().clearRiderLocation();

      // Then navigate and show success
      showSuccess("Success", "Item delivered.");
      // router.back();
    },
    onError: (error: Error) => {
      showError("Error", error.message);
      Sentry.captureException(error, {
        extra: {
          orderId: data?.id,
          action: "mark_delivered",
        },
        tags: {
          feature: "delivery-management",
        },
      });
    },
  });

  const cancelDeliveryMutation = useMutation({
    mutationFn: (formData: { orderId: string; reason?: string }) => {
      // Use 'data' from the component scope (the order details), not the mutation argument
      const isRider =
        user?.user_metadata?.user_type === "RIDER" ||
        user?.id === data?.rider_id;

      if (isRider) {
        return cancelDeliveryByRider(
          formData.orderId,
          formData.reason || "No reason provided",
        );
      } else {
        return cancelDeliveryBySender(
          formData.orderId,
          formData.reason || "No reason provided",
        );
      }
    },
    onSuccess: async () => {
      Sentry.addBreadcrumb({
        message: "Delivery cancelled",
        category: "delivery",
        level: "info",
        data: { orderId: data?.id },
      });

      // Invalidate queries first
      await queryClient.invalidateQueries({
        queryKey: ["order", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", user?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", data?.sender_id],
      });

      // Wait for refetch to complete
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["order", id] }),
        queryClient.refetchQueries({ queryKey: ["user-orders", user?.id] }),
      ]);

      refetch();

      // Then navigate and show info
      showInfo("Delivery cancelled!");
      router.back();
    },
    onError: (error: Error) => {
      showError("Error", error.message);
      Sentry.captureException(error, {
        extra: {
          orderId: data?.id,
          action: "cancel_delivery",
        },
        tags: {
          feature: "delivery-management",
        },
      });
    },
  });

  const openAlert = async () => {
    // Check validation if it's a rider
    const isRider =
      user?.user_metadata?.user_type === "RIDER" || user?.id === data?.rider_id;

    if (isRider) {
      const isValid = await trigger(); // Validate all fields
      if (!isValid) {
        showError(
          "Validation Error",
          "Please fill in a valid reason (10+ characters).",
        );
        return;
      }
    }

    const formData = getValues();
    const isSender = user?.id === data?.sender_id;

    // Different warning messages
    const warningMessage = isSender
      ? "Are you sure you want to cancel this order? If it's already picked up, it will be returned."
      : "Cancelling this order will suspend you and affect your completion rate. Are you sure?";

    Alert.alert("Confirm Cancellation", warningMessage, [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: () => {
          // Both sender and rider now pass a reason
          cancelDeliveryMutation.mutate({
            orderId: formData.orderId,
            reason: formData.cancelReason,
          });
          closeSheet();
        },
      },
    ]);
  };

  const onSubmit = (formData: CancelFormData) => {
    // Direct submission logic if needed, but we essentially use openAlert which triggers mutate.
    // However, in case this is called directly:
    cancelDeliveryMutation.mutate({
      orderId: formData.orderId,
      reason: formData.cancelReason,
    });
    closeSheet();
  };

  // Supabase Realtime subscription
  useEffect(() => {
    if (!id || !isMountedRef.current) return;

    console.log("🔌 Setting up Realtime for order:", id);
    const channel = supabase
      .channel(`delivery_order_${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_orders",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          // Update TanStack Query cache
          queryClient.setQueryData(["order", id], (oldData: any) => {
            const updated = {
              ...oldData,
              ...payload.new,
              order_number: Number(payload.new.order_number),
            };
            return updated;
          });

          // Handle location tracking
          const coords = payload.new.last_known_rider_coordinates;
          if (coords) {
            // Ensure coordinates are [lat, lng]
            const normalized = normalizeCoords(coords);
            if (normalized) {
              useLocationStore.getState().setRiderLocation(id, normalized);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (data?.id) {
      setValue("orderId", data.id);
    }
  }, [data?.id, setValue]);

  useEffect(() => {
    if (!data?.id || !data?.last_known_rider_coordinates) return;

    const normalized = normalizeCoords(data.last_known_rider_coordinates);
    if (!normalized) return;

    useLocationStore.getState().setRiderLocation(data.id, normalized);
  }, [data?.id, data?.last_known_rider_coordinates]);

  const getActionButton = () => {
    if (!data || !user) return null;

    const isSender = user.id === data.sender_id;
    const isAssignedRider = user.id === data.rider_id;
    const isDispatch = data.dispatch_id && user.id === data.dispatch_id;
    const isRiderAccount = user.user_metadata?.user_type === "RIDER";

    // 1. Rider: Accept or Decline (pending + assigned)
    if (
      (data?.delivery_status === "PAID_NEEDS_RIDER" ||
        data?.delivery_status === "ASSIGNED") &&
      (isAssignedRider || isRiderAccount) &&
      !isSender
    ) {
      return [
        {
          label: "Accept",
          onPress: () => acceptDeliveryMutation.mutate(),
          loading: acceptDeliveryMutation.isPending,
        },
        {
          label: "Decline",
          onPress: () => declineBookingMutation.mutate(),
          loading: declineBookingMutation.isPending,
          variant: "outline" as const,
        },
      ];
    }

    // 2. Rider: Pickup item (after accepting)
    if (data?.delivery_status === "ACCEPTED" && isAssignedRider && !isSender) {
      return {
        label: "Confirm Pickup",
        onPress: () => pickupDeliveryMutation.mutate(),
        loading: pickupDeliveryMutation.isPending,
      };
    }

    // 3. Rider: Mark as Delivered (after pickup)
    if (
      (data?.delivery_status === "PICKED_UP" ||
        data?.delivery_status === "IN_TRANSIT") &&
      (isAssignedRider || isDispatch)
    ) {
      return {
        label: "Mark as Delivered",
        onPress: () => markDeliveredMutation.mutate(),
        loading: markDeliveredMutation.isPending,
      };
    }

    // 4. Sender: Confirm Received (when rider marks delivered)
    if (data?.delivery_status === "DELIVERED" && isSender) {
      return {
        label: "Confirm Received",
        onPress: () => confirmReceivedMutation.mutate(),
        loading: confirmReceivedMutation.isPending,
      };
    }

    // 5. Final state: Order completed
    if (data?.delivery_status === "COMPLETED") {
      return {
        label: "Order Completed",
        disabled: true,
      };
    }

    return null;
  };

  const actionButton = getActionButton();
  const showCancel =
    (user?.id === data?.sender_id || user?.id === data?.rider_id) &&
    ["ACCEPTED", "PAID_NEEDS_RIDER", "ASSIGNED"].includes(
      data?.delivery_status as string,
    );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  const showReview = () => {
    router.push({
      pathname: "/review/[id]",
      params: {
        id: data?.id as string,
        revieweeId: data?.rider_id as string,
        dispatchId: data?.dispatch_id as string,
        orderId: data?.id as string,
        orderType: data?.delivery_type as string,
        reviewType: "rider",
      },
    });
  };

  return (
    <>
      {data?.id ? (
        <DeliveryWrapper id={data?.id!} isPickedUp={isPickedUp}>
          {user?.id === data.sender_id &&
            data?.rider_id &&
            data?.delivery_status !== "PAID_NEEDS_RIDER" &&
            data?.delivery_status !== "COMPLETED" && (
              <View className="self-center w-full justify-center items-center">
                <AppButton
                  icon={<Feather name="user" color="orange" />}
                  width={"50%"}
                  borderRadius={50}
                  text="Contact Rider"
                  onPress={viewRiderProfile}
                />
              </View>
            )}

          <View className="my-5 w-[95%] self-center bg-background h-[100%] flex-1 px-5">
            <View className="gap-5">
              <View className="gap-5 items-baseline justify-between flex-row">
                <Text className="text-primary font-semibold text-[12px] mb-5">
                  ORDER DETAILS
                </Text>

                {showCancel && (
                  <TouchableOpacity onPress={openSheet} className="self-start">
                    <Text className="text-red-500 self-start bg-red-500/30 rounded-full px-5 py-2 font-poppins-semibold text-sm mb-5">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                )}

                <Status status={data?.delivery_status} />
              </View>
              <View className="flex-row justify-between">
                <View className="flex-row gap-3">
                  <Feather name="info" color="orange" size={15} />

                  <Text className="font-normal text-primary text-sm font-poppins-light">
                    Order ID
                  </Text>
                </View>
                <Text className="font-poppins-semibold text-primary text-sm">
                  #ORDN{data?.order_number}
                </Text>
              </View>
              <View className="gap-3 flex-row  justify-between">
                <View className="flex-row gap-3">
                  <Entypo name="wallet" color="orange" size={15} />

                  <Text className="font-poppins-light text-primary text-sm">
                    Delivery fee(After commission)
                  </Text>
                </View>
                <Text className="font-[500] text-primary text-[12px] font-poppins-semibold">
                  ₦ {Number(data?.amount_due_dispatch).toFixed(2)}
                </Text>
              </View>
              {(user?.id === data?.sender_id ||
                user?.id === data?.rider_id ||
                user?.id === data?.dispatch_id) && (
                <>
                  <View className="flex-row justify-between">
                    <View className="flex-row gap-3">
                      <Feather name="phone-call" color="orange" size={15} />
                      <Text className="font-poppins-light text-primary text-sm">
                        Sender Phone
                      </Text>
                    </View>
                    <Text className="font-[500] text-primary text-[12px] font-poppins-semibold">
                      {data?.sender_phone_number}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <View className="flex-row gap-3">
                      <Feather name="phone-call" color="orange" size={15} />
                      <Text className="font-poppins-light text-primary text-sm">
                        Receiver Phone
                      </Text>
                    </View>
                    <Text className="font-[500] text-primary text-[12px] font-poppins-semibold">
                      {data?.receiver_phone}
                    </Text>
                  </View>
                </>
              )}

              <View>
                <View className="flex-row gap-3">
                  <Feather name="map-pin" color="orange" size={15} />

                  <Text className="font-poppins-light text-primary text-sm">
                    Delivery Address
                  </Text>
                </View>
                <Text className=" mx-7 text-xs text-muted font-poppins-light">
                  {data?.destination}
                </Text>
              </View>

              <View className="flex-row gap-3">
                <Feather name="alert-triangle" color="orange" size={15} />
                <Text className="font-poppins-light text-wrap text-xs text-yellow-500">
                  Before leaving, both the sender and rider should confirm the
                  item’s content and condition together.
                </Text>
              </View>
              <Text
                onPress={() => setModalVisible(true)}
                className=" underline mx-7 text-blue-400 text-sm font-poppins-light"
              >
                View Image
              </Text>
            </View>
            <View className="justify-center w-full items-center gap-3 self-center mt-4">
              {actionButton && (
                <>
                  {Array.isArray(actionButton) ? (
                    // Accept + Decline buttons
                    <View className="flex-row gap-3 w-full px-5">
                      {actionButton.map((btn, index) => (
                        <AppButton
                          key={index}
                          borderRadius={50}
                          text={btn.label}
                          color={index === 0 ? "orange" : "#FF5C5C"}
                          textColor={index === 0 ? "#fff" : "#FF5C5C"}
                          variant={index === 0 ? "fill" : "outline"}
                          icon={
                            btn.loading && (
                              <ActivityIndicator
                                color={index === 0 ? "#fff" : "orange"}
                              />
                            )
                          }
                          width={"48%"}
                          onPress={btn.onPress}
                          disabled={btn.loading}
                        />
                      ))}
                    </View>
                  ) : (
                    // Single action button
                    <AppButton
                      borderRadius={50}
                      text={actionButton.label}
                      variant="fill"
                      backgroundColor={
                        actionButton.disabled ||
                        data?.delivery_status === "COMPLETED"
                          ? "rgba(0,0,0,0.3)"
                          : "orange"
                      }
                      icon={
                        actionButton.loading && (
                          <ActivityIndicator color="#fff" />
                        )
                      }
                      width={"90%"}
                      onPress={actionButton.onPress}
                      disabled={actionButton.disabled || actionButton.loading}
                    />
                  )}
                </>
              )}
            </View>

            {/* Additional Action Buttons */}
            <View className="flex-row w-[90%] self-center justify-between mt-4 mb-8 gap-2">
              {/* Review Button - Hide for package deliveries */}
              {data?.delivery_status === "COMPLETED" &&
                (data?.rider_id !== user?.id ||
                  data?.dispatch_id !== user?.id) && (
                  <AppButton
                    text="Review"
                    borderRadius={50}
                    color={"orange-500"}
                    width="32%"
                    onPress={showReview}
                  />
                )}

              {/* Report Button - Show for all delivery types */}
              {(data?.delivery_status === "COMPLETED" ||
                data?.delivery_status === "DELIVERED") && (
                <AppButton
                  text="Dispute"
                  color={"orange"}
                  borderRadius={50}
                  width="32%"
                  onPress={() => {
                    router.push({
                      pathname: "/report/[id]",
                      params: { id: id as string },
                    });
                  }}
                />
              )}

              {user?.user_metadata?.user_type === "RIDER" ||
              user?.user_metadata?.user_type === "DISPATCH" ? (
                ""
              ) : (
                <AppButton
                  text="Receipt"
                  color={"orange"}
                  borderRadius={50}
                  variant="outline"
                  disabled={
                    data?.rider_id === user?.id ||
                    data?.dispatch_id === user?.id
                      ? true
                      : false
                  }
                  width={"32%"}
                  onPress={() => {
                    router.push({
                      pathname: "/receipt/[id]",
                      params: { id: id as string },
                    });
                  }}
                />
              )}
            </View>
          </View>
        </DeliveryWrapper>
      ) : (
        <View className="flex-1 justify-center items-center p-5">
          <Text className="text-red-500">Order not found</Text>
        </View>
      )}

      <BottomSheet
        index={-1}
        snapPoints={["60%"]}
        ref={bottomSheetRef}
        enablePanDownToClose={true}
        enableDynamicSizing={true}
        handleIndicatorStyle={{ backgroundColor: HANDLE_INDICATOR_STYLE }}
        handleStyle={{ backgroundColor: HANDLE_STYLE }}
        backgroundStyle={{
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          backgroundColor: BG_COLOR,
          shadowColor: "orange",
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 20,
        }}
      >
        <BottomSheetView
          style={{ backgroundColor: BG_COLOR, padding: 16, flex: 1 }}
        >
          <View className="hidden">
            <Controller
              control={control}
              name="orderId"
              render={({ field: { onChange, value } }) => (
                <AppTextInput value={data?.id || value} onChange={onChange} />
              )}
            />
          </View>
          <View className="mb-5">
            <Controller
              control={control}
              name="cancelReason"
              render={({ field: { onChange, value } }) => (
                <View className="w-[90%] self-center">
                  <AppTextInput
                    value={data?.id || value}
                    onChange={onChange}
                    placeholder="Please describe the issue in detail..."
                    className="bg-input"
                    multiline
                    style={{
                      alignSelf: "center",
                      width: "100%",
                    }}
                  />
                  <Text className="font-poppins-light text-red-400 text-xs">
                    {errors.cancelReason?.message}
                  </Text>
                </View>
              )}
            />
          </View>

          <AppButton
            text="Cancel Booking"
            width={"90%"}
            onPress={openAlert}
            color="primary"
          />
        </BottomSheetView>
      </BottomSheet>
      <RiderProfile
        ref={riderProfileRef}
        riderId={data?.rider_id!}
        showButton={false}
      />
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          style={StyleSheet.absoluteFillObject}
          className="bg-black/90 items-center justify-center"
        >
          <View
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
            style={{ height: IMAGE_HEIGHT, width: "100%" }}
            className="self-center"
          >
            <Image
              source={data?.package_image_url!}
              placeholder={blurhash}
              contentFit="cover"
              transition={100}
              style={{
                width: "100%",
                height: IMAGE_HEIGHT,
                resizeMode: "cover",
              }}
            />
          </View>
          <View className="my-6 self-start px-5">
            <Text className="text-primary font-poppins">Description</Text>
            <Text className="text-sm text-muted font-poppins">
              {data?.additional_info || data?.package_name}
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};
const IMAGE_HEIGHT = Dimensions.get("window").height * 0.4;
export default ItemDetails;

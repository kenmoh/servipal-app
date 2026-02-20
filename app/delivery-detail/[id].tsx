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

import { getDeliveryDetailsById, updateDeliveryStatus } from "@/api/delivery";
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
import { getDeliveryButtonConfig } from "@/utils/deliveryButtonConfig";
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

  const openSheet = () => bottomSheetRef.current?.snapToIndex(1);
  const closeSheet = () => bottomSheetRef.current?.close();
  const viewRiderProfile = () => riderProfileRef.current?.snapToIndex(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["delivery-order", id],
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

  const isPickedUp = ["PICKED_UP", "IN_TRANSIT"].includes(
    data?.delivery_status as string,
  );

  const showCancel =
    (user?.id === data?.sender_id || user?.id === data?.rider_id) &&
    (data?.delivery_status === "PENDING" ||
      data?.delivery_status === "ASSIGNED" ||
      data?.delivery_status === "ACCEPTED");

  const queryClient = useQueryClient();

  // ============================================================
  // NEW: UNIFIED STATUS UPDATE MUTATION
  // ============================================================
  const updateDeliveryMutation = useMutation({
    mutationFn: ({
      txRef,
      newStatus,
      reason,
      riderId,
    }: {
      txRef: string;
      newStatus: string;
      reason?: string;
      riderId?: string;
    }) => updateDeliveryStatus(txRef, newStatus, riderId, reason),
    onSuccess: async () => {
      // Invalidate and refetch
      (refetch(),
        queryClient.invalidateQueries({ queryKey: ["delivery-order", id] }));
      queryClient.invalidateQueries({
        queryKey: ["user-orders", user?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["riders", user?.id] });
      queryClient.invalidateQueries({
        queryKey: ["user-delivery-orders", user?.id],
      });

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["delivery-order", id] }),
        queryClient.refetchQueries({
          queryKey: ["user-delivery-orders", user?.id],
        }),
      ]);
      Sentry.addBreadcrumb({
        message: "Delivery status updated",
        category: "delivery",
        level: "info",
        data: { orderId: data?.id, newStatus: data?.delivery_status },
      });

      // Handle tracking
      if (
        data?.delivery_status === "PICKED_UP" ||
        data?.delivery_status === "ACCEPTED"
      ) {
        startDeliveryTracking(data?.id!, user?.id!);
      } else if (
        data?.delivery_status === "DELIVERED" ||
        data?.delivery_status === "COMPLETED"
      ) {
        stopDeliveryTracking();
        useLocationStore.getState().clearRiderLocation();
      }

      // Success message
      const messages: Record<string, string> = {
        ACCEPTED: "Delivery accepted successfully!",
        PICKED_UP: "Package picked up successfully!",
        IN_TRANSIT: "Marked as in transit",
        DELIVERED: "Marked as delivered",
        COMPLETED: "Delivery completed and payment released",
        CANCELLED: data?.requires_return
          ? "Delivery cancelled - rider will return the package"
          : "Delivery cancelled successfully",
      };

      showSuccess(
        "Success",
        messages[data?.delivery_status as string] ||
          "Status updated successfully",
      );

      // Navigate back on completion
      if (data?.delivery_status === "COMPLETED") {
        setTimeout(() => router.back(), 1500);
      }
    },
    onError: (error: Error) => {
      showError("Error", error.message);
      Sentry.captureException(error, {
        extra: { orderId: data?.id, action: "update_delivery_status" },
        tags: { feature: "delivery-management" },
      });
    },
  });

  // ============================================================
  // STATUS UPDATE HANDLER
  // ============================================================
  const handleStatusUpdate = (newStatus: string, reason?: string) => {
    if (!data?.id) return;

    updateDeliveryMutation.mutate({
      txRef: data.tx_ref!,
      newStatus,
      riderId: data.rider_id!,
      reason,
    });
  };

  // ============================================================
  // BUTTON CONFIGURATION
  // ============================================================
  const getSmartActionButton = () => {
    if (!data || !user) return null;

    const isSender = user.id === data.sender_id;
    const isRider = user.id === data.rider_id;

    const userRole = isSender ? "SENDER" : isRider ? "RIDER" : null;
    if (!userRole) return null;

    const config = getDeliveryButtonConfig(
      data.delivery_status as any,
      userRole,
    );
    if (!config) return null;

    const handleAction = (btnConfig: any) => {
      // NAVIGATION LOGIC FOR "Assign Rider"
      if (
        btnConfig.text === "Assign Rider" &&
        btnConfig.nextStatus === "ASSIGNED"
      ) {
        // Redirect to riders screen
        router.push({
          pathname: "/(tabs)/delivery/riders",
          params: {
            txRef: data.tx_ref,
            paymentStatus: "PAID",
          },
        });
        return;
      }

      if (btnConfig.requiresReason) {
        // Show cancellation sheet
        openSheet();
      } else {
        // Show confirmation dialog for other actions
        Alert.alert(
          "Confirm Action",
          `${btnConfig.text}?${btnConfig.warningMessage ? "\n\n" + btnConfig.warningMessage : ""}`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Confirm",
              onPress: () => handleStatusUpdate(btnConfig.nextStatus!),
            },
          ],
        );
      }
    };

    return {
      primary: config.primary,
      secondary: config.secondary,
      handleAction,
      isPrimaryLoading:
        updateDeliveryMutation.isPending &&
        updateDeliveryMutation.variables?.newStatus ===
          config.primary?.nextStatus,
      isSecondaryLoading:
        updateDeliveryMutation.isPending &&
        updateDeliveryMutation.variables?.newStatus ===
          config.secondary?.nextStatus,
    };
  };

  // ============================================================
  // CANCEL DIALOG HANDLER
  // ============================================================
  const openAlert = async () => {
    const isValid = await trigger();
    if (!isValid) {
      showError(
        "Validation Error",
        "Please provide a reason (10+ characters).",
      );
      return;
    }

    const formData = getValues();
    const isSender = user?.id === data?.sender_id;

    const warningMessage =
      isPickedUp && isSender
        ? "⚠️ Package is in transit. Rider will return it and still be paid for the trip."
        : isSender
          ? "Are you sure you want to cancel this delivery?"
          : "Cancelling will affect your completion rate. Continue?";

    Alert.alert("Confirm Cancellation", warningMessage, [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: () => {
          handleStatusUpdate("CANCELLED", formData.cancelReason);
          closeSheet();
        },
      },
    ]);
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

          queryClient.setQueryData(["order", id], (oldData: any) => {
            const updated = {
              ...oldData,
              ...payload.new,
              order_number: Number(payload.new.order_number),
            };
            return updated;
          });

          const coords = payload.new.last_known_rider_coordinates;
          if (coords) {
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

  const smartButton = getSmartActionButton();
  // const specialButtons = getSpecialButtons(); // Removed in favor of config

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
        orderType: "DELIVERY",
      },
    });
  };

  return (
    <>
      {data?.id ? (
        <DeliveryWrapper id={data?.id!} isPickedUp={isPickedUp}>
          {user?.id === data.sender_id &&
            data?.rider_id &&
            data?.delivery_status !== "PENDING" &&
            data?.delivery_status !== "COMPLETED" && (
              <View className="self-center w-full justify-center items-center">
                <AppButton
                  icon={<Feather name="user" color="orange" size={22} />}
                  width={"50%"}
                  variant="outline"
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
                  #ORDN-{data?.order_number}
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
                  item's content and condition together.
                </Text>
              </View>
              <Text
                onPress={() => setModalVisible(true)}
                className=" underline mx-7 text-blue-400 text-sm font-poppins-light"
              >
                View Image
              </Text>
            </View>

            {/* ============================================================ */}
            {/* ACTION BUTTONS */}
            {/* ============================================================ */}
            <View className="justify-center w-full items-center gap-3 self-center mt-4">
              {smartButton ? (
                <View
                  className={`w-full items-center ${
                    smartButton.primary && smartButton.secondary
                      ? "flex-row justify-between"
                      : "gap-3"
                  }`}
                >
                  {/* Primary Button */}
                  {smartButton.primary && (
                    <AppButton
                      borderRadius={50}
                      text={smartButton.primary.text}
                      variant="fill"
                      color={
                        smartButton.primary.disabled
                          ? "rgba(0,0,0,0.3)"
                          : smartButton.primary.color
                      }
                      textColor={smartButton.primary.textColor}
                      icon={
                        smartButton.isPrimaryLoading ? (
                          <ActivityIndicator
                            color={smartButton.primary.textColor || "#fff"}
                          />
                        ) : (
                          smartButton.primary.icon
                        )
                      }
                      width={
                        smartButton.primary && smartButton.secondary
                          ? "48%"
                          : "100%"
                      }
                      onPress={() =>
                        smartButton.handleAction(smartButton.primary!)
                      }
                      disabled={
                        smartButton.primary.disabled ||
                        smartButton.isPrimaryLoading
                      }
                    />
                  )}

                  {/* Secondary Button */}
                  {smartButton.secondary && (
                    <AppButton
                      borderRadius={50}
                      text={smartButton.secondary.text}
                      variant={smartButton.secondary.variant || "outline"}
                      backgroundColor="transparent"
                      textColor={smartButton.secondary.color}
                      color={smartButton.secondary.color}
                      icon={
                        smartButton.isSecondaryLoading ? (
                          <ActivityIndicator
                            color={smartButton.secondary.color}
                          />
                        ) : (
                          smartButton.secondary.icon
                        )
                      }
                      width={
                        smartButton.primary && smartButton.secondary
                          ? "48%"
                          : "100%"
                      }
                      onPress={() =>
                        smartButton.handleAction(smartButton.secondary!)
                      }
                      disabled={
                        smartButton.secondary.disabled ||
                        smartButton.isSecondaryLoading
                      }
                    />
                  )}
                </View>
              ) : null}
            </View>

            {/* Additional Action Buttons */}
            <View className="flex-row w-[90%] self-center justify-between mt-4 mb-8 gap-2">
              {data?.rider_id !== user?.id && (
                <AppButton
                  text="Review"
                  borderRadius={50}
                  color="orange"
                  width="32%"
                  onPress={showReview}
                  disabled={data?.delivery_status !== "COMPLETED"}
                  variant={
                    data?.delivery_status !== "COMPLETED" ? "outline" : "fill"
                  }
                />
              )}

              <AppButton
                text="Dispute"
                color={"orange"}
                borderRadius={50}
                width="32%"
                onPress={() => {
                  router.push({
                    pathname: "/report/[id]",
                    params: {
                      id: id as string,
                      orderType: "DELIVERY",
                      respondentId: data?.rider_id,
                    },
                  });
                }}
                disabled={
                  !(
                    data?.delivery_status === "COMPLETED" ||
                    data?.delivery_status === "DELIVERED"
                  )
                }
                variant={
                  !(
                    data?.delivery_status === "COMPLETED" ||
                    data?.delivery_status === "DELIVERED"
                  )
                    ? "outline"
                    : "fill"
                }
              />

              {user?.user_metadata?.user_type !== "RIDER" &&
                user?.user_metadata?.user_type !== "DISPATCH" && (
                  <AppButton
                    text="Receipt"
                    color={"orange"}
                    borderRadius={50}
                    variant="outline"
                    width={"32%"}
                    onPress={() => {
                      router.push({
                        pathname: "/receipt/delivery-receipt/[id]",
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

      {/* ============================================================ */}
      {/* CANCELLATION BOTTOM SHEET */}
      {/* ============================================================ */}
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
          shadowOffset: { width: 0, height: -4 },
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
                    value={value}
                    onChange={onChange}
                    placeholder="Please describe the reason for cancellation..."
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
            text="Cancel Delivery"
            width={"90%"}
            onPress={openAlert}
            color="primary"
            icon={
              updateDeliveryMutation.isPending && (
                <ActivityIndicator color="#fff" />
              )
            }
            disabled={updateDeliveryMutation.isPending}
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

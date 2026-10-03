import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useMutation } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import {
  FoodRiderStatus,
  updateFoodDeliveryStatusByRider,
} from "@/api/food-delivery";
import Map from "@/components/Map";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocationStore } from "@/store/locationStore";
import { DeliveryOrderStatus } from "@/types/delivey-types";
import { DeliveryDetails } from "@/types/order-types";
import { getDeliveryButtonConfig } from "@/utils/deliveryButtonConfig";
import { supabase } from "@/utils/supabase";

/**
 * The rider's half of a food order (AC-25).
 *
 * `food_orders.order_status` belongs to the kitchen and is rendered by the
 * receipt's own status row; everything here reads
 * `food_deliveries.delivery_status` and writes only that column. The two are
 * never mixed — a badge here must not stand in for the food status, and the
 * food status must not stand in for this.
 *
 * Rendered only when `get_order_details` returned a `delivery` payload, so
 * pickup and vendor-delivery orders see no card and no map at all.
 */
interface FoodDeliveryCardProps {
  /** The food order id — the realtime filter and the parent's query key. */
  orderId: string;
  delivery: DeliveryDetails;
  /** True only for the rider assigned to this row. Everyone else reads. */
  isRider: boolean;
  /** Called when realtime reports a new status, so the parent can refetch. */
  onStatusChanged?: () => void;
}

/**
 * `food_deliveries.*_coordinates` are jsonb `[lat, lng]` arrays, not GeoJSON —
 * see `_jsonb_point` in the backend. Only shape is checked here: the pair is
 * already in order by contract, so guessing at a swap is how a marker ends up
 * in the wrong country.
 */
const toCoords = (coords: unknown): [number, number] | null => {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lat, lng] = coords as [unknown, unknown];
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
};

const statusLabel = (status: string) => status.replace(/_/g, " ");

const statusTheme = (status: string): { bg: string; text: string } => {
  switch (status) {
    case "PENDING":
    case "PAID_NEEDS_RIDER":
      return { bg: "bg-yellow-500/10", text: "text-yellow-600" };
    case "ASSIGNED":
      return { bg: "bg-blue-500/10", text: "text-blue-600" };
    case "ACCEPTED":
      return { bg: "bg-indigo-500/10", text: "text-indigo-600" };
    case "PICKED_UP":
      return { bg: "bg-purple-500/10", text: "text-purple-600" };
    case "IN_TRANSIT":
      return { bg: "bg-orange-500/10", text: "text-orange-600" };
    case "DELIVERED":
    case "COMPLETED":
      return { bg: "bg-green-500/10", text: "text-green-600" };
    case "DECLINED":
    case "CANCELLED":
    case "RETURNED":
      return { bg: "bg-red-500/10", text: "text-red-600" };
    default:
      return { bg: "bg-gray-500/10", text: "text-gray-500" };
  }
};

/** Courier's rule: the rider is now heading for the drop, not the pickup. */
const isPickedUp = (status: string) =>
  status === "PICKED_UP" || status === "IN_TRANSIT";

const MAP_HEIGHT = 200;

const FoodDeliveryCard = ({
  orderId,
  delivery,
  isRider,
  onStatusChanged,
}: FoodDeliveryCardProps) => {
  const theme = useColorScheme();
  const isDark = theme === "dark";
  const { showError, showSuccess } = useToast();

  const CARD_BG = isDark ? "bg-gray-800/40" : "bg-white";
  const TEXT_PRIMARY = isDark ? "text-white" : "text-gray-900";
  const TEXT_SECONDARY = isDark ? "text-gray-400" : "text-gray-600";
  const BORDER_COLOR = isDark ? "border-gray-700" : "border-gray-200";

  const { setOrigin, setDestination, setRiderLocation } = useLocationStore();

  const status = delivery.delivery_status as DeliveryOrderStatus;
  const badge = statusTheme(delivery.delivery_status);
  const hasRider = !!delivery.rider_id;

  /**
   * Seed the map's two endpoints, and the rider's last known position, once
   * per delivery. `Map` reads all three from the store rather than taking
   * them as props, so nothing else on this screen has to know the coordinates
   * exist. Without the rider seed the marker would only appear after the
   * first live ping.
   */
  useEffect(() => {
    const origin = toCoords(delivery.pickup_coordinates);
    if (origin) setOrigin(delivery.pickup_location || null, origin);

    const drop = toCoords(delivery.dropoff_coordinates);
    if (drop) setDestination(delivery.destination || null, drop);

    const rider = toCoords(delivery.last_known_rider_coordinates);
    if (rider) setRiderLocation(delivery.id, rider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery.id]);

  /**
   * Stream this order's delivery row. Every update feeds the marker; the
   * parent is only asked to refetch when the status actually moves, so a
   * rider pinging coordinates every few seconds does not become a fetch storm.
   */
  const lastStatusRef = useRef(delivery.delivery_status);
  useEffect(() => {
    if (!orderId || !delivery.id) return;

    const channel = supabase
      .channel(`food_delivery_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "food_deliveries",
          filter: `food_order_id=eq.${orderId}`,
        },
        (payload) => {
          const next = payload.new as Record<string, unknown>;

          const coords = toCoords(next.last_known_rider_coordinates);
          if (coords) setRiderLocation(delivery.id, coords);

          const nextStatus = next.delivery_status as string | undefined;
          if (nextStatus && nextStatus !== lastStatusRef.current) {
            lastStatusRef.current = nextStatus;
            onStatusChanged?.();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, delivery.id]);

  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const { mutate } = useMutation({
    mutationFn: (newStatus: FoodRiderStatus) =>
      updateFoodDeliveryStatusByRider(delivery.id, newStatus),
    onMutate: (newStatus) => {
      setPendingStatus(newStatus);
    },
    onSettled: () => {
      setPendingStatus(null);
    },
    onSuccess: (_result, newStatus) => {
      showSuccess("Delivery updated", `Marked ${statusLabel(newStatus)}`);
      // Realtime usually lands first; this is the belt to its braces.
      onStatusChanged?.();
    },
    onError: (error: Error) => {
      showError("Could not update", error.message || "Please try again");
    },
  });

  // Only the rider gets actions. A customer sees the card read-only and a
  // vendor sees no rider controls at all (AC-25).
  const config = isRider
    ? getDeliveryButtonConfig(status, "RIDER")
    : { primary: null, secondary: null };

  // Primary first, secondary second: on ASSIGNED that reads Accept, Decline,
  // with the destructive action on the right where the thumb expects it.
  const actions = [config.primary, config.secondary].filter(
    (action): action is NonNullable<typeof config.primary> =>
      !!action && !!action.nextStatus,
  );

  return (
    <View
      className={`${CARD_BG} rounded-xl p-4 ${BORDER_COLOR} border shadow-sm mb-3`}
    >
      {/* Identity + status */}
      <View className="flex-row items-center justify-between mb-4">
        <Text
          className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px]`}
        >
          Delivery
        </Text>
        <View className={`${badge.bg} px-3 py-1 rounded-full`}>
          <Text
            className={`${badge.text} text-[11px] font-poppins-semibold uppercase`}
          >
            {statusLabel(delivery.delivery_status)}
          </Text>
        </View>
      </View>

      <View className="gap-4 mb-4">
        <View className="flex-row justify-between items-start">
          <Text className={`${TEXT_SECONDARY} font-poppins`}>Rider</Text>
          <View className="flex-1 ml-4 items-end">
            {hasRider ? (
              <>
                <Text
                  className={`${TEXT_PRIMARY} font-poppins-medium text-right`}
                >
                  {delivery.rider_name || "Assigned rider"}
                </Text>
                {!!delivery.rider_phone && (
                  <View className="flex-row items-center gap-1 justify-end mt-0.5">
                    <Ionicons name="call-outline" size={11} color="#9ca3af" />
                    <Text className="text-[11px] text-gray-400 font-poppins">
                      {delivery.rider_phone}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text className="text-[11px] text-orange-500 font-poppins-medium text-right">
                {delivery.delivery_status === "DECLINED"
                  ? "Rider declined — pick another"
                  : "Finding a rider…"}
              </Text>
            )}
          </View>
        </View>

        {!!delivery.dispatch_business_name && (
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>Dispatch</Text>
            <Text
              className={`${TEXT_PRIMARY} font-poppins-medium flex-1 text-right ml-4`}
              numberOfLines={1}
            >
              {delivery.dispatch_business_name}
            </Text>
          </View>
        )}

        <View className="flex-row justify-between items-center">
          <Text className={`${TEXT_SECONDARY} font-poppins`}>Fee</Text>
          <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
            ₦{Number(delivery.delivery_fee || 0).toFixed(2)}
          </Text>
        </View>
      </View>

      {/*
        Rider marker, vendor pin and destination pin with the route between
        them. `Map` is `flex: 1` throughout and collapses without an explicit
        box, so the height lives on this wrapper rather than on the component
        — `Map.tsx` itself is not touched.
      */}
      <View
        className="rounded-xl overflow-hidden mb-4"
        style={{ height: MAP_HEIGHT }}
      >
        <Map id={delivery.id} isPickedUp={isPickedUp(delivery.delivery_status)} />
      </View>

      {actions.length > 0 && (
        <View className="flex-row gap-2 items-center">
          {actions.map((action, index) => {
            const isPending = pendingStatus === action.nextStatus;
            const isSecondary = action.variant === "outline";

            return (
              <AppButton
                key={action.nextStatus ?? `action-${index}`}
                text={action.text}
                icon={isPending ? undefined : action.icon}
                variant={isSecondary ? "outline" : "fill"}
                color={action.color}
                textColor={action.textColor}
                borderColor={action.borderColor}
                disabled={isPending || pendingStatus !== null}
                width={actions.length > 1 ? "48%" : "100%"}
                onPress={() => mutate(action.nextStatus as FoodRiderStatus)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

export default FoodDeliveryCard;

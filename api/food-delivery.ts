import { apiClient } from "@/utils/client";
import { supabase } from "@/utils/supabase";

/**
 * Client for the forked rider RPCs that act on `food_deliveries`.
 *
 * The plain RPC wrappers below map one to one onto a function created in
 * `migrations/033_food_delivery_rpcs.sql`, which is a copy of its courier
 * original retargeted at the food table. `api/delivery.ts` is deliberately
 * not touched and shares no code with this file: the two tables have separate
 * lifecycles, and a shared helper would be the first place a fix lands in one
 * and forgets the other.
 *
 * The one status writer the app uses is `updateFoodDeliveryStatusByRider`,
 * which goes over HTTP instead. That is deliberate: the forked RPC moves the
 * row but knows nothing about pushes, so hitting it direct would make AC-19
 * depend on a second round trip succeeding. The route runs the RPC and fans
 * the recipient matrix out in the same call.
 *
 * Each path moves `delivery_status` and nothing else. `food_orders.order_status`
 * belongs to the vendor's kitchen and is never written from here (AC-11).
 */

const currentUser = async (): Promise<string> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error("User not authenticated");
  }
  return session.user.id;
};

const call = async <T>(
  fn: string,
  args: Record<string, unknown>,
  fallback: string,
): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    throw new Error(error.message || fallback);
  }
  return data as T;
};

/** Rider accepts an assignment made at payment or by a customer re-pick. */
export const acceptFoodDelivery = (txRef: string): Promise<unknown> =>
  currentUser().then((riderId) =>
    call("accept_food_delivery", { p_tx_ref: txRef, p_rider_id: riderId }, "Failed to accept delivery"),
  );

/** Rider turns the job down; the customer is told to re-pick (AC-19). */
export const declineFoodDelivery = (txRef: string): Promise<unknown> =>
  currentUser().then((riderId) =>
    call("decline_food_delivery", { p_tx_ref: txRef, p_rider_id: riderId }, "Failed to decline delivery"),
  );

/** Rider collects the order. Both args are text, matching the courier source. */
export const pickupFoodDelivery = (deliveryId: string): Promise<unknown> =>
  currentUser().then((riderId) =>
    call(
      "mark_food_delivery_picked_up",
      { p_delivery_id: deliveryId, p_rider_id: riderId },
      "Failed to mark pickup",
    ),
  );

/** Rider confirms hand-off. Ends the rider's part of the lifecycle. */
export const markFoodDeliveryDelivered = (deliveryId: string): Promise<unknown> =>
  currentUser().then((riderId) =>
    call(
      "mark_food_delivery_delivered",
      { p_delivery_id: deliveryId, p_rider_id: riderId },
      "Failed to mark as delivered",
    ),
  );

/**
 * Streams the rider's position for one delivery. Writes the row only — no
 * `delivery_location_logs` row, because that table's foreign key points at
 * `delivery_orders`.
 */
export const updateFoodDeliveryCoords = (
  deliveryId: string,
  lat: number,
  lng: number,
): Promise<unknown> =>
  currentUser().then((riderId) =>
    call(
      "update_food_delivery_coords",
      { p_delivery_id: deliveryId, p_rider_id: riderId, p_lat: lat, p_lng: lng },
      "Failed to update location",
    ),
  );

/**
 * Generic status move, used where an action has no dedicated function. The
 * caller is passed through rather than taken from the session because the
 * returning flow is driven by the sender, not the rider.
 */
export const updateFoodDeliveryStatus = (
  deliveryId: string,
  newStatus: string,
  triggeredByUserId: string,
): Promise<unknown> =>
  call(
    "update_food_delivery_status",
    {
      p_delivery_id: deliveryId,
      p_new_status: newStatus,
      p_triggered_by_user_id: triggeredByUserId,
    },
    "Failed to update delivery status",
  );

/** Sender cancels. Handles the PICKED_UP return path (AC-15). */
export const cancelFoodDeliveryBySender = (
  orderId: string,
  reason: string,
): Promise<unknown> =>
  call(
    "cancel_food_delivery_by_sender",
    { p_order_id: orderId, p_reason: reason },
    "Failed to cancel delivery",
  );

/** Frees a rider who can no longer run the job. */
export const clearFoodDeliveryRider = (deliveryId: string): Promise<unknown> =>
  call(
    "clear_food_delivery_rider",
    { p_delivery_id: deliveryId },
    "Failed to clear rider",
  );

/**
 * Booking a rider for a food delivery. Normally the server calls this inside
 * the capture transaction or from `POST /food/orders/{id}/assign-delivery`;
 * exported so the same call is not re-spelled anywhere else.
 */
export const assignRiderToFoodDelivery = (
  txRef: string,
  riderId: string,
): Promise<unknown> =>
  call(
    "assign_rider_to_food_delivery",
    { p_tx_ref: txRef, p_rider_id: riderId },
    "Failed to assign rider",
  );

/** One of the statuses `FoodDeliveryStatusUpdate` will accept. */
export type FoodRiderStatus =
  | "ACCEPTED"
  | "DECLINED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED";

/**
 * The rider's five moves, over HTTP (AC-19, task 43).
 *
 * `PUT /food/deliveries/{delivery_id}/update-status` picks the right forked
 * RPC server side and fans the recipient matrix out afterwards, so a status
 * can never move without the push that goes with it. It also re-checks the
 * caller is the rider on this row, which the raw RPC wrappers above do not
 * do from the client's point of view.
 */
export const updateFoodDeliveryStatusByRider = async (
  deliveryId: string,
  newStatus: FoodRiderStatus,
  declineReason?: string,
): Promise<{ delivery_status?: string; rider_id?: string | null }> => {
  const response = await apiClient.put(
    `/food/deliveries/${deliveryId}/update-status`,
    declineReason
      ? { new_status: newStatus, decline_reason: declineReason }
      : { new_status: newStatus },
  );

  if (!response.ok) {
    const errorData = response.data as { detail?: string; message?: string };
    throw new Error(
      errorData?.detail ||
        errorData?.message ||
        "Failed to update delivery status",
    );
  }

  return (response.data ?? {}) as {
    delivery_status?: string;
    rider_id?: string | null;
  };
};

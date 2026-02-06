import { DeliveryOrder } from "@/types/order-types";
import { RiderAssignmentResponse } from "@/types/user-types";
import { supabase } from "@/utils/supabase";

/**
 * Fetches delivery orders where current user is sender, rider, or dispatch
 *
 * SECURITY: Relies on RLS policy "Users access their delivery orders"
 *           (must be configured in Supabase dashboard)
 *
 * @param supabase - Authenticated Supabase client
 * @param options - Pagination and filtering options
 * @returns Promise<DeliveryOrder[]> - Orders with order_number safely converted to number
 */
export async function getUserDeliveryOrders(
  options: {
    limit?: number;
    offset?: number;
    status?: string; // Optional filter (e.g., 'PENDING', 'DELIVERED')
  } = {},
): Promise<DeliveryOrder[]> {
  const { limit = 50, offset = 0, status } = options;

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User is not authenticated");
    }

    const userId = session.user.id;

    let query = supabase
      .from("delivery_orders")
      .select(
        `
      id,
      order_number,
      tx_ref,
      sender_id,
      receiver_phone,
      pickup_location,
      destination,
      distance,
      delivery_type,
      package_image_url,
      additional_info,
      delivery_fee,
      total_price,
      amount_due_dispatch,
      rider_id,
      dispatch_id,
      rider_phone_number,
      duration,
      delivery_status,
      payment_status,
      package_name
    `,
        { count: "exact" },
      )
      .eq("is_deleted", false)
      .or(
        `sender_id.eq.${userId},rider_id.eq.${userId},dispatch_id.eq.${userId}`,
      )
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // status filter
    if (status) {
      query = query.eq("delivery_status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Delivery orders fetch failed:", error);
      throw new Error(`Failed to load orders: ${error.message}`);
    }

    return (data || []).map((order: any) => {
      if (!Number.isSafeInteger(Number(order.order_number))) {
        console.warn(`Unsafe order_number: ${order.order_number}`);
      }

      return {
        ...order,
        order_number: Number(order.order_number),
      };
    }) as DeliveryOrder[];
  } catch (error) {
    console.error("Delivery orders fetch failed:", error);
    throw new Error(`Failed to load orders: ${error}`);
  }
}

/**
 * Assign a rider to a delivery order
 * Automatically copies the rider's dispatch_id from their profile
 *
 * @param orderId - The delivery order ID
 * @param riderId - The rider's user ID
 */
export const assignRiderToDeliveryOrder = async (
  txRef: string,
  riderId: string,
): Promise<RiderAssignmentResponse> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    console.log("🚚 Assigning rider to order...", { txRef, riderId });

    // Call RPC - it will automatically get dispatch_id from rider's profile
    const { data, error } = await supabase.rpc("assign_rider_to_delivery", {
      p_tx_ref: txRef,
      p_rider_id: riderId,
    });

    if (error) {
      console.error("❌ Assignment failed:", error);

      let errorMessage = error.message || "Failed to assign rider";

      if (errorMessage.includes("Rider not available")) {
        errorMessage =
          "Rider is currently unavailable (offline, blocked, or not a dispatch rider)";
      } else if (errorMessage.includes("already assigned")) {
        errorMessage = "Order already has a rider assigned";
      } else if (errorMessage.includes("not found")) {
        errorMessage = "Order not found";
      } else if (errorMessage.includes("cannot assign")) {
        errorMessage = "Order cannot be assigned in current status";
      }

      throw new Error(errorMessage);
    }

    if (!data) {
      throw new Error("No response from server");
    }

    console.log("✅ Rider assigned:", data);

    return data as RiderAssignmentResponse;
  } catch (error) {
    console.error("❌ Assign rider error:", error);
    throw error;
  }
};

/**
 * Rider accepts a delivery assignment
 *
 * @param txRef - The transaction reference of the order
 * @param riderId - The rider's user ID
 */
export const acceptDeliveryOrder = async (txRef: string): Promise<any> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }
    const { data, error } = await supabase.rpc("accept_delivery", {
      p_tx_ref: txRef,
      p_rider_id: session.user.id,
    });

    if (error) {
      console.error("❌ Accept delivery failed:", error);
      throw new Error(error.message || "Failed to accept delivery");
    }

    return data;
  } catch (error) {
    console.error("❌ Accept delivery error:", error);
    throw error;
  }
};

/**
 * Rider declines a delivery assignment
 *
 * @param txRef - The transaction reference of the order
 * @param riderId - The rider's user ID
 */
export const declineDeliveryOrder = async (txRef: string): Promise<any> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }
    const { data, error } = await supabase.rpc("decline_delivery", {
      p_tx_ref: txRef,
      p_rider_id: session.user.id,
    });

    if (error) {
      console.error("❌ Decline delivery failed:", error);
      throw new Error(error.message || "Failed to decline delivery");
    }

    return data;
  } catch (error) {
    console.error("❌ Decline delivery error:", error);
    throw error;
  }
};

/**
 * Rider marks a delivery as picked up
 *
 * @param txRef - The transaction reference of the order
 * @param riderId - The rider's user ID
 */
export const pickupDeliveryOrder = async (txRef: string): Promise<any> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }
    const { data, error } = await supabase.rpc("pickup_delivery", {
      p_tx_ref: txRef,
      p_rider_id: session.user.id,
    });

    if (error) {
      console.error("❌ Pickup delivery failed:", error);
      throw new Error(error.message || "Failed to mark pickup");
    }

    return data;
  } catch (error) {
    console.error("❌ Pickup delivery error:", error);
    throw error;
  }
};

/**
 * Rider marks a delivery as delivered
 *
 * @param txRef - The transaction reference of the order
 */
export const markDeliveryDelivered = async (txRef: string): Promise<any> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }
    const { data, error } = await supabase.rpc("mark_delivery_delivered", {
      p_tx_ref: txRef,
      p_rider_id: session.user.id,
    });

    if (error) {
      console.error("❌ Delivered marking failed:", error);
      throw new Error(error.message || "Failed to mark as delivered");
    }

    return data;
  } catch (error) {
    console.error("❌ Delivered marking error:", error);
    throw error;
  }
};

/**
 * Sender marks a delivery as completed (triggers payout)
 *
 * @param txRef - The transaction reference of the order
 * @param senderId - The sender's user ID
 */
export const markDeliveryCompleted = async (txRef: string): Promise<any> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.rpc("mark_delivery_completed", {
      p_tx_ref: txRef,
      p_sender_id: session.user.id,
    });

    if (error) {
      console.error("❌ Completion failed:", error);
      throw new Error(error.message || "Failed to complete delivery");
    }

    return data;
  } catch (error) {
    console.error("❌ Completion error:", error);
    throw error;
  }
};

/**
 * Fetches complete delivery details by tx_ref
 *
 * @param txRef - The transaction reference of the order
 * @returns Promise<DeliveryOrder>
 */
export const getDeliveryDetailsById = async (
  id: string,
): Promise<DeliveryOrder> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ Fetch delivery details failed:", error);
      throw new Error(error.message || "Failed to fetch delivery details");
    }

    if (!data) {
      throw new Error("Delivery order not found");
    }

    console.log("SINGLE DATA:", data);

    return {
      ...data,
      order_number: Number(data.order_number),
    } as DeliveryOrder;
  } catch (error) {
    console.error("❌ Fetch delivery details error:", error);
    throw error;
  }
};
/**
 * Updates the rider's coordinates and logs them in history
 *
 * @param deliveryId - The delivery order ID
 * @param lat - Current latitude
 * @param lng - Current longitude
 */
export const updateDeliveryCoords = async (
  deliveryId: string,
  lat: number,
  lng: number,
): Promise<void> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase.rpc("update_delivery_coords", {
      p_delivery_id: deliveryId,
      p_rider_id: session.user.id,
      p_lat: lat,
      p_lng: lng,
    });

    if (error) {
      console.error("❌ Location update failed:", error);
      throw new Error(error.message || "Failed to update location");
    }
  } catch (error) {
    console.error("❌ Location update error:", error);
    throw error;
  }
};

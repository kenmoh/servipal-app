import { DetailResponse, UnifiedOrderResponse } from "@/types/order-types";
import { supabase } from "@/utils/supabase";

/**
 * Fetch orders for a user using Supabase RPC for efficiency (handles joins and filters)
 */
export const fetchUserOrders = async (
  userId: string,
  orderType: "FOOD" | "LAUNDRY",
): Promise<UnifiedOrderResponse[]> => {
  try {
    const { data, error } = await supabase.rpc("get_user_orders", {
      p_user_id: userId,
      p_order_type: orderType,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred while fetching orders.");
  }
};

/**
 * Soft delete an order using Supabase RPC
 */
export const softDeleteOrder = async (
  orderId: string,
  orderType: "FOOD" | "LAUNDRY",
): Promise<void> => {
  try {
    const { error } = await supabase.rpc("soft_delete_order", {
      p_order_id: orderId,
      p_order_type: orderType,
    });

    if (error) throw error;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred while deleting the order.");
  }
};

/**
 * Fetch detailed order information using Supabase RPC
 */
export const fetchOrderDetails = async (
  orderId: string,
  orderType: "FOOD" | "LAUNDRY",
): Promise<DetailResponse> => {
  try {
    const { data, error } = await supabase.rpc("get_order_details", {
      p_order_id: orderId,
      p_order_type: orderType,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(
      "An unexpected error occurred while fetching order details.",
    );
  }
};

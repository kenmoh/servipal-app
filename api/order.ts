import {
  DetailResponse,
  OrderStatus,
  UnifiedOrderResponse,
} from "@/types/order-types";
import { apiClient } from "@/utils/client";
import { supabase } from "@/utils/supabase";

interface OrderStatusUpdate {
  status?: string;
  new_status: OrderStatus;
  cancel_reason?: string;
}

const FOOD_BASE_URL = "/food";
const LAUNDRY_BASE_URL = "/laundry";

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

    if (error) {
      console.log(error);
      throw error;
    }
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

/**
 * Mark order as preparing/washing
 */
// export const markOrderAsPreparing = async (
//   orderId: string,
//   orderType: "FOOD" | "LAUNDRY",
// ): Promise<void> => {
//   try {
//     const { error } = await supabase.rpc("mark_order_as_preparing", {
//       p_order_id: orderId,
//       p_order_type: orderType,
//     });

//     if (error) throw error;
//   } catch (error) {
//     if (error instanceof Error) {
//       throw new Error(error.message);
//     }
//     throw new Error(
//       "An unexpected error occurred while marking the order as preparing.",
//     );
//   }
// };

// /**
//  * Mark order as ready for pickup
//  */
// export const markOrderAsReady = async (
//   orderId: string,
//   orderType: "FOOD" | "LAUNDRY",
// ): Promise<void> => {
//   try {
//     const { error } = await supabase.rpc("mark_order_as_ready", {
//       p_order_id: orderId,
//       p_order_type: orderType,
//     });

//     if (error) throw error;
//   } catch (error) {
//     if (error instanceof Error) {
//       throw new Error(error.message);
//     }
//     throw new Error(
//       "An unexpected error occurred while marking the order as ready.",
//     );
//   }
// };

// /**
//  Mark ordr as delivered
//  */
// export const markOrderAsDelivered = async (
//   orderId: string,
//   orderType: "FOOD" | "LAUNDRY",
// ): Promise<void> => {
//   try {
//     const { error } = await supabase.rpc("mark_order_as_delivered", {
//       p_order_id: orderId,
//       p_order_type: orderType,
//     });

//     if (error) throw error;
//   } catch (error) {
//     if (error instanceof Error) {
//       throw new Error(error.message);
//     }
//     throw new Error(
//       "An unexpected error occurred while marking the order as delivered.",
//     );
//   }
// };

// /**
//  * Mark order as cancelled
//  */
// export const markOrderAsCancelled = async (
//   orderId: string,
//   orderType: "FOOD" | "LAUNDRY",
// ): Promise<void> => {
//   try {
//     const { error } = await supabase.rpc("mark_order_as_cancelled", {
//       p_order_id: orderId,
//       p_order_type: orderType,
//     });

//     if (error) throw error;
//   } catch (error) {
//     if (error instanceof Error) {
//       throw new Error(error.message);
//     }
//     throw new Error(
//       "An unexpected error occurred while marking the order as cancelled.",
//     );
//   }
// };

// /**
//  * Mark order as completed
//  */
// export const markOrderAsCompleted = async (
//   orderId: string,
//   orderType: "FOOD" | "LAUNDRY",
// ): Promise<void> => {
//   try {
//     const { error } = await supabase.rpc("mark_order_as_completed", {
//       p_order_id: orderId,
//       p_order_type: orderType,
//     });

//     if (error) throw error;
//   } catch (error) {
//     if (error instanceof Error) {
//       throw new Error(error.message);
//     }
//     throw new Error(
//       "An unexpected error occurred while marking the order as completed.",
//     );
//   }
// };

/**
 * Update food order status
 */
export const updateFoodOrderStatus = async (
  orderId: string,
  data: OrderStatusUpdate,
): Promise<OrderStatusUpdate> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session) throw new Error("No session found");

    const response = await apiClient.put(
      `${FOOD_BASE_URL}/${orderId}/update-food-order-status?order_id`,
      {
        new_status: data.new_status,
      },
    );

    if (!response?.ok) throw new Error("Failed to update food order status");

    return response.data as OrderStatusUpdate;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(
      "An unexpected error occurred while updating the food order status.",
    );
  }
};

export const cancelFoodOrder = async (
  orderId: string,
  data: OrderStatusUpdate,
): Promise<OrderStatusUpdate> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session) throw new Error("No session found");

    const response = await apiClient.put(
      `${FOOD_BASE_URL}/${orderId}/update-food-order-status`,
      {
        new_status: data.new_status,
        cancel_reason: data.cancel_reason,
      },
    );

    if (!response?.ok) throw new Error("Failed to update food order status");

    return response.data as OrderStatusUpdate;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(
      "An unexpected error occurred while updating the food order status.",
    );
  }
};

/**
 * Update food order status
 */
export const updateLaundryOrderStatus = async (
  orderId: string,
  data: OrderStatusUpdate,
): Promise<OrderStatusUpdate> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session) throw new Error("No session found");

    const response = await apiClient.put(
      `${LAUNDRY_BASE_URL}/${orderId}/update-laundry-order-status`,
      {
        new_status: data.new_status,
        cancel_reason: data.cancel_reason,
      },
    );

    if (!response?.ok) throw new Error("Failed to update laundry order status");

    return response.data as OrderStatusUpdate;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(
      "An unexpected error occurred while updating the  order status.",
    );
  }
};

export const cancelLaundryOrder = async (
  orderId: string,
  data: OrderStatusUpdate,
): Promise<OrderStatusUpdate> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session) throw new Error("No session found");

    const response = await apiClient.put(
      `${LAUNDRY_BASE_URL}/update-laundry-order-status?order_id=${orderId}`,
      {
        new_status: data.new_status,
        cancel_reason: data.cancel_reason,
      },
    );

    if (!response?.ok) throw new Error("Failed to update laundry order status");

    return response.data as OrderStatusUpdate;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(
      "An unexpected error occurred while updating the laundry order status.",
    );
  }
};

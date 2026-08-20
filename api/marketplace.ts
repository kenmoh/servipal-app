import { MenuItem } from "@/types/item-types";
import {
  BuyItem,
  BuyItemResponse,
  OrderUpdateStatus,
  ProduductOrderResponse,
} from "@/types/marketplace";
import { apiClient } from "@/utils/client";
import { ApiResponse } from "apisauce";
import { ErrorResponse } from "./auth";

const BASE_URL = "/marketplace";

// Fetch Vendor Items
export const fetchVendorItems = async (
  Vendor_id: string
): Promise<MenuItem[]> => {
  try {
    const response: ApiResponse<MenuItem[] | ErrorResponse> =
      await apiClient.get(`/items/${Vendor_id}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching vendour items.";
      throw new Error(errorMessage);
    }

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Buy items
export const buyItem = async (
  productData: BuyItem,
  productId: string
): Promise<BuyItemResponse[]> => {
  const data = {
    quantity: productData.quantity,
    colors: productData.colors,
    sizes: productData.sizes,
    additional_info: productData.additional_info,
  };
  try {
    const response: ApiResponse<BuyItemResponse[] | ErrorResponse> =
      await apiClient.post(`${BASE_URL}/${productId}/buy`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching categories.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Fetch user orders
export const fetUserOrders = async (
  userId: string
): Promise<ProduductOrderResponse[]> => {
  try {
    const response: ApiResponse<ProduductOrderResponse[] | ErrorResponse> =
      await apiClient.get(`${BASE_URL}/${userId}/user-orders`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching orders.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};
// Fetch user orders
export const fetProductOrderDetails = async (
  orderId: string
): Promise<ProduductOrderResponse> => {
  try {
    const response: ApiResponse<ProduductOrderResponse | ErrorResponse> =
      await apiClient.get(`${BASE_URL}/${orderId}/product-order-details`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching order.";
      throw new Error(errorMessage);
    }

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Order Delivered
export const orderDelivered = async (
  orderId: string
): Promise<OrderUpdateStatus[]> => {
  try {
    const response: ApiResponse<OrderUpdateStatus[] | ErrorResponse> =
      await apiClient.put(`${BASE_URL}/${orderId}/item-delivered`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error updating order status.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Order Received
export const orderReceived = async (
  orderId: string
): Promise<OrderUpdateStatus> => {
  try {
    const response: ApiResponse<OrderUpdateStatus | ErrorResponse> =
      await apiClient.put(`${BASE_URL}/${orderId}/item-received`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error updating order status.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};
// Rejected Order Received
export const vendorRecivedRejectedItem = async (
  orderId: string
): Promise<OrderUpdateStatus> => {
  try {
    const response: ApiResponse<OrderUpdateStatus | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${orderId}/vendor-received-rejected-item`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error updating order status.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Buyer Reject Order
export const buyerRejectedItem = async (
  orderId: string
): Promise<OrderUpdateStatus> => {
  try {
    const response: ApiResponse<OrderUpdateStatus | ErrorResponse> =
      await apiClient.put(`${BASE_URL}/${orderId}/item-rejected`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error updating order status.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

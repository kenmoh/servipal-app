import {
  CreateReview,
  DeliveryDetail,
  InitPaymentData,
  OrderFoodOLaundry,
  SendItem,
  UpdateDeliveryLocation,
} from "@/types/order-types";
import { PaymentLink } from "@/types/payment";
import { apiClient } from "@/utils/client";
import { ApiResponse } from "apisauce";
import { ErrorResponse } from "./auth";

const BASE_URL = "/orders";
const DELIVERY_URL = "/delivery";

export type DeliveryType = "food" | "laundry" | "package";

interface FetchDeliveriesParams {
  skip?: number;
  limit?: number;
}

// Fetch Paid Pending Deliveries
export const fetchPaidPendingDeliveries = async (): Promise<
  DeliveryDetail[]
> => {
  try {
    const response: ApiResponse<DeliveryDetail[] | ErrorResponse> =
      await apiClient.get(`${BASE_URL}/paid-pending-deliveries`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching deliveries.";
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
// Fetch Paid Pending Deliveries
export const fetchUserRelatedOrders = async (
  userId: string,
): Promise<DeliveryDetail[]> => {
  try {
    const response: ApiResponse<DeliveryDetail[] | ErrorResponse> =
      await apiClient.get(`${BASE_URL}/${userId}/user-related-orders`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching deliveries.";
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

// Fetch Deliveries
export const fetchDeliveries = async ({
  skip = 0,
  limit = 25,
}: FetchDeliveriesParams = {}): Promise<DeliveryDetail[]> => {
  const params = new URLSearchParams();

  // if (deliveryType) {
  //   params.append("delivery_type", deliveryType.toString());
  // }
  if (typeof skip === "number") {
    params.append("skip", skip.toString());
  }
  if (typeof limit === "number") {
    params.append("limit", limit.toString());
  }
  try {
    const response: ApiResponse<DeliveryDetail[] | ErrorResponse> =
      await apiClient.get(
        `${BASE_URL}${params.toString() ? `?${params.toString()}` : ""}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching deliveries.";
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

// Fetch Delivery
export const fetchOrder = async (orderId: string): Promise<DeliveryDetail> => {
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.get(`${BASE_URL}/${orderId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching delivery.";
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

// Send Item
export const sendItem = async (
  itemData: SendItem,
): Promise<InitPaymentData> => {
  const data = new FormData();
  data.append("package_name", itemData.packageName);
  data.append("description", itemData.description);
  data.append("pickup_location", itemData.origin);
  data.append("destination", itemData.destination);
  data.append("duration", itemData.duration);
  data.append("distance", itemData.distance?.toString());
  data.append("receiver_phone", itemData.receiverPhone);

  // Format coordinates without array brackets
  if (itemData.pickupLat && itemData.pickupLng) {
    data.append("pickup_lat", `${itemData.pickupLat}`);
    data.append("pickup_lng", `${itemData.pickupLng}`);
  }

  if (itemData.dropoffLat && itemData.dropoffLng) {
    data.append("dropoff_lat", `${itemData.dropoffLat}`);
    data.append("dropoff_lng", `${itemData.dropoffLng}`);
  }
  // data.append("distance", itemData.distance?.toString());

  // Handle image
  if (itemData.imageUrl) {
    const imageInfo = {
      uri: itemData.imageUrl,
      type: "image/jpeg",
      name: `image-${Date.now()}.jpg`,
    };
    data.append("package_image", imageInfo as any);
  }


  try {
    const response: ApiResponse<InitPaymentData | ErrorResponse> =
      await apiClient.post(`${DELIVERY_URL}/initiate-payment`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error creating item. Please try again later.";
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

// Order Food
export const createOrder = async (
  vendorId: string,
  orderData: OrderFoodOLaundry,
): Promise<DeliveryDetail> => {
  const data = {
    order_items: orderData.order_items,
    pickup_coordinates: orderData.pickup_coordinates,
    dropoff_coordinates: orderData.dropoff_coordinates,
    distance: orderData.distance,
    require_delivery: orderData.require_delivery,
    duration: orderData.duration,
    origin: orderData.origin,
    destination: orderData.destination,
    additional_info: orderData.additional_info,
    is_one_way_delivery: orderData.is_one_way_delivery,
  };

  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.post(`${BASE_URL}/${vendorId}`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error creating order.";
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

// Vendor mark order delivered
// export const updateOrderStatus = async (
//   orderId: string
// ): Promise<DeliveryDetail> => {
//   try {
//     const response: ApiResponse<DeliveryDetail | ErrorResponse> =
//       await apiClient.put(
//         `${BASE_URL}/${orderId}/vendor-mark-order-delivered`,
//         {
//           headers: {
//             "Content-Type": "application/json",
//           },
//         }
//       );

//     if (!response.ok || !response.data || "detail" in response.data) {
//       const errorMessage =
//         response.data && "detail" in response.data
//           ? response.data.detail
//           : "Error updating order status.";
//       throw new Error(errorMessage);
//     }
//     return response.data;
//   } catch (error) {
//     if (error instanceof Error) {
//       throw new Error(error.message);
//     }
//     throw new Error("An unexpected error occurred");
//   }
// };

// Confirm Item Received by sender
export const senderConfirmDeliveryReceived = async (
  orderId: string,
  senderId: string,
): Promise<DeliveryDetail> => {
  const params = new URLSearchParams({ sender_id: senderId });
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${orderId}/sender-confirm-package-received?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error confirming delivery.";
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

// Confirm Item Received by customer(food/laundry order)
export const customerConfirmOrderReceived = async (
  orderId: string,
  customerId: string,
): Promise<DeliveryDetail> => {
  const params = new URLSearchParams({ customer_id: customerId });
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${orderId}/customer-confirm-order-received?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error confirming delivery.";
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

// Rider Accept Delivery
export const riderAcceptBooking = async (
  orderId: string,
  riderId: string,
): Promise<DeliveryDetail> => {
  const params = new URLSearchParams({ rider_id: riderId });
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${orderId}/accept-booking?${params.toString()}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error accepting booking.";
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
// Rider Decline Booking
export const riderDeclineBooking = async (
  orderId: string,
  riderId: string,
): Promise<DeliveryDetail> => {
  const params = new URLSearchParams({ rider_id: riderId });
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${orderId}/decline-booking?${params.toString()}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "An unexpected error occurred";
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

// Rider pickup Delivery
export const riderPickupDelivery = async (
  orderId: string,
  riderId: string,
): Promise<DeliveryDetail> => {
  const params = new URLSearchParams({ rider_id: riderId });
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${orderId}/pickup?${params.toString()}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error picking up delivery order.";
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

// Vendor pickup laundry
export const vendorPickupLaundry = async (
  orderId: string,
  vendorId: string,
): Promise<DeliveryDetail> => {
  const params = new URLSearchParams({ vendor_id: vendorId });
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${orderId}/pickup-laundry?${params.toString()}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "An error occured! Try again.";
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

// Vendor return laundry
export const vendorReturnLaundry = async (
  orderId: string,
  vendorId: string,
): Promise<DeliveryDetail> => {
  const params = new URLSearchParams({ vendor_id: vendorId });
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${orderId}/laundry-returned?${params.toString()}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "An error occured! Try again.";
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

// Vendor mark order delivered
export const vendorMarkorderelivered = async (
  orderId: string,
  vendorId: string,
): Promise<DeliveryDetail> => {
  const params = new URLSearchParams({ vendor_id: vendorId });
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${orderId}/vendor-mark-order-delivered?${params.toString()}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "An error occured! Try again.";
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

// Rider Mark Package Delivered
export const riderMarkDelivered = async (
  deliveryId: string,
  riderId: string,
): Promise<DeliveryDetail> => {
  const params = new URLSearchParams({ rider_id: riderId });
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${deliveryId}/package-delivered?${params.toString()}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error confirming delivery.";
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

export type CancelData = {
  orderId: string;
  cancelReason: string;
};

// Cancel delivery
export const cancelDelivery = async (
  cancelData: CancelData,
): Promise<DeliveryDetail> => {
  const data = {
    order_id: cancelData.orderId,
    reason: cancelData.cancelReason,
  };

  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(`${BASE_URL}/cancel-delivery`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error cancelling delivery.";
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

// Assign rider to existing delivery
export const assignRiderToExistingDelivery = async (
  deliveryId: string,
  riderId: string,
): Promise<DeliveryDetail> => {
  const params = new URLSearchParams({ rider_id: riderId });

  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${deliveryId}/assign-rider-to-existing-delivery-order?${params.toString()}`,
        {
          // params: params,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error assigning rider to this order.";
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

// Relist item
export const relistDelivery = async (
  deliveryId: string,
): Promise<DeliveryDetail> => {
  try {
    const response: ApiResponse<DeliveryDetail | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${deliveryId}/re-list-item`,

        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error relisting delivery.";
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

// Create review
export const createReview = async (
  orderId: string,
  revData: CreateReview,
): Promise<CreateReview> => {
  const data = {
    rating: revData.rating,
    comment: revData.comment,
  };
  try {
    const response: ApiResponse<CreateReview | ErrorResponse> =
      await apiClient.post(`${BASE_URL}/${orderId}/review`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error creating review. Please try again";
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


export const getTravelDistance = async (
  userLat: number,
  userLng: number,
  destinationLat: number,
  destinationLng: number,
): Promise<number | null> => {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLng},${userLat};${destinationLng},${destinationLat}?geometries=geojson&overview=false&access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== "Ok" && data.message) {
      console.warn(`Mapbox API error: ${data.code} - ${data.message}`);

      return null;
    }

    const distanceInMeters = data?.routes?.[0]?.distance;

    if (distanceInMeters) {
      // Convert meters → kilometers
      return distanceInMeters / 1000;
    }

    return null;
  } catch (error) {
    throw new Error(`Error calculating travel distance (Mapbox): ${error}`);
  }
};

export const generateOrderPaymentLink = async (
  orderId: string,
): Promise<PaymentLink> => {
  try {
    const response: ApiResponse<PaymentLink | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${orderId}/generate-new-payment-link`,

        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error generating payment link.";
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

// Update location
export const updateDeliveryLocation = async (
  deliveryId: string,
  locationData: UpdateDeliveryLocation,
): Promise<UpdateDeliveryLocation> => {
  const body = {
    rider_id: locationData.rider_id,
    last_known_rider_coordinates: locationData.last_known_rider_coordinates,
  };

  try {
    const response: ApiResponse<UpdateDeliveryLocation | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${deliveryId}/delivery-location-update`,
        body,

        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error updating delivery location.";
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

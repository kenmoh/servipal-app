import {
  CreateLaundryItem,
  LaundryItemResponse,
  OrderCreate,
} from "@/types/item-types";
import { InitiatePaymentResponse } from "@/types/payment-types";
import { apiClient } from "@/utils/client";
import { supabase } from "@/utils/supabase";
import { normalizeMenuImages } from "./food";

const LAUNDRY_TABLE = "laundry_items";
const MENU_IMAGES_BUCKET = "menu-images";
const BASE_URL = "/laundry";

export const createLaundryItem = async (
  item: CreateLaundryItem,
): Promise<LaundryItemResponse> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const vendorId = session.user.id;

    const uploadedImages = await normalizeMenuImages(
      item.images,
      vendorId,
      MENU_IMAGES_BUCKET,
    );

    const payload = {
      vendor_id: vendorId,
      name: item.name,
      description: item.description ?? null,
      price: item.price,
      images: uploadedImages,
    };

    const { data, error } = await supabase
      .from(LAUNDRY_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create laundry item");
    }

    return data as LaundryItemResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while creating laundry item");
  }
};

export const fetchLaundryItem = async (
  id: string,
): Promise<LaundryItemResponse> => {
  try {
    const { data, error } = await supabase
      .from(LAUNDRY_TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message || "Failed to fetch laundry item");
    }

    if (!data) {
      throw new Error("Laundry item not found");
    }

    return data as LaundryItemResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while fetching laundry item");
  }
};

export const updateLaundryItem = async (
  id: string,
  item: Partial<CreateLaundryItem> & { vendor_id: string },
): Promise<LaundryItemResponse> => {
  try {
    const vendorId = item.vendor_id;

    let uploadedImages = item.images;
    if (item.images) {
      uploadedImages = await normalizeMenuImages(
        item.images,
        vendorId,
        MENU_IMAGES_BUCKET,
      );
    }

    const payload: any = {
      ...item,
    };

    if (uploadedImages) {
      payload.images = uploadedImages;
    }

    const { data, error } = await supabase
      .from(LAUNDRY_TABLE)
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update laundry item");
    }

    if (!data) {
      throw new Error("Laundry item not found");
    }

    return data as LaundryItemResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while updating laundry item");
  }
};

export const softDeleteLaundryItem = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(LAUNDRY_TABLE)
      .update({ is_deleted: true })
      .eq("id", id);

    if (error) {
      throw new Error(error.message || "Failed to delete laundry item");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while deleting laundry item");
  }
};

export const fetchVendorLaundryItems = async (
  vendorId: string,
): Promise<LaundryItemResponse[]> => {
  try {
    const { data, error } = await supabase
      .from(LAUNDRY_TABLE)
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("is_deleted", false);

    if (error) {
      throw new Error(error.message || "Failed to fetch laundry items");
    }

    return (data || []) as LaundryItemResponse[];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      "An unexpected error occurred while fetching laundry items",
    );
  }
};

/**
 * Initiates a laundry request.
 *
 * @param item - The laundry details (OrderCreate)
 * @returns Promise<InitiatePaymentResponse>
 */
export const initiateLaundryOrderPayment = async (
  item: OrderCreate,
): Promise<InitiatePaymentResponse> => {
  try {
    const response = await apiClient.post(`${BASE_URL}/initiate-payment`, item);

    if (!response.ok) {
      const errorData = response.data as any;
      throw new Error(
        errorData?.detail ||
          errorData?.message ||
          "Failed to initiate laundry request",
      );
    }

    return response.data as InitiatePaymentResponse;
  } catch (error) {
    throw error;
  }
};

import {
  CategoryResponse,
  CreateRestaurantMenuItem,
  RestaurantMenuItemResponse,
  RestaurantOrderCreate,
  UpdateRestaurantMenuItem,
} from "@/types/item-types";
import { InitiatePaymentResponse } from "@/types/payment-types";
import { apiClient } from "@/utils/client";
import { supabase } from "@/utils/supabase";

const FOOD_TABLE = "food_items";
const BASE_URL = "/food";

const MENU_IMAGES_BUCKET = "menu-images";

export const fetchCategories = async (): Promise<CategoryResponse[]> => {
  const { data, error } = await supabase.from("food_categories").select("*");

  if (error) {
    throw new Error(error.message || "Failed to fetch categories");
  }

  return (data || []) as CategoryResponse[];
};

export const normalizeMenuImages = async (
  images: string[] = [],
  vendorId: string,
  bucket: string,
): Promise<string[]> => {
  const normalized: string[] = [];

  for (let index = 0; index < images.length; index++) {
    const uri = images[index];

    // If it's already a remote URL, just keep it
    if (/^https?:\/\//i.test(uri)) {
      normalized.push(uri);
      continue;
    }

    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const ext = uri.split(".").pop() || "jpg";
      const filePath = `${vendorId}/${Date.now()}_${index}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, bytes, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (publicData?.publicUrl) {
        normalized.push(publicData.publicUrl);
      }
    } catch (error) {
      console.error("Error uploading menu image", error);
      // Skip failing image but continue with others
    }
  }

  return normalized;
};

export const createFoodItem = async (
  item: CreateRestaurantMenuItem,
): Promise<RestaurantMenuItemResponse> => {
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
      sizes: item.sizes ?? [],
      sides: item.sides ?? [],
      images: uploadedImages,
      restaurant_item_type: item.restaurant_item_type,
      is_available: item.is_available ?? true,
      is_deleted: item.is_deleted ?? false,
      category_id: item.category_id ?? null,
    };

    const { data, error } = await supabase
      .from(FOOD_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create menu item");
    }

    return data as RestaurantMenuItemResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while creating menu item");
  }
};

export const fetchFoodItem = async (
  id: string,
): Promise<RestaurantMenuItemResponse> => {
  try {
    const { data, error } = await supabase
      .from(FOOD_TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message || "Failed to fetch menu item");
    }

    if (!data) {
      throw new Error("Menu item not found");
    }

    return data as RestaurantMenuItemResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while fetching menu item");
  }
};

export const updateFoodItem = async (
  id: string,
  item: UpdateRestaurantMenuItem,
): Promise<RestaurantMenuItemResponse> => {
  try {
    const vendorId = item.vendor_id;

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
      sizes: item.sizes ?? [],
      sides: item.sides ?? [],
      images: uploadedImages,
      restaurant_item_type: item.restaurant_item_type,
      is_available: item.is_available,
      is_deleted: item.is_deleted,
      category_id: item.category_id ?? null,
    };

    const { data, error } = await supabase
      .from(FOOD_TABLE)
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update menu item");
    }

    if (!data) {
      throw new Error("Menu item not found");
    }

    return data as RestaurantMenuItemResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while updating menu item");
  }
};

export const softDeleteFoodItem = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(FOOD_TABLE)
      .update({ is_deleted: true })
      .eq("id", id);

    if (error) {
      throw new Error(error.message || "Failed to delete menu item");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while deleting menu item");
  }
};

export const fetchVendorMenuItems = async (
  vendorId: string,
  restaurantItemType?: "FOOD" | "DRINK" | "EXTRAS",
): Promise<RestaurantMenuItemResponse[]> => {
  try {
    let query = supabase
      .from(FOOD_TABLE)
      .select("*, category:food_categories(name)")
      .eq("vendor_id", vendorId)
      .eq("is_deleted", false);

    if (restaurantItemType) {
      query = query.eq("restaurant_item_type", restaurantItemType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || "Failed to fetch menu items");
    }

    return (data || []) as RestaurantMenuItemResponse[];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while fetching menu items");
  }
};

/**
 * Initiates a food request.
 *
 * @param item - The food details (OrderCreate)
 * @returns Promise<InitiatePaymentResponse>
 */
export const initiateRestaurantOrderPayment = async (
  item: RestaurantOrderCreate,
): Promise<InitiatePaymentResponse> => {
  try {
    const response = await apiClient.post(`${BASE_URL}/initiate-payment`, item);

    if (!response.ok) {
      const errorData = response.data as any;
      throw new Error(
        errorData?.detail ||
          errorData?.message ||
          "Failed to initiate food request",
      );
    }

    return response.data as InitiatePaymentResponse;
  } catch (error) {
    throw error;
  }
};

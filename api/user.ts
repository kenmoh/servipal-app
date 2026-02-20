import {
  CreateRiderData,
  LocationCoordinates,
  NearbyRidersResponse,
  NearbyVendorsResponse,
  RiderResponse,
  UpdateLocationResponse,
  UpdateRiderData,
  UserProfile,
  UserProfileUpdate,
  WalletResponse,
} from "@/types/user-types";
import { apiClient } from "@/utils/client";

import { supabase } from "@/utils/supabase";
import { ApiResponse } from "apisauce";
import { ErrorResponse } from "./auth";

const BASE_URL = "/users";
const AUTH_URL = "/auth";

export interface ImageData {
  uri: string;
  type: string;
  name: string;
}

export async function fetchProfileWithReviews(
  userId: string,
  reviewLimit: number = 50,
): Promise<UserProfile> {
  const { data, error } = await supabase.rpc("get_user_profile_with_reviews", {
    target_user_id: userId,
    review_limit: reviewLimit,
  });

  if (error) {
    console.error("Failed to fetch user profile:", error);
  }

  return data as UserProfile;
}

export const fetchProfile = async (userId: string): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as UserProfile;
};

// Image upload
export type ImageFieldType = "profile_image_url" | "backdrop_image_url";

export const uploadImage = async (
  imageData: ImageData,
  fieldType: ImageFieldType,
): Promise<{ publicUrl: string }> => {
  try {
    // Check session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const userId = session.user.id;
    const fileExtension = imageData.name.split(".").pop() || "jpg";

    // Different paths based on image type
    const fileName = fieldType === "profile_image_url" ? "profile" : "backdrop";
    const filePath = `${userId}/${fileName}.${fileExtension}`;

    // Fetch image as ArrayBuffer
    const response = await fetch(imageData.uri);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Convert to ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload using Uint8Array
    const { data, error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(filePath, uint8Array, {
        contentType: imageData.type || "image/jpeg",
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload image");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("profile-images")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update the appropriate field in profiles table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ [fieldType]: publicUrl })
      .eq("id", userId);

    if (updateError) {
      console.warn(`Failed to update ${fieldType}:`, updateError);
    } else {
      console.log(`${fieldType} updated successfully`);
    }

    return { publicUrl };
  } catch (error) {
    throw error;
  }
};

interface NotificationTokenResponse {
  notification_token: string;
}

export const fetchRider = async (riderId: string): Promise<RiderResponse> => {
  try {
    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    // Fetch rider using rpc
    const { data, error } = await await supabase.rpc("get_rider_with_reviews", {
      rider_id: riderId,
      review_limit: 25,
    });

    if (error) {
      throw new Error(error.message || "Failed to fetch profile");
    }

    if (!data) {
      throw new Error("Profile not found");
    }

    return data as RiderResponse;
  } catch (error) {
    throw error;
  }
};

export const getCurrentUserProfile = async (): Promise<UserProfile> => {
  try {
    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const userId = session.user.id;

    // Fetch profile from profiles table
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      throw new Error(error.message || "Failed to fetch profile");
    }

    if (!data) {
      throw new Error("Profile not found");
    }

    return data as UserProfile;
  } catch (error) {
    throw error;
  }
};

export const updateCurrentUserProfile = async (
  profileData: UserProfileUpdate,
): Promise<UserProfile> => {
  try {
    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const userId = session.user.id;
    // Fetch profile from profiles table
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...profileData,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update profile");
    }

    if (!data) {
      throw new Error("Profile not found");
    }

    return data as UserProfile;
  } catch (error) {
    throw error;
  }
};

export const fetchDispatchRiders = async (): Promise<RiderResponse[]> => {
  try {
    // 1. Get current authenticated user (should be a dispatcher)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const dispatcherId = session.user.id;

    // Call the RPC function
    const { data: riders, error: fetchError } = await supabase.rpc(
      "get_my_dispatch_riders",
      {
        dispatch_user_id: dispatcherId,
      },
    );

    if (fetchError) {
      throw new Error(fetchError.message || "Failed to load riders");
    }

    return riders as RiderResponse[];
  } catch (error) {
    throw error;
  }
};

// vendors.ts

interface GetNearbyVendorsOptions {
  userType: "RESTAURANT_VENDOR" | "LAUNDRY_VENDOR";
  maxDistanceKm?: number;
  page?: number;
  pageSize?: number;
  minRating?: number;
  searchQuery?: string;
}

export async function getNearbyVendors(
  options: GetNearbyVendorsOptions,
): Promise<NearbyVendorsResponse | null> {
  const {
    userType,
    maxDistanceKm = 100,
    page = 0,
    pageSize = 20,
    minRating,
    searchQuery,
  } = options;

  const { data, error } = await supabase.rpc("get_nearby_vendors", {
    p_user_type: userType,
    max_distance_km: maxDistanceKm,
    page_size: pageSize,
    page_offset: page * pageSize,
    min_rating: minRating ?? null,
    p_search_query: searchQuery ?? null,
  });

  if (error) {
    console.error("Failed to fetch nearby vendors:", error);
    return null;
  }

  return data as NearbyVendorsResponse;
}

export const searchNearbyRestaurants = (
  query: string,
  options?: Omit<GetNearbyVendorsOptions, "userType" | "searchQuery">,
) =>
  getNearbyVendors({
    ...options,
    userType: "RESTAURANT_VENDOR",
    searchQuery: query,
  });

export const searchNearbyLaundry = (
  query: string,
  options?: Omit<GetNearbyVendorsOptions, "userType" | "searchQuery">,
) =>
  getNearbyVendors({
    ...options,
    userType: "LAUNDRY_VENDOR",
    searchQuery: query,
  });

export const fetchServiceProviders = async (
  userId: string,
  userType: string,
  searchQuery?: string,
): Promise<UserProfile[]> => {
  try {
    // Ensure user is authenticated
    const { data: session, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    // Get vendors by distance and search query
    const { data, error } = await supabase.rpc("get_vendors_by_distance", {
      p_user_id: userId,
      p_user_type: userType,
      p_search_query: searchQuery || null,
    });

    if (error) {
      throw new Error(error.message || "Failed to fetch laundry users");
    }

    return data as UserProfile[];
  } catch (error) {
    throw error;
  }
};

export const fetchUserWallet = async (
  userId: string,
): Promise<WalletResponse> => {
  try {
    // Ensure user is authenticated
    const { data: session, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    // Get user wallet via rpc
    const { data, error } = await supabase.rpc("get_user_wallet_details", {
      p_user_id: userId,
    });

    if (error) {
      throw new Error(error.message || "Failed to fetch user wallet");
    }

    return data as WalletResponse;
  } catch (error) {
    throw error;
  }
};

export const createRiderByDispatcher = async (
  riderData: CreateRiderData,
): Promise<RiderResponse> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const response: ApiResponse<RiderResponse | ErrorResponse> =
      await apiClient.post(`${BASE_URL}/riders`, riderData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    if (
      !response.ok ||
      (response.data &&
        typeof response.data === "object" &&
        "detail" in response.data)
    ) {
      const errorMessage =
        response.data &&
        typeof response.data === "object" &&
        "detail" in response.data
          ? response.data.detail
          : "Error creating rider.";
      throw new Error(errorMessage);
    }
    if (!response.data) {
      throw new Error("No data received from server");
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteRider = async (riderId: string): Promise<null> => {
  try {
    const response: ApiResponse<null | ErrorResponse> = await apiClient.delete(
      `${BASE_URL}/${riderId}/delete`,
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
          : "Error deleting rider.";
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

export const updateRiderByDispatcher = async (
  riderId: string,
  updates: UpdateRiderData,
): Promise<RiderResponse> => {
  try {
    // 1. Get current session (must be dispatcher)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const dispatcherId = session.user.id;

    // Confirm current user is a dispatcher
    const { data: profile, error: roleError } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", dispatcherId)
      .single();

    if (roleError || !profile || profile.user_type !== "DISPATCH") {
      throw new Error("Only dispatchers can update riders");
    }

    // 2. Update rider — only if it belongs to this dispatcher
    const { data, error } = await supabase
      .from("profiles")
      .update({
        user_type: "RIDER",
        dispatcher_id: dispatcherId,
        full_name: updates.full_name,
        phone_number: updates.phone_number,
        bike_number: updates.bike_number,
      })
      .eq("id", riderId)
      .eq("dispatcher_id", dispatcherId)
      .eq("user_type", "RIDER")
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update rider");
    }

    if (!data) {
      throw new Error("Rider not found or access denied");
    }

    return data as RiderResponse;
  } catch (error) {
    throw error;
  }
};

export const toggleRiderBlockStatus = async (
  riderId: string,
): Promise<RiderResponse> => {
  const { data, error } = await supabase.rpc("toggle_rider_block", {
    rider_uuid: riderId,
  });

  if (error) throw new Error(error.message || "Failed to toggle block status");
  return data as RiderResponse;
};

// update user location
export const updatecurrentUserLocation = async (
  coordinates: LocationCoordinates,
): Promise<UpdateLocationResponse> => {
  try {
    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const userId = session.user.id;

    // Validate coordinates
    if (
      coordinates.latitude < -90 ||
      coordinates.latitude > 90 ||
      coordinates.longitude < -180 ||
      coordinates.longitude > 180
    ) {
      throw new Error("Invalid coordinates");
    }

    // Call the RPC function
    const { data, error } = await supabase.rpc("update_user_location", {
      user_id: userId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });

    if (error) {
      throw new Error(error.message || "Failed to update location");
    }

    return data as UpdateLocationResponse;
  } catch (error) {
    throw error;
  }
};

// Get user location from profile
export const getUserLocation =
  async (): Promise<LocationCoordinates | null> => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("User not authenticated");
      }

      const userId = session.user.id;

      // Fetch location using PostGIS ST_X and ST_Y functions
      const { data, error } = await supabase.rpc("get_user_location", {
        user_id: userId,
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch location");
      }

      return data;
    } catch (error) {
      return null;
    }
  };

interface GetNearbyRidersOptions {
  maxDistanceKm?: number;
  page?: number;
  pageSize?: number;
}

export const getNearbyRiders = async (
  options: GetNearbyRidersOptions = {},
): Promise<NearbyRidersResponse> => {
  const { maxDistanceKm = 100, page = 0, pageSize = 20 } = options;
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }
    // Call RPC function
    const { data, error } = await supabase.rpc("get_nearby_riders_new", {
      max_distance_km: maxDistanceKm,
      page_size: pageSize,
      page_offset: page * pageSize,
    });

    if (error) {
      throw new Error(error.message || "Failed to fetch nearby riders");
    }

    return data as NearbyRidersResponse;
  } catch (error) {
    throw error;
  }
};

/*
LEGACY
*/
// export const getNearbyRiders = async (
//   userId: string,
// ): Promise<RiderResponse[]> => {
//   try {
//     const {
//       data: { session },
//       error: sessionError,
//     } = await supabase.auth.getSession();

//     if (sessionError || !session) {
//       throw new Error("User not authenticated");
//     }
//     // Call RPC function
//     const { data, error } = await supabase.rpc("get_nearby_riders", {
//       p_user_id: userId,
//     });

//     if (error) {
//       throw new Error(error.message || "Failed to fetch nearby riders");
//     }

//     return data as RiderResponse[];
//   } catch (error) {
//     throw error;
//   }
// };

export const getRiderProfile = async (
  riderId: string,
): Promise<RiderResponse> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", riderId)
      .single();

    if (error) {
      throw new Error(error.message || "Failed to fetch rider profile");
    }

    return data as RiderResponse;
  } catch (error) {
    throw error;
  }
};

export const registerPushToken = async (
  token: string,
  platform: string,
): Promise<void> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const userId = session.user.id;

    // Validate platform
    if (!["ios", "android"].includes(platform)) {
      throw new Error("Invalid platform. Must be ios or android");
    }

    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token: token,
        platform: platform,
      },
      {
        onConflict: "user_id,token",
        ignoreDuplicates: false,
      },
    );

    if (error) {
      console.error("Push token registration error:", error);
      throw new Error(error.message || "Failed to register push token");
    }
  } catch (error) {
    99;
    throw error;
  }
};

// Reset password

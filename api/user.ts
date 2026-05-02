import {
  CreateRiderData,
  DispatchRidersResponse,
  GetUserWalletDetailsResponse,
  LocationCoordinates,
  NearbyVendorsResponse,
  PayoutAccount,
  RiderResponse,
  UpdateLocationResponse,
  UpdateRiderData,
  UserProfile,
  UserProfileUpdate,
  VendorAvailability,
  VendorAvailabilityInput,
  WalletResponse,
} from "@/types/user-types";
import { apiClient } from "@/utils/client";
import { supabase } from "@/utils/supabase";
import * as Sentry from "@sentry/react-native";
import { ApiResponse } from "apisauce";
import { fetch } from "expo/fetch";
import { ErrorResponse } from "./auth";
import { RequireDelivery } from "@/types/order-types";

const BASE_URL = "/users";
const BENEFICIARIES_URL = "/beneficiaries";

export interface ImageData {
  uri: string;
  type: string;
  name: string;
}

export async function fetchProfileWithReviews(
  userId: string,
  reviewLimit: number = 50,
): Promise<UserProfile> {
  const [{ data: rpcData, error }, { data: profile }] = await Promise.all([
    supabase.rpc("get_user_profile_with_reviews", {
      target_user_id: userId,
      review_limit: reviewLimit,
    }),
    supabase
      .from("profiles")
      .select("enable_reservation")
      .eq("id", userId)
      .single(),
  ]);

  if (error) {
    Sentry.captureException(error, {
      tags: { action: "fetch_profile_with_reviews" },
    });
  }

  return {
    ...(rpcData as UserProfile),
    enable_reservation: profile?.enable_reservation,
  } as UserProfile;
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

interface ProfileImageURL {
  backdrop_image_url: string;
  profile_image_url: string;
  account_status: string;
}

export const fetchProfileImageUrls = async (): Promise<ProfileImageURL> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) {
    throw Error(sessionError.message);
  }
  const userId = session?.user.id;
  const { data, error } = await supabase
    .from("profiles")
    .select("backdrop_image_url, profile_image_url, account_status")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as ProfileImageURL;
};

// Image upload
export type ImageFieldType = "profile_image_url" | "backdrop_image_url";

export interface ImageData {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export const uploadImage = async (
  imageData: ImageData,
  fieldType: ImageFieldType,
): Promise<{ publicUrl: string }> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("User not authenticated");

    const userId = session.user.id;
    const uri = imageData.uri;

    if (/^https?:\/\//i.test(uri)) {
      return { publicUrl: uri };
    }

    const fileExt = imageData.name?.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = fieldType === "profile_image_url" ? "profile" : "backdrop";
    const filePath = `${userId}/${fileName}.${fileExt}`;

    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(filePath, bytes, {
        contentType: imageData.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      Sentry.captureException(uploadError, {
        tags: { action: "fetch_profile_with_reviews" },
      });
      throw uploadError;
    }

    const { data: publicData } = supabase.storage
      .from("profile-images")
      .getPublicUrl(filePath);

    if (!publicData?.publicUrl) {
      throw new Error("Failed to get public URL");
    }

    const timestamp = Date.now();
    const publicUrl = `${publicData.publicUrl}?t=${timestamp}`;

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        [fieldType]: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      Sentry.captureException(uploadError, {
        tags: { action: "fetch_profile_with_reviews" },
      });
      throw updateError;
    }

    return { publicUrl };
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: { action: "fetch_profile_with_reviews" },
    });
    throw error;
  }
};

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
    const { data, error } = await await supabase.rpc("get_rider_by_id", {
      rider_id: riderId,
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

// export const fetchRider = async (riderId: string): Promise<RiderResponse> => {
//   try {
//     // Get current session
//     const {
//       data: { session },
//       error: sessionError,
//     } = await supabase.auth.getSession();

//     if (sessionError || !session) {
//       throw new Error("User not authenticated");
//     }

//     // Fetch rider using rpc
//     const { data, error } = await await supabase.rpc("get_rider_with_reviews", {
//       rider_id: riderId,
//       review_limit: 25,
//     });

//     if (error) {
//       throw new Error(error.message || "Failed to fetch profile");
//     }

//     if (!data) {
//       throw new Error("Profile not found");
//     }

//     return data as RiderResponse;
//   } catch (error) {
//     throw error;
//   }
// };

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

// export const fetchDispatchRiders = async (): Promise<RiderResponse[]> => {
//   try {
//     // 1. Get current authenticated user (should be a dispatcher)
//     const {
//       data: { session },
//       error: sessionError,
//     } = await supabase.auth.getSession();

//     if (sessionError || !session) {
//       throw new Error("User not authenticated");
//     }

//     const dispatcherId = session.user.id;

//     // Call the RPC function
//     const { data: riders, error: fetchError } = await supabase.rpc(
//       "get_my_dispatch_riders",
//       {
//         dispatch_user_id: dispatcherId,
//       },
//     );

//     if (fetchError) {
//       throw new Error(fetchError.message || "Failed to load riders");
//     }

//     return riders as RiderResponse[];
//   } catch (error) {
//     throw error;
//   }
// };

export const fetchDispatchRiders =
  async (): Promise<DispatchRidersResponse> => {
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
        "get_riders_by_dispatcher",
        {
          dispatcher_uuid: dispatcherId,
          page_size: 20,
          page_offset: 0,
        },
      );

      if (fetchError) {
        throw new Error(fetchError.message || "Failed to load riders");
      }

      return riders as DispatchRidersResponse;
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
    maxDistanceKm = 1000000,
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
    p_search_query: searchQuery && searchQuery.length >= 3 ? searchQuery : null,
  });

  if (error) {
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

export const fetchUserTransactions = async (
  userId: string,
  pageParam: number = 0,
  limit: number = 15,
): Promise<GetUserWalletDetailsResponse> => {
  try {
    // Ensure user is authenticated
    const { data: session, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    // Get user wallet via rpc
    const { data, error } = await supabase.rpc(
      "get_user_wallet_details_paginated",
      {
        p_user_id: userId,
        p_limit: limit,
        p_offset: pageParam * limit,
      },
    );

    if (error) {
      throw new Error(error.message || "Failed to fetch user wallet");
    }

    return data as GetUserWalletDetailsResponse;
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

/**
 * Deletes the current user's account using a Supabase RPC function.
 * This RPC should handle deleting the profile and the auth user record.
 *
 * @param feedback - Optional reason for deleting the account
 */
export const deleteUserAccount = async (feedback?: string): Promise<void> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase.rpc("delete_user_account", {
      p_feedback: feedback || null,
    });

    if (error) {
      throw new Error(error.message || "Failed to delete account");
    }

    // Sign out the user locally after successful deletion
    await supabase.auth.signOut();
  } catch (error) {
    throw error;
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
    Sentry.logger.info(
      `[updatecurrentUserLocation] entering... lat=${coordinates.latitude} lng=${coordinates.longitude}`,
    );

    // ── Auth Hardening for Background Cold Boots ──────────────────────────
    // In production (EAS builds), background tasks may wake up before the
    // Supabase session is hydrated from storage. We retry getUser() a few times.
    let userData = null;
    let userError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const resp = await supabase.auth.getSession();
      userData = resp.data;
      userError = resp.error;

      if (userData?.session?.user.id) break;

      if (attempt < 3) {
        Sentry.addBreadcrumb({
          category: "auth",
          message: `[updatecurrentUserLocation] getSession() attempt ${attempt} failed — retrying in 1s`,
          level: "info",
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // If getSession() still fails, attempt a session refresh as a final fallback
    if (userError || !userData?.session) {
      Sentry.logger.warn(
        `[updatecurrentUserLocation] All getSession() attempts failed (${userError?.message}) — attempting refreshSession`,
      );
      Sentry.addBreadcrumb({
        category: "auth",
        message: `Final fallback: attempting refreshSession`,
        level: "warning",
      });

      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession();

      if (refreshError || !refreshData?.session) {
        Sentry.logger.error(
          `[updatecurrentUserLocation] refreshSession failed: ${refreshError?.message || "No session data"}`,
        );
        throw new Error(
          `User not authenticated — getUser: ${userError?.message}, refresh: ${refreshError?.message}`,
        );
      }
      userData = { session: refreshData.session };

      Sentry.logger.info(
        `[updatecurrentUserLocation] refreshSession succeeded for ${refreshData.session.user.id}`,
      );
    }

    const userId = userData?.session?.user.id;

    // Validate coordinates
    if (
      coordinates.latitude < -90 ||
      coordinates.latitude > 90 ||
      coordinates.longitude < -180 ||
      coordinates.longitude > 180
    ) {
      Sentry.logger.error(
        `[updatecurrentUserLocation] Invalid coordinates: lat=${coordinates.latitude} lng=${coordinates.longitude}`,
      );
      throw new Error(
        `Invalid coordinates: lat=${coordinates.latitude} lng=${coordinates.longitude}`,
      );
    }

    // Call the RPC function
    Sentry.logger.info(
      `[updatecurrentUserLocation] Calling RPC for userId=${userId}`,
    );
    const { data, error } = await supabase.rpc("update_user_location", {
      user_id: userId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });

    Sentry.logger.info(
      `[updatecurrentUserLocation] RPC response: ${JSON.stringify(data)}`,
    );
    if (error) {
      Sentry.logger.error(
        `[updatecurrentUserLocation] RPC error: ${error.message}`,
      );
      throw new Error(error.message || "Failed to update location");
    }

    Sentry.logger.info(
      `[updatecurrentUserLocation] RPC success for userId=${userId}`,
    );
    Sentry.addBreadcrumb({
      category: "location",
      message: `[updatecurrentUserLocation] RPC success for userId=${userId}`,
      level: "info",
      data: coordinates,
    });

    return data as UpdateLocationResponse;
  } catch (error: any) {
    Sentry.logger.error(`[updatecurrentUserLocation] Error: ${error}`);
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
): Promise<DispatchRidersResponse> => {
  const { maxDistanceKm = 1000000, page = 0, pageSize = 20 } = options;
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

    return data as DispatchRidersResponse;
  } catch (error) {
    throw error;
  }
};

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
      throw new Error(error.message || "Failed to register push token");
    }
  } catch (error) {
    throw error;
  }
};

export const updateBackgroundLocationStatus = async (
  foregroundStatus: "granted" | "denied" | "undetermined",
  backgroundStatus: "granted" | "denied" | "undetermined",
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

    const { error } = await supabase
      .from("profiles")
      .update({
        foreground_location_permission: foregroundStatus,
        background_location_permission: backgroundStatus,
      })
      .eq("id", userId);

    if (error) {
      throw new Error(
        error.message || "Failed to update background location status",
      );
    }
  } catch (error) {
    throw error;
  }
};

interface Bank {
  id: number;
  name: string;
  code: string;
}

export const fetchBanks = async (): Promise<Bank[]> => {
  try {
    const response = await apiClient.get("/banks");

    return response.data as Bank[];
  } catch (error) {
    throw error;
  }
};

interface ResolveBank {
  account_number: string;
  account_name: string;
}

export const resolveBank = async (
  accountNumber: string,
  bankCode: string,
): Promise<ResolveBank> => {
  try {
    const response = await apiClient.post(`/banks/resolve`, {
      account_number: accountNumber,
      account_bank: bankCode,
    });

    return response.data as ResolveBank;
  } catch (error) {
    throw error;
  }
};

export async function upsertVendorAvailabilityBulk(
  availability: VendorAvailabilityInput[],
) {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error("User not authenticated");
    }

    const vendorId = session.session?.user?.id;
    const { data, error } = await supabase.rpc(
      "upsert_vendor_availability_bulk",
      {
        p_availability: availability,
        p_vendor_id: vendorId,
      },
    );

    if (error) {
      console.error("RPC Error:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error("Upsert availability failed:", err);
    throw err;
  }
}

/**
 * Available slot returned from DB
 */
export interface AvailableSlot {
  slot_start: string; // ISO timestamp
  slot_end: string; // ISO timestamp
  available_capacity: number;
  express_fee?: number;
}

/**
 * Get vendor available slots
 */
export async function getAvailableSlots(
  vendor_id: string,
  delivery_option: RequireDelivery,
  date: string,
): Promise<AvailableSlot[]> {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_vendor_id: vendor_id,
    p_type: delivery_option,
    p_date: date,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AvailableSlot[];
}

/**
 * Fetch vendor availability rows (for express fee / availability info)
 */
export async function fetchVendorAvailability(): Promise<VendorAvailability[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    throw new Error("User not authenticated");
  }

  const vendorId = session.session?.user?.id;
  const { data, error } = await supabase
    .from("vendor_availability")
    .select("*")
    .eq("vendor_id", vendorId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VendorAvailability[];
}

/**
 * Fetch vendor availability rows (for express fee / availability info)
 */
// export async function getAvailableSlots(vendorId: string): Promise<AvailableSlot[]> {
//   const { data: session } = await supabase.auth.getSession();
//   if (!session.session) {
//     throw new Error("User not authenticated");
//   }

//   const { data, error } = await supabase
//     .from("available_slots")
//     .select("*")
//     .eq("vendor_id", vendorId);

//   if (error) {
//     throw new Error(error.message);
//   }

//   console.log("Available slots:", data);
//   return (data ?? []) as AvailableSlot[];
// }

export const createPayoutAccount = async (payoutAccount: PayoutAccount) => {
  try {
    const response = await apiClient.post(BENEFICIARIES_URL, payoutAccount, {
      headers: {
        "Content-Type": "application/json",
        ...(payoutAccount.idempotencyKey && {
          "X-Idempotency-Key": payoutAccount.idempotencyKey,
        }),
      },
    });

    return response.data;
  } catch (err) {
    console.error("Create payout account failed:", err);
    throw err;
  }
};

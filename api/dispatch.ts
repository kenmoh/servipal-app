import type {
  DispatchQuote,
  DispatchRider,
  DispatchRiderListResponse,
} from "@/types/dispatch";
import { apiClient } from "@/utils/client";
import type { ApiResponse } from "apisauce";

const unwrap = async <T>(
  response: ApiResponse<unknown>,
  fallback: string,
): Promise<T> => {
  if (!response.ok) {
    const body = response.data as
      | { detail?: unknown; message?: string }
      | null
      | undefined;
    const detail = body?.detail;
    let message = "";
    if (typeof detail === "string") {
      message = detail;
    } else if (detail && typeof detail === "object") {
      message =
        (detail as { message?: string }).message ||
        (detail as { msg?: string }).msg ||
        "";
    } else {
      message = body?.message || "";
    }
    throw new Error(message || fallback);
  }
  return response.data as T;
};

/**
 * Riders this vendor can actually reach: an ACCEPTED dispatch connection
 * plus a rider online and in range. An empty array means External delivery
 * is withheld from the cart, so the kill switch needs no separate check.
 */
export const getDispatchRiders = async (
  vendorId: string,
  maxDistanceKm?: number,
): Promise<DispatchRider[]> => {
  const response = await unwrap<DispatchRiderListResponse>(
    await apiClient.get("/dispatch/riders", {
      vendor_id: vendorId,
      ...(maxDistanceKm ? { max_distance_km: maxDistanceKm } : {}),
    }),
    "Could not load delivery riders",
  );
  return response.data;
};

/**
 * Server-recomputed fee for the map route distance the UI computed.
 * Echo `delivery_fee` back as `quoted_fee` at payment (AC-7).
 */
export const quoteDispatchDelivery = async (
  vendorId: string,
  distanceKm: number,
  duration?: string | null,
): Promise<DispatchQuote> =>
  await unwrap<DispatchQuote>(
    await apiClient.post("/delivery/quote", {
      vendor_id: vendorId,
      distance_km: distanceKm,
      ...(duration ? { duration } : {}),
    }),
    "Could not quote delivery",
  );

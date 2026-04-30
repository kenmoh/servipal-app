// services/reservation.service.ts
import { InitiatePaymentResponse } from "@/types/payment-types";
import {
  AvailableSlot,
  BookingStatus,
  Reservation,
  ReservationRulesInput,
  ReservationRulesOutput,
  ReservationSettingsInput,
  ReservationSettingsOutput,
  CreateReservationIntent,
  CreateServingPeriod,
  GetServingPeriod,
  UpdateServingPeriod,
  ReservationPolicy,
  GetUserReservationsResponse,
} from "@/types/reservation-types";
import { apiClient } from "@/utils/client";
import { supabase } from "@/utils/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

const INTENT_URL = "/reservations";

async function getVendorId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("User not authenticated");
  }

  return session.user.id;
}

/**
 * Add or update vendor reservation settings
 */
export async function upsertReservationSettings(
  settingsData: ReservationSettingsInput,
): Promise<ReservationSettingsOutput> {
  const vendorId = await getVendorId();
  const { data, error } = await supabase
    .from("reservation_settings")
    .upsert(
      { ...settingsData, vendor_id: vendorId },
      { onConflict: "vendor_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(`Upsert failed: ${error.message}`);
  return data as ReservationSettingsOutput;
}

/**
 * Create vendor reservation rules
 */
export async function createReservationRules(
  rulesData: ReservationRulesInput,
): Promise<ReservationRulesOutput> {
  const vendorId = await getVendorId();
  const { data, error } = await supabase
    .from("reservation_rules")
    .insert({ ...rulesData, vendor_id: vendorId })
    .select("*")
    .single();

  if (error) throw new Error(`Upsert failed: ${error.message}`);
  return data as ReservationRulesOutput;
}

/**
 * List vendor reservation rules
 *
 */

export async function getvendorReservationRules(): Promise<
  ReservationRulesOutput[]
> {
  const vendorId = await getVendorId();

  const { data, error } = await supabase
    .from("reservation_rules")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return (data || []) as ReservationRulesOutput[];
}

/**
 Get vendor reservation rule

*/

export const getReservationPolicy = async ({
  vendorId,
  dayOfWeek,
  partySize,
}: {
  vendorId: string;
  dayOfWeek: number; // 0–6 (Sunday–Saturday)
  partySize: number;
}): Promise<ReservationPolicy> => {
  const { data, error } = await supabase.rpc("get_reservation_policy", {
    p_vendor_id: vendorId,
    p_day_of_week: dayOfWeek,
    p_party_size: partySize,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as ReservationPolicy;
};

export async function getVendorReservationRule(
  ruleId: string,
): Promise<ReservationRulesOutput> {
  const vendorId = await getVendorId();

  const { data, error } = await supabase
    .from("reservation_rules")
    .select("*")
    .eq("id", ruleId)
    .eq("vendor_id", vendorId)
    .single();

  if (error) throw new Error(`Rule not found: ${error.message}`);
  return data as ReservationRulesOutput;
}

/**
 * Update vendor reservation rules
 */
export async function updateReservationRules(
  ruleId: string,
  rulesData: ReservationRulesInput,
): Promise<ReservationRulesOutput> {
  const vendorId = await getVendorId();
  const { data: result, error } = await supabase
    .from("reservation_rules")
    .update(rulesData)
    .eq("id", ruleId)
    .eq("vendor_id", vendorId)
    .select("*")
    .single();

  if (error) throw new Error(`Update failed: ${error.message}`);
  return result as ReservationRulesOutput;
}

/**
 * Delete vendor reservation rules
 */
export async function deleteReservationRules(ruleId: string): Promise<void> {
  const vendorId = await getVendorId();

  const { error } = await supabase
    .from("reservation_rules")
    .delete()
    .eq("id", ruleId)
    .eq("vendor_id", vendorId);

  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/**
 * Get vendor reservation settings
 */
export async function getReservationSettings(): Promise<ReservationSettingsOutput | null> {
  const vendorId = await getVendorId();
  const { data, error } = await supabase
    .from("reservation_settings")
    .select("*")
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data as ReservationSettingsOutput | null;
}

/**
 * Get all reservations for a vendor
 */
export async function getVendorReservations(): Promise<Reservation[]> {
  const vendorId = await getVendorId();
  const { data, error } = await supabase
    .from("restaurant_reservations")
    .select("*, customer:profiles(full_name, phone_number, email)")
    .eq("vendor_id", vendorId)
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true });

  if (error) throw new Error(`Fetch reservations failed: ${error.message}`);
  return (data || []) as any[];
}

export async function getUserReservations(params?: {
  page?: number;
  pageSize?: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  status?: string | null;
}): Promise<GetUserReservationsResponse> {
  const {
    page = 1,
    pageSize = 20,
    startDate = null,
    endDate = null,
    status = null,
  } = params ?? {};

  const toTsTz = (d: string | Date | null) =>
    d == null ? null : typeof d === "string" ? d : d.toISOString();

  const { data, error } = await supabase.rpc("get_user_reservations", {
    p_page: page,
    p_page_size: pageSize,
    p_start_date: toTsTz(startDate),
    p_end_date: toTsTz(endDate),
    p_status: status,
  });

  if (error) throw error;
  return data as unknown as GetUserReservationsResponse;
}
/**
 * Update reservation status
 */
export async function updateReservationStatus(
  reservationId: string,
  status: BookingStatus,
): Promise<void> {
  const vendorId = await getVendorId();
  const { error } = await supabase
    .from("reservations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .eq("vendor_id", vendorId);

  if (error) throw new Error(`Update status failed: ${error.message}`);
}

/**
 * Customer: Get current user's reservations
 */
export async function getMyReservations() {
  const { data, error } = await supabase.rpc("get_customer_reservations");
  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data;
}

/**
 * Customer: Get reservation detail
 */
export async function getReservationDetail(id: string) {
  const { data, error } = await supabase.rpc(
    "get_customer_reservation_detail",
    { p_reservation_id: id },
  );
  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data;
}

/**
 * Customer: Get vendor reservation settings
 */
export async function getVendorReservationSettings(
  vendorId: string,
): Promise<ReservationSettingsOutput | null> {
  const { data, error } = await supabase
    .from("reservation_settings")
    .select("*")
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data as ReservationSettingsOutput | null;
}

/**
 * Customer: Get vendor reservation rules
 */
export async function getVendorReservationRules(
  vendorId: string,
): Promise<ReservationRulesOutput[]> {
  const { data, error } = await supabase
    .from("reservation_rules")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return (data || []) as ReservationRulesOutput[];
}

/**
 * Customer: Create a new reservation intent
 */
const BASE_URL = "/reservations";

export async function createReservationIntent(
  data: CreateReservationIntent,
): Promise<InitiatePaymentResponse> {
  try {
    const { data: session, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    const customerId = session?.session?.user?.id;
    const response = await apiClient.post(
      `${BASE_URL}/initiate-payment`,
      { ...data, customer_id: customerId },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = response.data as any;
      throw new Error(
        errorData?.detail ||
          errorData?.message ||
          "Failed to initiate delivery request",
      );
    }

    return response.data as InitiatePaymentResponse;
  } catch (error) {
    throw error;
  }
}

/**
 * Customer: Update an existing reservation
 */
export async function updateReservation(
  id: string,
  data: {
    party_size?: number;
    number_of_children?: number;
    number_of_adult?: number;
    notes?: string;
  },
) {
  const { data: res, error } = await supabase.rpc(
    "update_customer_reservation",
    {
      p_reservation_id: id,
      ...data,
    },
  );
  if (error) throw new Error(`Update failed: ${error.message}`);
  return res;
}

/**
 * Vendor: Get reservations with filters (RPC version)
 */
export async function getVendorReservationsRpc(filters?: {
  start_date?: string;
  end_date?: string;
  status?: string;
}) {
  const { data, error } = await supabase.rpc(
    "get_vendor_reservations",
    filters || {},
  );
  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data;
}

/**
 * Vendor: Get reservation detail
 */
export async function getVendorReservationDetail(id: string) {
  const { data, error } = await supabase.rpc("get_vendor_reservation_detail", {
    p_reservation_id: id,
  });
  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data;
}

/**
 * Vendor: Serving Periods
 */

export async function getVendorServingPeriods(
  vendorId?: string,
): Promise<GetServingPeriod[]> {
  const id = vendorId || (await getVendorId());
  const { data, error } = await supabase.rpc("get_serving_periods", {
    p_vendor_id: id,
  });

  if (error) throw new Error(`Fetch serving periods failed: ${error.message}`);
  return (data || []) as GetServingPeriod[];
}

export async function updateServingPeriod(
  data: UpdateServingPeriod,
): Promise<GetServingPeriod> {
  const { data: res, error } = await supabase.rpc("update_serving_period", {
    p_id: data.id,
    p_period: data.period,
    p_start_time: data.start_time,
    p_end_time: data.end_time,
    p_is_active: data.is_active,
    p_capacity: data.capacity,
  });
  if (error) throw new Error(`Update failed: ${error.message}`);
  return res;
}

export async function deleteServingPeriod(id: string): Promise<void> {
  const vendorId = await getVendorId();
  const { error } = await supabase
    .from("serving_periods")
    .delete()
    .eq("id", id)
    .eq("vendor_id", vendorId);

  if (error) throw new Error(`Delete serving period failed: ${error.message}`);
}

/**
 * Customer: Get available time slots for a vendor on a specific date
 */

export async function getAvailableSlots({
  vendorId,
  date,
  partySize,
}: {
  vendorId: string;
  date: string; // "YYYY-MM-DD"
  partySize: number;
}): Promise<AvailableSlot[]> {
  const { data, error } = await supabase.rpc(
    "get_available_reservation_slots_new",
    {
      p_vendor_id: vendorId,
      p_date: date,
      p_party_size: partySize,
    },
  );

  if (error) throw new Error(`Fetch slots failed: ${error.message}`);
  return data as AvailableSlot[];
}

export async function createServingPeriod(
  servingPeriodData: CreateServingPeriod,
): Promise<GetServingPeriod> {
  const vendorId = await getVendorId();
  const { data, error } = await supabase.rpc("create_serving_period", {
    p_vendor_id: vendorId,
    p_day_of_week: servingPeriodData.day_of_week,
    p_period: servingPeriodData.period,
    p_start_time: servingPeriodData.start_time,
    p_end_time: servingPeriodData.end_time,
    p_capacity: servingPeriodData.capacity,
  });

  if (error) {
    throw new Error(`Create serving period failed: ${error.message}`);
  }
  return data as GetServingPeriod;
}

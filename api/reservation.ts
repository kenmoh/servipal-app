// services/reservation.service.ts
import {
  AvailableSlot,
  BookingStatus,
  PaginatedResult,
  PaginatedTables,
  Reservation,
  ReservationRulesInput,
  ReservationRulesOutput,
  ReservationSettingsInput,
  ReservationSettingsOutput,
  RestaurantAvailability,
  RestaurantAvailabilityInput,
  RestaurantTable,
} from "@/types/reservation-types";
import { supabase } from "@/utils/supabase";

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
    .from("reservations")
    .select("*, customer:profiles(full_name, phone_number, email)")
    .eq("vendor_id", vendorId)
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true });

  if (error) throw new Error(`Fetch reservations failed: ${error.message}`);
  return (data || []) as any[];
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
 * Customer: Create a new reservation
 */
export async function createReservation(data: {
  vendor_id: string;
  table_id?: string;
  reservation_time: string;
  end_time?: string;
  party_size: number;
  number_of_children?: number;
  number_of_adult?: number;
  deposit_required?: number;
  deposit_paid?: number;
  notes?: string;
}) {
  const { data: res, error } = await supabase.rpc(
    "create_customer_reservation",
    data,
  );
  if (error) throw new Error(`Create failed: ${error.message}`);
  return res;
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
 * Vendor: Create a new restaurant table
 */
export async function createRestaurantTable(
  name: string,
  capacity: number,
): Promise<RestaurantTable> {
  const { data, error } = await supabase.rpc("create_restaurant_table", {
    p_name: name,
    p_capacity: capacity,
  });

  if (error) throw new Error(`Create table failed: ${error.message}`);
  return data as RestaurantTable;
}

/**
 * Vendor: List restaurant tables
 */
export async function getVendorTables(
  page = 1,
  pageSize = 20,
  search?: string,
  isActive?: boolean,
): Promise<PaginatedTables> {
  const { data, error } = await supabase.rpc("get_vendor_tables", {
    p_page: page,
    p_page_size: pageSize,
    p_search: search || null,
    p_is_active: isActive ?? null,
  });

  if (error) throw new Error(`Fetch tables failed: ${error.message}`);
  return data as PaginatedTables;
}

/**
 * Vendor: Get restaurant table detail
 */
export async function getRestaurantTable(id: string): Promise<RestaurantTable> {
  const { data, error } = await supabase.rpc("get_restaurant_table", {
    p_table_id: id,
  });

  if (error) throw new Error(`Fetch table detail failed: ${error.message}`);
  return data as RestaurantTable;
}

/**
 * Vendor: Update restaurant table
 */
export async function updateRestaurantTable(
  id: string,
  updates: { name?: string; capacity?: number; is_active?: boolean },
): Promise<RestaurantTable> {
  const { data, error } = await supabase.rpc("update_restaurant_table", {
    p_table_id: id,
    ...updates,
  });

  if (error) throw new Error(`Update table failed: ${error.message}`);
  return data as RestaurantTable;
}

/**
 * Vendor: Delete restaurant table
 */
export async function deleteRestaurantTable(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_restaurant_table", {
    p_table_id: id,
  });

  if (error) throw new Error(`Delete table failed: ${error.message}`);
}

/**
 * Vendor: Create restaurant availability
 */
export async function createAvailability(
  availabilityData: RestaurantAvailabilityInput,
): Promise<RestaurantAvailability> {
  const { data, error } = await supabase.rpc("create_availability", {
    p_day_of_week: availabilityData.day_of_week,
    p_open_time: availabilityData.open_time,
    p_close_time: availabilityData.close_time,
    p_slot_interval: availabilityData.slot_interval,
    p_reservation_duration: availabilityData.reservation_duration,
    p_buffer_minutes: availabilityData.buffer_minutes,
    p_is_active: availabilityData.is_active,
  });

  if (error) {
    throw new Error(`Create availability failed: ${error.message}`);
  }
  return data as RestaurantAvailability;
}

/**
 * Vendor: List restaurant availability
 */
export async function getVendorAvailability(
  page = 1,
  isActive?: boolean,
): Promise<PaginatedResult<RestaurantAvailability>> {
  const { data, error } = await supabase.rpc("get_vendor_availability", {
    p_page: page,
    p_is_active: isActive ?? null,
  });

  if (error) throw new Error(`Fetch availability failed: ${error.message}`);
  return data as PaginatedResult<RestaurantAvailability>;
}

/**
 * Vendor: Get availability detail
 */
export async function getAvailabilityDetail(
  id: string,
): Promise<RestaurantAvailability> {
  const { data, error } = await supabase.rpc("get_availability_detail", {
    p_id: id,
  });

  if (error)
    throw new Error(`Fetch availability detail failed: ${error.message}`);
  return data as RestaurantAvailability;
}

/**
 * Vendor: Update restaurant availability
 */
export async function updateAvailability(
  id: string,
  updates: Partial<RestaurantAvailabilityInput>,
): Promise<RestaurantAvailability> {
  const { data, error } = await supabase.rpc("update_availability", {
    p_id: id,
    ...updates,
  });

  if (error) throw new Error(`Update availability failed: ${error.message}`);
  return data as RestaurantAvailability;
}

/**
 * Vendor: Delete restaurant availability
 */
export async function deleteAvailability(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_availability", {
    p_id: id,
  });

  if (error) throw new Error(`Delete availability failed: ${error.message}`);
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
    "get_available_reservation_slots",
    {
      p_vendor_id: vendorId,
      p_date: date,
      p_party_size: partySize,
    },
  );
  console.log(data);
  if (error) throw new Error(`Fetch slots failed: ${error.message}`);
  return data as AvailableSlot[];
}

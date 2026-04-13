// types/reservation.ts
export interface ReservationSettingsInput {
  min_deposit?: number;
  deposit_type?: "FIXED" | "PERCENTAGE";
  min_party_size?: number;
  max_party_size?: number;
  cancellation_fee?: number;
  auto_confirm?: boolean;
  cancellation_window_minutes?: number;
}

export interface ReservationSettingsOutput extends ReservationSettingsInput {
  id: string;
  vendor_id: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationRulesInput {
  min_party_size?: number;
  max_party_size?: number;
  day_of_week?: number; // 0=Sun, 1=Mon, ... 6=Sat
  deposit?: number;
  cancellation_fee?: number;
  no_show_fee?: number;
  priority?: number;
}

export interface ReservationRulesOutput extends ReservationRulesInput {
  id: string;
  vendor_id: string;
  created_at: string;
  updated_at: string;
}
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Reservation1 {
  id: string;
  vendor_id: string;
  customer_id: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  end_time?: string;
  reservation_status: BookingStatus;
  notes?: string;
  deposit_amount?: number;
  platform_commission?: number;
  cancelled_by?: string;
  cancellation_fee?: number;
  deposit_paid?: number;
  deposit_required?: number;
  number_of_children?: string;
  number_of_adult?: string;
  deposit_status?: "PENDING" | "PAID" | "REFUNDED";
  created_at: string;
  updated_at: string;
  customer: {
    full_name: string;
    phone_number: string;
    email: string;
  };
}

// types/reservation.ts
export type ProfileSummary = {
  full_name: string;
  phone_number: string | null;
  email: string | null;
};

export type Reservation = {
  id: string;
  vendor_id: string;
  table_id: string;
  customer_id: string | null;
  reservation_time: string;
  end_time: string;
  party_size: number;
  number_of_children: number | null;
  number_of_adult: number | null;
  deposit_required: number | null;
  deposit_paid: number | null;
  reservation_status: string;
  payment_status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  cancellation_fee: number | null;
  cancelled_by: string | null;
  platform_commission: number | null;
  vendor_payout: number | null;
  escrow_locked: boolean | null;
  notes: string | null;
  customer: ProfileSummary | null;
  vendor: ProfileSummary;
};

// types/reservation.ts
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
};

export type ReservationSummary = {
  id: string;
  vendor_id?: string;
  customer_id?: string;
  reservation_time: string;
  end_time: string;
  party_size: number;
  reservation_status: string;
  deposit_paid: number | null;
  created_at: string;
  vendor?: {
    full_name: string;
    phone_number: string | null;
    email: string | null;
  };
  customer?: {
    full_name: string;
    phone_number: string | null;
    email: string | null;
  };
};

// types/tables.ts
export type RestaurantTable = {
  id: string;
  vendor_id: string;
  name: string | null;
  capacity: number;
  is_active: boolean | null;
  created_at: string;
};

export type PaginatedTables<T = RestaurantTable> = {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
};

// types/availability.ts
export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
};

export type RestaurantAvailabilityInput = {
  day_of_week: number;
  open_time: string; // "HH:MM:SS"
  close_time: string; // "HH:MM:SS"
  slot_interval: number | null;
  reservation_duration: number | null;
  buffer_minutes: number | null;
  is_active: boolean | null;
};

export type RestaurantAvailability = RestaurantAvailabilityInput & {
  id: string;
  vendor_id: string;
  created_at: string;
};

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  cancellation_fee: number;
  cancellation_window_minutes: number;
  max_party_size: number;
  min_deposit: number;
  min_party_size: number;
}

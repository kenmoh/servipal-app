// @/types/user-types.ts
import { User } from "@supabase/supabase-js";

// ============================================================================
// REGULAR EXPRESSIONS
// ============================================================================
export const phoneRegEx =
  /^((\+[1-9]{1,4}[ \-]*)|(\([0-9]{2,3}\)[ \-]*)|([0-9]{2,4})[ \-]*)*?[0-9]{3,4}?[ \-]*[0-9]{3,4}?$/;

// ============================================================================
// ENUMS & TYPES
// ============================================================================
export type Role =
  | "DISPATCH"
  | "RIDER"
  | "CUSTOMER"
  | "RESTAURANT_VENDOR"
  | "LAUNDRY_VENDOR";

export type AccountStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SUSPENDED"
  | "DEACTIVATED";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

export type TransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "TRANSFER"
  | "ESCROW_HOLD"
  | "ESCROW_RELEASE";

// ============================================================================
// AUTH & USER INTERFACES
// ============================================================================
export interface AuthUser extends Omit<User, "user_metadata"> {
  id: string;
  email: string;
  phone: string;
  user_metadata: {
    email?: string;
    email_verified?: boolean;
    phone?: string;
    phone_verified?: boolean;
    user_type?: Role;
  };
}

export interface UserProfile {
  id: string;
  created_at: string;
  updated_at?: string;
  full_name?: string;
  business_name?: string;
  phone_number?: string;
  email: string;
  user_type: Role;
  state?: string;
  bank_name?: string;
  store_name: string;
  bank_account_number: string;
  profile_image_url?: string;
  backdrop_image_url?: string;
  business_address?: string;
  opening_hour?: string;
  closing_hour?: string;
  can_pickup_and_dropoff?: boolean;
  business_registration_number?: string;
  pickup_and_delivery_charge?: number;
  review_count?: number;
  average_rating?: number;
  account_status?: AccountStatus;
  is_verified?: boolean;
  is_online?: boolean;
  is_blocked?: boolean;
  last_seen_at?: string;
}

export interface UserProfileUpdate {
  full_name?: string;
  business_name?: string; // FOR RESTAURANT_VENDOR, DISPATCH AND LAUNDRY_VENDOR
  phone_number?: string;
  business_address?: string; // FOR RESTAURANT_VENDOR, DISPATCH AND LAUNDRY_VENDOR (use the current location button ang the custom GoogleTextInput, user can either type or press the button to populate the field)
  opening_hour?: string; // FOR RESTAURANT_VENDOR AND LAUNDRY_VENDOR
  closing_hour?: string; // FOR RESTAURANT_VENDOR AND LAUNDRY_VENDOR
  state?: string;
  bank_account_number?: number;
  bank_name?: string;
  business_registration_number?: string; // FOR RESTAURANT_VENDOR, DISPATCH AND LAUNDRY_VENDOR
  pickup_and_delivery_charge?: number; // FOR RESTAURANT_VENDOR AND LAUNDRY_VENDOR
  store_name?: string; // CUSTOMER
}

export interface ImageUrl {
  profile_image_url?: string;
  backdrop_image_url?: string;
}

// ============================================================================
// LOCATION INTERFACES
// ============================================================================
export interface UserCoords {
  lat: number;
  lng: number;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface UpdateLocationResponse {
  success: boolean;
  latitude: number;
  longitude: number;
  updated_at: string;
}

// ============================================================================
// RIDER INTERFACES
// ============================================================================
export interface RiderResponse {
  id: string;
  full_name: string;
  phone_number: string;
  profile_image_url: string;
  bike_number: string;
  business_name: string;
  business_address: string;
  total_distance_travelled: number;
  total_deliveries: number;
  average_rating: number;
  review_count: number;
  dispatch_id: string;
  dispatch_business_name: string;
  rider_average_rating: number;
  dispatch_average_rating: number;
  dispatch_total_reviews: number;
  dispatch_rider_count: number;
  distance_km: number;
  daily_delivery_count: number;
  total_delivery_count: number;
}

export interface CreateRiderData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  bike_number: string;
}

export interface UpdateRiderData {
  full_name?: string;
  phone?: string;
  bike_number?: string;
}

export interface RiderAssignmentResponse {
  success: boolean;
  message: string;
  order_id: string;
  rider_id: string;
  dispatch_id: string;
  order_status: "ASSIGNED";
}

// ============================================================================
// WALLET & TRANSACTION INTERFACES
// ============================================================================
export interface WalletTransactionResponse {
  id: string;
  tx_ref: string;
  amount: string;
  from_user_id: string;
  to_user_id: string;
  order_id: string;
  to_user: string;
  from_user: string;
  transaction_type: TransactionType;
  payment_status: PaymentStatus;
  payment_method: string;
  created_at: string;
}

export interface WalletBalanceResponse {
  id: string;
  balance: string;
  escrow_balance: string;
  transactions: WalletTransactionResponse[];
}

// ============================================================================
// BANK INTERFACE
// ============================================================================
export interface Bank {
  id: number;
  code: string;
  name: string;
}

// ============================================================================
// TYPE GUARDS & HELPERS
// ============================================================================
/**
 * Type guard to validate if a Supabase User has valid AuthUser metadata
 */
export function isValidAuthUser(
  user: User,
): user is User & { user_metadata: AuthUser["user_metadata"] } {
  return typeof user.id === "string" && typeof user.email === "string";
}

/**
 * Convert Supabase User to AuthUser format
 */
export function toAuthUser(user: User): AuthUser {
  return {
    ...user,
    id: user.id,
    email: user.email || "",
    phone: user.phone || "",
    user_metadata: {
      email: user.user_metadata?.email || user.email,
      email_verified: user.user_metadata?.email_verified ?? false,
      phone: user.user_metadata?.phone || user.phone,
      phone_verified: user.user_metadata?.phone_verified ?? false,
      user_type: user.user_metadata?.user_type as Role,
    },
  };
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, role: Role): boolean {
  return user?.user_metadata?.user_type === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: AuthUser | null, roles: Role[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // Format as +X (XXX) XXX-XXXX for standard numbers
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

/**
 * Validate if a string is a valid phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  return phoneRegEx.test(phone);
}

/**
 * Validate if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export interface ToggleOnlineResponse {
  id: string;
  is_online: boolean;
  last_seen_at: string;
}

export interface TogglePickupResponse {
  id: string;
  can_pickup_and_dropoff: boolean;
  updated_at: string;
}

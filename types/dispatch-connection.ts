export type ConnectionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "DISCONNECTED";

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DispatchDirectoryItem {
  id: string;
  business_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  dispatch_average_rating: number | null;
  rider_count: number;
  online_rider_count: number;
  connection_status: ConnectionStatus | null;
  has_payout_account: boolean;
}

export interface DispatchDirectoryResponse {
  data: DispatchDirectoryItem[];
  meta: PaginationMeta;
}

export interface ConnectionRow {
  id: string;
  vendor_id: string;
  dispatch_id: string;
  status: ConnectionStatus;
  requested_at: string | null;
  responded_at: string | null;
  response_note: string | null;
  vendor_business_name: string | null;
  vendor_full_name: string | null;
  vendor_profile_image_url: string | null;
  vendor_user_type: string | null;
  vendor_rating: number | null;
  dispatch_business_name: string | null;
  dispatch_full_name: string | null;
  dispatch_profile_image_url: string | null;
  // Contact block. The service returns these only while status is ACCEPTED,
  // so a pending, declined or disconnected row arrives with nulls here.
  vendor_email: string | null;
  vendor_phone_number: string | null;
  vendor_business_address: string | null;
  vendor_state: string | null;
  dispatch_email: string | null;
  dispatch_phone_number: string | null;
  dispatch_business_address: string | null;
  dispatch_state: string | null;
}

export interface ConnectionListResponse {
  data: ConnectionRow[];
  has_payout_account: boolean;
}

export interface ConnectionActionResponse {
  data: ConnectionRow;
}

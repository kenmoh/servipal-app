export interface DispatchRider {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  average_rating: number | null;
  review_count: number | null;
  distance_km: number | null;
  dispatch_id: string | null;
  dispatch_business_name: string | null;
  dispatch_average_rating: number | null;
}

export interface DispatchRiderListResponse {
  data: DispatchRider[];
}

export interface DispatchQuoteRequest {
  vendor_id: string;
  distance_km: number;
  duration?: string | null;
}

export interface DispatchQuote {
  distance_km: number;
  duration: string | null;
  delivery_fee: number;
}

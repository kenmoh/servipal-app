export type OrderStatus =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export type OrderPaymentStatus =
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type RequireDelivery = "PICKUP" | "VENDOR_DELIVERY";

import { SizeOption } from "./item-types";

export interface OrderItem {
  id?: string;
  order_id?: string;
  item_id: string;
  vendor_id?: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  sizes?: SizeOption[];
  sides?: string[];
  colors?: string[];
  created_at?: string;
}

export interface UnifiedOrderResponse {
  id: string;
  tx_ref: string | null;
  order_number: number;
  customer_id: string;
  vendor_id: string;
  total_price: number;
  grand_total: number;
  amount_due_vendor: number;
  pickup_location: string;
  destination: string;
  pickup_coordinates: [number, number] | any;
  dropoff_coordinates: [number, number] | any;
  distance: number;
  order_type: "FOOD" | "PRODUCT" | "LAUNDRY" | "DELIVERY";
  order_status: OrderStatus;
  delivery_option: string;
  order_payment_status: OrderPaymentStatus;
  require_delivery: boolean | string;
  cancel_reason?: string;
  cooking_instructions?: string;
  washing_instructions?: string;
  additional_info?: string;
  customer_name?: string;
  vendor_name?: string;
  order_items: OrderItem[];
  vendor_pickup_dropoff_charge?: number;
  dispute_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryDetails {
  id: string;
  order_id: string;
  rider_id: string | null;
  dispatch_id: string | null;
  delivery_status: string;
  delivery_fee: number;
  pickup_location: string;
  destination: string;
  origin: string;
  distance: number;
  duration: string;
  created_at: string;
  updated_at: string;
}

export interface DetailResponse {
  order: UnifiedOrderResponse;
  delivery: DeliveryDetails | null;
}

export interface DeliveryDetail extends DetailResponse {}

export interface OrderFoodOLaundry {
  order_items: {
    vendor_id: string;
    item_id: string;
    quantity: number;
    size?: string;
    sides?: string;
  }[];
  pickup_coordinates: [number, number];
  dropoff_coordinates: [number, number];
  distance: number;
  require_delivery: RequireDelivery;
  is_one_way_delivery?: boolean;
  duration: string;
  origin: string;
  destination?: string;
  additional_info?: string;
}

export interface SendItem {
  packageName: string;
  description: string;
  origin: string;
  destination: string;
  duration: string;
  distance: number;
  imageUrl?: string;
  receiverPhone: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
}

export interface InitPaymentData {
  payment_link: string;
  tx_ref: string;
  order_id: string;
}

export interface UpdateDeliveryLocation {
  rider_id: string;
  last_known_rider_coordinates: [number, number];
}

export interface CreateReview {
  rating: number;
  comment: string;
}

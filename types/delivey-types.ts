export type DeliveryOrderStatus =
  | "PENDING"
  | "PAID_NEEDS_RIDER"
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | null;
export type EscrowStatus = "PENDING" | "HELD" | "RELEASED" | "REFUNDED" | null;
export type CancelledByRole =
  | "RESTAURANT_VENDOR"
  | "CUSTOMER"
  | "LAUNDRY_VENDOR"
  | "RIDER"
  | "ADMIN"
  | "MODERATOR"
  | "SUPER_ADMIN"
  | null;
export type DeliveryType = "STANDARD" | "SCHEDULED";

export interface DeliveryOrder {
  id: string;
  order_number: number;
  tx_ref: string | null;
  sender_id: string;
  receiver_phone: string;
  sender_phone_number: string;
  pickup_location: string;
  destination: string;
  distance: number | null;
  delivery_type: DeliveryType;
  package_image_url: string | null;
  additional_info: string | null;
  delivery_fee: number;
  total_price: number | null;
  amount_due_dispatch: number;
  rider_id: string | null;
  dispatch_id: string | null;
  rider_phone_number: string | null;
  duration: string | null;
  delivery_status: DeliveryOrderStatus;
  payment_status: PaymentStatus;
  package_name: string;
  pickup_coordinates?: [number, number];
  dropoff_coordinates?: [number, number];
  last_known_rider_coordinates?: [number, number];
}

export interface SendItem {
  packageName: string;
  description: string;
  origin: string;
  destination: string;
  duration: string;
  distance: number;
  imageUrl: string;
  receiverPhone: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
}

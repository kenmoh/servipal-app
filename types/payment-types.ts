import { CartItem } from "@/store/cartStore";
import { Coordinates } from "@/store/locationStore";

export interface InitPaymentData {
  logo: string;
  email: string;
  distance: number;
  phonenumber: string;
  fullName: string;
  description: string;
  title: string;
  tx_ref: string;
  amount: number;
  public_key: string;
  receiver_phone: string;
  pickup_location: string;
  destination: string;
  package_name: string;
}

export interface WithdrawalResponse {
  status: string;
  message: string;
  transaction_id: string;
  amount: string;
  bank_name: string;
  account_number: string;
  beneficiary: string;
  timestamp: string;
}

export interface PayWithWalletResponse {
  status: string;
  order_id: string;
  tx_ref: string;
  grand_total: number;
  message: string;
}

export interface InitBankTransferResponse {
  status: string;
  message: string;
  transfer_reference: string;
  account_expiration: string;
  transfer_account: string;
  transfer_bank: string;
  transfer_amount: string;
  transfer_note: string;
  mode: string;
}

export interface PaymentLink {
  payment_link: string;
}

export interface InitiatePaymentResponse {
  tx_ref: string;
  amount: number;
  public_key: string;
  currency: string;
  customer: {
    email: string;
    phone_number: string;
    full_name: string;
  };
  customization: {
    title: string;
    description: string;
    logo: string;
  };
  message: string;
  // Service specific optional fields
  receiver_phone?: string;
  pickup_location?: string;
  destination?: string;
  distance?: string;
  duration?: string;
  package_name?: string;
}

export interface FlutterwavePayload {
  tx_ref: string;
  amount: number;
  currency: string;
  public_key: string;
  customer: {
    email: string;
    phonenumber: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
}

export interface PaymentSuccessResponse {
  status: "success";
  tx_ref: string;
  flw_ref?: string;
  amount: number;
}

export interface PaymentFailureResponse {
  status: "failed" | "cancelled";
  message?: string;
}

export interface RedirectParams {
  status: "successful" | "cancelled";
  transaction_id?: string;
  tx_ref: string;
}

export interface FoodOrderPayload {
  order_type: "FOOD";
  grand_total: number;
  total_price: number;
  delivery_fee: number;
  delivery_option: "DELIVERY";
  vendor_id: string;
  order_data: CartItem[];
  destination: string;
  additional_info: string;
}

// PRODUCT
export interface ProductOrderPayload {
  order_type: "PRODUCT";
  grand_total: number;
  vendor_id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  unit_price: number;
  subtotal: number;
  shipping_cost: number;
  delivery_option: string;
  delivery_address: string;
  images: string;
  selected_size: string;
  selected_color: string;
  additional_info: string;
}

// LAUNDRY
export interface LaundryOrderPayload {
  order_type: "LAUNDRY";
  grand_total: number;
  subtotal: number;
  delivery_fee: number;
  delivery_option: string;
  vendor_id: string;
  order_data: CartItem[];
  destination: string;
  additional_info: string;
}

// DELIVERY
export interface DeliveryOrderPayload {
  order_type: "DELIVERY";
  grand_total: number;
  distance: number;
  package_name: string;
  receiver_phone: string;
  sender_phone_number: string;
  pickup_location: string;
  destination: string;
  pickup_coordinates: Coordinates;
  dropoff_coordinates: Coordinates;
  additional_info: string;
  delivery_type: "STANDARD";
  duration: number;
  package_image_url: string;
}

export interface PayWithWalletPayload {
  serviceType: "FOOD" | "LAUNDRY" | "PRODUCT" | "DELIVERY" | "WALLET";
  food?: FoodOrderPayload;
  laundry?: LaundryOrderPayload;
  product?: ProductOrderPayload;
  delivery?: DeliveryOrderPayload;
}

import { ReviewSummaryStats } from "./review-types";

export interface CreateProduct {
  name: string;
  description: string;
  price: number;
  sizes: string[];
  colors: string[];
  stock: number;
  category_id: string;
  product_type: "PHYSICAL" | "DIGITAL";
  images: string[];
  return_days?: number;
  shipping_cost?: number;
  warranty?: string;
}

export interface ProductResponse extends CreateProduct {
  id: string;
  vendor_id: string;
  in_stock: boolean;
  total_sold: number;
  is_deleted: boolean;
  store_name: string;
  review_stats: ReviewSummaryStats;
  created_at: Date;
  updated_at: Date;
}

export interface ProductOrderResponse {
  id: string;
  order_number: string;
  grand_total: string;
  order_items: CreateProduct[];
  payment_status: string;
  order_status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProductSubcategory {
  id: string;
  product_subcategory_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  subcategories: ProductSubcategory[];
}

export type CategoriesWithSubcategories = ProductCategory[];

export interface ProductOrderCreateRequest {
  vendor_id: string;
  item_id: string;
  quantity: number;
  sizes?: string[];
  colors?: string[];
  images?: string[];
  delivery_option: "PICKUP" | "VENDOR_DELIVERY";
  delivery_address?: string;
  additional_info?: string;
}

export type OrderRole = "CUSTOMER" | "VENDOR";
export type OrderStatus =
  | "PENDING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "RETURNED"
  | "DISPUTED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type EscrowStatus =
  | "PENDING"
  | "HELD"
  | "RELEASED"
  | "REFUNDED"
  | "DISPUTED";
export type DeliveryOption = "VENDOR_DELIVERY" | "PICKUP";

export interface ProductOrderItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  images: string[] | null;
  selected_size: string[] | null;
  selected_color: string[] | null;
  created_at?: string;
}

export interface OrderTransaction {
  tx_ref: string;
  amount: number;
  payment_method: "CARD" | "WALLET";
  payment_status: PaymentStatus;
  transaction_type: string;
  details: {
    flw_ref: string;
    label: string;
    payment_method: string;
  };
  created_at: string;
}

export interface ProductOrder {
  id: string;
  tx_ref: string;
  order_number: number;
  role: OrderRole;
  customer_id: string;
  vendor_id: string;
  grand_total: number;
  amount_due_vendor: number;
  shipping_cost: number | null;
  delivery_option: DeliveryOption;
  delivery_address: string;
  additional_info: string | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  escrow_status: EscrowStatus;
  order_type: string;
  cancel_reason: string | null;
  dispute_id: string | null;
  created_at: string;
  updated_at: string;
  items: ProductOrderItem[];
  transaction?: OrderTransaction; // only in details response
}

export interface UserOrdersResponse {
  orders: ProductOrder[];
  total: number;
  limit: number;
  offset: number;
}

export const ALLOWED_TRANSITIONS: Record<
  OrderStatus,
  Partial<Record<"CUSTOMER" | "VENDOR", OrderStatus[]>>
> = {
  PENDING: {
    VENDOR: ["SHIPPED", "CANCELLED", "DISPUTED"],
    CUSTOMER: ["CANCELLED", "DISPUTED"],
  },
  SHIPPED: {
    VENDOR: ["DELIVERED", "CANCELLED", "DISPUTED"],
    CUSTOMER: ["CANCELLED", "DISPUTED"],
  },
  DELIVERED: {
    VENDOR: ["DISPUTED"],
    CUSTOMER: ["COMPLETED", "REJECTED", "DISPUTED"],
  },
  CANCELLED: { VENDOR: ["RETURNED"] },
  REJECTED: { VENDOR: ["RETURNED"] },
  RETURNED: { VENDOR: ["COMPLETED"] },
  COMPLETED: {},
  DISPUTED: {},
};

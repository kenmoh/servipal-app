type RestaurantItemType = "FOOD" | "DRINK";

export interface SizeOption {
  size: string;
  price: number;
}

export interface CreateRestaurantMenuItem {
  // vendor_id is derived from Supabase auth session on the server side
  vendor_id?: string;
  name: string;
  description?: string;
  price: number;
  sizes?: SizeOption[];
  sides?: string[];
  images: string[];
  restaurant_item_type: RestaurantItemType;
  is_available?: boolean;
  is_deleted?: boolean;
  category_id?: string;
}

export interface UpdateRestaurantMenuItem extends CreateRestaurantMenuItem {
  id: string;
  vendor_id: string;
  is_available?: boolean;
  is_deleted: boolean;
}
export interface RestaurantMenuItemResponse extends UpdateRestaurantMenuItem {}

export type LaundryType = "DRY_CLEAN" | "WASH_FOLD" | "IRON_ONLY" | "SPECIAL";

export interface CreateLaundryItem {
  vendor_id?: string;
  name: string;
  description?: string;
  price: number;
  laundry_type: LaundryType;
  images: string[];
}

export interface LaundryItemResponse extends CreateLaundryItem {
  id: string;
  is_deleted?: boolean;
  vendor_id: string;
  created_at: string;
  updated_at: string;
}
export interface CategoryResponse {
  id: string;
  name: string;
  category_type: string;
  created_at?: string;
}

export interface CreateCategory {
  name: string;
  category_type: string;
}

export interface OrderItem {
  price: number;
  item_id: string;
  quantity: number;
  images: string[];
}

export interface OrderCreate {
  vendor_id: string;
  items: OrderItem[];
  delivery_option: "PICKUP" | "VENDOR_DELIVERY";
  instructions: string;
  delivery_address: string;

  // Laundry booking fields (optional — only for laundry orders)
  pickup_date?: string; // YYYY-MM-DD
  delivery_date?: string;
  pickup_time?: string; // ISO slot start time
  delivery_time?: string;
  is_express?: boolean;
  express_fee?: number;
  idempotencyKey?: string;
}

export interface RestaurantOrderCreate extends OrderCreate {
  sides?: string;
  sizes?: SizeOption;
}

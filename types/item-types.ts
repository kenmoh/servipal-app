type RestaurantItemType = "FOOD" | "DRINK";
export interface CreateRestaurantMenuItem {
  // vendor_id is derived from Supabase auth session on the server side
  vendor_id?: string;
  name: string;
  description?: string;
  price: number;
  sizes?: string[];
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

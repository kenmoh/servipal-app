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
  wash_type?: LaundryType;
  images: string[];
  is_available?: boolean;
  is_deleted?: boolean;
  category_id?: string;
}

export interface LaundryItemResponse extends CreateLaundryItem {
  id: string;
  vendor_id: string;
  average_rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

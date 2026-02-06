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

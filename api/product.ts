import { InitiatePaymentResponse } from "@/types/payment-types";
import {
  CategoriesWithSubcategories,
  CreateProduct,
  ProductOrderCreateRequest,
  ProductResponse,
  ProductSubcategory,
} from "@/types/product-types";
import { apiClient } from "@/utils/client";
import { supabase } from "@/utils/supabase";
import { ApiResponse } from "apisauce";
import { ErrorResponse } from "./auth";
import { normalizeMenuImages } from "./food";

const BASE_URL = "/products";

/**
 * Initiate payment for a product
 * @param data Order details
 * @returns Payment initialization details
 */
export const initiateProductPayment = async (
  data: ProductOrderCreateRequest,
): Promise<InitiatePaymentResponse> => {
  try {
    const response: ApiResponse<InitiatePaymentResponse | ErrorResponse> =
      await apiClient.post(`${BASE_URL}/initiate-payment`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Failed to initiate payment";
      throw new Error(errorMessage);
    }

    console.log(response.data);

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while initiating payment");
  }
};

/**
 * Product filters for querying products
 */
export interface ProductFilters {
  category_id?: string;
  vendor_id?: string;
  product_type?: "PHYSICAL" | "DIGITAL";
  in_stock?: boolean;
  include_deleted?: boolean;
}

const PRODUCT_IMAGE_BUCKET = "product-images";

/**
 * Create product-images records
 * @param productId Product ID
 * @param imageUrls Array of image URLs
 */
const createProductImages = async (
  productId: string,
  imageUrls: string[],
): Promise<void> => {
  try {
    const imageRecords = imageUrls.map((url, index) => ({
      product_id: productId,
      url: url,
      display_order: index,
    }));

    const { error } = await supabase
      .from(PRODUCT_IMAGE_BUCKET)
      .insert(imageRecords);

    if (error) {
      throw new Error(`Failed to create image records: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to create product images");
  }
};

/**
 * Delete files from Supabase storage
 * @param urls Array of public URLs to delete
 */
const deleteFilesFromStorage = async (urls: string[]) => {
  const buckets: Record<string, string[]> = {};

  urls.forEach((url) => {
    try {
      const urlObj = new URL(url);
      // pathname usually: /storage/v1/object/public/bucket/path/to/file
      const parts = urlObj.pathname.split("/");
      const publicIndex = parts.indexOf("public");
      if (publicIndex !== -1 && publicIndex + 2 < parts.length) {
        const bucket = parts[publicIndex + 1];
        const path = parts.slice(publicIndex + 2).join("/");

        if (!buckets[bucket]) buckets[bucket] = [];
        buckets[bucket].push(path);
      }
    } catch (e) {
      console.error("Invalid URL for deletion", url);
    }
  });

  for (const [bucket, paths] of Object.entries(buckets)) {
    if (paths.length > 0) {
      await supabase.storage.from(bucket).remove(paths);
    }
  }
};

/**
 * Create a new product
 * @param data Product data to create
 * @returns Created product
 */
export const createProduct = async (
  data: CreateProduct,
): Promise<ProductResponse> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("User not authenticated");
    }
    const uploadedImages = await normalizeMenuImages(
      data.images,
      session.user.id,
      PRODUCT_IMAGE_BUCKET,
    );
    // First, create the product without images
    const { data: product, error: productError } = await supabase
      .from("product_items")
      .insert({
        vendor_id: session.user.id,
        name: data.name,
        description: data.description,
        price: data.price,
        sizes: data.sizes,
        colors: data.colors,
        stock: data.stock,
        warranty: data.warranty,
        return_days: data.return_days,
        shipping_cost: data.shipping_cost,
        images: uploadedImages,
        product_category_id: data.category_id,
        product_type: data.product_type,
      })
      .select()
      .single();

    if (productError) {
      throw new Error(productError.message || "Failed to create product");
    }

    if (!product) {
      throw new Error("No product data returned");
    }

    return product as ProductResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error creating product: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while creating product");
  }
};

/**
 * Get a single product by ID
 * @param id Product ID
 * @returns Product data
 */
export const getProduct = async (id: string): Promise<ProductResponse> => {
  try {
    const { data: product, error } = await supabase
      .from("product_items")
      .select("*")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (error) {
      throw new Error(error.message || "Failed to fetch product");
    }

    if (!product) {
      throw new Error("Product not found");
    }

    return product as ProductResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error fetching product: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while fetching product");
  }
};

/**
 * Get all products with optional filters
 * @param filters Optional filters to apply
 * @returns Array of products
 */
export const getProducts = async (
  filters?: ProductFilters,
): Promise<ProductResponse[]> => {
  try {
    let query = supabase.from("product_items").select("*");

    // Apply filters
    if (filters?.category_id) {
      query = query.eq("category_id", filters.category_id);
    }

    if (filters?.vendor_id) {
      query = query.eq("vendor_id", filters.vendor_id);
    }

    if (filters?.product_type) {
      query = query.eq("product_type", filters.product_type);
    }

    if (filters?.in_stock !== undefined) {
      query = query.eq("in_stock", filters.in_stock);
    }

    // By default, exclude deleted products unless explicitly requested
    if (!filters?.include_deleted) {
      query = query.eq("is_deleted", false);
    }

    // Order by created_at descending
    query = query.order("created_at", { ascending: false });

    const { data: products, error } = await query;

    if (error) {
      throw new Error(error.message || "Failed to fetch products");
    }

    return (products || []) as ProductResponse[];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error fetching products: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while fetching products");
  }
};

/**
 * Get all products for a specific vendor
 * @param vendorId Vendor/user ID
 * @returns Array of products
 */
export const getUserProducts = async (): Promise<ProductResponse[]> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message || "Failed to fetch user products");
  }
  if (!session) {
    throw new Error("User not authenticated");
  }
  return getProducts({ vendor_id: session.user.id });
};

/**
 * Update an existing product
 * @param id Product ID
 * @param data Partial product data to update
 * @returns Updated product
 */
export const updateProduct = async (
  id: string,
  data: Partial<CreateProduct>,
): Promise<ProductResponse> => {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are provided (excluding images for now)
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.sizes !== undefined) updateData.sizes = data.sizes;
    if (data.colors !== undefined) updateData.colors = data.colors;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.category_id !== undefined)
      updateData.category_id = data.category_id;
    if (data.product_type !== undefined)
      updateData.product_type = data.product_type;

    // Handle images separately
    if (data.images !== undefined) {
      try {
        // Get current user session for vendor ID
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("User not authenticated");
        }

        // 1. Get current product images to identify deletions
        const { data: currentProduct } = await supabase
          .from("product_items")
          .select("images")
          .eq("id", id)
          .single();

        const currentImages: string[] = currentProduct?.images || [];

        // 2. Normalize/Update images
        const uploadedUrls = await normalizeMenuImages(
          data.images,
          session.user.id,
          PRODUCT_IMAGE_BUCKET,
        );

        // 3. Identify deleted images (present in current but not in new list)
        const imagesToDelete = currentImages.filter(
          (img) => !uploadedUrls.includes(img),
        );

        if (imagesToDelete.length > 0) {
          await deleteFilesFromStorage(imagesToDelete);
        }

        // 4. Overwrite product-images records
        // Delete existing records
        await supabase.from("product_images").delete().eq("product_id", id);

        // Create new records
        if (uploadedUrls.length > 0) {
          await createProductImages(id, uploadedUrls);
        }

        // Update product with new image URLs
        updateData.images = uploadedUrls;
      } catch (imageError) {
        console.error("Image update failed:", imageError);
        // Continue with other updates even if images fail
      }
    }

    const { data: product, error } = await supabase
      .from("product_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update product");
    }

    if (!product) {
      throw new Error("Product not found or update failed");
    }

    return product as ProductResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error updating product: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while updating product");
  }
};

/**
 * Soft delete a product (set is_deleted to true)
 * @param id Product ID
 */
export const softDeleteProduct = async (
  productId: string,
  vendorId: string,
): Promise<void> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("User not authenticated");
    }
    if (session?.user.id !== vendorId) {
      throw new Error("You can only delete your own products");
    }
    const { error } = await supabase
      .from("product_items")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("vendor_id", vendorId);

    if (error) {
      throw new Error(error.message || "Failed to delete product");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error deleting product: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while deleting product");
  }
};

/**
 * Permanently delete a product (hard delete)
 * Use with caution - this cannot be undone
 * @param id Product ID
 */
export const deleteProduct = async (
  id: string,
  vendorId: string,
): Promise<void> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("User not authenticated");
    }
    if (session?.user.id !== vendorId) {
      throw new Error("You can only delete your own products");
    }
    const { error } = await supabase
      .from("product_items")
      .delete()
      .eq("id", id)
      .eq("vendor_id", vendorId);

    if (error) {
      throw new Error(error.message || "Failed to permanently delete product");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error permanently deleting product: ${error.message}`);
    }
  }
};

/**
 * Fetch a single product by ID (alias for backward compatibility)
 * @param productId Product ID
 * @returns Product data
 */
export const fetchProduct = async (
  productId: string,
): Promise<ProductResponse> => {
  return getProduct(productId);
};

/**
 * Fetch all products with optional category filter (alias for backward compatibility)
 * @param categoryId Optional category ID
 * @returns Array of products
 */
export const fetchProducts = async (
  categoryId?: string,
): Promise<ProductResponse[]> => {
  return getProducts(categoryId ? { category_id: categoryId } : undefined);
};

export const getCategoriesWithSubcategories =
  async (): Promise<CategoriesWithSubcategories> => {
    const { data, error } = await supabase.rpc(
      "get_categories_with_subcategories",
    );

    if (error) {
      console.error("Error fetching categories:", error);
      throw new Error(error.message || "Failed to fetch categories");
    }

    const categories: CategoriesWithSubcategories = data;

    return categories;
  };

export const getAllProductSubcategories = async (): Promise<
  ProductSubcategory[]
> => {
  const { data, error } = await supabase.rpc("get_all_product_subcategories");

  if (error) {
    console.error("Error fetching categories:", error);
    throw new Error(error.message || "Failed to fetch categories");
  }

  return data as ProductSubcategory[];
};

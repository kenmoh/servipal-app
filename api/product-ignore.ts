import {
  BuyItem,
  BuyItemResponse,
  CreateProduct,
  CreateProductResponse,
  ItemOrderStatus,
  ProductResponse,
} from "@/types/marketplace";
import { apiClient } from "@/utils/client";
import { ApiResponse } from "apisauce";
import { ErrorResponse } from "./auth";

const BASE_URL = "/products";
const BASE_URL_MKT = "/marketplace";

// /api/products/{product_id}

// Create Item
export const createProduct = async (
  prodData: CreateProduct
): Promise<CreateProductResponse> => {
  const data = new FormData();
  data.append("name", prodData.name);
  data.append("price", prodData.price.toString());
  data.append("description", prodData.description);
  // data.append("sizes", prodData.sizes);
  data.append("stock", prodData.stock.toString());

  if (prodData.sizes) {
    data.append("sizes", prodData.sizes);
  }

  if (prodData.category_id !== undefined) {
    data.append("category_id", prodData.category_id);
  }

  if (prodData.images && prodData.images.length > 0) {
    prodData.images.forEach((imageUri, index) => {
      data.append("images", {
        uri: imageUri,
        type: "image/jpeg",
        name: `image_${index}.jpg`,
      } as any);
    });
  }
  // Handle multiple colors
  if (prodData.colors && prodData.colors.length > 0) {
    prodData.colors.forEach((color) => {
      data.append("colors", color);
    });
  }
  try {
    const response: ApiResponse<CreateProductResponse | ErrorResponse> =
      await apiClient.post(`${BASE_URL}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error creating item. Please try again later.";
      throw new Error(errorMessage);
    }

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};



export const updateProduct = async (
  productId: string,
  prodData: CreateProduct
): Promise<CreateProductResponse> => {
  const data = new FormData();
  data.append("name", prodData.name);
  data.append("price", prodData.price.toString());
  data.append("description", prodData.description);
  data.append("sizes", prodData.sizes || "");
  data.append("stock", prodData.stock.toString());

  if (prodData.category_id !== undefined) {
    data.append("category_id", prodData.category_id);
  }

  // Handle multiple images - Since backend replaces all images, send all current images
  if (prodData.images && prodData.images.length > 0) {
    prodData.images.forEach((imageUrl, index) => {
      // Create file object for all images (new and existing)
      data.append("images", {
        uri: imageUrl,
        type: "image/jpeg",
        name: `image_${index}.jpg`,
      } as any);
    });
  }

  // Handle multiple colors - Fixed: was appending as "images" instead of "colors"
  if (prodData.colors && prodData.colors.length > 0) {
    prodData.colors.forEach((color) => {
      data.append("colors", color);
    });
  }

  try {
    const response: ApiResponse<CreateProductResponse | ErrorResponse> =
      await apiClient.put(`${BASE_URL}/${productId}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error updating item. Please try again later.";
      throw new Error(errorMessage);
    }

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Fetch products
export const fetchProducts = async (
  categoryId?: string
): Promise<ProductResponse[]> => {
  try {
    // Build URL with optional categoryId parameter
    const url = categoryId ? `${BASE_URL}?category_id=${categoryId}` : BASE_URL;

   

    const response: ApiResponse<ProductResponse[] | ErrorResponse> =
      await apiClient.get(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching products.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Fetch Product
export const fetchProduct = async (
  productId: string
): Promise<ProductResponse> => {
  try {
    const response: ApiResponse<ProductResponse | ErrorResponse> =
      await apiClient.get(`${BASE_URL}/${productId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching item.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Fetch Product
/* Fetch all product belonging to a given user ID */
export const fetchUserProducts = async (
  userId: string
): Promise<ProductResponse[]> => {
  try {
    const response: ApiResponse<ProductResponse[] | ErrorResponse> =
      await apiClient.get(`${BASE_URL}/${userId}/user-products`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching products.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Delete Product
export const deleteProduct = async (
  productId: string
): Promise<null> => {
  try {
    const response: ApiResponse<null | ErrorResponse> =
      await apiClient.delete(`${BASE_URL}/${productId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// BuyItem
export const buyItem = async (
  itemId: string,
  itemData: BuyItem
): Promise<BuyItemResponse> => {
  const data = {
    quantity: itemData.quantity,
    colors: itemData.colors,
    sizes: itemData.sizes,
    additional_info: itemData.additional_info,
  };
  try {
    const response: ApiResponse<BuyItemResponse | ErrorResponse> =
      await apiClient.post(`${BASE_URL_MKT}/${itemId}/buy`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error purchasing item. Please try again";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};
// Update item status
export const updateItemStatus = async (
  itemId: string,
  status: ItemOrderStatus
): Promise<BuyItemResponse> => {
  const params = new URLSearchParams({ new_status: status.toString() });
  try {
    const response: ApiResponse<BuyItemResponse | ErrorResponse> =
      await apiClient.post(
        `${BASE_URL_MKT}/${itemId}/status?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error updating item status. Please try again";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

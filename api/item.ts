import {
  CategoryResponse,
  CreateCategory,
} from "@/types/item-types";
import { apiClient } from "@/utils/client";
import { ApiResponse } from "apisauce";
import { ErrorResponse } from "./auth";

const BASE_URL = "/items";

// Fetch categories
export const fetchCategories = async (): Promise<CategoryResponse[]> => {
  try {
    const response: ApiResponse<CategoryResponse[] | ErrorResponse> =
      await apiClient.get(`${BASE_URL}/categories`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching categories.";
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

// Create Category
export const createCategory = async (
  catData: CreateCategory
): Promise<CategoryResponse> => {
  const data = {
    name: catData.name,
  };
  try {
    const response: ApiResponse<CategoryResponse | ErrorResponse> =
      await apiClient.post(`${BASE_URL}/categories`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error creating category.";
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

// Create Food Item
export const createRestaurantMenuItem = async (
  itemData: CreateMenuItmItem
): Promise<ItemMenuResponse> => {
  const data = new FormData();

  data.append("name", itemData.name);
  data.append("price", itemData.price.toString());
  if (itemData.itemType) {
    data.append("item_type", itemData.itemType);
  }
  if (itemData.side) {
    data.append("side", itemData.side);
  }
  if (itemData.description) {
    data.append("description", itemData.description);
  }

  // Handle images
  const imagesArray = Array.isArray(itemData.images) ? itemData.images : [];

  if (imagesArray.length > 0) {
    imagesArray.forEach((imagePath, index) => {
      const imageData = {
        uri: imagePath,
        type: "image/jpeg",
        name: `image_${index}.jpg`,
      };
      data.append("images", imageData as any);
    });
  }
  try {
    const response: ApiResponse<ItemMenuResponse | ErrorResponse> =
      await apiClient.post(`${BASE_URL}/menu-item-create`, data, {
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

// Create Laundry Item
export const createLaundryItem = async (
  itemData: CreateMenuItmItem
): Promise<ItemMenuResponse> => {
  const data = new FormData();

  data.append("name", itemData.name);
  data.append("price", itemData.price.toString());

  if (itemData.description) {
    data.append("description", itemData.description);
  }

  // Handle images
  const imagesArray = Array.isArray(itemData.images) ? itemData.images : [];

  if (imagesArray.length > 0) {
    imagesArray.forEach((imagePath: string, index: number) => {
      const imageData = {
        uri: imagePath,
        type: "image/jpeg",
        name: `image_${index}.jpg`,
      };
      data.append("images", imageData as any);
    });
  }
  try {
    const response: ApiResponse<ItemMenuResponse | ErrorResponse> =
      await apiClient.post(`${BASE_URL}/laundry-item-create`, data, {
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

// Update Food Item
export const updateMenuItem = async (
  itemId: string,
  itemData: UpdateMenuItmItem
): Promise<ItemMenuResponse> => {
  const data = new FormData();
  data.append("name", itemData.name);
  data.append("price", itemData.price.toString());
  data.append("food_group", itemData.foodGroup);

  if (itemData.category_id !== undefined) {
    data.append("category_id", itemData.category_id);
  }

  if (itemData.description) {
    data.append("description", itemData.description);
  }

  if (itemData.side) {
    data.append("side", itemData.side);
  }

  if (itemData.itemType) {
    data.append("item_type", itemData.itemType);
  }
  // Handle multiple images
  if (itemData.images && itemData.images.length > 0) {
    itemData.images.forEach((image: any, index: number) => {
      data.append("images", {
        uri: image,
        type: "image/jpeg",
        name: `image_${index}.jpg`,
      } as any);
    });
  }

  try {
    const response: ApiResponse<ItemMenuResponse | ErrorResponse> =
      await apiClient.put(`/items/${itemId}/update`, data, {
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


// Update Food Item
export const updateLaundryItem = async (
  itemId: string,
  itemData: UpdateMenuItmItem
): Promise<ItemMenuResponse> => {
  const data = new FormData();
  data.append("name", itemData.name);
  data.append("price", itemData.price.toString());

  if (itemData.description) {
    data.append("description", itemData.description);
  }

  // Handle multiple images
  if (itemData.images && itemData.images.length > 0) {
    itemData.images.forEach((image: any, index: number) => {
      data.append("images", {
        uri: image,
        type: "image/jpeg",
        name: `image_${index}.jpg`,
      } as any);
    });
  }

  try {
    const response: ApiResponse<ItemMenuResponse | ErrorResponse> =
      await apiClient.put(`/items/${itemId}/laundry-item-update`, data, {
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

// Fetch Item
export const fetchItem = async (itemId: string): Promise<ItemMenuResponse> => {
  try {
    const response: ApiResponse<ItemMenuResponse | ErrorResponse> =
      await apiClient.get(`/items/${itemId}/item`, {
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

// Delete Item
export const deleteItem = async (itemId: string): Promise<void> => {
  try {
    const response: ApiResponse<null | ErrorResponse> = await apiClient.delete(
      `/items/${itemId}/delete`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

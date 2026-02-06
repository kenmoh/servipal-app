import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";

import {
  createProduct,
  fetchProduct,
  getCategoriesWithSubcategories,
  softDeleteProduct,
  updateProduct,
} from "@/api/product";
import AppPicker from "@/components/AppPicker";
import ChipInput from "@/components/ChipInput";
import ColorPickerInput from "@/components/ColorPickerInput";
import ImagePickerInput from "@/components/ImagePickerInput";
import LoadingIndicator from "@/components/LoadingIndicator";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useUserStore } from "@/store/userStore";
import { CreateProduct } from "@/types/product-types";
import z from "zod";

// Zod enum for ItemType
const PRODUCT_TYPE = [
  { id: "DIGITAL", name: "DIGITAL" },
  { id: "PHYSICAL", name: "PHSYCAL" },
];

/**
 * Zod schema for item creation.
 */
export const productCreateSchema = z.object({
  name: z.string().min(1, "Name is a required field"),

  description: z
    .string()
    .min(10, "Description must be at least 10 characters long"),

  price: z.coerce
    .number("Price must be a number")
    .positive("Price must be greater than 0"),

  warranty: z.string().optional(),

  shipping_cost: z.coerce.number().positive().optional(),

  return_days: z.coerce.number().positive().optional(),

  category_id: z.string({ message: "Category is a required field" }),

  // For forms, we often handle images as an array of URI strings.
  images: z.array(z.string()).nonempty({
    message: "At least one image is required",
  }),

  stock: z.coerce
    .number("Stock must be a number")
    .int("Stock must be a whole number")
    .min(1, "Stock cannot be less than 1"),

  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  productType: z.string({ message: "Product type is required" }),
});

type ProductCreateFormData = z.infer<typeof productCreateSchema>;

const AddProductScreen = () => {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const { user } = useUserStore();
  const isEditing = !!productId;
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productCreateSchema),
    defaultValues: {
      name: "",
      category_id: "",
      description: "",
      shipping_cost: 0,
      return_days: 0,
      warranty: "",
      sizes: [],
      images: [],
      colors: [],
      productType: "PHYSICAL",
    },
  });

  // Fetch product data if editing
  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct(productId!),
    enabled: !!productId,
  });

  // Populate form when product data is loaded
  useEffect(() => {
    if (existingProduct) {
      reset({
        name: existingProduct.name || "",
        category_id: existingProduct.category_id || "",
        description: existingProduct.description || "",
        price: existingProduct.price || 0,
        stock: existingProduct.stock || 0,
        sizes: existingProduct.sizes || [],
        images: existingProduct.images || [],
        colors: existingProduct.colors || [],
        warranty: existingProduct.warranty,
        return_days: existingProduct.return_days,
        shipping_cost: existingProduct.shipping_cost,
        productType: existingProduct.product_type || "PHYSICAL",
      });
    }
  }, [existingProduct, reset]);

  const { data: productCategories } = useQuery({
    queryKey: ["categories-with-subcategories"],
    queryFn: getCategoriesWithSubcategories,
    select: (categories) =>
      categories.flatMap((category) => category.subcategories),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProduct) => createProduct(data),
    onSuccess: (data) => {
      showSuccess("Success", `${data?.name} created successfully`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["user-products", user?.id] });

      router.back();
    },

    onError: (error: Error) => {
      showError("Error", error.message);
      console.log(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      softDeleteProduct(productId as string, user?.id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["user-products", user?.id] });

      showSuccess("Success", "Product deleted successfully.");
      router.back();
    },

    onError: (error: Error) => {
      showError("Error", error.message);
      console.log(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: Partial<CreateProduct>;
    }) => updateProduct(productId, data),

    onSuccess: () => {
      showSuccess("Success", "Product updated successfully");

      // Invalidate relevant queries to refresh cached data
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["user-products", user?.id] });

      router.back();
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: ProductCreateFormData) => {
    console.log("SUBMITTED", data);
    const productData: CreateProduct = {
      name: data.name,
      description: data.description,
      price: data.price,
      sizes: data.sizes || [],
      colors: data.colors || [],
      stock: data.stock,
      category_id: data.category_id,
      warranty: data.warranty,
      shipping_cost: data.shipping_cost,
      return_days: data.return_days,
      product_type: data.productType as "PHYSICAL" | "DIGITAL",
      images: data.images,
    };

    if (isEditing && productId) {
      updateMutation.mutate({ productId, data: productData });
    } else {
      createMutation.mutate(productData);
    }
  };

  const openDialog = () => {
    // deleteMutation.mutate()
    Alert.alert(
      "Confirm",
      `Are you sure you want to delete ${existingProduct?.name}`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: () => {
            deleteMutation.mutate();
          },
        },
      ],
    );
  };

  if (isLoadingProduct) {
    return <LoadingIndicator />;
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingBottom: 250,
      }}
    >
      <Stack.Screen
        options={{
          title: isEditing && productId ? "Edit Product" : "Create Product",
          headerTitleAlign: "center",
        }}
      />
      <View className="gap-3">
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value, onBlur } }) => (
            <AppTextInput
              label="Product Name"
              placeholder="T-Shirt"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              width={"90%"}
              height={45}
              errorMessage={errors.name?.message}
              editable={!isPending}
            />
          )}
        />
        <View className="hidden">
          <Controller
            control={control}
            name="productType"
            render={({ field: { onChange, value } }) => (
              <AppPicker
                label="Type"
                items={PRODUCT_TYPE}
                onValueChange={onChange}
                value={value}
              />
            )}
          />
        </View>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value, onBlur } }) => (
            <AppTextInput
              label="Product Description"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              multiline
              width={"90%"}
              height={45}
              errorMessage={errors.description?.message}
              editable={!isPending}
            />
          )}
        />
        <View className="flex-row w-[90%] self-center justify-between">
          <Controller
            control={control}
            name="price"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                placeholder="Price"
                label="Price"
                width={"45%"}
                onBlur={onBlur}
                onChangeText={onChange}
                height={45}
                value={value?.toString() || ""}
                keyboardType="numeric"
                errorMessage={errors.price?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="stock"
            render={({ field: { onChange, value, onBlur } }) => (
              <AppTextInput
                label="Stock"
                onBlur={onBlur}
                value={value?.toString()}
                onChangeText={(text) => onChange(Number(text))}
                errorMessage={errors.stock?.message}
                keyboardType="numeric"
                width={"45%"}
                height={45}
                editable={!isPending}
              />
            )}
          />
        </View>

        <View className="flex-row gap-2 w-[90%] self-center">
          <Controller
            control={control}
            name="shipping_cost"
            render={({ field: { onChange, value, onBlur } }) => (
              <AppTextInput
                label="Shipping"
                onBlur={onBlur}
                value={value?.toString()}
                onChangeText={(text) => onChange(Number(text))}
                errorMessage={errors.stock?.message}
                keyboardType="numeric"
                width={"32.5%"}
                height={45}
                editable={!isPending}
              />
            )}
          />

          <Controller
            control={control}
            name="return_days"
            render={({ field: { onChange, value, onBlur } }) => (
              <AppTextInput
                label="Return Days"
                onBlur={onBlur}
                value={value?.toString()}
                onChangeText={(text) => onChange(Number(text))}
                errorMessage={errors.stock?.message}
                keyboardType="numeric"
                width={"30%"}
                height={45}
                editable={!isPending}
              />
            )}
          />
          <Controller
            control={control}
            name="warranty"
            render={({ field: { onChange, value, onBlur } }) => (
              <AppTextInput
                label="Warranty"
                placeholder="1 Year"
                onBlur={onBlur}
                value={value?.toString()}
                onChangeText={(text) => onChange(text)}
                errorMessage={errors.stock?.message}
                keyboardType="default"
                width={"32.5%"}
                height={45}
                editable={!isPending}
              />
            )}
          />
        </View>

        <Controller
          control={control}
          name="category_id"
          render={({ field: { onChange, value } }) => (
            <AppPicker
              label="Category"
              items={productCategories || []}
              onValueChange={onChange}
              value={value}
            />
          )}
        />
      </View>

      <Controller
        control={control}
        name="sizes"
        render={({ field: { onChange, value } }) => (
          <ChipInput
            label="Sizes"
            value={value || []}
            onChange={onChange}
            placeholder="Type size and press Enter (e.g., S, M, L)"
            error={errors.sizes?.message}
            disabled={isPending}
            maxChips={10}
          />
        )}
      />

      {/* Color Picker */}
      <ColorPickerInput
        control={control}
        name="colors"
        setValue={setValue}
        maxColors={8}
        disabled={isPending}
      />

      {/* Image Picker */}
      <ImagePickerInput
        control={control}
        name="images"
        maxImages={4}
        disabled={isPending}
        setValue={setValue}
        error={errors.images?.message}
      />

      {/* Submit Button */}
      <View style={{ padding: 20 }} className="mb-7 gap-3">
        <AppButton
          text={
            isPending
              ? isEditing
                ? "Updating Product..."
                : "Creating Product..."
              : isEditing
                ? "Update Product"
                : "Create Product"
          }
          onPress={handleSubmit(onSubmit, (errors) =>
            console.log("Form errors:", errors),
          )}
          icon={
            isPending ? (
              <ActivityIndicator color={"white"} size={"large"} />
            ) : (
              ""
            )
          }
          disabled={isPending}
          // borderRadius={10}
        />
        {isEditing && (
          <AppButton
            text="Delete"
            onPress={handleSubmit(openDialog)}
            textColor="red"
            variant="ghost"
          />
        )}
      </View>
    </ScrollView>
  );
};

export default AddProductScreen;

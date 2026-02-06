import React, { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  createFoodItem,
  fetchFoodItem,
  softDeleteFoodItem,
  updateFoodItem,
} from "@/api/food";
import { fetchCategories } from "@/api/item";
import ImagePickerInput from "@/components/AppImagePicker";

import AppPicker from "@/components/AppPicker";
import ChipInput from "@/components/ChipInput";

import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { useUserStore } from "@/store/userStore";
import {
  CreateRestaurantMenuItem,
  UpdateRestaurantMenuItem,
} from "@/types/item-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";

import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { z } from "zod";

const SIZE_OPTIONS = ["SMALL", "MEDIUM", "LARGE", "EXTRA LARGE"] as const;

const schema = z
  .object({
    name: z.string().min(1, "Name is a required field"),
    price: z
      .number({ message: "Price must be a number" })
      .positive("Price must be greater than 0"),
    // Ingredients (description) is only required when type is FOOD
    description: z.string().optional(),
    restaurant_item_type: z.string({ message: "Please select a type" }),
    sides: z.array(z.string()),
    sizes: z.array(z.string()),
    images: z.array(z.any()).nonempty({
      message: "Image is required",
    }),
    category_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.restaurant_item_type === "FOOD" &&
      (!data.description || !data.description.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingredients is a required field",
        path: ["description"],
      });
    }
  });

type MenuFormData = z.infer<typeof schema>;

const RESTAURANT_ITEM_TYPE = [
  { id: "FOOD", name: "FOOD" },
  { id: "DRINK", name: "DRINK" },
];

const addMenu = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const { showError, showSuccess } = useToast();
  const { user } = useUserStore();

  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MenuFormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      price: 0,
      description: "",
      images: [],
      restaurant_item_type: "",
      sides: [],
      sizes: [],
      category_id: "",
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    select: (cats) =>
      cats.filter((cat) => cat.category_type.toLowerCase() === "food"),
  });

  const sides = watch("sides");
  const sizes = watch("sizes");
  const itemType = watch("restaurant_item_type");

  // Fetch menu data if editing
  const { data: existingMenuItem, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["menu", id],
    queryFn: () => fetchFoodItem(id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingMenuItem && isEditing) {
      reset({
        name: existingMenuItem.name || "",
        restaurant_item_type: existingMenuItem.restaurant_item_type || "",
        description: existingMenuItem.description || "",
        price: existingMenuItem.price || 0,
        images: (existingMenuItem.images as any[]) || [],
        sides: existingMenuItem.sides || [],
        sizes: existingMenuItem.sizes || [],
        category_id: existingMenuItem.category_id || "",
      });
    }
  }, [existingMenuItem, reset, isEditing]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MenuFormData }) => {
      if (!existingMenuItem) {
        throw new Error("No item to update");
      }

      const payload: UpdateRestaurantMenuItem = {
        id: existingMenuItem.id,
        vendor_id: existingMenuItem.vendor_id,
        name: data.name,
        description: data.description,
        price: data.price,
        sizes: data.sizes || [],
        sides: data.sides || [],
        images: (data.images as any[]) || [],
        restaurant_item_type: data.restaurant_item_type as any,
        is_deleted: existingMenuItem.is_deleted,
        category_id: data.category_id || undefined,
      };

      return updateFoodItem(id, payload);
    },

    onSuccess: (updated) => {
      showSuccess("Success", "Item updated successfully");
      queryClient.invalidateQueries({
        queryKey: [
          "restaurantItems",
          updated.vendor_id,
          updated.restaurant_item_type,
        ],
      });
      router.back();
    },
    onError: (error) => {
      showError("Error", error.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MenuFormData) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const payload: CreateRestaurantMenuItem = {
        name: data.name,
        description: data.description,
        price: data.price,
        sizes: data.sizes || [],
        sides: data.sides || [],
        images: (data.images as any[]) || [],
        restaurant_item_type: data.restaurant_item_type as any,
        is_available: true,
        is_deleted: false,
        category_id: data.category_id || undefined,
      };

      return createFoodItem(payload);
    },
    onSuccess: (created) => {
      showSuccess("Success", `${created?.name} created successfully`);
      queryClient.invalidateQueries({
        queryKey: [
          "restaurantItems",
          created.vendor_id,
          created.restaurant_item_type,
        ],
      });
      router.back();
    },

    onError: (error: any) => {
      showError("Error", error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => softDeleteFoodItem(itemId),
    onSuccess: () => {
      if (existingMenuItem) {
        queryClient.invalidateQueries({
          queryKey: [
            "restaurantItems",
            existingMenuItem.vendor_id,
            existingMenuItem.restaurant_item_type,
          ],
        });
      }
      showSuccess("Success", "Item deleted successfully");
      router.back();
    },
    onError: (error: any) => {
      showError("Error", error.message);
    },
  });

  const onSubmit = (data: MenuFormData) => {
    if (isEditing && id) {
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoadingProduct) {
    return <LoadingIndicator />;
  }

  return (
    <>
      <ScrollView
        className="bg-background flex-1"
        contentContainerStyle={{ paddingBottom: 300 }}
      >
        <Stack.Screen
          options={{
            title: isEditing ? "Update Menu" : "Add Menu",
          }}
        />
        <View className="mt-3 mb-8 gap-3">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                placeholder="Name"
                label="Name"
                width={"90%"}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                errorMessage={errors.name?.message}
              />
            )}
          />

          <View className="flex-row items-center w-[90%] self-center">
            <Controller
              control={control}
              name="price"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextInput
                  placeholder="Price"
                  label="Price"
                  width={"50%"}
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(Number(text))}
                  value={value?.toString()}
                  keyboardType="numeric"
                  errorMessage={errors.price?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="restaurant_item_type"
              render={({ field: { onChange, value } }) => (
                <AppPicker
                  label="Type"
                  width={"50%"}
                  items={RESTAURANT_ITEM_TYPE ?? []}
                  onValueChange={(val) => {
                    onChange(val);
                    if (val === "DRINK") {
                      // Clear food-only fields when switching to DRINK
                      setValue("description", "");
                      setValue("sides", []);
                      setValue("sizes", []);
                    }
                  }}
                  value={value}
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
                width={"90%"}
                items={
                  categories?.map((cat) => ({ id: cat.id, name: cat.name })) ||
                  []
                }
                onValueChange={onChange}
                value={value}
                placeholder="Select Category"
              />
            )}
          />
          <>
            {itemType === "FOOD" && (
              <>
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AppTextInput
                      label="Ingredients"
                      placeholder="Ingredients"
                      height={60}
                      onBlur={onBlur}
                      width={"90%"}
                      onChangeText={onChange}
                      multiline={true}
                      numberOfLines={4}
                      value={value}
                      errorMessage={errors.description?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="sides"
                  render={({ field: { onChange, value } }) => (
                    <ChipInput
                      label="Sides"
                      placeholder="Type a side and press enter"
                      value={value}
                      onChange={onChange}
                      error={errors.sides?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="sizes"
                  render={({ field: { value, onChange } }) => (
                    <View className="w-[90%] self-center mt-2 mb-4">
                      <Text className="mb-1 font-poppins text-[14px] text-gray-400">
                        Sizes (select one or more)
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {SIZE_OPTIONS.map((size) => {
                          const selected = (value || []).includes(size);
                          return (
                            <TouchableOpacity
                              key={size}
                              className={
                                selected
                                  ? "px-3 py-2 rounded-full bg-button-primary"
                                  : "px-3 py-2 rounded-full bg-input"
                              }
                              onPress={() => {
                                if (selected) {
                                  onChange(
                                    (value || []).filter(
                                      (s: string) => s !== size,
                                    ),
                                  );
                                } else {
                                  onChange([...(value || []), size]);
                                }
                              }}
                            >
                              <Text
                                className={
                                  selected
                                    ? "text-white font-poppins text-xs"
                                    : "text-primary font-poppins text-xs"
                                }
                              >
                                {size}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                />
              </>
            )}
          </>

          <Controller
            control={control}
            name="images"
            render={({ field: { onChange, value } }) => (
              <ImagePickerInput
                value={value && value.length > 0 ? value[0] : null}
                onChange={(image) => onChange(image ? [image] : [])}
                errorMessage={errors.images?.message?.toString()}
              />
            )}
          />
          <View className="my-4 w-[90%] self-center">
            <AppButton
              text={isEditing ? "Update" : "Submit"}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                deleteMutation.isPending
              }
              icon={
                (createMutation.isPending ||
                  updateMutation.isPending ||
                  deleteMutation.isPending) && (
                  <ActivityIndicator color="#ccc" />
                )
              }
              width={"100%"}
              onPress={handleSubmit(onSubmit)}
            />

            {isEditing && id && (
              <View className="mt-3">
                <AppButton
                  variant="ghost"
                  text="Delete Item"
                  color="red"
                  disabled={deleteMutation.isPending}
                  width={"100%"}
                  onPress={() => deleteMutation.mutate(id)}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default addMenu;

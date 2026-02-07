import React, { useEffect } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { fetchCategories } from "@/api/food";
import {
  createLaundryItem,
  fetchLaundryItem,
  softDeleteLaundryItem,
  updateLaundryItem,
} from "@/api/laundry";
import ImagePickerInput from "@/components/AppImagePicker";
import AppPicker from "@/components/AppPicker";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useUserStore } from "@/store/userStore";
import { CreateLaundryItem } from "@/types/item-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is a required field"),
  price: z
    .number({ message: "Price must be a number" })
    .positive("Price must be greater than 0"),
  description: z.string().min(1, "Description is a required field"),
  wash_type: z.string({ message: "Please select a wash type" }),
  images: z.array(z.any()).nonempty({
    message: "Image is required",
  }),
  category_id: z.string().optional(),
});

type LaundryFormData = z.infer<typeof schema>;

const WASH_TYPE_OPTIONS = [
  { id: "DRY_CLEAN", name: "DRY CLEAN" },
  { id: "WASH_FOLD", name: "WASH & FOLD" },
  { id: "IRON_ONLY", name: "IRON ONLY" },
  { id: "SPECIAL", name: "SPECIAL" },
];

const AddLaundryItem = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const { showError, showSuccess } = useToast();
  const { user } = useUserStore();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LaundryFormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      price: 0,
      description: "",
      images: [],
      wash_type: "",
      category_id: "",
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    select: (cats) =>
      cats.filter((cat) => cat.category_type.toLowerCase() === "laundry"),
  });

  const { data: existingMenuItem, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["laundryItem", id],
    queryFn: () => fetchLaundryItem(id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingMenuItem && isEditing) {
      reset({
        name: existingMenuItem.name || "",
        description: existingMenuItem.description || "",
        price: existingMenuItem.price || 0,
        images: (existingMenuItem.images as any[]) || [],
        wash_type: existingMenuItem.wash_type || "",
        category_id: existingMenuItem.category_id || "",
      });
    }
  }, [existingMenuItem, reset, isEditing]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LaundryFormData }) => {
      if (!existingMenuItem) {
        throw new Error("No item to update");
      }

      return updateLaundryItem(id, {
        vendor_id: existingMenuItem.vendor_id,
        name: data.name,
        description: data.description,
        price: data.price,
        wash_type: data.wash_type as any,
        images: (data.images as any[]) || [],
        is_deleted: existingMenuItem.is_deleted,
        category_id: data.category_id || undefined,
      });
    },
    onSuccess: () => {
      showSuccess("Success", "Laundry service updated successfully");
      queryClient.invalidateQueries({ queryKey: ["laundryItems", user?.id] });
      router.back();
    },
    onError: (error) => {
      showError("Error", error.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LaundryFormData) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const payload: CreateLaundryItem = {
        name: data.name,
        description: data.description,
        price: data.price,
        wash_type: data.wash_type as any,
        images: (data.images as any[]) || [],
        is_available: true,
        is_deleted: false,
        category_id: data.category_id || undefined,
      };

      return createLaundryItem(payload);
    },
    onSuccess: (created) => {
      showSuccess("Success", `${created?.name} created successfully`);
      queryClient.invalidateQueries({ queryKey: ["laundryItems", user?.id] });
      router.back();
    },
    onError: (error: any) => {
      showError("Error", error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => softDeleteLaundryItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laundryItems", user?.id] });
      showSuccess("Success", "Item deleted successfully");
      router.back();
    },
    onError: (error: any) => {
      showError("Error", error.message);
    },
  });

  const onSubmit = (data: LaundryFormData) => {
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
            title: isEditing ? "Update Service" : "Add Service",
          }}
        />
        <View className="mt-3 mb-8 gap-3">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                placeholder="Service Name"
                label="Service Name"
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
              name="wash_type"
              render={({ field: { onChange, value } }) => (
                <AppPicker
                  label="Wash Type"
                  width={"50%"}
                  items={WASH_TYPE_OPTIONS}
                  onValueChange={onChange}
                  value={value}
                  placeholder="Select Type"
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
                value={value || ""}
                placeholder="Select Category"
              />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                label="Description"
                placeholder="Description"
                height={80}
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
                  text="Delete Service"
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

export default AddLaundryItem;

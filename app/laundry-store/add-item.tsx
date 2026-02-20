import AppPicker from "@/components/AppPicker";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  View,
} from "react-native";

import { fetchCategories } from "@/api/food";
import {
  createLaundryItem,
  fetchLaundryItem,
  softDeleteLaundryItem,
  updateLaundryItem,
} from "@/api/laundry";
import ImagePickerInput from "@/components/AppImagePicker";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
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
  laundry_type: z.string({ message: "Please select a wash type" }),
  images: z.array(z.any()).nonempty({
    message: "Image is required",
  }),
});

type LaundryFormData = z.infer<typeof schema>;

const LAUNDRY_TPES_OPTIONS = [
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
  const theme = useColorScheme();

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
      laundry_type: "",
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
        laundry_type: existingMenuItem.laundry_type || "",
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
        images: (data.images as any[]) || [],
        laundry_type: data.laundry_type as any,
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
        images: (data.images as any[]) || [],
        laundry_type: data.laundry_type as any,
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
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen
          options={{
            title: isEditing ? "Update Service" : "Add Service",
            headerStyle: {
              backgroundColor:
                theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
            },
            headerTintColor: theme === "dark" ? "white" : "black",
          }}
        />
        <View className="mt-3 mb-8 gap-3">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                placeholder="Item Name"
                label="Item Name"
                width={"90%"}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                errorMessage={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="price"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                placeholder="Price"
                label="Price"
                onBlur={onBlur}
                width={"90%"}
                onChangeText={(text) => onChange(Number(text))}
                value={value?.toString()}
                keyboardType="numeric"
                errorMessage={errors.price?.message}
              />
            )}
          />
          <View className="items-center">
            <Controller
              control={control}
              name="laundry_type"
              render={({ field: { onChange, value } }) => (
                <AppPicker
                  label="Laundry Type"
                  placeholder="Select Wash Type"
                  items={LAUNDRY_TPES_OPTIONS}
                  onValueChange={onChange}
                  value={value}
                />
              )}
            />
          </View>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                label="Description"
                placeholder="Description"
                onBlur={onBlur}
                onChangeText={onChange}
                multiline={true}
                width={"90%"}
                value={value}
                errorMessage={errors.description?.message}
              />
            )}
          />

          <View className="w-[90%] self-center">
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
          </View>

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

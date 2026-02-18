import {
  createRiderByDispatcher,
  deleteRider,
  updateRiderByDispatcher,
} from "@/api/user";
import HDivider from "@/components/HDivider";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useUserStore } from "@/store/userStore";
// import { useAuth } from '@/context/authContext';
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { z } from "zod";

const createSchema = z
  .object({
    full_name: z.string().min(1, "Name is required"),
    email: z.string({ message: "Email is required." }).email().trim(),
    phone: z.string().min(1, { message: "Phone number is required" }),
    bike_number: z.string().min(1, { message: "Plate number is required" }),
    password: z.string().min(1, { message: "Password is required" }),
    confirm_password: z
      .string()
      .min(1, { message: "Confirm password is required" }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Password do not match.",
    path: ["confirmPassword"],
  });

const editSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, { message: "Phone number is required" }),
  bike_number: z.string().min(1, { message: "Plate number is required" }),
});

type CreateFormData = z.infer<typeof createSchema>;
type UpdateFormData = z.infer<typeof editSchema>;
type FormData = CreateFormData | UpdateFormData;

const AddRider = () => {
  const { user } = useUserStore();

  /*
  fullName: rider.full_name,
            phoneNumber: rider.phone_number,
            email: rider.email,
            isEditing: "true",
            bikeNumber: rider.bike_number,
            id: rider.id,
  */
  const { id, isEditing, fullName, phoneNumber, bikeNumber } =
    useLocalSearchParams<{
      id: string;
      isEditing: string;
      fullName: string;
      phoneNumber: string;
      bikeNumber: string;
    }>();

  const { showError, showSuccess } = useToast();

  const editing = !!isEditing;

  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(editing ? editSchema : createSchema),
    mode: "onBlur",
    defaultValues: {
      full_name: fullName || "",
      email: "",
      phone: phoneNumber || "",
      bike_number: bikeNumber || "",
      password: "",
      confirm_password: "",
    },
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["riders", user?.id] });
    showSuccess(
      isEditing ? "Rider Updated" : "Rider Added(Pending Confirmation)",
      isEditing ? "Rider updated successfully." : "Rider added successfully.",
    );

    router.back();
  };

  const handleError = (error: Error) => {
    showError("Error", error.message);
  };

  const deleteRiderMutation = useMutation({
    mutationFn: () => deleteRider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders", user?.id] });
      showSuccess("Rider Deleted", "Rider deleted successfully.");
      router.back();
    },
    onError: handleError,
  });

  const createMutation = useMutation({
    mutationFn: createRiderByDispatcher,
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateFormData) =>
      updateRiderByDispatcher(id, {
        full_name: data.full_name,
        phone_number: data.phone,
        bike_number: data.bike_number,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["riders", user?.id],
        exact: true,
      });

      handleSuccess();
      reset();
    },
    onError: handleError,
  });

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMutation.mutate(data as UpdateFormData);
    } else {
      createMutation.mutate(data as CreateFormData);
    }
  };

  return (
    <>
      <HDivider />
      <Stack.Screen
        options={{ title: isEditing ? "Edit Rider" : "Add Rider" }}
      />
      <ScrollView
        className="bg-background flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-5 mt-5 w-[90%] mx-auto"
        contentContainerStyle={{ paddingBottom: 400 }}
      >
        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextInput
              placeholder="Full Name"
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="words"
              value={value}
              errorMessage={errors.root?.full_name.message}
            />
          )}
        />
        {!isEditing && (
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                placeholder="Email"
                onBlur={onBlur}
                autoCapitalize="none"
                onChangeText={onChange}
                keyboardType="email-address"
                value={value}
                errorMessage={errors?.root?.email?.message}
              />
            )}
          />
        )}
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextInput
              placeholder="Phone Number"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              keyboardType={"phone-pad"}
              errorMessage={errors.phone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="bike_number"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextInput
              placeholder="Plate Number"
              onBlur={onBlur}
              autoCapitalize="characters"
              onChangeText={onChange}
              value={value}
              errorMessage={errors.bike_number?.message}
            />
          )}
        />
        {!isEditing && (
          <>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextInput
                  placeholder="Password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  secureTextEntry
                  value={value}
                  errorMessage={errors?.root?.password?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="confirm_password"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextInput
                  placeholder="Confirm Password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  secureTextEntry
                  value={value}
                  errorMessage={errors?.root?.confirm_password?.message}
                />
              )}
            />
          </>
        )}

        <AppButton
          text={
            createMutation.isPending || updateMutation.isPending
              ? ""
              : isEditing
                ? "Update"
                : "Submit"
          }
          onPress={handleSubmit(onSubmit)}
          borderRadius={50}
          disabled={createMutation.isPending || updateMutation.isPending}
          icon={
            createMutation.isPending || updateMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : null
          }
        />

        {editing && (
          <AppButton
            text="Delete Rider"
            variant="outline"
            backgroundColor="red"
            borderRadius={50}
            color="red"
            borderColor="red"
            onPress={() => deleteRiderMutation.mutate}
            disabled={deleteRiderMutation.isPending}
            icon={
              deleteRiderMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : null
            }
          />
        )}
      </ScrollView>
    </>
  );
};

export default AddRider;

const styles = StyleSheet.create({});

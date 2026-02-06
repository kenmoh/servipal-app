import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import React, { useEffect, useState } from "react";

import { sendItem } from "@/api/order";
import ImagePickerInput from "@/components/AppImagePicker";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useLocationStore } from "@/store/locationStore";
import { formatDuration } from "@/utils/distance-cache";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";

// import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useUserStore } from "@/store/userStore";
import { getDirections } from "@/utils/map";
import { z } from "zod";

const coordinatesSchema = z.tuple([
  z.number({ message: "Required" }).nullable(),
  z.number({ message: "Required" }).nullable(),
]);

export const sendItemSchema = z.object({
  packageName: z.string().nonempty({ message: "Package name is required" }),
  pickupLat: z.number().nullable(),
  pickupLng: z.number().nullable(),
  dropoffLat: z.number().nullable(),
  distance: z.number(),
  dropoffLng: z.number().nullable(),
  receiverPhone: z.string().nonempty({ message: "Receiver phone is required" }),
  description: z.string().nonempty({ message: "Description is required" }),
  origin: z.string().nonempty({ message: "Origin is required" }),
  destination: z.string().nonempty({ message: "Destination is required" }),
  duration: z.string().nonempty({ message: "Duration is required" }),
  imageUrl: z.string().nonempty({ message: "Image is required" }),
});

type FormData = z.infer<typeof sendItemSchema>;

const ItemInfo = () => {
  // Get location data from Zustand store
  const { origin, originCoords, reset, destination, destinationCoords } =
    useLocationStore();

  const { showError, showInfo } = useToast();
  const { user } = useUserStore();
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState(0);

  // Initialize form with empty values
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(sendItemSchema),
    mode: "onBlur",
    defaultValues: {
      packageName: "",
      receiverPhone: "",
      description: "",
      imageUrl: "",
      origin: "",
      destination: "",
      pickupLat: null,
      pickupLng: null,
      dropoffLat: null,
      dropoffLng: null,
      duration: "",
      distance: 0,
    },
  });

  // State to track form values for non-editable fields
  const [formValues, setFormValues] = useState({
    origin: "",
    destination: "",
    pickupLat: null as number | null,
    pickupLng: null as number | null,
    dropoffLat: null as number | null,
    dropoffLng: null as number | null,
    distance: 0,
    duration: "",
  });
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: sendItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-orders", user?.id],
      });

      queryClient.invalidateQueries({
        queryKey: ["delivery-orders"],
      });

      showInfo("Payment Successful", "Please select a rider ");
      reset();

      router.push({
        pathname: "/payment",
        params: {
          logo: data.logo,
          email: data.email,
          distance: data.distance,
          phonenumber: data.phonenumber,
          fullName: data.fullName,
          description: data.description,
          title: data.title,
          txRef: data.tx_ref,
          amount: data.amount,
          publicKey: data.public_key,
          receiverPhoneNumber: data.receiver_phone,
          pickupLocation: data.pickup_location,
          destination: data.destination,
          packageName: data.package_name,
        },
      });
      return;
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      showError("Error", errorMessage);
    },
  });

  const onSubmit = (data: FormData) => {
    mutate(data);
  };

  // Update form from Zustand state
  useEffect(() => {
    // Only update if the values exist and are different from current values
    if (origin) {
      setValue("origin", origin);
      setFormValues((prev) => ({ ...prev, origin }));
    }

    if (destination) {
      setValue("destination", destination);
      setFormValues((prev) => ({ ...prev, destination }));
    }

    if (originCoords && originCoords.length === 2) {
      setValue("pickupLat", originCoords[0]);
      setValue("pickupLng", originCoords[1]);

      setFormValues((prev) => ({
        ...prev,
        pickupLat: originCoords[0],
        pickupLng: originCoords[1],
      }));
    }

    if (destinationCoords && destinationCoords.length === 2) {
      setValue("dropoffLat", destinationCoords[0]);
      setValue("dropoffLng", destinationCoords[1]);

      setFormValues((prev) => ({
        ...prev,
        dropoffLat: destinationCoords[0],
        dropoffLng: destinationCoords[1],
      }));
    }
  }, [origin, destination, originCoords, destinationCoords, setValue]);

  // Fetch distance and duration when origin or destination changes

  useEffect(() => {
    const fetchAndUseTravelInfo = async () => {
      if (!originCoords || !destinationCoords) return;

      try {
        const { distance, duration } = await getDirections(
          originCoords as [number, number],
          destinationCoords as [number, number],
        );

        // Convert distance meters → km
        const distanceKm = (distance / 1000).toFixed(2);

        // Convert duration seconds → hr/min format
        const durationText = formatDuration(duration);

        setValue("distance", parseFloat(distanceKm));
        setValue("duration", durationText);

        setDistance(parseFloat(distanceKm));
        setDuration(durationText);

        setFormValues((prev) => ({
          ...prev,
          distance: parseFloat(distanceKm),
          duration: durationText,
        }));
      } catch (error) {
        console.error("Failed to fetch Mapbox travel info:", error);
      }
    };

    fetchAndUseTravelInfo();
  }, [originCoords, destinationCoords]);

  if (!origin || !destination || !originCoords || !destinationCoords) {
    return <LoadingIndicator />;
  }

  return (
    <>
      <HDivider />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 350 }}
      >
        <View className="px-[20px] gap-3 my-2">
          <View className="flex-row items-center gap-5">
            <View className="w-[10px] h-[10px] rounded-[3px] bg-gray-500" />
            <Text className="text-primary text-[12px] font-poppins">
              {origin}{" "}
            </Text>
          </View>

          <View className="flex-row items-center gap-5">
            <Feather name="map-pin" color="gray" size={10} />
            <Text className="text-primary text-[12px] font-poppins">
              {destination}{" "}
            </Text>
          </View>
          <View className="flex-row gap-10">
            <View className="flex-row gap-5 items-center">
              <MaterialCommunityIcons
                name="road-variant"
                size={12}
                color={"gray"}
              />
              <Text className="text-primary text-[12px]">{distance} km</Text>
            </View>
            <View className="items-center flex-row gap-5">
              <Feather name="clock" color="gray" size={12} />

              <Text className="text-primary text-[12px]"> {duration} </Text>
            </View>
          </View>
        </View>
        <HDivider />

        <View className="mt-5">
          <View className="gap-3">
            <Controller
              control={control}
              name="packageName"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextInput
                  placeholder="Name"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  width={"90%"}
                  errorMessage={errors.packageName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="receiverPhone"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextInput
                  placeholder="Receiver Phone Number"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  width={"90%"}
                  errorMessage={errors.receiverPhone?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextInput
                  placeholder="Description"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  width={"90%"}
                  errorMessage={errors.description?.message}
                  multiline
                />
              )}
            />

            <Controller
              control={control}
              name="imageUrl"
              render={({ field: { onChange, value } }) => (
                <ImagePickerInput
                  // imageHeight={1000}
                  iconSize={50}
                  value={value}
                  onChange={onChange}
                  errorMessage={errors.imageUrl?.message?.toString()}
                />
              )}
            />
          </View>
          <View className="self-center w-full items-center mt-4">
            <AppButton
              text="Send"
              width={"90%"}
              icon={
                isPending && <ActivityIndicator size={"large"} color="white" />
              }
              onPress={handleSubmit(onSubmit)}
              disabled={isPending}
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default ItemInfo;

const styles = StyleSheet.create({});

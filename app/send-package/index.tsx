import CurrentLocationButton from "@/components/CurrentLocationButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import { AppButton } from "@/components/ui/app-button";
import { useLocationStore } from "@/store/locationStore";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const index = () => {
  const { origin, destination, setOrigin, setDestination } = useLocationStore();
  const [errors, setErrors] = useState({ origin: "", destination: "" });
  // const [isDisabled, setIsDisabled] = useState(false);

  const isDisabled = !origin || !destination;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row gap-2">
          <View className="flex-1">
            <GoogleTextInput
              placeholder="Pickup Location"
              value={origin}
              error={errors.origin}
              onChangeText={(text) => {
                setOrigin(text, null);
              }}
              onPlaceSelect={(lat, lng, address) => {
                setOrigin(address, [lat, lng]);
                setErrors((prev) => ({ ...prev, origin: "" }));
              }}
            />
          </View>
          <View className="">
            <CurrentLocationButton
              height={55}
              width={55}
              onLocationSet={(address, coords) => {
                setOrigin(address, coords);
                setErrors((prev) => ({ ...prev, origin: "" }));
              }}
            />
          </View>
        </View>

        <GoogleTextInput
          placeholder="Dropoff Location"
          value={destination}
          error={errors.destination}
          scrollEnabled={false}
          onChangeText={(text) => {
            setDestination(text, null);
          }}
          onPlaceSelect={(lat, lng, address) => {
            setDestination(address, [lat, lng]);
            setErrors((prev) => ({ ...prev, destination: "" }));
          }}
        />

        <View className="mt-4">
          <AppButton
            text="Next"
            onPress={() => router.push("/send-package/package-info")}
            disabled={isDisabled}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default index;

const styles = StyleSheet.create({});

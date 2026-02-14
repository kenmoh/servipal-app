import { initiateRestaurantOrderPayment } from "@/api/food";
import { initiateLaundryOrderPayment } from "@/api/laundry";
import { fetchProfile } from "@/api/user";
import AppModal from "@/components/AppModal";
import Item from "@/components/CartItem";
import CurrentLocationButton from "@/components/CurrentLocationButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import RadioButton from "@/components/RadioButton";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useCartStore } from "@/store/cartStore";
import { useLocationStore } from "@/store/locationStore";
import { useUserStore } from "@/store/userStore";
import { OrderCreate, RestaurantOrderCreate } from "@/types/item-types";
import { RequireDelivery } from "@/types/order-types";
import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

const Cart = () => {
  const [instructions, setInstructions] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useColorScheme();
  const { user } = useUserStore();
  const { isLaundry } = useLocalSearchParams();
  const { showError } = useToast();

  const isLaundryOrder = isLaundry === "true";

  const { setDeliveryOption, cart, setAdditionalInfo, totalCost } =
    useCartStore();

  const vendorId = cart.order_items[0]?.vendor_id;
  const { delivery_option } = cart;

  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor-profile", vendorId],
    queryFn: () => fetchProfile(vendorId),
    enabled: !!vendorId,
  });

  const { setDestination, destination } = useLocationStore();

  const queryClient = useQueryClient();
  const isDark = theme === "dark";
  const bgColor = isDark ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  // ---- Laundry mutation ----
  const { mutate: laundryMutate, isPending: laundryIsPending } = useMutation({
    mutationFn: (payload: OrderCreate) => initiateLaundryOrderPayment(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["laundry-orders", user?.id] });
      router.push({
        pathname: "/payment",
        params: {
          logo: data.customization.logo,
          email: data.customer.email,
          phonenumber: data.customer.phone_number,
          fullName: data.customer.full_name,
          description: data.customization.description,
          title: data.customization.title,
          txRef: data.tx_ref,
          amount: data.amount,
          publicKey: data.public_key,
          serviceType: "LAUNDRY",
        },
      });
    },
    onError: (error) => {
      showError(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    },
  });

  // ---- Food mutation ----
  const { mutate: foodMutate, isPending: foodIsPending } = useMutation({
    mutationFn: (payload: RestaurantOrderCreate) => {
      return initiateRestaurantOrderPayment(payload);
    },
    onSuccess: (data) => {
      router.push({
        pathname: "/payment",
        params: {
          logo: data.customization.logo,
          email: data.customer.email,
          phonenumber: data.customer.phone_number,
          fullName: data.customer.full_name,
          description: data.customization.description,
          title: data.customization.title,
          txRef: data.tx_ref,
          amount: data.amount,
          publicKey: data.public_key,
          serviceType: "FOOD",
        },
      });
      queryClient.invalidateQueries({ queryKey: ["food-orders", user?.id] });
    },
    onError: (error) => {
      showError(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    },
  });

  const isPending = isLaundryOrder ? laundryIsPending : foodIsPending;

  // ---- Delivery option handler ----
  // Opens modal automatically when vendor delivery is selected or when pickup-only vendor
  const handleDeliveryOptionChange = (option: RequireDelivery) => {
    setDeliveryOption(option);
    if (option === "VENDOR_DELIVERY") {
      setModalVisible(true);
    }
    // For pickup-only vendors, open modal to select address
    if (option === "PICKUP" && !vendorProfile?.can_pickup_and_dropoff) {
      setModalVisible(true);
    }
  };

  // ---- Submit ----
  const handleOrderCreate = () => {
    if (!delivery_option) {
      showError("Error", "Please select a delivery option");
      return;
    }

    if (delivery_option === "VENDOR_DELIVERY" && !destination) {
      showError("Error", "Please enter a delivery address");
      setModalVisible(true);
      return;
    }

    // For pickup-only vendors, also require address
    if (delivery_option === "PICKUP" && !vendorProfile?.can_pickup_and_dropoff && !destination) {
      showError("Error", "Please select a delivery address");
      setModalVisible(true);
      return;
    }

    // Shared base payload for both order types
    const basePayload: OrderCreate = {
      vendor_id: vendorId,
      delivery_option,
      instructions,
      delivery_address:
        delivery_option === "VENDOR_DELIVERY" || !vendorProfile?.can_pickup_and_dropoff
          ? (destination ?? "")
          : "",
      items: cart.order_items.map((item) => ({
        item_id: item.item_id,
        name: item.name ?? "",
        price: item.price ?? 0,
        quantity: item.quantity,
        images: item.images ?? (item.image ? [item.image] : []),
        sides: item.selected_side ? [item.selected_side] : [],
        sizes: item.selected_size ? [item.selected_size] : [],
      })),
    };

    if (isLaundryOrder) {
      laundryMutate(basePayload);
    } else {
      foodMutate(basePayload);
    }
  };

  // ---- Empty cart ----
  if (cart.order_items.length === 0) {
    return (
      <View
        style={{ backgroundColor: bgColor }}
        className="flex-1 items-center justify-center px-10"
      >
        <View className="w-24 h-24 rounded-full bg-button-primary/10 items-center justify-center mb-6">
          <Feather name="shopping-cart" color="#FF8C00" size={40} />
        </View>
        <Text className="text-xl font-poppins-bold text-primary text-center mb-2 px-4 w-full">
          Your cart is empty
        </Text>
        <Text className="text-sm font-poppins-regular text-gray-400 text-center mb-8 px-4 w-full">
          Browse our menu and add some items to your cart!
        </Text>
        <AppButton
          text="Go Back"
          width="50%"
          height={45}
          variant="outline"
          borderRadius={50}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 400 }}
      >
        <View className="px-5 pt-4">
          {/* Cart Items */}
          <View className="mb-8">
            {cart.order_items.map((item) => (
              <Item key={item.item_id} item={item} />
            ))}
          </View>

          {/* Pricing Summary */}
          <View className="bg-input rounded-2xl p-5 border border-gray-600 mb-8">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-400 font-poppins-medium">
                Subtotal
              </Text>
              <Text className="text-primary font-poppins-semibold">
                ₦{Number(totalCost).toFixed(2)}
              </Text>
            </View>
            <View className="h-[1px] bg-gray-600 my-4" />
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-poppins-bold text-primary">
                Total
              </Text>
              <Text className="text-lg font-poppins-bold text-button-primary">
                ₦{Number(totalCost).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Delivery Options */}
          <View className="mb-8">
            <Text className="text-base font-poppins-bold text-primary mb-4">
              Delivery Method
            </Text>
            <View className="bg-input rounded-2xl p-4 border border-gray-600">
              {vendorProfile?.can_pickup_and_dropoff ? (
                <>
                  <RadioButton
                    label={
                      isLaundryOrder
                        ? "Self Drop-off / Pickup"
                        : "Pickup from Store"
                    }
                    selected={delivery_option === "PICKUP"}
                    onPress={() => handleDeliveryOptionChange("PICKUP")}
                  />
                  <RadioButton
                    label="Vendor Delivery"
                    selected={delivery_option === "VENDOR_DELIVERY"}
                    onPress={() => handleDeliveryOptionChange("VENDOR_DELIVERY")}
                  />
                </>
              ) : (
                <RadioButton
                  label="Select delivery address"
                  selected={delivery_option === "PICKUP"}
                  onPress={() => handleDeliveryOptionChange("PICKUP")}
                />
              )}
            </View>
          </View>

          {/* Delivery address summary — shown after modal is confirmed */}
          {((delivery_option === "VENDOR_DELIVERY") ||
            (delivery_option === "PICKUP" && !vendorProfile?.can_pickup_and_dropoff)) &&
            destination &&
            !modalVisible && (
              <View className="mb-8">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-base font-poppins-bold text-primary">
                    Delivery Address
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    hitSlop={8}
                  >
                    <Text className="text-sm font-poppins-medium text-button-primary">
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="bg-input rounded-2xl p-4 border border-gray-600 flex-row">
                  <Feather
                    name="map-pin"
                    size={16}
                    color="#FF8C00"
                    style={{ marginTop: 2, marginRight: 10 }}
                  />
                  <Text className="text-sm text-primary font-poppins-regular flex-1">
                    {destination}
                  </Text>
                </View>
              </View>
            )}

          {/* Instructions */}
          <View className="mb-8">
            <Text className="text-base font-poppins-bold text-primary mb-4">
              Instructions
            </Text>
            <AppTextInput
              placeholder={
                isLaundryOrder
                  ? "e.g. Use cold water, no bleach, handle delicates with care"
                  : "e.g. Less spice, no onions, leave at the front desk"
              }
              multiline
              disabled={isPending}
              textAlignVertical="center"
              value={instructions}
              onChangeText={(text) => {
                setInstructions(text);
                setAdditionalInfo(text);
              }}
            />
          </View>
        </View>

        {/* Footer */}
        {!modalVisible && (
          <View className="w-full px-5 pb-5 bg-background">
            <AppButton
              disabled={isPending}
              text={isPending ? "" : "Place Order"}
              onPress={handleOrderCreate}
              icon={
                isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Feather name="check-circle" size={18} color="white" />
                )
              }
            />
          </View>
        )}
      </ScrollView>

      {/* Delivery Address Modal */}
      <AppModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        height="65%"
      >
        <View className="flex-1 pt-2">
          <Text className="text-xl font-poppins-bold text-primary mb-6">
            Delivery Address
          </Text>

          <View className="mb-6">
            <Text className="text-xs text-gray-400 font-poppins-medium mb-2 uppercase ml-1">
              Dropoff Location
            </Text>
            <View className="flex-row items-center gap-2">
              <GoogleTextInput
                placeholder="Enter delivery address"
                value={destination}
                onPlaceSelect={(lat, lng, address) => {
                  setDestination(address, [lat, lng]);
                }}
              />
              <CurrentLocationButton
                onLocationSet={(address, coords) => {
                  setDestination(address, coords);
                }}
              />
            </View>
          </View>

          <View className="mt-auto">
            <AppButton
              text="Confirm Address"
              onPress={() => setModalVisible(false)}
              disabled={!destination}
            />
          </View>
        </View>
      </AppModal>
    </>
  );
};

export default Cart;

import { createOrder } from "@/api/order";
import { fetchRider } from "@/api/user";
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
import { OrderFoodOLaundry, RequireDelivery } from "@/types/order-types";
import { formatDistanceAndTime } from "@/utils/formatCurrency";
import { getCoordinatesFromAddress } from "@/utils/geocoding";
import { getDirections } from "@/utils/map";
import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

const Cart = () => {
  const [infoText, setInfoText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useColorScheme();
  const { user, storeAddress } = useUserStore();
  const { isLaundry } = useLocalSearchParams();
  const { showError } = useToast();

  const {
    setDeliveryOption,
    cart,
    updateDuration,
    updateDistance,
    setAdditionalInfo,
    totalCost,
  } = useCartStore();

  const vendorId = cart.order_items[0]?.vendor_id;

  const { data: vendorProfile } = useQuery({
    queryKey: ["vendorProfile", vendorId],
    queryFn: () => fetchRider(vendorId),
    enabled: !!vendorId,
  });

  const {
    require_delivery,
    duration: storeDelivery,
    distance: storeDistance,
  } = useCartStore((state) => state.cart);

  const { setDestination, destination, destinationCoords, originCoords } =
    useLocationStore();

  const isDark = theme === "dark";
  const bgColor = isDark ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  const handleDeliveryOptionChange = (option: RequireDelivery) => {
    setDeliveryOption(option);
    if (option === "vendor-pickup-and-dropoff" || option === "delivery") {
      setModalVisible(true);
    }
  };

  const handleNext = () => {
    setAdditionalInfo(infoText);
    setModalVisible(false);
  };

  const prepareOrderForServer = (): OrderFoodOLaundry => {
    return {
      order_items: cart.order_items.map((item) => ({
        vendor_id: item.vendor_id,
        item_id: item.item_id,
        quantity: item.quantity,
        ...(item.selectedSize && { size: item.selectedSize }),
        ...(item.selectedSides && { sides: item.selectedSides }),
      })),
      pickup_coordinates: originCoords || [0, 0],
      dropoff_coordinates: destinationCoords || [0, 0],
      distance: Number(cart.distance) || 0,
      require_delivery: cart.require_delivery,
      is_one_way_delivery: cart.is_one_way_delivery,
      duration: cart.duration,
      origin: storeAddress || "",
      destination: destination ?? undefined,
      ...(cart.additional_info && { additional_info: cart.additional_info }),
    };
  };

  const { mutate, isPending } = useMutation({
    mutationKey: ["createOrder", user?.id],
    mutationFn: () =>
      createOrder(cart.order_items[0].vendor_id, prepareOrderForServer()),
    onSuccess: (data) => {
      router.push({
        pathname: "/payment/[orderId]",
        params: {
          orderNumber: data?.order?.order_number,
          deliveryType: data?.delivery?.delivery_type,
          orderType: data?.order?.order_type,
          paymentLink: data?.order?.payment_link,
          orderId: data?.order?.id,
          deliveryFee: data?.order?.vendor_pickup_dropoff_charge || 0,
          orderItems: JSON.stringify(data?.order?.order_items),
        },
      });
    },
    onError: (error) => {
      showError("Error", error.message);
    },
  });

  const handleOrderCreate = () => {
    if (!require_delivery) {
      showError("Error", "Please select a delivery option");
      return;
    }
    mutate();
  };

  useEffect(() => {
    const fetchTravelInfo = async () => {
      if (!storeAddress || !destinationCoords) return;

      try {
        const storeCoords = await getCoordinatesFromAddress(storeAddress);
        if (!storeCoords) return;

        const { distance, duration } = await getDirections(
          [storeCoords.lat, storeCoords.lng],
          destinationCoords,
        );

        if (distance && duration) {
          const { distance: formattedDistance, duration: formattedDuration } =
            formatDistanceAndTime(distance, duration);

          updateDistance(formattedDistance);
          updateDuration(formattedDuration);
        }
      } catch (error) {
        console.error("Failed to fetch distance matrix:", error);
      }
    };

    fetchTravelInfo();
  }, [destinationCoords, storeAddress]);

  if (cart?.order_items.length === 0) {
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
          Browse our menu and add some delicious items to your cart!
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
        contentContainerStyle={{ paddingBottom: 300 }}
      >
        <View className="px-5 pt-4">
          {/* Cart Items */}
          <View className="mb-8">
            {cart.order_items.map((item) => (
              <Item key={item?.item_id} item={item} />
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
              <RadioButton
                label={
                  isLaundry === "true"
                    ? "Self delivery/pickup"
                    : "Pickup from Store"
                }
                selected={require_delivery === "pickup"}
                onPress={() => handleDeliveryOptionChange("pickup")}
              />
              {isLaundry === "true" && (
                <RadioButton
                  label="Vendor Pickup & Delivery"
                  selected={require_delivery === "vendor-pickup-and-dropoff"}
                  onPress={() =>
                    handleDeliveryOptionChange("vendor-pickup-and-dropoff")
                  }
                />
              )}
              {(isLaundry === "true" ||
                vendorProfile?.can_pickup_and_dropoff) && (
                <RadioButton
                  label="Vendor Delivery"
                  selected={require_delivery === "delivery"}
                  onPress={() => handleDeliveryOptionChange("delivery")}
                />
              )}
            </View>
          </View>

          {/* Delivery Details (If applicable) */}
          {(require_delivery === "vendor-pickup-and-dropoff" ||
            require_delivery === "delivery") &&
            destination &&
            !modalVisible && (
              <View className="mb-8">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-base font-poppins-bold text-primary">
                    Delivery Details
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <Text className="text-sm font-poppins-medium text-button-primary">
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="bg-input rounded-2xl p-5 border border-gray-600 gap-4">
                  <View className="flex-row">
                    <Feather
                      name="map-pin"
                      size={16}
                      color="#FF8C00"
                      style={{ marginTop: 2, marginRight: 10 }}
                    />
                    <View className="flex-1">
                      <Text className="text-xs text-gray-400 font-poppins-medium mb-1 uppercase">
                        Destination
                      </Text>
                      <Text className="text-sm text-primary font-poppins-regular">
                        {destination}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between pt-2 border-t border-gray-600">
                    <View>
                      <Text className="text-xs text-gray-400 font-poppins-medium mb-1 uppercase">
                        Distance
                      </Text>
                      <Text className="text-sm text-primary font-poppins-semibold">
                        {storeDistance} Km
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-gray-400 font-poppins-medium mb-1 uppercase">
                        Estimated Time
                      </Text>
                      <Text className="text-sm text-primary font-poppins-semibold">
                        {storeDelivery}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

          {/* Additional Info */}
          <View className="mb-8">
            <Text className="text-base font-poppins-bold text-primary mb-4">
              Additional Instructions
            </Text>
            <AppTextInput
              placeholder="e.g. Leave at the front desk"
              multiline
              value={infoText}
              onChangeText={(text) => {
                setInfoText(text);
                setAdditionalInfo(text);
              }}
            />
          </View>
        </View>
        {/* Footer Bottom Button */}
        {!modalVisible && (
          <View className=" w-full p-5 bg-background shadow-2xl">
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

      {/* Location Modal */}
      <AppModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        height="85%"
      >
        <View className="flex-1 pt-2">
          <Text className="text-xl font-poppins-bold text-primary mb-6">
            Delivery Location
          </Text>

          <View className="mb-6">
            <Text className="text-xs text-gray-400 font-poppins-medium mb-2 uppercase ml-1">
              Pickup Point
            </Text>
            <View className="flex-row items-center bg-gray-600/20 p-4 rounded-xl">
              <Feather
                name="home"
                size={18}
                color="#888"
                style={{ marginRight: 12 }}
              />
              <Text className="text-gray-400 font-poppins-medium flex-1">
                {storeAddress || "Waitng for store address..."}
              </Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-xs text-gray-400 font-poppins-medium mb-2 uppercase ml-1">
              Dropoff Point
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
              text="Confirm Location"
              onPress={handleNext}
              disabled={!destination}
            />
          </View>
        </View>
      </AppModal>
    </>
  );
};

export default Cart;

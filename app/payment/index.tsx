import HDivider from "@/components/HDivider";
import { useToast } from "@/components/ToastProvider";
import { useCartStore } from "@/store/cartStore";
import { router, useLocalSearchParams } from "expo-router";
import { PayWithFlutterwave } from "flutterwave-react-native";
import { RedirectParams } from "flutterwave-react-native/dist/PayWithFlutterwave";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

const payment = () => {
  const { showSuccess } = useToast();
  const {
    logo,
    email,
    distance,
    phonenumber,
    fullName,
    description,
    title,
    txRef,
    amount,
    publicKey,
    receiverPhoneNumber,
    pickupLocation,
    destination,
    packageName,
    serviceType,
  } = useLocalSearchParams<{
    logo: string;
    receiverPhoneNumber?: string;
    pickupLocation?: string;
    destination?: string;
    distance?: string;
    fullName: string;
    email: string;
    phonenumber: string;
    description: string;
    title: string;
    txRef: string;
    amount: string;
    publicKey: string;
    packageName?: string;
    serviceType?: string;
  }>();

  const { clearCart } = useCartStore();

  const handleOnRedirect = (data: RedirectParams) => {
    clearCart();

    showSuccess(
      "Payment Successful",
      "Your payment was successful. Please select a rider.",
    );

    if (serviceType === "DELIVERY") {
      router.push({
        pathname: "/riders",
        params: { txRef: data.tx_ref, paymentStatus: data.status },
      });
    }
    if (serviceType === "FOOD") {
      router.push({
        pathname: "/delivery/food",
        params: { txRef: data.tx_ref, paymentStatus: data.status },
      });
    }
    if (serviceType === "LAUNDRY") {
      router.push({
        pathname: "/delivery/laundry",
        params: { txRef: data.tx_ref, paymentStatus: data.status },
      });
    }
    if (serviceType === "PRODUCT") {
      router.push({
        pathname: "/marketplace/orders",
        params: { txRef: data.tx_ref, paymentStatus: data.status },
      });
    }
  };

  return (
    <View className="flex-1 bg-background px-6 pt-8 w-full">
      <View className="mb-6">
        <Text className="font-poppins-bold text-2xl text-primary">{title}</Text>
        <Text className="font-poppins text-sm text-muted">{description}</Text>
      </View>

      <View className="bg-input rounded-2xl p-4 mb-4">
        {packageName ? (
          <DisplayDetails label="Package" value={packageName} />
        ) : null}
        <DisplayDetails label="Amount" value={`₦${amount}`} />
        <HDivider />
        <DisplayDetails label="Ref" value={txRef} />
        <HDivider />

        {receiverPhoneNumber ? (
          <DisplayDetails label="Receiver Phone" value={receiverPhoneNumber} />
        ) : null}
        <HDivider />

        {distance ? (
          <DisplayDetails label="Distance" value={`${distance} km`} />
        ) : null}
        <HDivider />

        {pickupLocation ? (
          <DisplayDetails
            label="Pickup"
            value={
              pickupLocation.length > 30
                ? `${pickupLocation.slice(0, 30)}...`
                : pickupLocation
            }
          />
        ) : null}
        <HDivider />

        {destination ? (
          <DisplayDetails
            label="Destination"
            value={
              destination.length > 30
                ? `${destination.slice(0, 30)}...`
                : destination
            }
          />
        ) : null}
      </View>

      <View className="flex-1 justify-end pb-16 w-full">
        <PayWithFlutterwave
          onRedirect={handleOnRedirect}
          options={{
            tx_ref: txRef,
            amount: Number(amount),
            currency: "NGN",
            authorization: publicKey,
            payment_options: "card, banktransfer",
            customer: {
              email: email || "customer@servipal.com",
              phonenumber: phonenumber || "N/A",
              name: fullName || "Customer",
            },
            customizations: {
              title: title || "Servipal Payment",
              description: description || "Secure payment for order",
              logo:
                logo ||
                "https://mohdelivery.s3.us-east-1.amazonaws.com/favion/favicon.ico",
            },
          }}
          customButton={({ onPress, disabled }) => (
            <TouchableOpacity
              className="bg-button-primary h-14 mb-4 rounded-full flex-row items-center justify-center shadow-md"
              activeOpacity={0.7}
              onPress={() => onPress()}
              disabled={disabled}
              style={{ opacity: disabled ? 0.6 : 1 }}
            >
              {disabled ? (
                <ActivityIndicator size={"small"} color={"white"} />
              ) : (
                <Text className="text-white font-poppins-bold text-lg">
                  Pay Now ₦{amount}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
};

export default payment;

const DisplayDetails = ({ label, value }: { label: string; value: string }) => (
  <>
    <View className="flex-row justify-between my-3 w-full gap-1">
      <Text className="font-poppins text-sm text-muted">{label}</Text>
      <Text
        className="font-poppins-medium text-[12px] text-primary"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  </>
);

import { InitiatePaymentResponse } from "@/types/payment-types";
import { router } from "expo-router";

/**
 * Centrally manages navigation to the payment screen.
 * Maps the backend response structure to the flat params expected by useLocalSearchParams.
 */
export const navigateToPayment = (paymentData: InitiatePaymentResponse) => {
  router.push({
    pathname: "/payment",
    params: {
      txRef: paymentData.tx_ref,
      amount: paymentData.amount.toString(),
      publicKey: paymentData.public_key,
      currency: paymentData.currency,
      email: paymentData.customer.email,
      phonenumber: paymentData.customer.phone_number,
      fullName: paymentData.customer.full_name,
      title: paymentData.customization.title,
      description: paymentData.customization.description,
      logo: paymentData.customization.logo,
      // Optional fields
      receiverPhoneNumber: paymentData.receiver_phone || "",
      pickupLocation: paymentData.pickup_location || "",
      destination: paymentData.destination || "",
      distance: paymentData.distance || "",
      packageName: paymentData.package_name || "",
    },
  });
};

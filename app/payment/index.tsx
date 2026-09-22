import HDivider from "@/components/HDivider";
import { useToast } from "@/components/ToastProvider";
import { useCartStore } from "@/store/cartStore";
import { useUserStore } from "@/store/userStore";
import { verifyCustomerPayment } from "@/api/payment";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { PayWithFlutterwave } from "flutterwave-react-native";
import { RedirectParams } from "flutterwave-react-native/dist/PayWithFlutterwave";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";



const payment = () => {
  const { showSuccess, showWarning, showInfo } = useToast();
  const user = useUserStore((state) => state.user);
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);
  const redirectHandled = useRef(false);
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

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // Server-side verification: confirm the SDK redirect status with the
  // backend (which checks Flutterwave) instead of trusting the client alone.
  // Retries pending results twice (~3s apart) before giving up.
  const confirmWithBackend = async (txRef: string): Promise<string> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await verifyCustomerPayment(txRef);
        if (result.status === "success") return "success";
        if (result.status === "failed") return "failed";
      } catch {
        // Network/verify error — fall through to retry, then treat as failed
      }
      if (attempt < 2) await sleep(3000);
    }
    return "pending";
  };

  const navigateOnSuccess = (txRef: string, paymentStatus: string) => {
    clearCart();

    showSuccess(
      "Payment Successful",
      `${serviceType === "DELIVERY" ? "Your payment was successful. Please select a rider." : "Your payment was successful."}`,
    );

    if (serviceType === "DELIVERY") {
      router.push({
        pathname: "/riders",
        params: { txRef, paymentStatus },
      });
    }
    if (serviceType === "FOOD") {
      router.push({
        pathname: "/delivery/food",
        params: { txRef, paymentStatus },
      });
    }
    if (serviceType === "LAUNDRY") {
      router.push({
        pathname: "/delivery/laundry",
        params: { txRef, paymentStatus },
      });
    }
    if (serviceType === "PRODUCT") {
      router.push({
        pathname: "/marketplace/orders",
        params: { txRef, paymentStatus },
      });
    }
    if (serviceType === "RESERVATION") {
      queryClient.invalidateQueries({
        queryKey: ["user-reservations", user?.id],
      });

      router.push({
        pathname: "/restaurant-reservation",
        params: { txRef, paymentStatus },
      });
    }
  };

  const showFailedAndBack = () => {
    showWarning('Payment Failed', 'Your payment was not successful. Please try again.');
    router.back();
  };

  const redirect = async (data: RedirectParams) => {
    // The SDK can return 'successful', 'completed' (verified-on-close /
    // bank-transfer success), 'cancelled', or 'failed' — the type
    // declaration only lists a subset, so normalize defensively.
    const sdkStatus = String((data as { status?: unknown }).status ?? "").toLowerCase();
    const txRefValue = data.tx_ref;

    if (sdkStatus === "cancelled") {
      showWarning('Payment Cancelled', 'You have cancelled the payment. Please try again.');
      router.back();
      return;
    }

    if (sdkStatus === "successful" || sdkStatus === "completed") {
      setIsVerifying(true);
      showInfo("Confirming payment", "Please wait while we confirm your payment.");
      try {
        const outcome = await confirmWithBackend(txRefValue);
        if (outcome === "success") {
          navigateOnSuccess(txRefValue, data.status);
          return;
        }
        if (outcome === "pending") {
          showWarning(
            "Payment Pending",
            "Your payment is still being confirmed. Your order will appear once confirmed.",
          );
          router.back();
          return;
        }
        showFailedAndBack();
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    // Any other SDK status (failed/unknown): verify once with the backend
    // before declaring failure — money may still have been debited.
    setIsVerifying(true);
    try {
      const outcome = await confirmWithBackend(txRefValue);
      if (outcome === "success") {
        navigateOnSuccess(txRefValue, data.status);
        return;
      }
      if (outcome === "pending") {
        showWarning(
          "Payment Pending",
          "Your payment is still being confirmed. Your order will appear once confirmed.",
        );
        router.back();
        return;
      }
      showFailedAndBack();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOnRedirect = (data: RedirectParams) => {
    if (redirectHandled.current || isVerifying) return;
    redirectHandled.current = true;
    posthog.capture("payment_completed", {
      tx_ref: data.tx_ref,
      status: data.status,
      amount: Number(amount),
      service_type: serviceType ?? null,
      currency: "NGN",
    });
    redirect(data).catch(() => showFailedAndBack());
  };

  return (
    <View className="flex-1 bg-background px-3 pt-8 w-full">
      <View className="mb-6">
        <Text className="font-poppins-medium text-sm text-muted">
          Transaction Ref: {txRef}
        </Text>
      </View>

      <View className="bg-input rounded-2xl p-4 mb-4">
        {packageName ? (
          <DisplayDetails label="Package" value={packageName} />
        ) : null}
        <DisplayDetails label="Amount" value={`₦${amount}`} />
        <HDivider />
        {/* <DisplayDetails label="Ref" value={txRef} /> */}
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

      <View className="flex-1 justify-end pb-24 w-full gap-3">
        <PayWithFlutterwave
          onRedirect={handleOnRedirect}
          options={{
            tx_ref: txRef,
            amount: Number(amount),
            currency: "NGN",
            authorization: "FLWPUBK-bacac4908c9dd75770e0015a2274301c-X",
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
              className="bg-button-primary gap-2 h-14 mb-4 rounded-full flex-row items-center justify-center shadow-md"
              activeOpacity={0.7}
              onPress={() => onPress()}
              disabled={disabled || isVerifying}
              style={{ opacity: disabled || isVerifying ? 0.6 : 1 }}
            >
              {!disabled && !isVerifying && (
                <Ionicons name="card-outline" size={22} color="white" />
              )}
              {disabled || isVerifying ? (
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
      {isVerifying && (
        <View className="absolute inset-0 items-center justify-center bg-black/40">
          <View className="items-center rounded-2xl bg-background p-6">
            <ActivityIndicator size="large" />
            <Text className="mt-3 font-poppins-medium text-sm text-primary">
              Confirming your payment…
            </Text>
          </View>
        </View>
      )}
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

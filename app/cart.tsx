import { initiateRestaurantOrderPayment } from "@/api/food";
import { initiateLaundryOrderPayment } from "@/api/laundry";
import { fetchProfile } from "@/api/user";
import {
  AvailableSlot,
  fetchVendorAvailability,
  getAvailableSlots,
} from "@/api/user";
import AppModal from "@/components/AppModal";
import Item from "@/components/CartItem";
import CurrentLocationButton from "@/components/CurrentLocationButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import RadioButton from "@/components/RadioButton";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTrack } from "@/hooks/use-events";
import { useCartStore } from "@/store/cartStore";
import { useLocationStore } from "@/store/locationStore";
import { useUserStore } from "@/store/userStore";
import { OrderCreate, RestaurantOrderCreate } from "@/types/item-types";
import { RequireDelivery } from "@/types/order-types";
import { supabase } from "@/utils/supabase";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Sentry from "@sentry/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { format } from "date-fns";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";

// ─── Helpers ────────────────────────────────────────────────────────────────
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Build dates for a given month, starting from now */
const buildDates = (baseDate: Date = new Date()): Date[] => {
  const dates: Date[] = [];
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Get first day of the month
  const firstDay = new Date(year, month, 1);
  // Get last day of the month
  const lastDay = new Date(year, month + 1, 0);

  for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateCopy = new Date(d);
    // Only add dates that are today or in the future
    if (dateCopy >= now) {
      dates.push(dateCopy);
    }
  }
  return dates;
};

const toYMD = (d: Date) => d.toISOString().split("T")[0];

const formatSlotTime = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr || dateStr === "NOT_SPECIFIED") return "Date Not Selected";
  const d = new Date(dateStr);
  return `${DAY_LABELS[d.getDay()]}, ${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  if (!arr) return [];
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size),
  );
};

// ─── Component ──────────────────────────────────────────────────────────────
const Cart = () => {
  const [instructions, setInstructions] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalFullyOpen, setModalFullyOpen] = useState(false);
  const theme = useColorScheme();
  const { user } = useUserStore();
  const { isLaundry, deliveryFee } = useLocalSearchParams<{
    isLaundry: string;
    deliveryFee: string;
  }>();
  const { showError } = useToast();
  const { track } = useTrack();

  const isLaundryOrder = isLaundry === "true";

  const {
    setDeliveryOption,
    cart,
    clearCart,
    setAdditionalInfo,
    totalCost,
    setLaundryBooking,
  } = useCartStore();

  const { delivery_option } = cart;
  const vendorId = cart.order_items[0]?.vendor_id;

  // ── Laundry booking local form state (modal) ──────────────────────────
  const [laundryServiceType, setLaundryServiceType] =
    useState<RequireDelivery>("PICKUP");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [expressEnabled, setExpressEnabled] = useState(false);
  const [expressDate, setExpressDate] = useState("");
  const [expressSlot, setExpressSlot] = useState<AvailableSlot | null>(null);

  const [baseDate, setBaseDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const bookingDates = useMemo(() => buildDates(baseDate), [baseDate]);

  // ── Data queries ──────────────────────────────────────────────────────
  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor-profile", vendorId],
    queryFn: () => fetchProfile(vendorId),
    enabled: !!vendorId,
  });

  // Fetch vendor availability (express fee info)
  // Fetch pickup/drop-off time slots
  const { data: pickupSlots, isLoading: pickupSlotsLoading } = useQuery({
    queryKey: ["pickup-slots", vendorId, laundryServiceType, selectedDate],
    queryFn: () =>
      getAvailableSlots(
        vendorId,
        laundryServiceType === "VENDOR_DELIVERY" ? "VENDOR_DELIVERY" : "PICKUP",
        selectedDate,
      ),
    enabled:
      !!vendorId &&
      !!selectedDate &&
      isLaundryOrder &&
      modalVisible &&
      modalFullyOpen,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "available-delivery",
      vendorId,
      laundryServiceType,
      selectedDate,
    ],
    queryFn: () =>
      getAvailableSlots(vendorId, laundryServiceType, selectedDate),

    enabled:
      !!vendorId &&
      !!selectedDate &&
      isLaundryOrder &&
      modalVisible &&
      modalFullyOpen,
  });
  // Fetch express delivery time slots
  const { data: deliverySlots, isLoading: deliverySlotsLoading } = useQuery({
    queryKey: ["delivery-slots", vendorId, expressDate],
    queryFn: () => getAvailableSlots(vendorId, "VENDOR_DELIVERY", expressDate),
    enabled:
      !!vendorId &&
      !!expressDate &&
      expressEnabled &&
      isLaundryOrder &&
      modalVisible &&
      modalFullyOpen,
  });

  // Derived: express fee for the selected day
  const expressFee = useMemo(() => {
    if (!expressEnabled || !pickupSlots || pickupSlots.length === 0) return 0;
    return pickupSlots[0].express_fee ?? 0;
  }, [expressEnabled, pickupSlots]);

  // Does this vendor support express at all?
  const vendorHasExpress = useMemo(
    () => pickupSlots?.some((s) => (s.express_fee ?? 0) > 0) ?? false,
    [pickupSlots],
  );

  // Derived: has a laundry booking been confirmed?
  const hasLaundryBooking = cart.pickup_date !== "";

  // ── Pricing ───────────────────────────────────────────────────────────
  const totalCostWithDeliveryFee = useMemo(() => {
    let total = totalCost;
    if (
      deliveryFee &&
      delivery_option === "VENDOR_DELIVERY" &&
      vendorProfile?.can_pickup_and_dropoff
    ) {
      total += Number(deliveryFee);
    }
    if (isLaundryOrder && cart.is_express && cart.express_fee > 0) {
      total += cart.express_fee;
    }
    return total;
  }, [
    totalCost,
    deliveryFee,
    delivery_option,
    vendorProfile,
    isLaundryOrder,
    cart.is_express,
    cart.express_fee,
  ]);

  const { setDestination, destination } = useLocationStore();
  const queryClient = useQueryClient();
  const isDark = theme === "dark";
  const bgColor = isDark ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  const hasItems = cart.order_items.length > 0;
  const [showEmpty, setShowEmpty] = useState(!hasItems);

  useEffect(() => {
    if (hasItems) {
      setShowEmpty(false);
      return;
    }
    const t = setTimeout(() => setShowEmpty(true), 180);
    return () => clearTimeout(t);
  }, [hasItems]);

  // ── Laundry mutation ──────────────────────────────────────────────────
  const { mutate: laundryMutate, isPending: laundryIsPending } = useMutation({
    mutationFn: (payload: OrderCreate) => {
      Sentry.addBreadcrumb({
        category: "order",
        message: "Initiating laundry order payment",
        level: "info",
      });

      return initiateLaundryOrderPayment(payload);
    },

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

  // ── Food mutation ─────────────────────────────────────────────────────
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

  // ── Delivery option handler (restaurant only) ─────────────────────────
  const handleDeliveryOptionChange = (option: RequireDelivery) => {
    setDeliveryOption(option);
    if (option === "VENDOR_DELIVERY") {
      setModalVisible(true);
    }
    if (option === "PICKUP" && !vendorProfile?.can_pickup_and_dropoff) {
      setModalVisible(true);
    }
  };

  // ── Laundry modal handlers ────────────────────────────────────────────
  const handleOpenLaundryModal = () => {
    // Pre-populate from cart state if user already booked
    if (hasLaundryBooking) {
      setLaundryServiceType(delivery_option);
      setSelectedDate(
        cart.pickup_date === "NOT_SPECIFIED" ? "" : cart.pickup_date,
      );
      setSelectedSlot({
        slot_start: cart.pickup_slot_start,
        slot_end: cart.pickup_slot_end,
        available_capacity: 1,
        express_fee: cart.express_fee || 0,
      });
      setExpressEnabled(cart.is_express);
      setExpressDate(cart.express_delivery_date);
      if (cart.express_delivery_slot_start) {
        setExpressSlot({
          slot_start: cart.express_delivery_slot_start,
          slot_end: cart.express_delivery_slot_end,
          available_capacity: 1,
          express_fee: cart.express_fee || 0,
        });
      }
    } else {
      setLaundryServiceType("PICKUP");
      setSelectedDate("");
      setSelectedSlot(null);
      setExpressEnabled(false);
      setExpressDate("");
      setExpressSlot(null);
    }
    setModalVisible(true);
    // Reset fully open state; actual opening is handled by AppModal props or effect
    setModalFullyOpen(false);
  };

  const handleLaundryServiceChange = (svc: RequireDelivery) => {
    setLaundryServiceType(svc);
    // Reset slots when service type changes
    setSelectedSlot(null);
  };

  const handleDateChange = (dateKey: string) => {
    setSelectedDate(dateKey);
    setSelectedSlot(null);
  };

  const handleExpressDateChange = (dateKey: string) => {
    setExpressDate(dateKey);
    setExpressSlot(null);
  };

  const handleLaundryBookingConfirm = () => {
    // Requires date/slot for vendor delivery but makes them optional for self pickup
    const isRequired = laundryServiceType === "VENDOR_DELIVERY";

    if (isRequired && (!selectedDate || !selectedSlot)) {
      showError("Error", "Please select a date and time slot");
      return;
    }
    if (expressEnabled && (!expressDate || !expressSlot)) {
      showError("Error", "Please select delivery date and time for express");
      return;
    }
    if (laundryServiceType === "VENDOR_DELIVERY" && !destination) {
      showError("Error", "Please enter a delivery address");
      return;
    }

    setDeliveryOption(laundryServiceType);
    setLaundryBooking({
      pickup_date: selectedDate || "NOT_SPECIFIED",
      pickup_slot_start: selectedSlot?.slot_start ?? "",
      pickup_slot_end: selectedSlot?.slot_end ?? "",
      is_express: expressEnabled,
      express_fee: expressFee,
      express_delivery_date: expressDate,
      express_delivery_slot_start: expressSlot?.slot_start ?? "",
      express_delivery_slot_end: expressSlot?.slot_end ?? "",
    });
    setModalVisible(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleOrderCreate = () => {
    if (!delivery_option) {
      showError("Error", "Please select a delivery option");
      track("order_failed", {
        reason: "No delivery option selected",
        serviceType: isLaundryOrder ? "LAUNDRY" : "FOOD",
      });
      return;
    }

    // Laundry-specific validations
    if (isLaundryOrder && !hasLaundryBooking) {
      showError("Error", "Please book a laundry slot");
      track("order_failed", {
        reason: "No laundry slot booked",
        serviceType: "LAUNDRY",
      });
      return;
    }

    if (delivery_option === "VENDOR_DELIVERY" && !destination) {
      showError("Error", "Please enter a delivery address");
      track("order_failed", {
        reason: "No delivery address selected",
        serviceType: isLaundryOrder ? "LAUNDRY" : "FOOD",
      });
      if (!isLaundryOrder) setModalVisible(true);
      return;
    }

    // For pickup-only vendors, also require address
    if (
      delivery_option === "PICKUP" &&
      !vendorProfile?.can_pickup_and_dropoff &&
      !destination
    ) {
      showError("Error", "Please select a delivery address");
      track("order_failed", {
        reason: "No delivery address selected",
        serviceType: isLaundryOrder ? "LAUNDRY" : "FOOD",
      });
      if (!isLaundryOrder) setModalVisible(true);
      return;
    }

    // Shared base payload for both order types
    const basePayload: OrderCreate = {
      vendor_id: vendorId,
      delivery_option,
      instructions,
      delivery_address:
        delivery_option === "VENDOR_DELIVERY" ||
        !vendorProfile?.can_pickup_and_dropoff
          ? (destination ?? "")
          : "",
      items: cart.order_items.map((item) => ({
        item_id: item.item_id,
        name: item.name ?? "",
        price: item.price ?? 0,
        quantity: item.quantity,
        images: item.images ?? (item.image ? [item.image] : []),
        sides: item.selected_side ? [item.selected_side] : [],
        sizes: item.selected_size
          ? [
              {
                ...item.selected_size,
                size: item.selected_size.size.replace(/\s+/g, "_"),
              },
            ]
          : [],
      })),
      // Laundry booking fields
      ...(isLaundryOrder && {
        pickup_date:
          cart.pickup_date === "NOT_SPECIFIED" ? "" : cart.pickup_date,
        pickup_time: cart.pickup_slot_start,
        is_express: cart.is_express,
        ...(cart.is_express && {
          delivery_date: cart.express_delivery_date,
          delivery_time: cart.express_delivery_slot_start,
        }),
      }),
    };

    if (isLaundryOrder) {
      laundryMutate(basePayload);
      track("order_created", {
        serviceType: "LAUNDRY",
      });
    } else {
      foodMutate(basePayload);
      track("order_created", {
        serviceType: "FOOD",
      });
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────
  /** Horizontal date card */
  const renderDateCard = useCallback(
    (d: Date, active: string, onPress: (key: string) => void) => {
      const key = toYMD(d);
      const isActive = active === key;
      return (
        <Pressable
          key={key}
          onPress={() => onPress(key)}
          className={`px-4 py-2 rounded-full flex-row gap-2 items-baseline mr-2 ${
            isActive
              ? "bg-orange-400/10 border-button-primary border"
              : "bg-input border border-gray-300 dark:border-gray-600"
          }`}
          style={{ minWidth: 66 }}
        >
          <Text
            className={`text-xs font-poppins-medium mb-1 ${isActive ? "text-white" : "text-gray-400"}`}
          >
            {DAY_LABELS[d.getDay()]}
          </Text>
          <Text
            className={`text-xs font-poppins-bold ${isActive ? "text-white" : "text-primary"}`}
          >
            {d.getDate()}
          </Text>
          <Text
            className={`text-xs font-poppins ${isActive ? "text-white/70" : "text-gray-400"}`}
          >
            {MONTH_LABELS[d.getMonth()]}
          </Text>
        </Pressable>
      );
    },
    [],
  );

  /** Slot chip */
  const renderSlotChip = useCallback(
    (slot: AvailableSlot, isSelected: boolean, onPress: () => void) => {
      const isFull = slot.available_capacity <= 0;
      return (
        <Pressable
          key={slot.slot_start}
          onPress={onPress}
          disabled={isFull}
          className={`px-6 py-2 rounded-full flex-row items-center mr-3 gap-2 mb-3 ${
            isSelected
              ? "bg-orange-400/10 border-button-primary border"
              : isFull
                ? "bg-gray-200 dark:bg-gray-700 opacity-40"
                : "bg-input border border-gray-300 dark:border-gray-600"
          }`}
          style={{ minWidth: 110 }}
        >
          <Text
            className={`text-xs font-poppins-semibold ${isSelected ? "text-white" : isFull ? "text-gray-400" : "text-primary"}`}
          >
            {formatSlotTime(slot.slot_start)}
          </Text>
          <Text
            className={`text-[10px] font-poppins mt-0.5 ${isSelected ? "text-white/70" : "text-gray-400"}`}
          >
            {formatSlotTime(slot.slot_end)}
          </Text>
        </Pressable>
      );
    },
    [],
  );

  // ─── JSX ──────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              className="flex-row gap-2 w-12 h-12 bg-red-900/35 items-center rounded-full px-3 py-1 justify-center"
              onPress={() => clearCart()}
            >
              <MaterialCommunityIcons
                name="cart-remove"
                size={20}
                color="red"
              />
            </Pressable>
          ),
        }}
      />
      {showEmpty ? (
        <Animated.View
          entering={FadeIn.duration(220)}
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
        </Animated.View>
      ) : (
        <ScrollView
          className="flex-1 bg-background"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 400 }}
        >
          <View className="px-5 pt-4">
            {/* ─── Cart Items ──────────────────────────────────── */}
            <View className="mb-8">
              {cart.order_items.map((item) => (
                <Animated.View
                  key={`${item.item_id}-${item.selected_size?.size ?? "nosize"}-${item.selected_side ?? "noside"}`}
                  entering={FadeInDown.duration(140)}
                  exiting={FadeOutUp.duration(160)}
                  layout={LinearTransition.duration(140)}
                >
                  <Item item={item} />
                </Animated.View>
              ))}
            </View>

            {/* ─── Pricing Summary ─────────────────────────────── */}
            <View className="bg-input rounded-2xl p-5 border border-gray-300 dark:border-gray-600 mb-8">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-400 font-poppins-medium">
                  Subtotal
                </Text>
                <Text className="text-primary font-poppins-semibold">
                  ₦{Number(totalCost).toFixed(2)}
                </Text>
              </View>
              {deliveryFee &&
                delivery_option === "VENDOR_DELIVERY" &&
                vendorProfile?.can_pickup_and_dropoff && (
                  <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-gray-400 font-poppins-medium">
                      Delivery Fee
                    </Text>
                    <Text className="text-primary font-poppins-semibold">
                      ₦{Number(deliveryFee).toFixed(2)}
                    </Text>
                  </View>
                )}
              {isLaundryOrder && cart.is_express && cart.express_fee > 0 && (
                <View className="flex-row justify-between items-center mt-1">
                  <Text className="text-gray-400 font-poppins-medium">
                    Express Fee
                  </Text>
                  <Text className="text-button-primary font-poppins-semibold">
                    ₦{Number(cart.express_fee).toFixed(2)}
                  </Text>
                </View>
              )}
              <View className="h-[1px] dark:bg-gray-600 bg-gray-200 my-4" />
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-poppins-bold text-primary">
                  Total
                </Text>
                <Text className="text-lg font-poppins-bold text-button-primary">
                  ₦{Number(totalCostWithDeliveryFee).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* ─── Delivery Options ────────────────────────────── */}
            {isLaundryOrder ? (
              /* ── Laundry: single button to open booking modal ── */
              <View className="mb-8">
                <Text className="text-base font-poppins-bold text-primary mb-4">
                  Laundry Booking
                </Text>
                <Pressable
                  onPress={handleOpenLaundryModal}
                  className="bg-input rounded-2xl p-4 border border-gray-300 dark:border-gray-600 flex-row items-center justify-between active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-button-primary/10 items-center justify-center">
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#FF8C00"
                      />
                    </View>
                    <View>
                      <Text className="text-sm font-poppins-semibold text-primary">
                        {hasLaundryBooking
                          ? "Booking Scheduled"
                          : "Schedule Pickup"}
                      </Text>
                      <Text className="text-xs font-poppins text-gray-400">
                        {hasLaundryBooking
                          ? "Tap to change"
                          : "Select date, time & options"}
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={20} color="#FF8C00" />
                </Pressable>
              </View>
            ) : (
              /* ── Restaurant: existing radio buttons ── */
              <View className="mb-8">
                <Text className="text-base font-poppins-bold text-primary mb-4">
                  Delivery Method
                </Text>
                <View className="bg-input rounded-2xl p-4 border border-gray-300 dark:border-gray-600">
                  {vendorProfile?.can_pickup_and_dropoff ? (
                    <>
                      <RadioButton
                        label="Pickup from Store"
                        selected={delivery_option === "PICKUP"}
                        onPress={() => handleDeliveryOptionChange("PICKUP")}
                      />
                      <RadioButton
                        label="Vendor Delivery"
                        selected={delivery_option === "VENDOR_DELIVERY"}
                        onPress={() =>
                          handleDeliveryOptionChange("VENDOR_DELIVERY")
                        }
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
            )}

            {/* ─── Laundry Booking Summary (after modal confirm) ── */}
            {isLaundryOrder && hasLaundryBooking && !modalVisible && (
              <Animated.View
                entering={FadeInDown.duration(200)}
                className="mb-8"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-base font-poppins-bold text-primary">
                    Booking Details
                  </Text>
                  <Pressable
                    onPress={handleOpenLaundryModal}
                    hitSlop={8}
                    className="py-1 px-3 bg-orange-500/20 rounded-full active:opacity-50"
                  >
                    <Text className="text-sm font-poppins-medium text-button-primary">
                      Change
                    </Text>
                  </Pressable>
                </View>
                <View className="bg-input rounded-2xl p-4 border border-gray-300 dark:border-gray-600">
                  {/* Service type */}
                  <View className="flex-row items-center mb-3">
                    <Ionicons
                      name="briefcase-outline"
                      size={15}
                      color="#FF8C00"
                      style={{ marginRight: 10 }}
                    />
                    <Text className="text-sm text-primary font-poppins-medium">
                      Delivery Option:{" "}
                      {delivery_option === "PICKUP"
                        ? "Self Drop-off / Pickup"
                        : "Vendor Pickup/Delivery"}
                    </Text>
                  </View>

                  {/* Date */}
                  {cart.pickup_date && cart.pickup_date !== "NOT_SPECIFIED" ? (
                    <View className="flex-row items-center mb-3">
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color="#FF8C00"
                        style={{ marginRight: 10 }}
                      />
                      <Text className="text-sm text-primary font-poppins-medium">
                        {formatDisplayDate(cart.pickup_date)}
                      </Text>
                    </View>
                  ) : null}

                  {/* Time slot */}
                  {cart.pickup_slot_start ? (
                    <View className="flex-row items-center mb-3">
                      <Ionicons
                        name="time-outline"
                        size={15}
                        color="#FF8C00"
                        style={{ marginRight: 10 }}
                      />
                      <Text className="text-sm text-primary font-poppins-medium">
                        {formatSlotTime(cart.pickup_slot_start)} –{" "}
                        {formatSlotTime(cart.pickup_slot_end)}
                      </Text>
                    </View>
                  ) : null}

                  {/* Express badge */}
                  {cart.is_express && (
                    <>
                      <View className="h-[1px] bg-gray-200 dark:bg-gray-600 my-2" />
                      <View className="flex-row items-center mb-3">
                        <Ionicons
                          name="flash"
                          size={15}
                          color="#FF8C00"
                          style={{ marginRight: 10 }}
                        />
                        <Text className="text-sm text-button-primary font-poppins-semibold">
                          Express (+₦{cart.express_fee})
                        </Text>
                      </View>
                      <View className="flex-row items-center mb-3">
                        <Ionicons
                          name="calendar-outline"
                          size={15}
                          color="#FF8C00"
                          style={{ marginRight: 10 }}
                        />
                        <Text className="text-sm text-primary font-poppins-medium">
                          Delivery Date:{" "}
                          {formatDisplayDate(cart.express_delivery_date)}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons
                          name="time-outline"
                          size={15}
                          color="#FF8C00"
                          style={{ marginRight: 10 }}
                        />
                        <Text className="text-sm text-primary font-poppins-medium">
                          Delivery Time:{" "}
                          {formatSlotTime(cart.express_delivery_slot_start)} –{" "}
                          {formatSlotTime(cart.express_delivery_slot_end)}
                        </Text>
                      </View>
                    </>
                  )}

                  {/* Delivery address (vendor delivery) */}
                  {delivery_option === "VENDOR_DELIVERY" && destination && (
                    <>
                      <View className="h-[1px] bg-gray-200 dark:bg-gray-600 my-2" />
                      <View className="flex-row items-start mt-1">
                        <Feather
                          name="map-pin"
                          size={15}
                          color="#FF8C00"
                          style={{ marginRight: 10, marginTop: 2 }}
                        />
                        <Text className="text-sm text-primary font-poppins-regular flex-1">
                          {destination}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </Animated.View>
            )}

            {/* ─── Restaurant delivery address summary ─────────── */}
            {!isLaundryOrder &&
              (delivery_option === "VENDOR_DELIVERY" ||
                (delivery_option === "PICKUP" &&
                  !vendorProfile?.can_pickup_and_dropoff)) &&
              destination &&
              !modalVisible && (
                <View className="mb-8">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-base font-poppins-bold text-primary">
                      Delivery Address
                    </Text>
                    <Pressable
                      onPress={() => setModalVisible(true)}
                      hitSlop={8}
                      className="py-1 px-3 bg-orange-500/20 rounded-full active:opacity-50"
                    >
                      <Text className="text-sm font-poppins-medium text-button-primary">
                        Change
                      </Text>
                    </Pressable>
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

            {/* ─── Instructions ─────────────────────────────────── */}
            <View className="mb-8">
              <Text className="text-base font-poppins-bold text-primary mb-4">
                Instructions
              </Text>
              <View>
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
                  maxLength={400}
                  onChangeText={(text) => {
                    setInstructions(text);
                    setAdditionalInfo(text);
                  }}
                />
                <Text className="text-[10px] text-gray-400 self-end mt-1 font-poppins px-1">
                  {instructions.length}/400
                </Text>
              </View>
            </View>
          </View>

          {/* ─── Footer ──────────────────────────────────────────── */}
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
      )}

      {/* ─── Shared Modal ────────────────────────────────────────────── */}
      <AppModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setModalFullyOpen(false);
          }}
          contentPadding={false}
          height={isLaundryOrder ? "85%" : "90%"}
        >
          {/* We use a slight delay for modal content queries to keep opening smooth */}
          {modalVisible && (
            <Animated.View
              entering={FadeIn.delay(300)}
              style={{ flex: 1 }}
              onLayout={() => {
                // Approximate time modal takes to open
                setTimeout(() => setModalFullyOpen(true), 150);
              }}
            >
              {isLaundryOrder ? (
                /* ════════════════════════════════════════════════════
                   LAUNDRY BOOKING MODAL
                   ════════════════════════════════════════════════════ */
                <>
                  <BottomSheetScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 100 }}
                  >
                  <View className="px-5">
                    <Text className="text-xl font-poppins-bold text-primary mb-4">
                      Book Laundry Slot
                    </Text>

                    {/* ── Service type ─────────────────── */}
                    <Text className="text-xs text-gray-400 font-poppins-medium mb-2 uppercase ml-1">
                      Service Type
                    </Text>
                    <View className="flex-row gap-3 mb-4">
                      <Pressable
                        onPress={() => handleLaundryServiceChange("PICKUP")}
                        className={`flex-1 py-3 rounded-full items-center ${
                          laundryServiceType === "PICKUP"
                            ? "bg-button-primary"
                            : "bg-input border border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        <Text
                          className={`text-xs font-poppins-semibold ${laundryServiceType === "PICKUP" ? "text-white" : "text-primary"}`}
                        >
                          Self Dropoff/Pickup
                        </Text>
                      </Pressable>
                      {vendorProfile?.can_pickup_and_dropoff && (
                        <Pressable
                          onPress={() =>
                            handleLaundryServiceChange("VENDOR_DELIVERY")
                          }
                          className={`flex-1 py-3 rounded-full items-center ${
                            laundryServiceType === "VENDOR_DELIVERY"
                              ? "bg-button-primary"
                              : "bg-input border border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          <Text
                            className={`text-xs font-poppins-semibold ${laundryServiceType === "VENDOR_DELIVERY" ? "text-white" : "text-primary"}`}
                          >
                            Vendor Pickup/Delivery
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    {/* ── Delivery address (vendor delivery) ── */}
                    {laundryServiceType === "VENDOR_DELIVERY" && (
                      <View className="mb-6 ">
                        <Text className="text-xs text-gray-400 font-poppins-medium mb-2 uppercase ml-1">
                          Delivery Address
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <View className="w-[81%]">
                            <GoogleTextInput
                              placeholder="Enter delivery address"
                              value={destination}
                              scrollEnabled={false}
                              onChangeText={(text) =>
                                setDestination(text, null)
                              }
                              onPlaceSelect={(lat, lng, address) => {
                                setDestination(address, [lat, lng]);
                              }}
                            />
                          </View>
                          <View className="w-[20%]">
                            <CurrentLocationButton
                              height={55}
                              width={55}
                              onLocationSet={(address, coords) => {
                                setDestination(address, coords);
                              }}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    {/* ── Select date ──────────────────── */}
                    <View className="flex-row items-center justify-between mb-2 ml-1">
                      <Text className="text-xs text-gray-400 font-poppins-medium uppercase">
                        Select Date
                      </Text>
                      <Pressable
                        onPress={() => setShowMonthPicker(true)}
                        className="flex-row items-center bg-input px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600"
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color="#FF8C00"
                        />
                        <Text className="text-[10px] text-gray-500 font-poppins-medium ml-1">
                          {format(baseDate, "MMM yyyy")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-6 flex-row"
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                  >
                    {bookingDates.map((d) =>
                      renderDateCard(d, selectedDate, handleDateChange),
                    )}
                  </ScrollView>

                  {/* ── Select time slot ─────────────── */}
                  {selectedDate !== "" && laundryServiceType !== "PICKUP" && (
                    <>
                      <View className="px-5">
                        <Text className="text-xs text-gray-400 font-poppins-medium mb-2 uppercase ml-1">
                          Available Time Slots
                        </Text>
                      </View>
                      {pickupSlotsLoading ? (
                        <View className="py-6 items-center">
                          <ActivityIndicator color="#FF8C00" />
                          <Text className="text-xs text-gray-400 font-poppins mt-2">
                            Loading slots…
                          </Text>
                        </View>
                      ) : (pickupSlots?.length ?? 0) === 0 ? (
                        <View className="px-5">
                          <View className="py-6 items-center bg-input rounded-xl mb-6">
                            <Ionicons
                              name="sad-outline"
                              size={28}
                              color="#999"
                            />
                            <Text className="text-sm text-gray-400 font-poppins mt-2">
                              No slots available for this date
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          className="mb-4 flex-row"
                          contentContainerStyle={{ paddingHorizontal: 20 }}
                        >
                          <View className="flex-row gap-x-1">
                            {chunk(pickupSlots || [], 2).map((pair, idx) => (
                              <View key={idx} className="flex-col">
                                {pair.map((slot) =>
                                  renderSlotChip(
                                    slot,
                                    selectedSlot?.slot_start ===
                                      slot.slot_start,
                                    () => setSelectedSlot(slot),
                                  ),
                                )}
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      )}
                    </>
                  )}

                  {/* ── Express toggle ───────────────── */}
                  {vendorHasExpress && selectedSlot && (
                    <View className="px-5">
                      <View className="bg-input rounded-2xl p-4 border border-gray-300 dark:border-gray-600 mb-4">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 mr-4">
                            <View className="flex-row items-center gap-2 mb-1">
                              <Ionicons
                                name="flash"
                                size={16}
                                color="#FF8C00"
                              />
                              <Text className="text-sm font-poppins-semibold text-primary">
                                Express Service
                              </Text>
                            </View>
                            <Text className="text-xs font-poppins text-gray-400">
                              Priority processing
                              {expressFee > 0 ? ` • +₦${expressFee}` : ""}
                            </Text>
                          </View>
                          <Switch
                            value={expressEnabled}
                            onValueChange={setExpressEnabled}
                            trackColor={{ false: "#767577", true: "#FF8C00" }}
                            thumbColor={expressEnabled ? "#fff" : "#f4f3f4"}
                          />
                        </View>
                      </View>

                      {/* ── Express delivery date ─── */}
                      {expressEnabled && (
                        <>
                          <Text className="text-xs text-gray-400 font-poppins-medium mb-2 uppercase ml-1">
                            Delivery Date
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                  {vendorHasExpress && selectedSlot && expressEnabled && (
                    <>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-4 flex-row"
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                      >
                        {bookingDates.map((d) =>
                          renderDateCard(
                            d,
                            expressDate,
                            handleExpressDateChange,
                          ),
                        )}
                      </ScrollView>

                      {/* ── Express delivery time ── */}
                      {expressDate !== "" && (
                        <>
                          <View className="w-[88%] self-center">
                            <Text className="text-xs text-gray-400 font-poppins-medium mb-2 uppercase ml-">
                              Delivery Time Slot
                            </Text>
                          </View>
                          {deliverySlotsLoading ? (
                            <View className="py-6 items-center">
                              <ActivityIndicator color="#FF8C00" />
                              <Text className="text-xs text-gray-400 font-poppins mt-2">
                                Loading delivery slots…
                              </Text>
                            </View>
                          ) : (deliverySlots?.length ?? 0) === 0 ? (
                            <View className="py-6 items-center bg-input rounded-xl mb-6">
                              <Ionicons
                                name="sad-outline"
                                size={28}
                                color="#999"
                              />
                              <Text className="text-sm text-gray-400 font-poppins mt-2">
                                No delivery slots available
                              </Text>
                            </View>
                          ) : (
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              className="mb-6 flex-row"
                              contentContainerStyle={{ paddingHorizontal: 20 }}
                            >
                              <View className="flex-row gap-x-1">
                                {chunk(deliverySlots || [], 2).map(
                                  (pair, idx) => (
                                    <View key={idx} className="flex-col">
                                      {pair.map((slot) =>
                                        renderSlotChip(
                                          slot,
                                          expressSlot?.slot_start ===
                                            slot.slot_start,
                                          () => setExpressSlot(slot),
                                        ),
                                      )}
                                    </View>
                                  ),
                                )}
                              </View>
                            </ScrollView>
                          )}
                        </>
                      )}
                    </>
                  )}
                </BottomSheetScrollView>
                  {/* ── Confirm button ───────────────── */}
                  <View className="absolute bottom-0 w-full px-5 pt-4 pb-10 bg-background border-t border-gray-100 dark:border-gray-800">
                    <AppButton
                      text="Confirm Booking"
                      onPress={handleLaundryBookingConfirm}
                      disabled={
                        laundryServiceType === "VENDOR_DELIVERY" &&
                        (!selectedDate || !selectedSlot)
                      }
                      icon={
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="white"
                        />
                      }
                    />
                  </View>
                </>
              ) : (
                /* ════════════════════════════════════════════════════
                   RESTAURANT DELIVERY ADDRESS MODAL
                   ════════════════════════════════════════════════════ */
                <BottomSheetScrollView
                  className="flex-1 pt-2 px-5"
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 40 }}
                >
                  <Text className="text-xl font-poppins-bold text-primary mb-6">
                    Delivery Address
                  </Text>

                  <View className="mb-4">
                    <Text className="text-xs text-gray-400 font-poppins-medium mb-2 uppercase ml-1">
                      Delivery Address
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="w-[81%]">
                        <GoogleTextInput
                          placeholder="Enter delivery address"
                          value={destination}
                          scrollEnabled={false}
                          onChangeText={(text) => setDestination(text, null)}
                          onPlaceSelect={(lat, lng, address) => {
                            setDestination(address, [lat, lng]);
                          }}
                        />
                      </View>
                      <View className="w-[20%]">
                        <CurrentLocationButton
                          height={55}
                          width={55}
                          onLocationSet={(address, coords) => {
                            setDestination(address, coords);
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  <View className="mt-auto">
                    <AppButton
                      text="Confirm Address"
                      onPress={() => setModalVisible(false)}
                      disabled={!destination}
                    />
                  </View>
                </BottomSheetScrollView>
              )}
              <DateTimePickerModal
                isVisible={showMonthPicker}
                mode="date"
                onConfirm={(date) => {
                  setBaseDate(date);
                  setShowMonthPicker(false);
                  // If the current selected date is not in the new month, reset it
                  if (
                    date.getMonth() !==
                    new Date(selectedDate || Date.now()).getMonth()
                  ) {
                    // If selected month is current month, set to today, else first day of month
                    const isCurrentMonth =
                      date.getMonth() === new Date().getMonth() &&
                      date.getFullYear() === new Date().getFullYear();
                    if (isCurrentMonth) {
                      setSelectedDate(toYMD(new Date()));
                    } else {
                      const firstDay = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        1,
                      );
                      setSelectedDate(toYMD(firstDay));
                    }
                    setSelectedSlot(null);
                  }
                }}
                onCancel={() => setShowMonthPicker(false)}
                minimumDate={new Date()}
              />
            </Animated.View>
          )}
        </AppModal>
    </View>
  );
};

export default Cart;

import {
  deleteServingPeriod,
  getVendorServingPeriods,
  getVendorReservations,
  updateReservationStatus,
  getUserReservations,
} from "@/api/reservation";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import {
  BookingStatus,
  Reservation,
  GetServingPeriod,
  GetUserReservationsItem,
} from "@/types/reservation-types";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { router, Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import ServingPeriodFormSheet from "./serving-period-form-sheet";

const TABS: { label: string; value: string }[] = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Pending", value: "PENDING" },
  { label: "History", value: "history" },
  { label: "Periods", value: "periods" },
];

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ReservationDashboard() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<GetServingPeriod | null>(
    null,
  );

  const { profile, user } = useUserStore();
  const userType = user?.user_metadata?.user_type || profile?.user_type;
  const isVendor = userType === "RESTAURANT_VENDOR";

  const theme = useColorScheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const tabsRef = useRef<FlashListRef<any>>(null);

  const HEADER_BG = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  const visibleTabs = React.useMemo(() => {
    return TABS.filter((tab) => tab.value !== "periods" || isVendor);
  }, [isVendor]);

  useEffect(() => {
    const activeIndex = visibleTabs.findIndex((t) => t.value === activeTab);
    if (activeIndex !== -1 && tabsRef.current) {
      tabsRef.current.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [activeTab, visibleTabs]);

  // Reservations Query
  const {
    data: reservationsResponse,
    isLoading: loadingReservations,
    refetch: refetchReservations,
    isRefetching: isRefetchingReservations,
  } = useQuery({
    queryKey: ["vendor-reservations"],
    queryFn: () => getUserReservations(),
  });

  // Serving Periods Query
  const {
    data: servingPeriods,
    isLoading: loadingPeriods,
    refetch: refetchPeriods,
    isRefetching: isRefetchingPeriods,
  } = useQuery({
    queryKey: ["vendor-serving-periods"],
    queryFn: () => getVendorServingPeriods(),
    enabled: activeTab === "periods",
  });

  const { mutate: performDeletePeriod } = useMutation({
    mutationFn: deleteServingPeriod,
    onSuccess: () => {
      showSuccess("Success", "Serving period removed");
      queryClient.invalidateQueries({ queryKey: ["vendor-serving-periods"] });
    },
    onError: (error: Error) => {
      showError("Error", error.message || "Failed to delete serving period");
    },
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      updateReservationStatus(id, status),
    onSuccess: () => {
      showSuccess("Success", "Status updated");
      queryClient.invalidateQueries({ queryKey: ["vendor-reservations"] });
    },
    onError: (error: Error) => {
      showError("Error", error.message || "Failed to update status");
    },
  });

  const handleOpenPeriodSheet = () => {
    setSelectedPeriod(null);
    setIsSheetVisible(true);
  };

  const handleEditPeriod = (period: GetServingPeriod) => {
    setSelectedPeriod(period);
    setIsSheetVisible(true);
  };

  const handleDeletePeriod = (id: string) => {
    Alert.alert(
      "Delete Serving Period",
      "Are you sure you want to remove this serving period?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDeletePeriod(id),
        },
      ],
    );
  };

  const { filteredData, counts } = React.useMemo(() => {
    const reservations = reservationsResponse?.data || [];

    const upcoming = reservations.filter((r) => {
      const dateStr = r.reservation_date?.includes("T")
        ? r.reservation_date
        : `${r.reservation_date}T${r.reservation_time}`;
      return (
        r.reservation_status === "CONFIRMED" && new Date(dateStr) >= new Date()
      );
    });
    const pending = reservations.filter(
      (r) => r.reservation_status === "PENDING",
    );
    const history = reservations.filter((r) => {
      const dateStr = r.reservation_date?.includes("T")
        ? r.reservation_date
        : `${r.reservation_date}T${r.reservation_time}`;
      return (
        ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(
          r.reservation_status || "",
        ) ||
        (r.reservation_status === "CONFIRMED" && new Date(dateStr) < new Date())
      );
    });

    let current: GetUserReservationsItem[] = [];
    if (activeTab === "upcoming") current = upcoming;
    else if (activeTab === "PENDING") current = pending;
    else if (activeTab === "history") current = history;

    return {
      filteredData: current,
      counts: {
        upcoming: upcoming.length,
        PENDING: pending.length,
        history: history.length,
        periods: servingPeriods?.length || 0,
      },
    };
  }, [reservationsResponse, activeTab, servingPeriods]);

  const groupedPeriods = React.useMemo(() => {
    if (!servingPeriods) return [];
    const groups: { [key: number]: GetServingPeriod[] } = {};

    servingPeriods.forEach((p) => {
      if (!groups[p.day_of_week]) groups[p.day_of_week] = [];
      groups[p.day_of_week].push(p);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([day, periods]) => ({
        day: Number(day),
        periods: periods.sort((a, b) =>
          a.start_time.localeCompare(b.start_time),
        ),
      }));
  }, [servingPeriods]);

  const renderItem = ({ item }: { item: GetUserReservationsItem }) => {
    const dateStr = item.reservation_date?.includes("T")
      ? item.reservation_date
      : `${item.reservation_date}T${item.reservation_time}`;
    const reservationDateTime = parseISO(dateStr);

    return (
      <View className="bg-input m-2 p-4 rounded-2xl shadow-sm border border-border-subtle">
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-primary font-poppins-semibold text-lg">
              {item.counterparty?.full_name || "Guest"}
            </Text>
            <Text className="text-secondary text-sm">
              {format(reservationDateTime, "EEEE, MMM d")} at{" "}
              {format(reservationDateTime, "h:mm a")}
            </Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full ${getStatusColor((item.reservation_status as BookingStatus) || "PENDING")}`}
          >
            <Text className="text-white text-xs font-poppins-medium uppercase">
              {item.reservation_status}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-4 mb-4">
          <View className="flex-row items-center gap-1">
            <Ionicons name="people-outline" size={16} color="gray" />
            <Text className="text-muted text-sm">{item.party_size} People</Text>
          </View>
          {item.deposit_paid ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="card-outline" size={16} color="gray" />
              <Text className="text-muted text-sm">Deposit Paid</Text>
            </View>
          ) : null}
        </View>

        {item.notes && (
          <View className="bg-input p-2 rounded-lg mb-4">
            <Text className="text-secondary text-xs italic">{item.notes}</Text>
          </View>
        )}

        {item.reservation_status === "PENDING" && (
          <View className="flex-row gap-3">
            <AppButton
              text="Confirm"
              className="flex-1"
              onPress={() => updateStatus({ id: item.id, status: "CONFIRMED" })}
            />
            <AppButton
              text="Decline"
              variant="outline"
              color="#FF3B30"
              className="flex-1"
              onPress={() => updateStatus({ id: item.id, status: "CANCELLED" })}
            />
          </View>
        )}

        {item.reservation_status === "CONFIRMED" && (
          <View className="flex-row gap-3">
            <AppButton
              text="Mark Completed"
              color="#2f4550"
              width={"65%"}
              height={35}
              borderRadius={50}
              onPress={() => updateStatus({ id: item.id, status: "COMPLETED" })}
            />
            <AppButton
              text="No Show"
              variant="ghost"
              color="#9ba1a6"
              width="30%"
              height={35}
              borderRadius={50}
              onPress={() => updateStatus({ id: item.id, status: "NO_SHOW" })}
            />
          </View>
        )}
      </View>
    );
  };

  const renderServingPeriodItem = ({ item }: { item: GetServingPeriod }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleEditPeriod(item)}
      className="bg-input p-4 rounded-2xl flex-row justify-between items-center"
    >
      <View className="flex-row items-center gap-4">
        <View className="bg-gray-500/10 p-3 rounded-2xl">
          <Ionicons name="time-outline" size={24} color="gray" />
        </View>
        <View>
          <Text className="text-primary font-poppins-semibold text-base">
            {item.period}
            {!item.is_active && (
              <Text className="text-red-500 text-[9px] font-poppins ml-2 uppercase">
                {"  "}(Inactive)
              </Text>
            )}
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={12} color="#666" />
            <Text className="text-muted text-xs">
              {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
              {"  "}(Cap: {item.capacity})
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            "Delete Period",
            "Are you sure you want to delete this serving period?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                onPress: () => handleDeletePeriod(item.id),
                style: "destructive",
              },
            ],
          );
        }}
        className="bg-red-500/10 p-2 rounded-xl"
      >
        <Ionicons name="trash-outline" size={16} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loadingReservations || (activeTab === "periods" && loadingPeriods)) {
    return <LoadingIndicator />;
  }

  const showFAB = activeTab === "periods";

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerRight: () =>
            isVendor ? (
              <View className="flex-row items-center gap-4 mr-2">
                <TouchableOpacity
                  onPress={() => router.push("/restaurant-reservation/rules")}
                >
                  <Ionicons name="list-outline" size={24} color="#ccc" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    router.push("/restaurant-reservation/settings")
                  }
                >
                  <Ionicons name="settings-outline" size={24} color="#ccc" />
                </TouchableOpacity>
              </View>
            ) : null,
        }}
      />
      <View className="h-16">
        <FlashList
          ref={tabsRef}
          data={visibleTabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 12 }}
          keyExtractor={(item) => item.value}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              onPress={() => setActiveTab(tab.value)}
              className={`px-5 py-2.5 rounded-full mr-2 ${
                activeTab === tab.value ? "bg-button-primary" : "bg-input"
              }`}
            >
              <Text
                className={`font-poppins-medium text-xs ${
                  activeTab === tab.value ? "text-white" : "text-secondary"
                }`}
              >
                {tab.label} ({counts[tab.value as keyof typeof counts] || 0})
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <HDivider />

      {activeTab === "periods" ? (
        <FlashList
          showsVerticalScrollIndicator={false}
          data={groupedPeriods}
          renderItem={({ item: group }) => (
            <View className="mb-6 px-4">
              <View className="flex-row items-center gap-2 mb-2 ml-2">
                <View className="w-1.5 h-1.5 rounded-full bg-button-primary" />
                <Text className="text-secondary font-poppins-semibold text-sm uppercase tracking-widest">
                  {DAYS[group.day]}
                </Text>
              </View>
              {group.periods.map((period) => (
                <View key={period.id} className="mb-2">
                  {renderServingPeriodItem({ item: period })}
                </View>
              ))}
            </View>
          )}
          keyExtractor={(item) => item.day.toString()}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="time-outline" size={64} color="#ddd" />
              <Text className="text-muted font-poppins-medium mt-4">
                No serving periods set
              </Text>
              <TouchableOpacity
                onPress={() => setIsSheetVisible(true)}
                className="mt-4"
              >
                <Text className="text-button-primary font-poppins-semibold">
                  + Add your first period
                </Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingPeriods}
              onRefresh={refetchPeriods}
            />
          }
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
        />
      ) : (
        <FlashList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="calendar-outline" size={64} color="#ddd" />
              <Text className="text-muted font-poppins-medium mt-4">
                No reservations found
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingReservations}
              onRefresh={refetchReservations}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* FAB */}
      {showFAB && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleOpenPeriodSheet}
          style={{
            position: "absolute",
            bottom: 50,
            right: 25,
            width: 50,
            height: 50,
            borderRadius: 30,
            backgroundColor: "#FF8C00",
            alignItems: "center",
            justifyContent: "center",
            elevation: 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}

      <ServingPeriodFormSheet
        isVisible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        initialData={selectedPeriod}
      />
    </View>
  );
}

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case "PENDING":
      return "bg-amber-500/15";
    case "CONFIRMED":
      return "bg-green-500/15";
    case "COMPLETED":
      return "bg-blue-500/15";
    case "CANCELLED":
      return "bg-red-500/15";
    case "NO_SHOW":
      return "bg-gray-500/15";
    default:
      return "bg-gray-400/15";
  }
};

import {
  deleteAvailability,
  deleteRestaurantTable,
  getVendorAvailability,
  getVendorReservations,
  getVendorTables,
  updateReservationStatus,
} from "@/api/reservation";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import {
  BookingStatus,
  Reservation,
  RestaurantAvailability,
  RestaurantTable,
} from "@/types/reservation-types";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import AvailabilityFormSheet from "./availability-form-sheet";
import TableFormSheet from "./table-form-sheet";

const TABS: { label: string; value: string }[] = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Pending", value: "PENDING" },
  { label: "History", value: "history" },
  { label: "Tables", value: "tables" },
  { label: "Availability", value: "availability" },
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
  const [isTableSheetVisible, setIsTableSheetVisible] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(
    null,
  );
  const [isAvailabilitySheetVisible, setIsAvailabilitySheetVisible] =
    useState(false);
  const [editingAvailability, setEditingAvailability] =
    useState<RestaurantAvailability | null>(null);

  const theme = useColorScheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const tabsRef = useRef<FlashList<any>>(null);

  const HEADER_BG = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  useEffect(() => {
    const activeIndex = TABS.findIndex((t) => t.value === activeTab);
    if (activeIndex !== -1 && tabsRef.current) {
      tabsRef.current.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [activeTab]);

  // Reservations Query
  const {
    data: reservations,
    isLoading: loadingReservations,
    refetch: refetchReservations,
    isRefetching: isRefetchingReservations,
  } = useQuery({
    queryKey: ["vendor-reservations"],
    queryFn: getVendorReservations,
  });

  // Tables Query
  const {
    data: tablesData,
    isLoading: loadingTables,
    refetch: refetchTables,
    isRefetching: isRefetchingTables,
  } = useQuery({
    queryKey: ["vendor-tables"],
    queryFn: () => getVendorTables(1, 100),
    enabled: activeTab === "tables",
  });

  // Availability Query
  const {
    data: availabilityData,
    isLoading: loadingAvailability,
    refetch: refetchAvailability,
    isRefetching: isRefetchingAvailability,
  } = useQuery({
    queryKey: ["vendor-availability"],
    queryFn: () => getVendorAvailability(1),
    enabled: activeTab === "availability",
  });

  const { mutate: deleteTable } = useMutation({
    mutationFn: deleteRestaurantTable,
    onSuccess: () => {
      showSuccess("Success", "Table deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["vendor-tables"] });
    },
    onError: (error: Error) => {
      showError("Error", error.message || "Failed to delete table");
    },
  });

  const { mutate: performDeleteAvailability } = useMutation({
    mutationFn: deleteAvailability,
    onSuccess: () => {
      showSuccess("Success", "Availability removed");
      queryClient.invalidateQueries({ queryKey: ["vendor-availability"] });
    },
    onError: (error: Error) => {
      showError("Error", error.message || "Failed to delete availability");
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

  const handleDeleteTable = (id: string) => {
    Alert.alert(
      "Delete Table",
      "Are you sure you want to delete this table? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTable(id),
        },
      ],
    );
  };

  const handleDeleteAvailability = (id: string) => {
    Alert.alert(
      "Delete Availability",
      "Are you sure you want to remove this availability slot?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDeleteAvailability(id),
        },
      ],
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="flex-row items-center gap-4 mr-2">
          <TouchableOpacity
            onPress={() => router.push("/restaurant-reservation/rules")}
          >
            <Ionicons name="list-outline" size={24} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/restaurant-reservation/settings")}
          >
            <Ionicons name="settings-outline" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, activeTab]);

  const { filteredData, counts } = React.useMemo(() => {
    const upcoming = (reservations || []).filter(
      (r) =>
        r.reservation_status === "CONFIRMED" &&
        new Date(`${r.reservation_time}T${r.reservation_time}`) >= new Date(),
    );
    const pending = (reservations || []).filter(
      (r) => r.reservation_status === "PENDING",
    );
    const history = (reservations || []).filter(
      (r) =>
        ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(r.reservation_status) ||
        (r.reservation_status === "CONFIRMED" &&
          new Date(`${r.reservation_time}T${r.reservation_time}`) < new Date()),
    );

    let current: Reservation[] = [];
    if (activeTab === "upcoming") current = upcoming;
    else if (activeTab === "PENDING") current = pending;
    else if (activeTab === "history") current = history;

    return {
      filteredData: current,
      counts: {
        upcoming: upcoming.length,
        PENDING: pending.length,
        history: history.length,
        tables: tablesData?.total || 0,
        availability: availabilityData?.total || 0,
      },
    };
  }, [reservations, activeTab, tablesData, availabilityData]);

  const renderItem = ({ item }: { item: Reservation }) => {
    const reservationDateTime = parseISO(
      `${item.reservation_time}T${item.reservation_time}`,
    );

    return (
      <View className="bg-surface-elevated m-2 p-4 rounded-2xl shadow-sm border border-border-subtle">
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-primary font-poppins-semibold text-lg">
              {item.customer?.full_name || "Guest"}
            </Text>
            <Text className="text-secondary text-sm">
              {format(reservationDateTime, "EEEE, MMM d")} at{" "}
              {format(reservationDateTime, "h:mm a")}
            </Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full ${getStatusColor(item.reservation_status as BookingStatus)}`}
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
          {item.deposit_required ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="card-outline" size={16} color="gray" />
              <Text className="text-muted text-sm">
                ₦{item.deposit_required} Deposit
              </Text>
            </View>
          ) : null}
        </View>

        {item.notes && (
          <View className="bg-input p-2 rounded-lg mb-4">
            <Text className="text-secondary text-xs italic">
              "{item.notes}"
            </Text>
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
              className="flex-1"
              onPress={() => updateStatus({ id: item.id, status: "COMPLETED" })}
            />
            <AppButton
              text="No Show"
              variant="outline"
              color="#FF9500"
              className="flex-1"
              onPress={() => updateStatus({ id: item.id, status: "NO_SHOW" })}
            />
          </View>
        )}
      </View>
    );
  };

  const renderTableItem = ({ item }: { item: RestaurantTable }) => (
    <View className="bg-surface-elevated m-2 p-4 rounded-2xl shadow-sm border border-border-subtle flex-row justify-between items-center">
      <View className="flex-row items-center gap-4">
        <View className="bg-orange-500/10 p-3 rounded-2xl">
          <Ionicons name="restaurant-outline" size={24} color="#FF8C00" />
        </View>
        <View>
          <Text className="text-primary font-poppins-semibold text-lg">
            {item.name || "Unnamed Table"}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-secondary text-sm">
              {item.capacity} Seats
            </Text>
            <View className="w-1 h-1 rounded-full bg-gray-300" />
            <Text
              className={`text-xs font-poppins-medium uppercase ${item.is_active ? "text-green-500" : "text-red-500"}`}
            >
              {item.is_active ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => {
            setEditingTable(item);
            setIsTableSheetVisible(true);
          }}
          className="bg-input p-2 rounded-xl"
        >
          <Ionicons name="create-outline" size={20} color="#FF8C00" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteTable(item.id)}
          className="bg-red-500/10 p-2 rounded-xl"
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAvailabilityItem = ({
    item,
  }: {
    item: RestaurantAvailability;
  }) => (
    <View className="bg-surface-elevated m-2 p-4 rounded-2xl shadow-sm border border-border-subtle flex-row justify-between items-center">
      <View className="flex-row items-center gap-4">
        <View className="bg-orange-500/10 p-3 rounded-2xl">
          <Ionicons name="time-outline" size={24} color="#FF8C00" />
        </View>
        <View>
          <Text className="text-primary font-poppins-semibold text-lg">
            {DAYS[item.day_of_week]}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-secondary text-sm">
              {item.open_time.slice(0, 5)} - {item.close_time.slice(0, 5)}
            </Text>
            <View className="w-1 h-1 rounded-full bg-gray-300" />
            <Text className="text-muted text-xs">
              {item.slot_interval}m slots
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => {
            setEditingAvailability(item);
            setIsAvailabilitySheetVisible(true);
          }}
          className="bg-input p-2 rounded-xl"
        >
          <Ionicons name="create-outline" size={20} color="#FF8C00" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteAvailability(item.id)}
          className="bg-red-500/10 p-2 rounded-xl"
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (
    loadingReservations ||
    (activeTab === "tables" && loadingTables) ||
    (activeTab === "availability" && loadingAvailability)
  ) {
    return <LoadingIndicator />;
  }

  const showFAB = activeTab === "tables" || activeTab === "availability";

  return (
    <View className="flex-1 bg-background">
      <View className="h-16">
        <FlashList
          ref={tabsRef}
          data={TABS}
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

      {activeTab === "tables" ? (
        <FlashList
          data={tablesData?.data || []}
          renderItem={renderTableItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="restaurant-outline" size={64} color="#ddd" />
              <Text className="text-muted font-poppins-medium mt-4">
                No tables created yet
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingTable(null);
                  setIsTableSheetVisible(true);
                }}
                className="mt-4"
              >
                <Text className="text-button-primary font-poppins-semibold">
                  + Add your first table
                </Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingTables}
              onRefresh={refetchTables}
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      ) : activeTab === "availability" ? (
        <FlashList
          data={availabilityData?.data || []}
          renderItem={renderAvailabilityItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="time-outline" size={64} color="#ddd" />
              <Text className="text-muted font-poppins-medium mt-4">
                No availability set
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingAvailability(null);
                  setIsAvailabilitySheetVisible(true);
                }}
                className="mt-4"
              >
                <Text className="text-button-primary font-poppins-semibold">
                  + Set your hours
                </Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingAvailability}
              onRefresh={refetchAvailability}
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
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
          onPress={() => {
            if (activeTab === "tables") {
              setEditingTable(null);
              setIsTableSheetVisible(true);
            } else {
              setEditingAvailability(null);
              setIsAvailabilitySheetVisible(true);
            }
          }}
          style={{
            position: "absolute",
            bottom: 30,
            right: 25,
            width: 60,
            height: 60,
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

      <TableFormSheet
        isVisible={isTableSheetVisible}
        onClose={() => setIsTableSheetVisible(false)}
        table={editingTable}
      />

      <AvailabilityFormSheet
        isVisible={isAvailabilitySheetVisible}
        onClose={() => setIsAvailabilitySheetVisible(false)}
        availability={editingAvailability}
      />
    </View>
  );
}

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case "PENDING":
      return "bg-amber-500";
    case "CONFIRMED":
      return "bg-green-500";
    case "COMPLETED":
      return "bg-blue-500";
    case "CANCELLED":
      return "bg-red-500";
    case "NO_SHOW":
      return "bg-gray-500";
    default:
      return "bg-gray-400";
  }
};

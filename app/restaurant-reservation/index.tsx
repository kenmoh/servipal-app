import {
  deleteServingPeriod,
  getVendorServingPeriods,
  updateReservationStatus,
  getUserReservations,
} from "@/api/reservation";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import {
  BookingStatus,
  GetServingPeriod,
  GetUserReservationsItem,
  UpdateReservationStatus,
  ReservationStatusMachine,
  UserRole,
} from "@/types/reservation-types";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import ServingPeriodFormSheet from "./serving-period-form-sheet";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type ActionConfig = {
  status: BookingStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const VENDOR_ACTIONS: ActionConfig[] = [
  { status: "CONFIRMED", label: "Confirm",  icon: "checkmark-circle-outline", color: "#22c55e" },
  { status: "CANCELLED", label: "Cancel",   icon: "close-circle-outline",     color: "#ef4444" },
  { status: "NO_SHOW",   label: "No Show",  icon: "person-remove-outline",    color: "#9ba1a6" },
];

const CUSTOMER_ACTIONS: ActionConfig[] = [
  { status: "COMPLETED", label: "Mark Completed", icon: "checkmark-done-outline", color: "#3b82f6" },
  { status: "CANCELLED", label: "Cancel",          icon: "close-circle-outline",   color: "#ef4444" },
];

const TABS: { label: string; value: string }[] = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Pending",  value: "PENDING"  },
  { label: "History",  value: "history"  },
  { label: "Periods",  value: "periods"  },
];

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ---------------------------------------------------------------------------
// Context menu component
// ---------------------------------------------------------------------------

type ContextMenuProps = {
  actions: ActionConfig[];
  currentStatus: BookingStatus;
  userRole: UserRole;
  onSelect: (status: BookingStatus) => void;
  onDismiss: () => void;
  colorScheme: string | null | undefined;
};

function ReservationContextMenu({
  actions,
  currentStatus,
  userRole,
  onSelect,
  onDismiss,
  colorScheme,
}: ContextMenuProps) {
  const isDark = colorScheme === "dark";
  const menuBg    = isDark ? "#1c1c1e" : "#ffffff";
  const borderCol = isDark ? "#2c2c2e" : "#e5e7eb";
  const dividerCol = isDark ? "#2c2c2e" : "#f3f4f6";

  return (
    <>
      {/* Invisible full-screen dismiss layer — no dimming */}
      <Animated.View
        entering={FadeIn.duration(120)}
        exiting={FadeOut.duration(120)}
        style={{
          position: "absolute",
          top: -9999,
          left: -9999,
          right: -9999,
          bottom: -9999,
          zIndex: 10,
        }}
        pointerEvents="box-only"
      >
        <Pressable style={{ flex: 1 }} onPress={onDismiss} />
      </Animated.View>

      {/* The menu card itself */}
      <Animated.View
        entering={ZoomIn.duration(160).springify().damping(18).stiffness(260)}
        exiting={ZoomOut.duration(120)}
        style={{
          position: "absolute",
          top: 36,
          right: 0,
          zIndex: 20,
          width: 190,
          borderRadius: 14,
          backgroundColor: menuBg,
          borderWidth: 1,
          borderColor: borderCol,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.5 : 0.12,
          shadowRadius: 12,
          elevation: 8,
          overflow: "hidden",
        }}
      >
        {actions.map((action, index) => {
          const isActive  = currentStatus === action.status;
          const isAllowed = ReservationStatusMachine.canTransition(
            currentStatus,
            action.status,
            userRole,
          );
          const isDisabled = isActive || !isAllowed;

          return (
            <React.Fragment key={action.status}>
              {index > 0 && (
                <View style={{ height: 1, backgroundColor: dividerCol }} />
              )}
              <TouchableOpacity
                disabled={isDisabled}
                activeOpacity={0.6}
                onPress={() => onSelect(action.status)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  opacity: isDisabled ? 0.35 : 1,
                }}
              >
                <Ionicons
                  name={action.icon}
                  size={17}
                  color={action.color}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Poppins-Medium",
                      color: isDisabled
                        ? isDark ? "#6b7280" : "#9ca3af"
                        : action.color,
                    }}
                  >
                    {action.label}
                  </Text>
                  {isActive && (
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Poppins-Regular",
                        color: isDark ? "#6b7280" : "#9ca3af",
                        marginTop: 1,
                      }}
                    >
                      Current status
                    </Text>
                  )}
                </View>
                {isActive && (
                  <Ionicons name="checkmark" size={14} color={action.color} />
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </Animated.View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Reservation card with inline context menu
// ---------------------------------------------------------------------------

type ReservationCardProps = {
  item: GetUserReservationsItem;
  userRole: UserRole;
  actionList: ActionConfig[];
  onStatusSelect: (reservationId: string, status: BookingStatus) => void;
  colorScheme: string | null | undefined;
};

function ReservationCard({
  item,
  userRole,
  actionList,
  onStatusSelect,
  colorScheme,
}: ReservationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const dateStr = item.reservation_date?.includes("T")
    ? item.reservation_date
    : `${item.reservation_date}T${item.reservation_time}`;
  const reservationDateTime = parseISO(dateStr);
  const currentStatus = item.reservation_status as BookingStatus;
  const isTerminal = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(currentStatus);

  return (
    <View
      className="bg-input m-2 p-4 rounded-2xl shadow-sm border border-border-subtle"
      style={{ zIndex: menuOpen ? 100 : 1 }}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-primary font-poppins-semibold text-lg">
            {item.counterparty?.full_name || "Guest"}
          </Text>
          <Text className="text-secondary text-sm">
            {format(reservationDateTime, "EEEE, MMM d")} at{" "}
            {format(reservationDateTime, "h:mm a")}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View className={`px-3 py-1 rounded-full ${getStatusColor(currentStatus)}`}>
            <Text className="text-white text-xs font-poppins-medium uppercase">
              {item.reservation_status}
            </Text>
          </View>

          {!isTerminal && (
            <View style={{ position: "relative" }}>
              <TouchableOpacity
                onPress={() => setMenuOpen((v) => !v)}
                className="bg-input border border-border-subtle p-1.5 rounded-xl"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="ellipsis-vertical" size={16} color="gray" />
              </TouchableOpacity>

              {menuOpen && (
                <ReservationContextMenu
                  actions={actionList}
                  currentStatus={currentStatus}
                  userRole={userRole}
                  colorScheme={colorScheme}
                  onDismiss={() => setMenuOpen(false)}
                  onSelect={(status) => {
                    setMenuOpen(false);
                    onStatusSelect(item.id, status);
                  }}
                />
              )}
            </View>
          )}
        </View>
      </View>

      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-1">
          <Ionicons name="people-outline" size={16} color="gray" />
          <Text className="text-muted text-sm">{item.party_size} People</Text>
        </View>
        {item.deposit_paid && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="card-outline" size={16} color="gray" />
            <Text className="text-muted text-sm">Deposit Paid</Text>
          </View>
        )}
      </View>

      {item.notes && (
        <View className="bg-input p-2 rounded-lg mt-3">
          <Text className="text-secondary text-xs italic">{item.notes}</Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function ReservationDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("upcoming");
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<GetServingPeriod | null>(null);

  const { profile, user } = useUserStore();
  const userType = user?.user_metadata?.user_type || profile?.user_type;
  const isVendor = userType === "RESTAURANT_VENDOR";
  const userRole: UserRole = isVendor ? "vendor" : "customer";
  const actionList = isVendor ? VENDOR_ACTIONS : CUSTOMER_ACTIONS;

  const colorScheme = useColorScheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const tabsRef = useRef<FlashListRef<any>>(null);

  const visibleTabs = React.useMemo(
    () => TABS.filter((tab) => tab.value !== "periods" || isVendor),
    [isVendor],
  );

  useEffect(() => {
    const activeIndex = visibleTabs.findIndex((t) => t.value === activeTab);
    if (activeIndex !== -1 && tabsRef.current) {
      tabsRef.current.scrollToIndex({ index: activeIndex, animated: true, viewPosition: 0.5 });
    }
  }, [activeTab, visibleTabs]);

  const {
    data: reservationsResponse,
    isLoading: loadingReservations,
    refetch: refetchReservations,
    isRefetching: isRefetchingReservations,
  } = useQuery({
    queryKey: ["vendor-reservations"],
    queryFn: () => getUserReservations(),
  });

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
    mutationFn: (data: UpdateReservationStatus) => updateReservationStatus(data),
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
        { text: "Delete", style: "destructive", onPress: () => performDeletePeriod(id) },
      ],
    );
  };

  const { filteredData, counts } = React.useMemo(() => {
    const reservations = reservationsResponse?.data || [];

    const upcoming = reservations.filter((r) => {
      const ds = r.reservation_date?.includes("T")
        ? r.reservation_date
        : `${r.reservation_date}T${r.reservation_time}`;
      return r.reservation_status === "CONFIRMED" && new Date(ds) >= new Date();
    });
    const pending = reservations.filter((r) => r.reservation_status === "PENDING");
    const history = reservations.filter((r) => {
      const ds = r.reservation_date?.includes("T")
        ? r.reservation_date
        : `${r.reservation_date}T${r.reservation_time}`;
      return (
        ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(r.reservation_status || "") ||
        (r.reservation_status === "CONFIRMED" && new Date(ds) < new Date())
      );
    });

    let current: GetUserReservationsItem[] = [];
    if (activeTab === "upcoming")    current = upcoming;
    else if (activeTab === "PENDING") current = pending;
    else if (activeTab === "history") current = history;

    return {
      filteredData: current,
      counts: {
        upcoming: upcoming.length,
        PENDING:  pending.length,
        history:  history.length,
        periods:  servingPeriods?.length || 0,
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
        periods: periods.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      }));
  }, [servingPeriods]);

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
        onPress={() =>
          Alert.alert(
            "Delete Period",
            "Are you sure you want to delete this serving period?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", onPress: () => handleDeletePeriod(item.id), style: "destructive" },
            ],
          )
        }
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
                <TouchableOpacity onPress={() => router.push("/restaurant-reservation/rules")}>
                  <Ionicons name="list-outline" size={24} color="#ccc" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/restaurant-reservation/settings")}>
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
              <Text className="text-muted font-poppins-medium mt-4">No serving periods set</Text>
              <TouchableOpacity onPress={() => setIsSheetVisible(true)} className="mt-4">
                <Text className="text-button-primary font-poppins-semibold">
                  + Add your first period
                </Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefetchingPeriods} onRefresh={refetchPeriods} />
          }
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
        />
      ) : (
        <FlashList
          data={filteredData}
          renderItem={({ item }) => (
            <ReservationCard
              item={item}
              userRole={userRole}
              actionList={actionList}
              colorScheme={colorScheme}
              onStatusSelect={(reservationId, status) =>
                updateStatus({ reservation_id: reservationId, new_status: status })
              }
            />
          )}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="calendar-outline" size={64} color="#ddd" />
              <Text className="text-muted font-poppins-medium mt-4">No reservations found</Text>
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case "PENDING":   return "bg-amber-500/15";
    case "CONFIRMED": return "bg-green-500/15";
    case "COMPLETED": return "bg-blue-500/15";
    case "CANCELLED": return "bg-red-500/15";
    case "NO_SHOW":   return "bg-gray-500/15";
    default:          return "bg-gray-400/15";
  }
};

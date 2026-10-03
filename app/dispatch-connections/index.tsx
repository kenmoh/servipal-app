import {
  createDispatchConnection,
  disconnectVendorConnection,
  fetchDispatchDirectory,
  fetchVendorConnections,
} from "@/api/dispatch-connections";
import EmptyList from "@/components/EmptyList";
import PartnerContact from "@/components/PartnerContact";
import { useToast } from "@/components/ToastProvider";
import { useUserStore } from "@/store/userStore";
import type {
  ConnectionRow,
  ConnectionStatus,
  DispatchDirectoryItem,
} from "@/types/dispatch-connection";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import FontAwesome from "@react-native-vector-icons/fontawesome/static";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

type Tab = "discover" | "connections";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Connected",
  DECLINED: "Declined",
  DISCONNECTED: "Disconnected",
};

const STATUS_CLASS: Record<ConnectionStatus, string> = {
  PENDING: "bg-status-pending-subtle text-status-pending",
  ACCEPTED: "bg-status-success-subtle text-status-success",
  DECLINED: "bg-status-error-subtle text-status-error",
  DISCONNECTED: "bg-surface-elevated text-muted",
};

const StatusBadge = ({ status }: { status: ConnectionStatus }) => (
  <View
    className={`px-2 py-1 rounded-full ${STATUS_CLASS[status]}`}
    testID={`status-${status}`}
  >
    <Text className="text-[11px] font-poppins-medium">
      {STATUS_LABEL[status]}
    </Text>
  </View>
);

const DispatchConnections = () => {
  const { user, profile } = useUserStore();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("discover");

  // Sliding highlight behind the active tab pill.
  const [tabsWidth, setTabsWidth] = useState(0);
  const indicatorX = useSharedValue(0);
  const tabIndex = tab === "discover" ? 0 : 1;
  // onLayout width includes the track's 1px border on each side.
  const segmentWidth = Math.max((tabsWidth - 2) / 2, 0);

  useEffect(() => {
    indicatorX.value = withTiming(tabIndex * segmentWidth, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [tabIndex, segmentWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const directoryQuery = useQuery({
    queryKey: ["dispatch-directory", user?.id],
    queryFn: () => fetchDispatchDirectory({ page: 1, page_size: 50 }),
    enabled: !!user?.id,
  });

  const connectionsQuery = useQuery({
    queryKey: ["vendor-dispatch-connections", user?.id],
    queryFn: () => fetchVendorConnections(),
    enabled: !!user?.id,
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dispatch-directory"] }),
      queryClient.invalidateQueries({
        queryKey: ["vendor-dispatch-connections"],
      }),
    ]);

  const connectMutation = useMutation({
    mutationFn: (dispatchId: string) => createDispatchConnection(dispatchId),
    onSuccess: async () => {
      showSuccess("REQUEST SENT", "Connection request sent to the dispatch.");
      await invalidate();
    },
    onError: (error) => showError("COULD NOT CONNECT", error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: (dispatchId: string) =>
      disconnectVendorConnection(dispatchId),
    onSuccess: async () => {
      showSuccess("DISCONNECTED", "The partnership has ended.");
      await invalidate();
    },
    onError: (error) => showError("COULD NOT DISCONNECT", error.message),
  });

  const handleConnect = (dispatchId: string) => {
    if (profile?.can_pickup_and_dropoff) {
      showError(
        "DELIVERY ENABLED",
        "You cannot connect to an external dispatch while Delivery is enabled. Turn off Delivery in your profile first.",
      );
      return;
    }
    connectMutation.mutate(dispatchId);
  };

  const renderDirectoryItem = ({
    item,
  }: {
    item: DispatchDirectoryItem;
  }) => {
    const status = item.connection_status;
    const busy = connectMutation.isPending;
    const connectable =
      !status || status === "DECLINED" || status === "DISCONNECTED";

    return (
      <Animated.View
        entering={FadeInDown.duration(160)}
        className="bg-profile-card rounded-2xl p-4 mb-3 gap-2"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="business-outline" size={14} color="#687076" />
              <Text
                className="text-primary font-poppins-semibold text-base flex-1"
                numberOfLines={1}
              >
                {item.business_name || item.full_name || "Dispatch company"}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="star" size={14} color="#687076" />
              <Text className="text-muted text-sm">
                {item.dispatch_average_rating != null
                  ? item.dispatch_average_rating.toFixed(1)
                  : "No ratings yet"}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="people-outline" size={14} color="#687076" />
              <Text className="text-muted text-sm">
                {item.rider_count} rider{item.rider_count === 1 ? "" : "s"} ·{" "}
                {item.online_rider_count} online
              </Text>
            </View>
            {(item.business_address || item.state) && (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="location-outline" size={14} color="#687076" />
                <Text className="text-muted text-sm flex-1" numberOfLines={1}>
                  {[item.business_address, item.state]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
            )}
          </View>
          <View className="items-end gap-2">
            {status && status !== "DISCONNECTED" && (
              <StatusBadge status={status} />
            )}
            {connectable && (
              <Pressable
                onPress={() => handleConnect(item.id)}
                disabled={busy}
                testID={`connect-${item.id}`}
                className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border-slate-800 border ${
                  busy ? "opacity-50" : "active:opacity-75"
                }`}
              >
                <FontAwesome name="handshake-o" size={14} color="#aaa" />
                <Text className="text-muted text-xs font-poppins-medium">
                  Connect
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {!item.has_payout_account && (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="warning-outline" size={14} color="#f59e0b" />
            <Text className="text-status-pending text-xs flex-1">
              No payout account yet, so it cannot accept your request.
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderConnectionItem = ({ item }: { item: ConnectionRow }) => (
    <Animated.View
      entering={FadeInDown.duration(160)}
      className="bg-profile-card rounded-2xl p-4 mb-3 gap-3"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="business-outline" size={14} color="#687076" />
            <Text
              className="text-primary font-poppins-semibold text-base flex-1"
              numberOfLines={1}
            >
              {item.dispatch_business_name ||
                item.dispatch_full_name ||
                "Dispatch company"}
            </Text>
          </View>
          {(item.dispatch_business_address || item.dispatch_state) && (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="location-outline" size={14} color="#687076" />
              <Text className="text-muted text-sm flex-1" numberOfLines={1}>
                {[item.dispatch_business_address, item.dispatch_state]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>
          )}
          {item.response_note ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={14}
                color="#687076"
              />
              <Text className="text-muted text-sm flex-1">
                {item.response_note}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="items-end gap-2">
          <StatusBadge status={item.status} />
          <Pressable
            onPress={() => disconnectMutation.mutate(item.dispatch_id)}
            disabled={disconnectMutation.isPending}
            testID={`disconnect-${item.dispatch_id}`}
            className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border border-button-primary ${
              disconnectMutation.isPending ? "opacity-50" : "active:opacity-75"
            }`}
          >
            <Ionicons name="unlink-outline" size={14} color="orange" />
            <Text className="text-button-primary text-xs font-poppins-medium">
              Disconnect
            </Text>
          </Pressable>
        </View>
      </View>

      {item.status === "ACCEPTED" && (
        <PartnerContact
          name={
            item.dispatch_business_name ||
            item.dispatch_full_name ||
            "this dispatch"
          }
          email={item.dispatch_email}
          phone={item.dispatch_phone_number}
          // Address and state live on the location line above, so they
          // are not repeated here - this block is for the direct line.
        />
      )}
    </Animated.View>
  );

  const isLoading = directoryQuery.isPending || connectionsQuery.isPending;
  const isRefreshing =
    directoryQuery.isRefetching || connectionsQuery.isRefetching;

  if (isLoading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size={'large'} color={'#ccc'}/>
      </View>
    );
  }

  if (directoryQuery.isError) {
    return (
      <View className="flex-1 bg-background">

      <EmptyList
        title="Something went wrong"
        description={directoryQuery.error.message}
        />
        </View>
    );
  }

  const directory = directoryQuery.data?.data ?? [];
  // A disconnected row is a partnership that no longer exists, so it
  // leaves the tab entirely rather than sitting there as a tombstone.
  const connections = (
    connectionsQuery.data?.data ?? []
  ).filter((item) => item.status !== "DISCONNECTED");

  return (
    <View className="flex-1 bg-background">
      <View className="px-3 pt-3">
        <View
          className="flex-row bg-profile-card border border-border-subtle rounded-full"
          onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View
            pointerEvents="none"
            className="absolute left-0 top-0 bottom-0 rounded-full border border-button-primary bg-button-primary-transparent"
            style={[{ width: segmentWidth }, indicatorStyle]}
          />
          {(["discover", "connections"] as Tab[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              className="flex-1 py-2.5 rounded-full"
            >
              <Text
                className={`text-center text-sm ${
                  tab === key
                    ? "font-poppins-bold text-button-primary"
                    : "font-poppins-medium text-muted"
                }`}
              >
                {key === "discover" ? "Discover" : "Connections"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Animated.View
        key={tab}
        className="flex-1"
        entering={FadeIn.duration(160)}
      >
        {tab === "discover" ? (
        <FlashList
          data={directory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={renderDirectoryItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => directoryQuery.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyList
              title="No dispatch companies yet"
              description="When a dispatch joins ServiPal it will show up here."
            />
          }
        />
      ) : (
        <FlashList
          data={connections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={renderConnectionItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => connectionsQuery.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyList
              title="No delivery partners"
              description="Send a request from the Discover tab to partner with a dispatch company."
            />
          }
        />
        )}
      </Animated.View>
    </View>
  );
};

export default DispatchConnections;

import {
  createDispatchConnection,
  disconnectVendorConnection,
  fetchDispatchDirectory,
  fetchVendorConnections,
} from "@/api/dispatch-connections";
import EmptyList from "@/components/EmptyList";
import PartnerContact from "@/components/PartnerContact";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { useUserStore } from "@/store/userStore";
import type {
  ConnectionRow,
  ConnectionStatus,
  DispatchDirectoryItem,
} from "@/types/dispatch-connection";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
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
  const { user } = useUserStore();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("discover");

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

  const renderDirectoryItem = ({
    item,
  }: {
    item: DispatchDirectoryItem;
  }) => {
    const status = item.connection_status;
    const busy = connectMutation.isPending;
    const label =
      status === "PENDING"
        ? "Pending"
        : status === "ACCEPTED"
          ? "Connected"
          : "Connect";

    return (
      <View className="bg-profile-card rounded-2xl p-4 mb-3 gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-primary font-poppins-semibold text-base">
              {item.business_name || item.full_name || "Dispatch company"}
            </Text>
            <Text className="text-muted text-sm">
              {item.dispatch_average_rating != null
                ? `★ ${item.dispatch_average_rating.toFixed(1)}`
                : "No ratings yet"}
            </Text>
            <Text className="text-muted text-sm">
              {item.rider_count} rider{item.rider_count === 1 ? "" : "s"} ·{" "}
              {item.online_rider_count} online
            </Text>
          </View>
          {status && <StatusBadge status={status} />}
        </View>

        {!item.has_payout_account && (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="warning-outline" size={14} color="#f59e0b" />
            <Text className="text-status-pending text-xs flex-1">
              No payout account yet, so it cannot accept your request.
            </Text>
          </View>
        )}

        <AppButton
          text={label}
          variant={status ? "outline" : "fill"}
          disabled={status === "PENDING" || status === "ACCEPTED" || busy}
          onPress={() => connectMutation.mutate(item.id)}
        />
      </View>
    );
  };

  const renderConnectionItem = ({ item }: { item: ConnectionRow }) => (
    <View className="bg-profile-card rounded-2xl p-4 mb-3 gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-primary font-poppins-semibold text-base">
            {item.dispatch_business_name ||
              item.dispatch_full_name ||
              "Dispatch company"}
          </Text>
          {item.response_note ? (
            <Text className="text-muted text-sm">{item.response_note}</Text>
          ) : null}
        </View>
        <StatusBadge status={item.status} />
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
          address={item.dispatch_business_address}
          state={item.dispatch_state}
        />
      )}

      <AppButton
        text="Disconnect"
        variant="outline"
        disabled={disconnectMutation.isPending}
        onPress={() => disconnectMutation.mutate(item.dispatch_id)}
      />
    </View>
  );

  const isLoading = directoryQuery.isPending || connectionsQuery.isPending;
  const isRefreshing =
    directoryQuery.isRefetching || connectionsQuery.isRefetching;

  if (isLoading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (directoryQuery.isError) {
    return (
      <EmptyList
        title="Something went wrong"
        description={directoryQuery.error.message}
      />
    );
  }

  const directory = directoryQuery.data?.data ?? [];
  const connections = connectionsQuery.data?.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row gap-2 px-3 pt-3">
        {(["discover", "connections"] as Tab[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-full ${
              tab === key ? "bg-brand-primary" : "bg-profile-card"
            }`}
          >
            <Text
              className={`text-center font-poppins-medium text-sm ${
                tab === key ? "text-white" : "text-muted"
              }`}
            >
              {key === "discover" ? "Discover" : "Connections"}
            </Text>
          </Pressable>
        ))}
      </View>

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
    </View>
  );
};

export default DispatchConnections;

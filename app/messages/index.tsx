import { getMyDisputes, subscribeToDisputeUpdates } from "@/api/dispute";
import EmptyList from "@/components/EmptyList";
import { useUserStore } from "@/store/userStore";
import type { Dispute } from "@/types/dispute-types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

/**
 * Get initials from a name for avatar display
 */
const getInitials = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * Format timestamp for display
 */
const formatTime = (dateStr: string | null): string => {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
};

/**
 * Status badge component
 */
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyle = () => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return "bg-status-success-subtle";
      case "OPEN":
        return "bg-status-pending-subtle";
      default:
        return "bg-surface-elevated";
    }
  };

  const getTextStyle = () => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return "text-status-success";
      case "OPEN":
        return "text-status-pending";
      default:
        return "text-muted";
    }
  };

  return (
    <View className={`px-2 py-0.5 rounded-full ${getStatusStyle()}`}>
      <Text className={`text-[10px] font-poppins-medium ${getTextStyle()}`}>
        {status}
      </Text>
    </View>
  );
};

/**
 * Single dispute list item component
 */
const DisputeItem = ({
  dispute,
  currentUserId,
  onPress,
}: {
  dispute: Dispute;
  currentUserId: string;
  onPress: () => void;
}) => {
  // Determine other party based on who initiated
  const isInitiator = dispute.initiator_id === currentUserId;
  const otherPartyId = isInitiator
    ? dispute.respondent_id
    : dispute.initiator_id;

  // Generate display name from order type (we don't have profile data here)
  const displayName = `${dispute.order_type} Support`;
  const initials = getInitials(displayName);

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-elevated rounded-2xl mb-3 active:opacity-80"
    >
      <View className="flex-row items-center p-4">
        {/* Avatar */}
        <View className="w-12 h-12 rounded-full bg-brand-primary items-center justify-center">
          <Text className="text-white font-poppins-bold text-base">
            {initials}
          </Text>
        </View>

        {/* Content */}
        <View className="flex-1 ml-3">
          {/* Top row: Name + Time */}
          <View className="flex-row items-center justify-between">
            <Text
              className="text-primary font-poppins-semibold flex-1"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text className="text-muted text-xs ml-2">
              {formatTime(dispute.last_message_at || dispute.created_at)}
            </Text>
          </View>

          {/* Middle row: Reason */}
          <Text className="text-secondary text-sm mt-0.5" numberOfLines={1}>
            {dispute.reason}
          </Text>

          {/* Bottom row: Last message + Status/Unread */}
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-muted text-xs flex-1 mr-2" numberOfLines={1}>
              {dispute.last_message_text || "No messages yet"}
            </Text>

            <View className="flex-row items-center gap-2">
              <StatusBadge status={dispute.status} />

              {dispute.unread_count > 0 && (
                <View className="bg-brand-primary w-5 h-5 rounded-full items-center justify-center">
                  <Text className="text-white text-[10px] font-poppins-bold">
                    {dispute.unread_count > 9 ? "9+" : dispute.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Chevron */}
        <Ionicons
          name="chevron-forward"
          size={18}
          color="#9CA3AF"
          style={{ marginLeft: 8 }}
        />
      </View>
    </Pressable>
  );
};

/**
 * Dispute List Screen (Messages Index)
 */
const DisputeListScreen = () => {
  const { user } = useUserStore();
  const queryClient = useQueryClient();

  // Fetch disputes
  const {
    data: disputes = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["disputes"],
    queryFn: getMyDisputes,
    enabled: !!user?.id,
  });

  // Subscribe to real-time updates for all disputes
  useEffect(() => {
    if (!disputes.length) return;

    const channels = disputes.map((dispute) =>
      subscribeToDisputeUpdates(dispute.id, (updatedDispute) => {
        queryClient.setQueryData<Dispute[]>(["disputes"], (old) =>
          old?.map((d) => (d.id === updatedDispute.id ? updatedDispute : d)),
        );
      }),
    );

    return () => {
      channels.forEach((channel) => channel.unsubscribe());
    };
  }, [disputes.length, queryClient]);

  const handleDisputePress = useCallback((disputeId: string) => {
    router.push({
      pathname: "/messages/[id]",
      params: { id: disputeId },
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Dispute }) => (
      <DisputeItem
        dispute={item}
        currentUserId={user?.id || ""}
        onPress={() => handleDisputePress(item.id)}
      />
    ),
    [user?.id, handleDisputePress],
  );

  const keyExtractor = useCallback((item: Dispute) => item.id, []);

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-5">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text className="text-primary font-poppins-semibold text-lg mt-4">
          Failed to load disputes
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="mt-4 bg-brand-primary px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-poppins-medium">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={disputes}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#FF8C00"
          />
        }
        ListEmptyComponent={
          <EmptyList
            icon={
              <Ionicons name="chatbubbles-outline" size={64} color="#9CA3AF" />
            }
            title="No Disputes"
            description="You don't have any active support conversations yet."
          />
        }
      />
    </View>
  );
};

export default DisputeListScreen;

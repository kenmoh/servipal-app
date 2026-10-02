import {
  acceptConnectionRequest,
  declineConnectionRequest,
  fetchDispatchConnectionRequests,
} from "@/api/dispatch-connections";
import EmptyList from "@/components/EmptyList";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { useUserStore } from "@/store/userStore";
import type { ConnectionRow } from "@/types/dispatch-connection";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

const RequestCard = ({
  item,
  hasPayoutAccount,
  isBusy,
  onAccept,
  onDecline,
}: {
  item: ConnectionRow;
  hasPayoutAccount: boolean;
  isBusy: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string, note?: string) => void;
}) => {
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");

  const vendorName =
    item.vendor_business_name || item.vendor_full_name || "Restaurant";

  return (
    <View className="bg-profile-card rounded-2xl p-4 mb-3 gap-3">
      <View className="gap-1">
        <Text className="text-primary font-poppins-semibold text-base">
          {vendorName}
        </Text>
        <Text className="text-muted text-sm">
          {item.vendor_user_type === "RESTAURANT_VENDOR"
            ? "Restaurant vendor"
            : "Vendor"}
          {item.vendor_rating != null
            ? `  ·  ★ ${item.vendor_rating.toFixed(1)}`
            : ""}
        </Text>
      </View>

      {!hasPayoutAccount && (
        <View className="bg-status-pending-subtle rounded-xl p-3 gap-2">
          <View className="flex-row items-center gap-2">
            <Ionicons name="warning-outline" size={16} color="#f59e0b" />
            <Text className="text-status-pending text-sm flex-1 font-poppins-medium">
              You need a payout account before you can accept.
            </Text>
          </View>
          <Text className="text-muted text-xs">
            Add a bank account and you will be able to accept this request.
          </Text>
        </View>
      )}

      {declining ? (
        <View className="gap-2">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Reason (optional)"
            placeholderTextColor="#9ca3af"
            multiline
            className="bg-input rounded-xl px-3 py-2.5 text-primary min-h-[72px]"
            textAlignVertical="top"
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <AppButton
                text="Send"
                variant="fill"
                disabled={isBusy}
                onPress={() => {
                  setDeclining(false);
                  setNote("");
                  onDecline(item.id, note.trim() || undefined);
                }}
              />
            </View>
            <View className="flex-1">
              <AppButton
                text="Cancel"
                variant="outline"
                disabled={isBusy}
                onPress={() => {
                  setDeclining(false);
                  setNote("");
                }}
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <AppButton
              text="Accept"
              variant="fill"
              disabled={isBusy || !hasPayoutAccount}
              onPress={() => onAccept(item.id)}
            />
          </View>
          <View className="flex-1">
            <AppButton
              text="Decline"
              variant="outline"
              disabled={isBusy}
              onPress={() => setDeclining(true)}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const DispatchConnectionRequests = () => {
  const { user } = useUserStore();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const inboxQuery = useQuery({
    queryKey: ["dispatch-connection-requests", user?.id],
    queryFn: () => fetchDispatchConnectionRequests("PENDING"),
    enabled: !!user?.id,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["dispatch-connection-requests"],
    });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => acceptConnectionRequest(id),
    onSuccess: async () => {
      showSuccess("CONNECTED", "Partnership accepted.");
      await invalidate();
    },
    onError: (error) => showError("COULD NOT ACCEPT", error.message),
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      declineConnectionRequest(id, note),
    onSuccess: async () => {
      showSuccess("DECLINED", "The request has been declined.");
      await invalidate();
    },
    onError: (error) => showError("COULD NOT DECLINE", error.message),
  });

  if (inboxQuery.isPending) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (inboxQuery.isError) {
    return (
      <EmptyList
        title="Something went wrong"
        description={inboxQuery.error.message}
      />
    );
  }

  const rows = inboxQuery.data?.data ?? [];
  const hasPayoutAccount = inboxQuery.data?.has_payout_account ?? false;

  return (
    <View className="flex-1 bg-background">
      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            hasPayoutAccount={hasPayoutAccount}
            isBusy={acceptMutation.isPending || declineMutation.isPending}
            onAccept={(id) => acceptMutation.mutate(id)}
            onDecline={(id, note) => declineMutation.mutate({ id, note })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={inboxQuery.isRefetching}
            onRefresh={() => inboxQuery.refetch()}
          />
        }
        ListHeaderComponent={
          !hasPayoutAccount && rows.length > 0 ? (
            <View className="mb-3 bg-status-pending-subtle rounded-2xl p-4 gap-3">
              <Text className="text-primary font-poppins-medium">
                Add a payout account to accept requests
              </Text>
              <Text className="text-muted text-sm">
                A dispatch can only be paid once it has a bank account on
                file, so these requests cannot be accepted yet.
              </Text>
              <View>
                <AppButton
                  text="Add payout account"
                  variant="fill"
                  onPress={() => router.push("/wallet/add-payout-account")}
                />
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyList
            title="No requests waiting"
            description="When a restaurant asks to partner with your dispatch it will appear here."
          />
        }
      />
    </View>
  );
};

export default DispatchConnectionRequests;

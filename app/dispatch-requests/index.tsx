import {
  acceptConnectionRequest,
  declineConnectionRequest,
  fetchDispatchConnectionRequests,
} from "@/api/dispatch-connections";
import EmptyList from "@/components/EmptyList";
import PartnerContact from "@/components/PartnerContact";
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
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

type Tab = "requests" | "partners";

const TABS: Tab[] = ["requests", "partners"];

const TAB_LABEL: Record<Tab, string> = {
  requests: "Requests",
  partners: "Partners",
};

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
  const [tab, setTab] = useState<Tab>("requests");

  const requestsQuery = useQuery({
    queryKey: ["dispatch-connection-requests", user?.id],
    queryFn: () => fetchDispatchConnectionRequests("PENDING"),
    enabled: !!user?.id,
  });

  const partnersQuery = useQuery({
    queryKey: ["dispatch-partners", user?.id],
    queryFn: () => fetchDispatchConnectionRequests("ACCEPTED"),
    enabled: !!user?.id && tab === "partners",
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["dispatch-connection-requests"],
      }),
      queryClient.invalidateQueries({ queryKey: ["dispatch-partners"] }),
    ]);

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

  const activeQuery = tab === "requests" ? requestsQuery : partnersQuery;

  if (activeQuery.isPending) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (activeQuery.isError) {
    return (
      <EmptyList
        title="Something went wrong"
        description={activeQuery.error.message}
      />
    );
  }

  const rows =
    tab === "requests"
      ? (requestsQuery.data?.data ?? [])
      : (partnersQuery.data?.data ?? []);
  const hasPayoutAccount = requestsQuery.data?.has_payout_account ?? false;
  const isBusy = acceptMutation.isPending || declineMutation.isPending;

  const renderPartner = ({ item }: { item: ConnectionRow }) => (
    <View className="bg-profile-card rounded-2xl p-4 mb-3 gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-primary font-poppins-semibold text-base">
          {item.vendor_business_name || item.vendor_full_name || "Restaurant"}
        </Text>
        <View className="px-2 py-1 rounded-full bg-status-success-subtle">
          <Text className="text-[11px] font-poppins-medium text-status-success">
            Connected
          </Text>
        </View>
      </View>

      <PartnerContact
        name={
          item.vendor_business_name || item.vendor_full_name || "this vendor"
        }
        email={item.vendor_email}
        phone={item.vendor_phone_number}
        address={item.vendor_business_address}
        state={item.vendor_state}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row gap-2 px-3 pt-3">
        {TABS.map((key) => (
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
              {TAB_LABEL[key]}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "requests" ? (
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
              isBusy={isBusy}
              onAccept={(id) => acceptMutation.mutate(id)}
              onDecline={(id, note) =>
                declineMutation.mutate({ id, note })
              }
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={requestsQuery.isRefetching}
              onRefresh={() => requestsQuery.refetch()}
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
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={renderPartner}
          refreshControl={
            <RefreshControl
              refreshing={partnersQuery.isRefetching}
              onRefresh={() => partnersQuery.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyList
              title="No delivery partners yet"
              description="Accept a request and the restaurant will appear here with its contact details."
            />
          }
        />
      )}
    </View>
  );
};

export default DispatchConnectionRequests;

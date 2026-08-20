import { fetchCurrentUserTransactions } from "@/api/user";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import Transactioncard from "@/components/Transactioncard";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import React, { useState } from "react";

import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

const AllTransactions = () => {
  const { profile } = useUserStore();
  const theme = useColorScheme();
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["user-transactions", profile?.id],
    queryFn: ({ pageParam = 1 }) =>
      fetchCurrentUserTransactions(pageParam, 15),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.data.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
    enabled: !!profile?.id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

 
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const transactions =
    data?.pages.flatMap((page) => page?.data || []) || [];

  const stats = data?.pages[0];

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerTitle: "All Transactions",
          headerTintColor: theme === "dark" ? "#fff" : "#000",
          headerTitleStyle: {
            fontSize: 16,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: BG_COLOR,
          },
          headerShadowVisible: false,
        }}
      />
      {stats && (
        <View className="px-5 pt-4 pb-1">
          <View className="flex-row gap-3">
            <SummaryCard
              label="Total Orders"
              value={stats.total}
              accent="orders"
              count
            />
            <SummaryCard
              label="Pending Payout"
              value={stats.pending_payout}
              accent="pending"
              wide
            />
            <SummaryCard
              label="Paid Out"
              value={stats.total_payout}
              accent="paid"
            />
          </View>
        </View>
      )}
      {isLoading && transactions.length === 0 ? (
        <LoadingIndicator />
      ) : (
        <FlashList
          data={transactions}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <HDivider />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <Transactioncard data={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme === "dark" ? "#fff" : "#000"}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View className="py-20 items-center justify-center">
              <Ionicons
                name="receipt-outline"
                size={48}
                color={theme === "dark" ? "#6B7280" : "#9CA3AF"}
              />
              <Text className="mt-3 text-base font-poppins-medium text-muted text-center">
                No transactions found
              </Text>
              <Text className="mt-1 text-x font-poppins-regular text-muted text-center">
                Your transaction history will appear here
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center justify-center">
                <ActivityIndicator size="small" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

export default AllTransactions;

const ACCENTS: Record<
  "orders" | "pending" | "paid",
  { card: string; label: string }
> = {
  orders: { card: "bg-blue-500/10 border-blue-500/30", label: "text-blue-500" },
  pending: {
    card: "bg-amber-500/10 border-amber-500/30",
    label: "text-amber-500",
  },
  paid: {
    card: "bg-emerald-500/10 border-emerald-500/30",
    label: "text-emerald-500",
  },
};

const SummaryCard = ({
  label,
  value,
  accent,
  wide = false,
  count = false,
}: {
  label: string;
  value?: number;
  accent: "orders" | "pending" | "paid";
  wide?: boolean;
  count?: boolean;
}) => (
  <View
    className={`${wide ? "flex-[1.3]" : "flex-1"} rounded-xl border border-border-subtle px-3 py-2.5 ${ACCENTS[accent].card}`}
  >
    <Text
      className={`${ACCENTS[accent].label} text-[9px] font-poppins-medium uppercase tracking-wide`}
      numberOfLines={1}
    >
      {label}
    </Text>
    <Text className="text-primary font-poppins-semibold text-sm mt-0.5">
      {count ? String(value ?? 0) : `₦ ${Number(value ?? 0).toFixed(2)}`}
    </Text>
  </View>
);

const styles = StyleSheet.create({});

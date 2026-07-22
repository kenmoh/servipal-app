import { fetchUserTransactions } from "@/api/user";
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
    queryFn: ({ pageParam = 0 }) =>
      fetchUserTransactions(profile?.id!, pageParam, 15),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const count = lastPage?.transactions?.length ?? 0;
      return count === 15 ? allPages.length : undefined;
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
    data?.pages.flatMap((page) => page?.transactions || []) || [];

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
      {isLoading && transactions.length === 0 ? (
        <LoadingIndicator />
      ) : (
        <FlashList
          data={transactions}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <HDivider />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <Transactioncard data={item as any} />}
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

const styles = StyleSheet.create({});

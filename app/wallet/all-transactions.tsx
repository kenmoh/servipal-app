import { fetchUserTransactions } from "@/api/user";
import HDivider from "@/components/HDivider";
import Transactioncard from "@/components/Transactioncard";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";

const AllTransactions = () => {
  const { profile } = useUserStore();
  const theme = useColorScheme();
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const {
    data,
    isLoading,
    refetch,
    isFetching,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["user-transactions", profile?.id],
    queryFn: ({ pageParam = 0 }) =>
      fetchUserTransactions(profile?.id!, pageParam, 15),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.transactions.length === 15 ? allPages.length : undefined;
    },
    enabled: !!profile?.id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const transactions = data?.pages.flatMap((page) => page.transactions) || [];
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
      <FlashList
        data={transactions}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <HDivider />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <Transactioncard data={item as any} />}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={theme === "dark" ? "#fff" : "#000"}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default AllTransactions;

const styles = StyleSheet.create({});

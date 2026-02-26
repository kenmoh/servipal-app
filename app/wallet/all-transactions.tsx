import { fetchUserWallet } from "@/api/user";
import HDivider from "@/components/HDivider";
import Transactioncard from "@/components/Transactioncard";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import { RefreshControl, StyleSheet, View, useColorScheme } from "react-native";

const AllTransactions = () => {
  const { profile } = useUserStore();
  const theme = useColorScheme();
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const { data, isLoading, refetch, isFetching, isPending } = useQuery({
    queryKey: ["user-wallet", profile?.id],
    queryFn: () => fetchUserWallet(profile?.id!),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!profile?.id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
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
        data={data?.transactions || []}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <HDivider />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <Transactioncard data={item} />}
        refreshControl={
          <RefreshControl refreshing={isFetching || isLoading || isPending} />
        }
        refreshing={isFetching || isLoading || isPending}
        onRefresh={refetch}
      />
    </View>
  );
};

export default AllTransactions;

const styles = StyleSheet.create({});

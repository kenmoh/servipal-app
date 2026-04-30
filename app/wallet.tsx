import { fetchUserWallet } from "@/api/user";
import HDivider from "@/components/HDivider";
import Transactioncard from "@/components/Transactioncard";
import { AppButton } from "@/components/ui/app-button";
import { useUserStore } from "@/store/userStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WalletScreen = () => {
  const insets = useSafeAreaInsets();
  const { profile } = useUserStore();

  const { data, isLoading, refetch, isFetching, isPending } = useQuery({
    queryKey: ["user-wallet", profile?.id],
    queryFn: () => fetchUserWallet(profile?.id!),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!profile?.id,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return (
    <View className="flex-1 bg-background">
      {/* Full-width Gradient Header + Balance */}
      <LinearGradient
        colors={["#1E3A5F", "#152C4A", "#0D1F33"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={{ paddingTop: insets.top }} className="px-5 pb-5">
          {/* Back Button Row */}
          <View className="flex-row items-center py-3">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="flex-row items-center"
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              <Text className="text-white font-poppins-medium ml-1">Back</Text>
            </Pressable>
          </View>

          {/*Account Details - Compact Row */}
          {profile?.bank_account_number && profile?.bank_name && (
            <View className="flex-row items-center mt-2">
              <Text className="text-white/50 text-xs">
                {profile?.bank_name}
              </Text>
              <View className="w-1 h-1 rounded-full bg-white/30 mx-2" />
              <Text className="text-white text-xs font-poppins-medium">
                {profile?.bank_account_number}
              </Text>
              <Pressable hitSlop={8} className="ml-1">
                <Ionicons
                  name="copy-outline"
                  size={12}
                  color="rgba(255,255,255,0.5)"
                />
              </Pressable>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3 my-5">
            <View className="flex-1">
              <AppButton
                text="Add Payout Account"
                height={40}
                borderRadius={50}
                width={"70%"}
                color="rgba(255,255,255,0.15)"
                textColor="#FFFFFF"
                icon={<Ionicons name="add-outline" size={18} color="#FFFFFF" />}
                onPress={() => router.push("/wallet/fund")}
              />
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Transactions Section */}
      <View
        className="flex-1 bg-background pt-5"
        style={{
          marginTop: -20,
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
        }}
      >
        <View className="px-5 mb-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-primary font-poppins-semibold text-lg">
              Recent Transactions
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => router.push("/wallet/all-transactions")}
              className="bg-orange-600/15 px-3 py-1 rounded-full active:opacity-20"
            >
              <Text className="text-orange-500 font-poppins-medium text-sm">
                See All
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Transaction List */}
        <FlatList
          data={data?.transactions?.slice(0, 9) || []}
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
    </View>
  );
};

export default WalletScreen;

import { fetchTransactionSummary } from "@/api/user";
import HDivider from "@/components/HDivider";
import Transactioncard from "@/components/Transactioncard";
import { AppButton } from "@/components/ui/app-button";
import { useUserStore } from "@/store/userStore";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TransactionsScreen = () => {
  const insets = useSafeAreaInsets();
  const { profile } = useUserStore();

  const { data, isLoading, refetch, isFetching, isPending } = useQuery({
    queryKey: ["user-transactions", profile?.id],
    queryFn: () => fetchTransactionSummary(),
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
                onPress={() => router.push("/wallet/add-payout-account")}
              />
            </View>
          </View>

          {/* Summary Row */}
          <View className="flex-row gap-3">
            <SummaryCard
              label="Total Orders"
              value={data?.total_count}
              accent="orders"
              count
            />
            <SummaryCard
              label="Pending Payout"
              value={data?.pending_payout}
              accent="pending"
              wide
            />
            <SummaryCard
              label="Paid Out"
              value={data?.total_payout}
              accent="paid"
            />
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
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 24,
          }}
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

export default TransactionsScreen;

const ACCENTS: Record<
  "orders" | "pending" | "paid",
  { card: string; label: string }
> = {
  orders: { card: "bg-blue-500/20", label: "text-blue-300" },
  pending: { card: "bg-amber-500/20", label: "text-amber-300" },
  paid: { card: "bg-emerald-500/20", label: "text-emerald-300" },
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
    className={`${wide ? "flex-[1.3]" : "flex-1"} rounded-xl px-3 py-2.5 ${ACCENTS[accent].card}`}
  >
    <Text
      className={`${ACCENTS[accent].label} text-[9px] font-poppins-medium`}
    >
      {label}
    </Text>
    <Text className="text-white font-poppins-semibold text-sm mt-0.5">
      {count ? String(value ?? 0) : `₦ ${Number(value ?? 0).toFixed(2)}`}
    </Text>
  </View>
);

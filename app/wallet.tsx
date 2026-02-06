import { AppButton } from "@/components/ui/app-button";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Transaction type definition
interface Transaction {
  id: string;
  type: "IN" | "OUT";
  title: string;
  amount: number;
  date: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
}

const WalletScreen = () => {
  const insets = useSafeAreaInsets();

  const account = useMemo(
    () => ({
      fullName: "Jane Doe",
      accountNumber: "0123456789",
      bankName: "ServiPal Bank",
      availableBalance: 128750.5,
      escrowBalance: 24500,
      currency: "₦",
    }),
    [],
  );

  const transactions = useMemo<Transaction[]>(
    () => [
      {
        id: "TX-1001",
        type: "IN",
        title: "Payment from Order #3421",
        amount: 12500,
        date: "2026-01-30 10:12",
        status: "COMPLETED",
      },
      {
        id: "TX-1002",
        type: "OUT",
        title: "Withdrawal to Bank",
        amount: 5000,
        date: "2026-01-29 16:40",
        status: "PENDING",
      },
      {
        id: "TX-1003",
        type: "IN",
        title: "Escrow Release",
        amount: 8300,
        date: "2026-01-28 09:05",
        status: "COMPLETED",
      },
      {
        id: "TX-1004",
        type: "OUT",
        title: "Service Fee",
        amount: 1200,
        date: "2026-01-27 12:22",
        status: "COMPLETED",
      },
    ],
    [],
  );

  const onPressTransaction = (tx: Transaction) => {
    router.push({
      pathname: "/wallet/transaction/[id]",
      params: { id: tx.id, tx: JSON.stringify(tx) },
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusStyle = (status: Transaction["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "bg-status-success-subtle";
      case "PENDING":
        return "bg-status-warning-subtle";
      case "FAILED":
        return "bg-status-error-subtle";
      default:
        return "bg-muted";
    }
  };

  const getStatusTextStyle = (status: Transaction["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "text-status-success";
      case "PENDING":
        return "text-status-warning";
      case "FAILED":
        return "text-status-error";
      default:
        return "text-muted";
    }
  };

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
          {/* Available Balance */}
          <View className="mt-4">
            <Text className="text-white/60 text-xs font-poppins-medium tracking-wide uppercase">
              Available Balance
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-white text-3xl font-poppins-bold mt-1">
                {account.currency}
                {account.availableBalance.toLocaleString()}
              </Text>
              {/* Escrow Balance - Compact Inline */}
              <View className="flex-row self-baseline items-center bg-white/10 rounded-xl px-3 py-2.5">
                <Ionicons
                  name="lock-closed"
                  size={14}
                  color="rgba(255,255,255,0.7)"
                />
                <Text className="text-white/60 text-xs ml-2">Escrow:</Text>
                <Text className="text-white font-poppins-semibold text-sm ml-1">
                  {account.currency}
                  {account.escrowBalance.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/*Account Details - Compact Row */}
          <View className="flex-row items-center mt-2">
            <Text className="text-white/50 text-xs">{account.bankName}</Text>
            <View className="w-1 h-1 rounded-full bg-white/30 mx-2" />
            <Text className="text-white text-xs font-poppins-medium">
              {account.accountNumber}
            </Text>
            <Pressable hitSlop={8} className="ml-1">
              <Ionicons
                name="copy-outline"
                size={12}
                color="rgba(255,255,255,0.5)"
              />
            </Pressable>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 my-5">
            <View className="flex-1">
              <AppButton
                text="Withdraw"
                variant="outline"
                height={40}
                color="rgba(255,255,255,0.3)"
                textColor="#FFFFFF"
                icon={
                  <Ionicons
                    name="arrow-up-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                }
              />
            </View>
            <View className="flex-1">
              <AppButton
                text="Fund Wallet"
                height={40}
                color="rgba(255,255,255,0.15)"
                textColor="#FFFFFF"
                icon={
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                }
                onPress={() => router.push("/wallet/fund")}
              />
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Transactions Section with curved top */}
      <View
        className="flex-1 bg-background pt-5"
        style={{
          marginTop: -20,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <View className="px-5 mb-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-primary font-poppins-semibold text-lg">
              Recent Transactions
            </Text>
            <Pressable hitSlop={8}>
              <Text className="text-brand-primary font-poppins-medium text-sm">
                See All
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Transaction List */}
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPressTransaction(item)}
              className="bg-surface-elevated rounded-2xl mt-3 active:opacity-80"
            >
              <View className="flex-row items-center p-4">
                {/* Icon */}
                <View
                  className={`w-11 h-11 rounded-full items-center justify-center ${
                    item.type === "IN"
                      ? "bg-status-success-subtle"
                      : "bg-status-error-subtle"
                  }`}
                >
                  <Ionicons
                    name={item.type === "IN" ? "arrow-down" : "arrow-up"}
                    size={20}
                    color={item.type === "IN" ? "#22C55E" : "#EF4444"}
                  />
                </View>

                {/* Details */}
                <View className="flex-1 ml-3">
                  <Text
                    className="text-foreground font-poppins-medium"
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text className="text-secondary text-xs mt-1">
                    {formatDate(item.date)}
                  </Text>
                </View>

                {/* Amount */}
                <View className="items-end ml-2">
                  <Text
                    className={`font-poppins-semibold ${
                      item.type === "IN"
                        ? "text-status-success"
                        : "text-status-error"
                    }`}
                  >
                    {item.type === "IN" ? "+" : "-"}
                    {account.currency}
                    {item.amount.toLocaleString()}
                  </Text>
                </View>

                {/* Chevron */}
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#9CA3AF"
                  style={{ marginLeft: 8 }}
                />
              </View>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
};

export default WalletScreen;

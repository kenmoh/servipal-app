import { useUserStore } from "@/store/userStore";
import { resolveDisplayName, Transaction } from "@/types/user-types";
import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const Transactioncard = ({ data }: { data: Transaction }) => {
  const { user } = useUserStore();
  // Determine circle and icon color
  let circleBg =
    data?.details.label === "CREDIT"
      ? "rgba(4, 255, 130, 0.1)"
      : data?.details.label === "DEBIT"
        ? "rgba(255, 0, 0, 0.2)"
        : "rgba(214, 152, 40, 0.2)";
  let iconColor =
    data?.details.label === "CREDIT"
      ? "green"
      : data?.details.label === "DEBIT"
        ? "red"
        : "gold";
  if (data?.payment_status === "PENDING" && data?.details.label === "CREDIT") {
    circleBg = "rgba(255, 193, 7, 0.2)";
    iconColor = "#FFC107";
  }

  const handleTransactionDetail = () => {
    router.push({
      pathname: "/wallet/transaction/[id]",
      params: {
        id: data?.id,
        txRef: data?.tx_ref,
        amount: data.amount,
        date: data?.created_at,
        status: data?.payment_status,
        fromUser: resolveDisplayName(data?.from_user),
        toUser: resolveDisplayName(data?.to_user),
        transactionType: data?.transaction_type,
        transactionDirection: data?.transaction_type,
        paymentStatus: data?.payment_status,
        walletId: data?.wallet_id,
      },
    });
  };

  const displayName =
    data.details?.label === "CREDIT"
      ? resolveDisplayName(data?.from_user)
      : resolveDisplayName(data?.to_user);

  return (
    <Pressable
      hitSlop={25}
      onPress={handleTransactionDetail}
      className="active:opacity-80"
    >
      <View className="w-full self-center  rounded-none py-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            style={{ backgroundColor: circleBg }}
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            {data?.details?.label === "CREDIT" ? (
              <AntDesign name="arrow-down" color={iconColor} size={14} />
            ) : data?.details?.label === "DEBIT" ? (
              <AntDesign name="arrow-up" color={iconColor} size={12} />
            ) : (
              <AntDesign name="lock" color={iconColor} size={12} />
            )}
          </View>
          <View>
            <Text className="capitalize text-xs font-normal text-primary">
              {displayName}
            </Text>
            <Text className="text-muted text-[10px]">{data?.created_at}</Text>
          </View>
        </View>
        <Text className="text-xs font-bold text-primary">
          ₦ {Number(data?.amount).toFixed(2)}
        </Text>
      </View>
    </Pressable>
  );
};

export default Transactioncard;

const styles = StyleSheet.create({});

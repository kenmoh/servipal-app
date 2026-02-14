import HDivider from "@/components/HDivider";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const TransactionDetailScreen = () => {
  const params = useLocalSearchParams<{
    id: string;
    txRef?: string;
    amount: string;
    date: string;
    status: string;
    fromUser: string;
    toUser: string;
    transactionType: string;
    transactionDirection: string;
    paymentStatus: string;
  }>();

  return (
    <View className="flex-1 bg-background px-2 py-6">
      <View className="bg-profile-card rounded-2xl border border-border-subtle  border-1 p-4">
        <TransactionValue label="Ref" value={params?.txRef || ""} />
        <HDivider />
        <TransactionValue label="Amount" value={`₦ ${params?.amount || ""}`} />
        <HDivider />
        <TransactionValue label="Date" value={params?.date || ""} />
        <HDivider />
        <TransactionValue label="Status" value={params?.status || ""} />
        <HDivider />
        <TransactionValue label="From" value={params?.fromUser || ""} />
        <HDivider />
        <TransactionValue label="To" value={params?.toUser || ""} />
        <HDivider />
        <TransactionValue
          label="Type"
          value={params?.transactionType.replace("_", " ") || ""}
        />
        <HDivider />

        <TransactionValue
          label="Payment Status"
          value={params?.paymentStatus || ""}
        />
      </View>
    </View>
  );
};

export default TransactionDetailScreen;

const TransactionValue = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <View className="flex-row items-center justify-between my-6">
      <Text className="text-muted text-xs font-poppins-medium">{label}</Text>
      <Text className="text-primary text-sm font-poppins">{value}</Text>
    </View>
  );
};

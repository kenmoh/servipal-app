import HDivider from "@/components/HDivider";
import { useToast } from "@/components/ToastProvider";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

const TransactionDetailScreen = () => {
  const { showSuccess } = useToast();
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

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(params?.txRef!);
    showSuccess("SUCCESS", `Copied ${params?.txRef} to clipboard`);
  };

  return (
    <View className="flex-1 bg-background px-4 py-6">
      <View className="bg-profile-card rounded-2xl border  border-border-subtle  border-1 p-4">
        <HDivider />
        <TransactionValue
          label="Ref"
          value={params?.txRef || ""}
          showIcon
          onPress={copyToClipboard}
        />
        <HDivider />
        <TransactionValue label="Amount" value={`₦ ${params?.amount || ""}`} />
        <HDivider />
        <TransactionValue label="Date" value={params?.date || ""} />
        <HDivider />
        <TransactionValue label="Status" value={params?.status || ""} />
        <HDivider />
        <TransactionValue label="From" value={params?.fromUser || "Customer"} />
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
  showIcon = false,
  onPress,
}: {
  label: string;
  value: string;
  showIcon?: boolean;
  onPress?: (data: string) => void;
}) => {
  return (
    <View className="flex-row items-center justify-between my-5">
      <Text className="text-muted text-sm font-poppins-medium">{label}</Text>
      <Pressable
        onPress={() => onPress?.(value)}
        className="flex-row items-center gap-2 active:opacity-50"
      >
        <Text className="text-primary text-xs font-poppins">{value}</Text>
        {showIcon && <Ionicons name="copy-outline" size={20} color="gray" />}
      </Pressable>
    </View>
  );
};

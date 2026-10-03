import Ionicons from "@react-native-vector-icons/ionicons/static";
import type { ComponentProps } from "react";
import { Linking, Pressable, Text, View } from "react-native";

interface PartnerContactProps {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  state?: string | null;
}

interface ContactRow {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onPress?: () => void;
}

/**
 * Contact block for an ACCEPTED vendor/dispatch pair. The service withholds
 * every field below on any other status, so this renders nothing rather than
 * an empty card when it is handed a stranger's row.
 */
const PartnerContact = ({
  name,
  email,
  phone,
  address,
  state,
}: PartnerContactProps) => {
  const addressLine = [address, state]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");

  const rows: ContactRow[] = [];
  if (phone) {
    rows.push({
      icon: "call-outline",
      label: "Phone",
      value: phone,
      onPress: () => Linking.openURL(`tel:${phone}`),
    });
  }
  if (email) {
    rows.push({
      icon: "mail-outline",
      label: "Email",
      value: email,
      onPress: () => Linking.openURL(`mailto:${email}`),
    });
  }
  if (addressLine) {
    rows.push({
      icon: "location-outline",
      label: "Address",
      value: addressLine,
    });
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <View className="bg-surface-elevated rounded-2xl p-4 gap-3">
      <Text className="text-muted font-poppins-medium text-xs uppercase tracking-wider">
        Contact {name}
      </Text>
      {rows.map((row) => {
        const content = (
          <>
            <View className="w-8 h-8 rounded-full bg-orange-500/20 items-center justify-center">
              <Ionicons name={row.icon} size={16} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="text-muted font-poppins-light text-[10px] uppercase tracking-wider">
                {row.label}
              </Text>
              <Text
                className="text-primary font-poppins text-xs"
                numberOfLines={2}
              >
                {row.value}
              </Text>
            </View>
          </>
        );

        return row.onPress ? (
          <Pressable
            key={row.label}
            className="flex-row items-center gap-3"
            onPress={row.onPress}
            testID={`partner-${row.label.toLowerCase()}`}
          >
            {content}
          </Pressable>
        ) : (
          <View
            key={row.label}
            className="flex-row items-center gap-3"
            testID={`partner-${row.label.toLowerCase()}`}
          >
            {content}
          </View>
        );
      })}
    </View>
  );
};

export default PartnerContact;

import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FontAwesome5,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import { useUserStore } from "@/store/userStore";
import { AppButton } from "@/components/ui/app-button";

const userTypes = [
  {
    id: "CUSTOMER",
    name: "Customer",
    description: "I want to order services, track deliveries & more.",
    icon: (color: string) => (
      <FontAwesome5 name="user" size={22} color={color} />
    ),
    color: "#FF8C00",
  },
  {
    id: "RESTAURANT_VENDOR",
    name: "Restaurant Service",
    description: "I want to list my restaurant and sell food & beverages.",
    icon: (color: string) => (
      <MaterialCommunityIcons
        name="silverware-fork-knife"
        size={22}
        color={color}
      />
    ),
    color: "#E63946",
  },
  {
    id: "LAUNDRY_VENDOR",
    name: "Laundry Service",
    description: "I want to offer laundry and dry cleaning services.",
    icon: (color: string) => (
      <MaterialCommunityIcons name="washing-machine" size={22} color={color} />
    ),
    color: "#457B9D",
  },
  {
    id: "DISPATCH",
    name: "Dispatch Service",
    description: "I want to manage delivery and logistics operations.",
    icon: (color: string) => (
      <Ionicons name="bicycle-outline" size={22} color={color} />
    ),
    color: "#1D3557",
  },
];

const UserSelection = () => {
  const { selectedUserType, setSelectedUserType } = useUserStore();

  const handleContinue = () => {
    if (selectedUserType) {
      router.push("/sign-up");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingVertical: 5, paddingHorizontal: 15 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <Text className="text-3xl font-poppins-bold text-primary mb-2">
            Join ServiPal as...
          </Text>
          <Text className="text-lg font-poppins text-primar">
            Select how you would like to use the platform.
          </Text>
        </View>

        <View className="gap-3">
          {userTypes.map((type) => {
            const isSelected = selectedUserType === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                onPress={() => setSelectedUserType(type.id)}
                activeOpacity={0.7}
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: isSelected ? "#FF8C00" : "transparent",
                }}
                className="p-5 rounded-2xl flex-row items-center bg-input"
              >
                <View className="w-14 h-14 rounded-full items-center bg-profile-card justify-center mr-4">
                  {type.icon("#9ca3af")}
                </View>
                <View className="flex-1">
                  <Text
                    className="text-xl font-poppins-semibold mb-1"
                    style={{ color: isSelected ? "#FF8C00" : "#aaa" }}
                  >
                    {type.name}
                  </Text>
                  <Text className="text-sm font-poppins text-gray-500 leading-5">
                    {type.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="mt-10 mb-5">
          <AppButton
            text="Continue"
            onPress={handleContinue}
            disabled={!selectedUserType}
            width="100%"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserSelection;

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
});

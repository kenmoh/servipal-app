import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const FoodScreen = () => {
  console.log("FoodScreen");
  return (
    <View className="flex-1 bg-background justify-center items-center">
      <Text className="text-primary">FoodScreen</Text>
      <AppButton
        text="Submit"
        // className="rounded-full"
        width={"95%"}
        onPress={() => console.log("Pressed")}
        variant="fill"
        icon={<MaterialIcons name="credit-card" color={"white"} size={24} />}
      />
      <AppTextInput
        label="Full Name"
        placeholder="Enter your full name"
        textColor="text-primary"
        labelColor="text-primary"
        width="95%"
      />
    </View>
  );
};

export default FoodScreen;

const styles = StyleSheet.create({});

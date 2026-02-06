import React from "react";
import { StyleSheet, Text, View } from "react-native";

const ChangePasswordScreen = () => {
  return (
    <View className="flex-1 bg-background px-5 py-6">
      <Text className="text-primary text-xl font-poppins-semibold">
        Change Password
      </Text>
      <Text className="text-secondary mt-2">
        Update your account password securely.
      </Text>
      <View className="mt-6 rounded-2xl bg-profile-card p-4">
        <Text className="text-foreground">Password form coming soon.</Text>
      </View>
    </View>
  );
};

export default ChangePasswordScreen;

const styles = StyleSheet.create({});

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface RadioButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const RadioButton: React.FC<RadioButtonProps> = ({
  label,
  selected,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center my-2"
    activeOpacity={0.7}
  >
    <View
      className={`h-5 w-5 rounded-full items-center justify-center mr-3 ${
        selected ? "border-2 border-button-primary" : "border border-gray-400"
      }`}
    >
      {selected && <View className="h-2.5 w-2.5 rounded-full bg-button-primary" />}
    </View>
    <Text
      className={`font-poppins-medium text-base ${
        selected ? "text-primary" : "text-gray-400"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default RadioButton;

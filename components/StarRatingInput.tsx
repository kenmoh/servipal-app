import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface StarRatingInputProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  maxStars?: number;
  label?: string;
}

const StarRatingInput = ({
  rating,
  onRatingChange,
  maxStars = 5,
  label,
}: StarRatingInputProps) => {
  return (
    <View className="mb-2">
      {label && (
        <Text className="text-sm text-muted font-poppins-medium mb-2">
          {label}
        </Text>
      )}
      <View className="flex-row gap-5">
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => onRatingChange(starValue)}
              activeOpacity={0.7}
            >
              <FontAwesome
                name={starValue <= rating ? "star" : "star-o"}
                size={18}
                color={starValue <= rating ? "#FFB800" : "#D3D3D3"}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default StarRatingInput;

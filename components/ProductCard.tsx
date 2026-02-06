import { ProductResponse } from "@/types/product-types";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CARD_HEIGHT = Dimensions.get("screen").height * 0.2;
const CARD_WIDTH = Dimensions.get("screen").width * 0.45;

const ProductCard = ({ product }: { product: ProductResponse }) => {
  const handlePress = () => {
    router.push({
      pathname: "/product-detail/productId/[productId]",
      params: {
        productId: product.id,
      },
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[styles.card, { width: CARD_WIDTH }]}
      className="my-2  bg-input rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Image Section */}
      <View style={styles.imageContainer} className="relative bg-gray-100">
        <Image
          source={{
            uri: product.images[0],
          }}
          className="w-full h-full object-cover"
        />

        {/* Stock Badge */}
        <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-md">
          <Text className="text-white text-[10px] font-poppins-medium">
            {product.stock > 0 ? `${product.stock} Left` : "Out of Stock"}
          </Text>
        </View>
      </View>

      {/* Details Section */}
      <View className="p-3 gap-1 bg-input">
        <View className="flex-row justify-between items-start">
          <Text
            className="text-primary text-sm font-poppins-semibold flex-1 mr-2"
            numberOfLines={1}
          >
            {product.name}
          </Text>
        </View>

        {/* Price */}
        <Text className="text-primary text-base font-poppins-bold">
          ₦{Number(product?.price).toLocaleString()}
        </Text>

        {/* Store Info */}
        <View className="flex-row items-center gap-1.5 mt-1 opacity-70">
          <MaterialCommunityIcons name="store" size={12} color="gray" />
          <Text
            className="text-secondary text-xs font-poppins flex-1"
            numberOfLines={1}
          >
            Store Name Here
          </Text>
        </View>

        {/* Footer / Sold Count */}
        {product.total_sold > 0 && (
          <View className="flex-row items-center mt-2 bg-secondary/10 px-2 py-1 rounded-md self-start">
            <Text className="text-secondary text-[10px] font-poppins-medium">
              {product.total_sold} sold
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ProductCard;

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  imageContainer: {
    height: CARD_HEIGHT,
    width: "100%",
  },
});

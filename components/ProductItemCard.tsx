import { blurhash } from "@/constants/state";
import { ProductResponse } from "@/types/product-types";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ItemProps = {
  item: ProductResponse;
};

const ProductItemCard = ({ item }: ItemProps) => {
  const handlePress = () => {
    router.push({
      pathname: "/product-detail/add-product",
      params: { productId: item?.id },
    });
  };

  console.log(item?.images[0]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={styles.card}
      className="bg-input rounded-xl mx-4 my-2 p-3 flex-row items-center border border-slate-100 dark:border-slate-800"
    >
      {/* Image Section */}
      <View className="h-20 w-20 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 items-center justify-center">
        {item?.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            style={{ flex: 1, width: "100%" }}
            contentFit="cover"
            transition={200}
            placeholder={blurhash}
          />
        ) : (
          <Feather name="image" size={24} color="gray" />
        )}
      </View>

      {/* Details Section */}
      <View className="flex-1 ml-4 justify-center">
        <Text
          className="text-primary font-poppins-semibold text-sm mb-0.5"
          numberOfLines={1}
        >
          {item?.name}
        </Text>

        <Text className="text-button-primary font-poppins-bold text-sm mb-1">
          ₦{Number(item?.price || 0).toLocaleString()}
        </Text>

        <View className="flex-row items-center gap-1.5 opacity-60">
          <Feather name="box" size={10} color="gray" />
          <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-poppins-medium">
            Stock: {item.stock}
          </Text>
        </View>
      </View>

      {/* Action Section */}
      <View className="ml-2">
        <Feather name="edit" size={16} color="gray" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 1,
  },
});

export default ProductItemCard;

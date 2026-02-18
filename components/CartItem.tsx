import { CartItem, useCartStore } from "@/store/cartStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Text, TouchableOpacity, View } from "react-native";

type CartItemProps = {
  item: CartItem;
};

const Item = ({ item }: CartItemProps) => {
  const { updateItemQuantity, removeItem } = useCartStore();

  return (
    <View className="p-3 bg-input rounded-lg my-1 self-center flex-row justify-between">
      <View className="flex-row flex-1">
        {/* Left side: Image */}
        <View className="rounded-lg w-20 h-20 overflow-hidden">
          <Image
            source={{ uri: item.image }}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </View>

        {/* Middle: Name and Price */}
        <View className="flex-1 ml-2 justify-between">
          <View>
            <Text className="text-primary font-poppins" numberOfLines={2}>
              {item.name}
            </Text>
            {item.selected_size && (
              <Text className="text-gray-400 font-poppins text-xs">
                Size: {item.selected_size.size}
              </Text>
            )}
            {item.selected_side && (
              <Text
                className="text-gray-400 font-poppins text-xs"
                numberOfLines={1}
              >
                Sides: {item.selected_side}
              </Text>
            )}
            <Text className="text-primary mt-1 font-poppins">
              ₦{item.price?.toLocaleString()}
            </Text>
          </View>
          {/* Bottom Right: Quantity Controls */}
          <View className="flex-row items-center gap-3 self-end">
            <View className="flex-row items-center rounded-full bg-gray-100 dark:bg-gray-800 px-5 py-0.5 gap-5">
              <TouchableOpacity
                onPress={() =>
                  updateItemQuantity(item.item_id, item.quantity - 1)
                }
              >
                <Ionicons name="remove" size={18} color="#aaa" />
              </TouchableOpacity>
              <Text className="text-primary font-poppins text-lg">
                {item.quantity}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  updateItemQuantity(item.item_id, item.quantity + 1)
                }
              >
                <Ionicons name="add" size={18} color="#aaa" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => removeItem(item.item_id)}
              style={{ marginLeft: 10 }}
            >
              <Ionicons name="trash" size={18} color="#aaa" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Item;

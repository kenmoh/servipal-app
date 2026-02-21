import { UserProfile } from "@/types/user-types";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { RelativePathString, router, type Href } from "expo-router";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

const IMAGET_HEIGHT = Dimensions.get("window").height * 0.2;

const StoreCard = ({
  item,
  pathName,
}: {
  item: UserProfile;
  pathName: Href;
}) => {
  const theme = useColorScheme();
  const handleStoreSelect = async () => {
    const finalPath =
      item?.user_type === "LAUNDRY_VENDOR"
        ? "/laundry-store/[storeId]"
        : (pathName as RelativePathString);

    router.push({
      pathname: finalPath as any,
      params: {
        storeId: item?.id,
        deliveryFee: item?.pickup_and_delivery_charge,
      },
    });
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handleStoreSelect}>
      <View
        className="self-center w-[90%]  rounded-2xl h-['20%'] overflow-hidden my-5"
        style={{
          height: IMAGET_HEIGHT,
        }}
      >
        {/* Background Image */}
        <Image
          source={{ uri: item?.backdrop_image_url }}
          style={styles.image}
          contentFit="cover"
        />

        {/* Gradient Overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.gradient}
        />

        {/* Rating Badge */}
        {Number(item?.reviews?.stats.average_rating) > 0 && (
          <View style={styles.ratingBadge}>
            <Text className="text-primary font-poppins-bold">
              {Number(item?.reviews?.stats.average_rating).toFixed(1)}
            </Text>
            <AntDesign name="star" size={14} color={"orange"} />
          </View>
        )}

        {/* Content */}
        <View className="absolute bottom-0 p-3 w-full gap-1">
          <View
            style={{ backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10 }}
            className="self-start px-2 py-1"
          >
            <Text
              className="text-[12px]"
              numberOfLines={1}
              style={{
                fontFamily: "Poppins-Medium",
                color: theme === "dark" ? "#fff" : "#fff",
              }}
            >
              {item?.business_name}
            </Text>
          </View>

          <View className="items-center flex-row gap-2">
            <Text className="text-sm text-white opacity-90" numberOfLines={1}>
              {item?.business_address} |
            </Text>
            <Text className="text-xs text-white opacity-90" numberOfLines={1}>
              {item?.distance_km} km Away
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: "center",
    gap: 4,
  },
});

export default StoreCard;

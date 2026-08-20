import { UserProfile } from "@/types/user-types";
import AntDesign from "@react-native-vector-icons/ant-design/static";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import FontAwesome from "@react-native-vector-icons/fontawesome/static";
import Feather from "@react-native-vector-icons/feather/static";
import { RelativePathString, router, type Href } from "expo-router";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Fontisto from "@react-native-vector-icons/fontisto/static";
import items from "@/app/(tabs)/marketplace/(market)/items";

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
        className="self-center w-[90%]  rounded-2xl h-['20%'] overflow-hidden my-4"
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
            <Text className="text-gray-300 font-poppins-bold">
              {Number(item?.reviews?.stats.average_rating).toFixed(1)}
            </Text>
            <AntDesign name="star" size={14} color={"orange"} />
          </View>
        )}
        {/* Pickup Status */}
        {item.can_pickup_and_dropoff && (
          <View style={styles.deliveryBadge}>
            <Fontisto name="motorcycle" color={"orange"} size={20} />
          </View>
        )}

        {/* Content */}
    
      </View>
      <View className="gap-1 w-[90%] self-center">
        <View className="flex-row gap-2 items-start justify-between">
          <View className="flex-row gap-2 items-start flex-1">
            <View className="pt-[2px]">
              <FontAwesome name="bank" size={12} color="gray" />
            </View>
            <Text className="text-[14px] font-poppins-medium text-primary flex-1">
              {item?.business_name}
            </Text>
          </View>
         
          <Text className="text-xs text-muted shrink-0 pt-[2px]">
               {`${item?.distance_km} km Away`}
            </Text>
        </View>

        {item?.business_address && (
          <View className="items-center flex-row gap-2">
            <Feather name="map-pin" size={12} color="gray" />
            <Text className="text-sm text-muted flex-1" numberOfLines={2}>
              {item?.business_address}
            </Text>
          </View>
        )}
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
  deliveryBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    height: 40,
    width: 40,
    borderRadius: 25,
    alignItems: "center",
    justifyContent:'center'
  },
});

export default StoreCard;

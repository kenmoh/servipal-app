import { Review } from "@/types/review-types";
import { FontAwesome } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { Image } from "expo-image";
import { Text, View } from "react-native";

const ReviewCard = ({ data }: { data: Review }) => {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <FontAwesome
        key={index}
        name={index < rating ? "star" : "star-o"}
        size={12}
        color={index < rating ? "#FFB800" : "#D3D3D3"}
        style={{ marginRight: 2 }}
      />
    ));
  };

  const timeAgo = data.created_at
    ? formatDistanceToNow(new Date(data.created_at), { addSuffix: true })
    : "";

  return (
    <View className="bg-card w-full p-4 rounded-xl mb-3 border border-border">
      <View className="flex-row items-center gap-3 mb-2">
        <View className="rounded-full overflow-hidden h-10 w-10 bg-gray-200">
          <Image
            source={{ uri: data.reviewer?.profile_image_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>
        <View className="flex-1">
          <Text className="font-poppins-medium text-sm text-foreground mb-1">
            {data.reviewer?.business_name ||
              data.reviewer?.store_name ||
              data.reviewer?.full_name ||
              "Anonymous User"}
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {renderStars(data.rating)}
            </View>
            <Text className="text-xs text-muted font-poppins-regular">
              {timeAgo}
            </Text>
          </View>
        </View>
      </View>

      <Text className="text-sm text-foreground/80 leading-5 font-poppins-regular">
        {data.comment}
      </Text>
    </View>
  );
};

export default ReviewCard;

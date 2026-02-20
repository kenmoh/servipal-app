import { Review } from "@/types/review-types";
import { FontAwesome } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import HDivider from "./HDivider";

const ReviewCard = ({ data }: { data: Review }) => {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <FontAwesome
        key={index}
        name={index < rating ? "star-o" : "star-o"}
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
    <View className="bg-card  p-4 rounded-xl mb-3 border border-border border-slate-200 dark:border-slate-800 w-[95%] self-center">
      <View className="flex-row items-center gap-3 mb-2">
        <View className="rounded-full overflow-hidden h-16 w-16 bg-gray-200">
          <Image
            source={{ uri: data.reviewer?.profile_image_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-muted font-poppins-regular">
            {timeAgo.charAt(0).toUpperCase() + timeAgo.slice(1)}
          </Text>
          <Text className="font-poppins-medium text-sm text-primary mb-1">
            {data.reviewer?.business_name ||
              data.reviewer?.store_name ||
              data.reviewer?.full_name ||
              "Anonymous User"}
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {renderStars(data.rating)}
            </View>
          </View>
        </View>
      </View>
      <HDivider />

      <Text className="text-sm text-muted leading-5 font-poppins-regular my-2">
        {data.comment}
      </Text>
    </View>
  );
};

export default ReviewCard;

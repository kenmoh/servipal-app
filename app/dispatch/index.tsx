import { fetchDispatchRiders } from "@/api/user";
import FAB from "@/components/FAB";
import RiderCard from "@/components/RiderCard";
import { useUserStore } from "@/store/userStore";
import { RiderResponse } from "@/types/user-types";
import { AntDesign } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { RefreshControl, StyleSheet, View } from "react-native";

const DispatchRiders = () => {
  const { user } = useUserStore();
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["dispatch-riders", user?.id],
    queryFn: fetchDispatchRiders,
    enabled: !!user?.id,
  });

  return (
    <View className="bg-background flex-1">
      <FlashList
        data={data || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }: { item: RiderResponse }) => (
          <RiderCard rider={item} />
        )}
        refreshControl={<RefreshControl refreshing={isFetching} />}
        refreshing={isFetching}
        onRefresh={refetch}
      />
      <View className="absolute bottom-10 right-0">
        <FAB
          icon={<AntDesign name="user-add" color={"white"} size={24} />}
          onPress={() => router.push({ pathname: "/dispatch/add-rider" })}
        />
      </View>
    </View>
  );
};

export default DispatchRiders;

const styles = StyleSheet.create({});

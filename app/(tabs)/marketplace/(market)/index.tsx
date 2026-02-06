import { fetchProducts, getCategoriesWithSubcategories } from "@/api/product";
import Category from "@/components/Category";
import FAB from "@/components/FAB";

import LoadingIndicator from "@/components/LoadingIndicator";
import ProductCard from "@/components/ProductCard";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";
import Feather from "@expo/vector-icons/Feather";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

const MarketPlace = () => {
  const { user } = useUserStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const theme = useColorScheme();
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const HANDLE_INDICATOR_STYLE =
    theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK;
  const HANDLE_STYLE = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const BORDER_COLOR = "#2f4550";
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { data, isLoading, isPending, isFetching, refetch } = useQuery({
    queryKey: ["products", selectedCategory],
    queryFn: () => {
      const categoryParam =
        selectedCategory === null ? undefined : selectedCategory;
      return fetchProducts(categoryParam);
    },
  });

  const handleModalCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    bottomSheetRef.current?.close();
  }, []);

  const openBottomSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategoriesWithSubcategories,
  });

  // Transform hierarchical categories into a flat list for the header
  const { headerSubcategories, allSubcategories } = React.useMemo(() => {
    if (!categories) return { headerSubcategories: [], allSubcategories: [] };
    const allSubcats = categories.flatMap((cat) => cat.subcategories || []);

    // Prioritize certain categories if they exist
    const prioritySlugs = ["electronics", "mens-clothing", "womens-clothing"];
    const prioritySubcats = allSubcats.filter((sub) =>
      prioritySlugs.some((slug) => sub.slug.toLowerCase().includes(slug)),
    );

    const otherSubcats = allSubcats.filter(
      (sub) => !prioritySubcats.some((ps) => ps.id === sub.id),
    );

    const header = [...prioritySubcats, ...otherSubcats].slice(0, 3);

    return { headerSubcategories: header, allSubcategories: allSubcats };
  }, [categories]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading || isPending) {
    return <LoadingIndicator />;
  }

  return (
    <>
      <View className="flex-1 bg-background">
        <FlashList
          data={data || []}
          renderItem={({ item }) => (
            <View className="flex-1 items-center">
              <ProductCard product={item} />
            </View>
          )}
          keyExtractor={(item) => item?.id}
          ListHeaderComponent={() => (
            <>
              <Category
                categories={headerSubcategories}
                allSubcategories={allSubcategories}
                onCategorySelect={setSelectedCategory}
                selectedCategory={selectedCategory}
                onOpenSheet={openBottomSheet}
              />
            </>
          )}
          ListEmptyComponent={() => (
            <View className="flex-1 justify-center items-center py-20">
              <Text className="text-muted text-base font-poppins text-center">
                {selectedCategory
                  ? "No products found in this category"
                  : "No products available"}
              </Text>
              <Text className="text-muted text-sm font-poppins-light text-center mt-2">
                {selectedCategory
                  ? "Try selecting a different category"
                  : "Check back later for new products"}
              </Text>
            </View>
          )}
          refreshing={isFetching}
          onRefresh={handleRefresh}
          numColumns={2}
        />
      </View>
      {user?.user_metadata?.user_type === "LAUNDRY_VENDOR" ||
      user?.user_metadata?.user_type === "RESTAURANT_VENDOR" ? (
        ""
      ) : (
        <FAB
          icon={<Feather name="plus" size={24} color={"white"} />}
          onPress={() => router.push("/product-detail/add-product")}
        />
      )}

      <BottomSheet
        index={-1}
        snapPoints={["35%", "65%"]}
        ref={bottomSheetRef}
        enablePanDownToClose={true}
        enableDynamicSizing={true}
        handleIndicatorStyle={{ backgroundColor: HANDLE_INDICATOR_STYLE }}
        handleStyle={{ backgroundColor: HANDLE_STYLE }}
        backgroundStyle={{
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          backgroundColor: BG_COLOR,
          shadowColor: "orange",
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 20,
        }}
      >
        <BottomSheetScrollView
          style={{
            backgroundColor: BG_COLOR,
            paddingHorizontal: 16,
            flex: 1,
            paddingBottom: 40,
          }}
        >
          {categories?.map((category) => (
            <View key={category.id} className="mb-6">
              <Text className="text-gray-400 font-poppins-bold text-xs uppercase mb-3 ml-1">
                {category.name}
              </Text>
              <View style={styles.modalCategoriesContainer}>
                {category.subcategories?.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => handleModalCategorySelect(sub.id)}
                    style={[
                      styles.modalCategoryItem,
                      {
                        backgroundColor:
                          selectedCategory === sub.id ? "orange" : BG_COLOR,
                        borderColor:
                          selectedCategory === sub.id ? "orange" : BORDER_COLOR,
                      },
                    ]}
                  >
                    <Text
                      className={`${selectedCategory === sub.id ? "text-white" : "text-primary"} ${selectedCategory === sub.id ? "font-poppins-medium" : "font-poppins-light"} text-sm`}
                    >
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
};

export default MarketPlace;

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  modalCategoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  modalCategoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
});

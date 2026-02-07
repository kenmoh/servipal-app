import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { RestaurantMenuItemResponse } from "@/types/item-types";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { AppButton } from "./ui/app-button";

interface ItemCustomizationSheetProps {
  item: RestaurantMenuItemResponse | null;
  onAdd: (
    item: RestaurantMenuItemResponse,
    selectedSize: string,
    selectedSides: string[],
  ) => void;
}

const ItemCustomizationSheet = forwardRef<
  BottomSheetModal,
  ItemCustomizationSheetProps
>(({ item, onAdd }, ref) => {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedSides, setSelectedSides] = useState<string[]>([]);
  const theme = useColorScheme();

  const snapPoints = useMemo(() => ["60%", "85%"], []);

  // Reset state when item changes or sheet opens (handled via useEffect in practice,
  // but for simplicity here we'll assume the parent manages it or we reset on close)

  const handleAdd = () => {
    if (item) {
      onAdd(item, selectedSize, selectedSides);
      setSelectedSize("");
      setSelectedSides([]);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    [],
  );

  if (!item) return null;

  const hasSizes = item.sizes && item.sizes.length > 0;
  const hasSides = item.sides && item.sides.length > 0;

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: "#ccc" }}
      backgroundStyle={{
        backgroundColor: theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
      }} // Matches app background
    >
      <BottomSheetView className="flex-1 px-5 pb-10">
        <View className="flex-row items-center mb-6">
          <View className="w-16 h-16 rounded-xl overflow-hidden mr-4 shadow-sm">
            <Image
              source={{ uri: item.images[0] }}
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-poppins-bold text-primary">
              {item.name}
            </Text>
            <Text className="text-sm font-poppins-medium text-button-primary">
              ₦{Number(item.price).toFixed(2)}
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {item.description && (
            <View className="mb-6">
              <Text className="text-sm font-poppins-regular text-muted leading-5">
                {item.description}
              </Text>
            </View>
          )}

          {/* SIZES */}
          {hasSizes && (
            <View className="mb-8">
              <Text className="text-base font-poppins-semibold text-primary mb-3">
                Choose Size
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {item?.sizes?.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      onPress={() => setSelectedSize(size)}
                      className={`px-5 py-2 rounded-full flex-row items-center ${
                        isSelected
                          ? "bg-button-primary/10 border border-button-primary"
                          : "bg-input"
                      }`}
                    >
                      <View
                        className={`w-4 h-4 rounded-full border items-center justify-center mr-2 ${
                          isSelected
                            ? "border-button-primary"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <View className="w-2 h-2 rounded-full bg-button-primary" />
                        )}
                      </View>
                      <Text
                        className={`text-sm font-poppins-medium ${
                          isSelected ? "text-button-primary" : "text-gray-500"
                        }`}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* SIDES */}
          {hasSides && (
            <View className="mb-8">
              <Text className="text-base font-poppins-semibold text-primary mb-3">
                Choose Side
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {item?.sides?.map((side) => {
                  const isSelected = selectedSides.includes(side);
                  const toggleSide = () => {
                    setSelectedSides((prev) =>
                      prev.includes(side)
                        ? prev.filter((s) => s !== side)
                        : [...prev, side],
                    );
                  };

                  return (
                    <TouchableOpacity
                      key={side}
                      onPress={toggleSide}
                      className={`px-5 py-2 rounded-full flex-row items-center ${
                        isSelected
                          ? "bg-button-primary/10 border border-button-primary"
                          : "bg-input"
                      }`}
                    >
                      <View
                        className={`w-4 h-4 rounded-md border items-center justify-center mr-2 ${
                          isSelected
                            ? "border-button-primary bg-button-primary"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <View className="w-2 h-2 bg-white rounded-sm" />
                        )}
                      </View>
                      <Text
                        className={`text-sm font-poppins-medium ${
                          isSelected ? "text-button-primary" : "text-gray-500"
                        }`}
                      >
                        {side}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        <View className="mt-4">
          <AppButton
            text={`Add to Cart • ₦${Number(item.price).toFixed(2)}`}
            onPress={handleAdd}
            width="100%"
            disabled={
              (hasSizes && !selectedSize) ||
              (hasSides && selectedSides.length === 0)
            }
          />
          {((hasSizes && !selectedSize) ||
            (hasSides && selectedSides.length === 0)) && (
            <Text className="text-center text-xs text-status-error font-poppins mt-2">
              Please select {hasSizes && !selectedSize ? "a size" : ""}
              {hasSizes &&
              !selectedSize &&
              hasSides &&
              selectedSides.length === 0
                ? " and "
                : ""}
              {hasSides && selectedSides.length === 0
                ? "at least one side"
                : ""}{" "}
              to continue
            </Text>
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default ItemCustomizationSheet;

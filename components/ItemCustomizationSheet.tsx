import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { RestaurantMenuItemResponse, SizeOption } from "@/types/item-types";
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
    selectedSizes: SizeOption[],
    selectedSide: string,
  ) => void;
}

const ItemCustomizationSheet = forwardRef<
  BottomSheetModal,
  ItemCustomizationSheetProps
>(({ item, onAdd }, ref) => {
  const [selectedSizes, setSelectedSizes] = useState<SizeOption[]>([]);
  const [selectedSide, setSelectedSide] = useState<string>("");
  const theme = useColorScheme();

  const snapPoints = useMemo(() => ["65%", "85%"], []);

  const handleAdd = () => {
    if (item) {
      onAdd(item, selectedSizes, selectedSide);
      setSelectedSizes([]);
      setSelectedSide("");
    }
  };

  const toggleSize = (sizeOption: SizeOption) => {
    setSelectedSizes((prev) => {
      const exists = prev.some((s) => s.size === sizeOption.size);
      if (exists) {
        return prev.filter((s) => s.size !== sizeOption.size);
      }
      return [...prev, sizeOption];
    });
  };

  const totalSizesPrice = useMemo(
    () => selectedSizes.reduce((sum, s) => sum + Number(s.price), 0),
    [selectedSizes],
  );

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
                Choose Size(s)
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {item?.sizes?.map((sizeOption) => {
                  const isSelected = selectedSizes.some(
                    (s) => s.size === sizeOption.size,
                  );

                  return (
                    <TouchableOpacity
                      key={sizeOption.size}
                      onPress={() => toggleSize(sizeOption)}
                      className={`px-5 py-3 rounded-full flex-row items-center ${
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
                          <Text className="text-white text-[10px] font-bold">✓</Text>
                        )}
                      </View>
                      <View>
                        <Text
                          className={`text-sm font-poppins-medium ${
                            isSelected ? "text-button-primary" : "text-gray-500"
                          }`}
                        >
                          {sizeOption.size}
                        </Text>
                        <Text
                          className={`text-xs font-poppins ${
                            isSelected ? "text-button-primary" : "text-muted"
                          }`}
                        >
                          ₦{Number(sizeOption.price).toFixed(2)}
                        </Text>
                      </View>
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
                  const isSelected = selectedSide === side;

                  return (
                    <TouchableOpacity
                      key={side}
                      onPress={() => setSelectedSide(side)}
                      className={`px-5 py-2 rounded-full flex-row items-center ${
                        isSelected
                          ? "bg-button-primary/10 border border-button-primary"
                          : "bg-input"
                      }`}
                    >
                      <View
                        className={`w-4 h-4 rounded-full border items-center justify-center mr-2 ${
                          isSelected
                            ? "border-button-primary bg-button-primary"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <View className="w-2 h-2 bg-white rounded-full" />
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
            text={`Add to Cart${selectedSizes.length > 1 ? ` (${selectedSizes.length} sizes)` : ""} • ₦${(hasSizes ? totalSizesPrice : Number(item.price)).toFixed(2)}`}
            onPress={handleAdd}
            width="100%"
            disabled={
              (hasSizes && selectedSizes.length === 0) ||
              (hasSides && !selectedSide)
            }
          />
          {((hasSizes && selectedSizes.length === 0) ||
            (hasSides && !selectedSide)) && (
            <Text className="text-center text-xs text-status-error font-poppins mt-2">
              Please select{" "}
              {hasSizes && selectedSizes.length === 0 ? "at least one size" : ""}
              {hasSizes &&
              selectedSizes.length === 0 &&
              hasSides &&
              selectedSide.length === 0
                ? " and "
                : ""}
              {hasSides && selectedSide.length === 0 ? "a side" : ""} to
              continue
            </Text>
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default ItemCustomizationSheet;

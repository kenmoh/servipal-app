import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo, useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

interface Bank {
  id: number;
  name: string;
  code: string;
}

interface BankSelectionSheetProps {
  banks: Bank[];
  onSelect: (bank: Bank) => void;
  onDismiss?: () => void;
}

const BankSelectionSheet = forwardRef<
  BottomSheetModal,
  BankSelectionSheetProps
>(({ banks, onSelect, onDismiss }, ref) => {
  const [searchQuery, setSearchQuery] = useState("");
  const theme = useColorScheme();

  const snapPoints = useMemo(() => ["75%", "85%"], []);

  const filteredBanks = useMemo(() => {
    return banks.filter((bank) =>
      bank.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [banks, searchQuery]);

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

  const renderBankItem = useCallback(
    ({ item }: { item: Bank }) => (
      <TouchableOpacity
        onPress={() => {
          onSelect(item);
          setSearchQuery("");
          // @ts-ignore
          ref.current?.dismiss();
        }}
        className="py-4 px-5 border-b border-gray-100 dark:border-gray-800"
      >
        <Text className="text-base font-poppins-medium text-primary">
          {item.name}
        </Text>
      </TouchableOpacity>
    ),
    [onSelect, ref],
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={() => {
        setSearchQuery("");
        onDismiss?.();
      }}
      handleIndicatorStyle={{ backgroundColor: "#ccc" }}
      backgroundStyle={{
        backgroundColor: theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
      }}
    >
      <BottomSheetFlatList
        data={filteredBanks}
        keyExtractor={(item: Bank) => item.id.toString()}
        renderItem={renderBankItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="px-5 pt-2 pb-4">
            <Text className="text-xl font-poppins-bold text-primary mb-4">
              Select Bank
            </Text>

            <View className="flex-row items-center bg-input rounded-xl px-4 py-1">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Search your bank..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-2 text-primary font-poppins-regular"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={() => (
          <View className="items-center justify-center pt-10">
            <Text className="text-muted font-poppins-medium">
              {searchQuery
                ? "No banks found matching your search"
                : "No banks available"}
            </Text>
          </View>
        )}
      />
    </BottomSheetModal>
  );
});

export default BankSelectionSheet;

import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { Picker } from "@react-native-picker/picker";
import React from "react";
import {
  type DimensionValue,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

type ItemProp = {
  id: number | string;
  name: string;
  capital?: string;
  code?: string;
};

type PickerProps = {
  label?: string;
  items: ItemProp[];
  value: string;
  placeholder?: string;
  isBank?: boolean;
  isState?: boolean;
  selectedValue?: string;
  enabled?: boolean;
  width?: DimensionValue;
  onValueChange: (val: string) => void;
};
const AppPicker = ({
  label,
  items,
  value,
  selectedValue,
  placeholder,
  onValueChange,
  isBank = false,
  isState = false,
  enabled = true,
  width = "90%",
}: PickerProps) => {
  const theme = useColorScheme();
  const CARD_BG = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const TEXT = theme === "dark" ? "white" : "black";
  const COLOR = theme === "dark" ? "rgba(30, 33, 39, 0.5)" : "#eee";

  return (
    <View className="overflow-hidden self-center" style={{ width: width }}>
      {label && (
        <Text className="text-muted font-poppins text-sm">{label}</Text>
      )}
      <View className="rounded-lg bg-input overflow-hidden">
        <Picker
          style={{
            backgroundColor: COLOR,
            borderRadius: 10,
            width: "100%",
            color: TEXT,
            fontSize: 12,
          }}
          mode="dropdown"
          placeholder={placeholder}
          enabled={enabled}
          selectedValue={value || selectedValue}
          onValueChange={(itemValue: any) => onValueChange(itemValue)}
        >
          <Picker.Item
            key="default"
            color={TEXT}
            style={{ backgroundColor: COLOR }}
            label={placeholder || "Select"}
            value=""
          />
          {items?.map((item) => {
            const itemKey = isBank
              ? `${item.code}`
              : isState
                ? `${item.name}`
                : `${item.id}`;
            const itemValue = isBank
              ? itemKey
              : isState
                ? `${item.name}`
                : item.id;

            return (
              <Picker.Item
                key={itemKey}
                color={TEXT}
                style={{ backgroundColor: CARD_BG }}
                label={item?.name}
                value={itemValue}
              />
            );
          })}
        </Picker>
      </View>
    </View>
  );
};

export default AppPicker;

const styles = StyleSheet.create({});

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Control, useWatch } from "react-hook-form";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
} from "reanimated-color-picker";
import { AppButton } from "./ui/app-button";

interface ColorPickerInputProps {
  control: Control<any>;
  name: string;
  maxColors?: number;
  disabled?: boolean;
  setValue: (name: any, value: any) => void;
}

export default function ColorPickerInput({
  control,
  name,
  setValue,
  maxColors = 8,
  disabled = false,
}: ColorPickerInputProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("#fff");

  const colors =
    (useWatch({
      control,
      name,
    }) as string[]) || [];

  // const { fields, append, remove } = useFieldArray({
  //     control,
  //     name,
  // });

  const removeColor = (index: number) => {
    const newColors = colors.filter((_: any, i: number) => i !== index);
    setValue(name, newColors);
  };

  const addColor = (color: string) => {
    const newColors = [...colors, color];
    setValue(name, newColors);
  };

  return (
    <View style={styles.container}>
      <Text className="text-primary font-poppins-bold text-sm ml-[5%] mb-3">
        Product Colors
      </Text>

      {/* Display selected colors */}
      <ScrollView
        className="flex-row ml-[5%] flex-wrap"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {colors.map((color: string, index: number) => (
          <TouchableOpacity
            className={`h-10 w-10 rounded-lg items-center justify-center`}
            key={`color-${color}-${index}`}
            // style={[styles.colorItem, { backgroundColor: field as unknown as string }]}
            // onPress={() => removeColor(index)}
            onPress={() => removeColor(index)}
            disabled={disabled}
            style={{
              backgroundColor: color,
            }}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        ))}

        {/* Add color button */}
        {colors.length < maxColors && (
          <TouchableOpacity
            className="h-10 w-10 rounded-lg items-center justify-center bg-input"
            onPress={() => setShowModal(true)}
            disabled={disabled}
          >
            <Ionicons name="add" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </ScrollView>

      <Text className="font-poppins-light text-gray-500 text-xs ml-[5%]">
        {colors.length}/{maxColors} colors selected
      </Text>

      {/* Color Picker Modal */}
      <Modal visible={showModal} animationType="slide">
        <View className="bg-background flex-1 justify-center items-center">
          <ColorPicker
            style={{ width: "70%", height: 300 }}
            value={selectedColor}
            onCompleteJS={(result: any) => {
              setSelectedColor(result.hex);
            }}
          >
            <Preview />
            <Panel1 />
            <HueSlider />
          </ColorPicker>

          <View style={styles.modalButtons}>
            <AppButton
              width={"30%"}
              text="Ok"
              onPress={() => {
                if (selectedColor && colors.length < maxColors) {
                  // append({name: selectedColor});
                  addColor(selectedColor);
                  // setSelectedColor("");
                  setShowModal(false);
                }
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  colorsContainer: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 10,
  },
  colorItem: {
    width: 25,
    height: 25,
    borderRadius: 17.5,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  addColorButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
  addColorText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#666",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 20,
  },
});

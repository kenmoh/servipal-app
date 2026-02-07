import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ChipInputProps {
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  maxChips?: number;
}

const ChipInput: React.FC<ChipInputProps> = ({
  value = [],
  onChange,
  placeholder = "Type and press Enter",
  label,
  error,
  disabled = false,
  maxChips,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleAddChip = () => {
    const trimmedValue = inputValue.trim();

    if (!trimmedValue) return;

    // Check if value already exists
    if (value.includes(trimmedValue)) {
      setInputValue("");
      return;
    }

    // Check max chips limit
    if (maxChips && value.length >= maxChips) {
      setInputValue("");
      return;
    }

    onChange([...value, trimmedValue]);
    setInputValue("");
  };

  const handleRemoveChip = (index: number) => {
    const newValues = value.filter((_, i) => i !== index);
    onChange(newValues);
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === "Enter") {
      e.preventDefault();
      handleAddChip();
    }
  };

  return (
    <View className="rounder-lg mt-2">
      {label && (
        <Text className="text-sm font-poppins-medium text-muted">{label}</Text>
      )}

      <View
        className="bg-input rounded-lg p-3"
        style={[error && styles.inputContainerError]}
      >
        {/* Chips Display */}
        {value.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScrollView}
            contentContainerStyle={styles.chipsContainer}
          >
            {value.map((chip, index) => (
              <View
                key={index}
                className="rounded-full bg-profile-card px-4 py-2 gap-2 justify-between flex-row"
              >
                <Text className="text-primary uppercase">{chip}</Text>
                {!disabled && (
                  <TouchableOpacity
                    onPress={() => handleRemoveChip(index)}
                    // style={styles.chipRemoveButton}
                    className=""
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Text Input */}
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          onKeyPress={handleKeyPress}
          onSubmitEditing={handleAddChip}
          placeholder={placeholder}
          placeholderTextColor="#666"
          editable={!disabled}
          returnKeyType="done"
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {maxChips && (
        <Text style={styles.helperText}>
          {value.length}/{maxChips} items
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "red",
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputContainerError: {
    borderColor: "#ef4444",
  },
  chipsScrollView: {
    maxHeight: 80,
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0e7ff",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 14,
    color: "#4338ca",
    marginRight: 4,
  },
  chipRemoveButton: {
    marginLeft: 4,
  },
  input: {
    fontSize: 14,
    minHeight: 40,
    paddingVertical: 8,
    color: "#ddd",
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
});

export default ChipInput;

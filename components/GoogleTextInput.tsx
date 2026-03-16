import GooglePlacesTextInput from "react-native-google-places-textinput";

import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";

interface GoogleTextInputProps {
  placeholder: string;
  onPlaceSelect: (lat: number, lng: number, address: string) => void;
  value: string | null;
  onChangeText?: (text: string) => void;
  error?: string;
  label?: string;
  scrollEnabled?: boolean;
}

type Styles = {
  container?: ViewStyle;
  input?: TextStyle;
  suggestionsContainer?: ViewStyle;
  suggestionsList?: ViewStyle;
  suggestionItem?: ViewStyle;
  suggestionText?: {
    main?: TextStyle;
    secondary?: TextStyle;
  };
  loadingIndicator?: {
    color?: string;
  };
  placeholder?: {
    color?: string;
  };
  clearButtonText?: ViewStyle;
};

const GoogleTextInput = ({
  placeholder,
  onPlaceSelect,
  label,
  value,
  error,
  onChangeText,
  scrollEnabled = true,
}: GoogleTextInputProps) => {
  const theme = useColorScheme();
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const ref = useRef<any>(null);

  const TEXT = theme === "dark" ? "white" : "gray";
  const BG_COLOR = theme === "dark" ? "rgba(30, 33, 39, 0.5)" : "#eee";

  useEffect(() => {
    if (value !== null && value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  const styles = StyleSheet.create({
    container: {},
    suggestionsContainer: {
      backgroundColor: BG_COLOR,
      maxHeight: 350,
      padding: 10,
    },
    suggestionItem: {
      padding: 5,
    },
    suggestionText: {
      main: {
        fontSize: 14,
        color: theme === "dark" ? "white" : "black",
        fontFamily: "Poppins-Regular",
      },
      secondary: {
        fontSize: 12,
        color: "#888888",
        fontFamily: "Poppins-Light",
      },
    } as any,

    input: {
      height: 56,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      color: TEXT,
      fontFamily: "Poppins-Regular",
      borderColor: isFocused ? "orange" : BG_COLOR,
      paddingHorizontal: 12,
      fontSize: 14,
      backgroundColor: BG_COLOR,
    },
    loadingIndicator: {
      color: "#aaa",
    },
    placeholder: {
      color: "#888888",
    },
    clearButtonText: {
      color: "#aaa",
      fontSize: 20,
    },
  });

  return (
    <View className="gap-2 w-full">
      {label && (
        <Text className="text-muted ml-5 mb-1 self-start font-poppins text-sm">
          {label}
        </Text>
      )}
      <GooglePlacesTextInput
        scrollEnabled={scrollEnabled}
        apiKey={`${process.env.EXPO_PUBLIC_GOOGLE_MAP_API_KEY}`}
        ref={ref}
        languageCode="en"
        placeHolderText={placeholder}
        includedRegionCodes={["ng"]}
        minCharsToFetch={3}
        onTextChange={(text) => {
          setInputValue(text);
          onChangeText?.(text);
        }}
        value={inputValue}
        style={styles as Styles}
        fetchDetails={true}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPlaceSelect={(data: any) => {
          if (data?.details) {
            // Support both New and Legacy Places API structures
            const text =
              data.details.displayName?.text ||
              data.details.name ||
              data.description ||
              "";
            const rawAddress = data.details.formattedAddress || "";
            const secondaryText = rawAddress.replace(/,? ?Nigeria$/i, "");

            // Avoid duplicating the main name if it's already in the formatted address
            let address =
              secondaryText.includes(text) || !text
                ? secondaryText
                : text + ", " + secondaryText;

            // Remove Plus Codes (e.g., FH97+8XG) and Postal Codes (e.g., 106104) and clean up
            address = address
              .replace(/\b[A-Z0-9]{4,8}\+[A-Z0-9]{2,}\b/gi, "") // Remove plus code
              .replace(/\b\d{6}\b/g, "") // Remove 6-digit postal code
              .replace(/^[ ,]+|[ ,]+$/g, "") // Trim leading/trailing commas/spaces
              .replace(/ ,[ ,]+/g, ", ") // Fix double commas
              .trim();

            setInputValue(address);

            // Directly update the input text if the ref supports it
            if (
              ref.current &&
              typeof ref.current.setAddressText === "function"
            ) {
              ref.current.setAddressText(address);
            }

            if (data.details.location) {
              const { latitude: lat, longitude: lng } = data.details.location;
              onPlaceSelect(lat, lng, address);
            }
          } else {
            console.warn(
              "GoogleTextInput: Selection made but no details found",
              data,
            );
          }
        }}
      />
      {error && <Text className="text-red-500">{error}</Text>}
    </View>
  );
};

export default GoogleTextInput;

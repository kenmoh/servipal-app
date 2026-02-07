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
    setInputValue(value || "");
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
        onPlaceSelect={(data) => {
          if (data?.details) {
            const text = data.details.displayName.text;
            const secondaryText = data.details.formattedAddress.replace(
              /,? ?Nigeria$/i,
              "",
            );
            const address = text + " " + secondaryText;

            setInputValue(address);
            if (data.details.location) {
              const { latitude: lat, longitude: lng } = data.details.location;
              onPlaceSelect(lat, lng, address);
            }
          }
        }}
      />
      {error && <Text className="text-red-500">{error}</Text>}
    </View>
  );
};

export default GoogleTextInput;

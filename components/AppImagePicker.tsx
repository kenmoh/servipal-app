import Feather from "@expo/vector-icons/Feather";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

export interface ImageType {
  url: string;
  type: string;
  name: string;
}

interface ImagePickerInputProps {
  value?: ImageType | null | string;
  onChange: (image: ImageType | null | string) => void;
  errorMessage?: string;
  imageHeight?: number;
  iconSize?: number;
}

const ImagePickerInput = ({
  value,
  onChange,
  errorMessage,
  imageHeight = 200,
  iconSize = 50,
}: ImagePickerInputProps) => {
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const imageData: ImageType = {
        url: result.assets[0].uri,
        type: "image/jpeg",
        name: result.assets[0].uri.split("/").pop() || "image.jpg",
      };
      onChange(imageData?.url.toString());
    }
  };

  return (
    <TouchableOpacity onPress={pickImage}>
      <View className="w-[90%] self-center items-center">
        {/* Preview Image or Placeholder */}
        {value ? (
          <Image
            source={{ uri: value.toString() }}
            style={{
              width: "100%",
              height: imageHeight,
              borderRadius: 10,
              marginBottom: 10,
            }}
          />
        ) : (
          <View
            style={{ height: imageHeight }}
            className={`w-full bg-input  items-center justify-center mb-[10px] rounded-lg overflow-hidden`}
          >
            <Feather name="camera" color="gray" size={iconSize} />
          </View>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Text className="self-start text-status-error mt-2 font-poppins text-xs">
            {errorMessage}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ImagePickerInput;

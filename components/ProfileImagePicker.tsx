import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";

interface CustomImagePickerProps {
  onImageSelect: (imageData: any) => void;
  initialImage?: string | null;
  width?: number;
  height?: number;
  borderRadius?: number;
  isBackdropImage?: boolean;
}

const ProfileImagePicker = ({
  borderRadius,
  onImageSelect,
  initialImage = null,
  width = 100,
  height = 100,
  isBackdropImage = false,
}: CustomImagePickerProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(
    initialImage,
  );
  // You can use your custom theme colors here if needed

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) handleImageSelection(result.assets[0]);
  };

  const handleImageSelection = (asset: ImagePicker.ImagePickerAsset) => {
    setSelectedImage(asset.uri);

    // Return data for React Query
    const imageData = {
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: asset.fileName || `image_${Date.now()}.jpg`,
    };

    onImageSelect(imageData);
  };

  return (
    <TouchableOpacity
      onPress={openGallery}
      activeOpacity={0.8}
      style={{
        borderRadius: borderRadius,
        width,
        height,
        overflow: "hidden",
      }}
    >
      {selectedImage ? (
        <Image
          source={{ uri: selectedImage }}
          style={{ width, height, borderRadius, objectFit: "cover" }}
        />
      ) : (
        <View
          className="bg-profile-card border-2 border-dashed border-border-subtle justify-center items-center"
          style={{ width, height, borderRadius }}
        >
          <Feather
            name="camera"
            size={isBackdropImage ? width * 0.1 : 30}
            color="#9BA1A6"
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ProfileImagePicker;

import { useLocationStore } from "@/store/locationStore";
import Feather from "@expo/vector-icons/Feather";
import React, { useState } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
} from "react-native";

interface CurrentLocationButtonProps {
  onLocationSet?: (address: string, coords: [number, number]) => void;
  width?: number;
  height?: number;
  borderRadius?: number;
}

const CurrentLocationButton = ({
  onLocationSet,
  width = 50,
  height = 50,
  borderRadius = 10,
}: CurrentLocationButtonProps) => {
  const theme = useColorScheme();
  const getCurrentLocation = useLocationStore(
    (state) => state.getCurrentLocation,
  );
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    const location = await getCurrentLocation();

    setLoading(false);
    if (location && onLocationSet) {
      onLocationSet(location.address, location.coords);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading}
      className="bg-input"
      style={{
        width,
        height,
        borderRadius,
        alignItems: "center",
        justifyContent: "center",
        padding: 5,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={"orange"} />
      ) : (
        <Feather name="map-pin" size={16} color={"orange"} />
      )}
    </TouchableOpacity>
  );
};

export default CurrentLocationButton;

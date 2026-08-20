import React from "react";
import { DimensionValue, StyleSheet, useColorScheme, View } from "react-native";

const HDivider = React.memo(
  ({ width = "100%" }: { width?: DimensionValue }) => {
    const theme = useColorScheme();
    const color = theme === "dark" ? "#333" : "#ddd";
    return (
      <View
        className="self-center"
        style={{
          height: StyleSheet.hairlineWidth,
          width,
          backgroundColor: color,
        }}
      />
    );
  },
);

export default HDivider;

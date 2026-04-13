import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useCallback } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: string;
  title?: string;
  contentPadding?: boolean;
}

const AppModal = ({
  visible,
  onClose,
  children,
  height = "90%",
  title,
  contentPadding = true,
}: AppModalProps) => {
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
  const snapPoints = ["65%", "80%", height];
  const theme = useColorScheme();

  React.useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        onPress={onClose}
      />
    ),
    [onClose],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      backgroundStyle={{
        backgroundColor: theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
      }}
      handleIndicatorStyle={{
        backgroundColor: theme === "dark" ? "#555" : "#ccc",
      }}
    >
      <BottomSheetView
        style={[styles.contentContainer, !contentPadding && { paddingHorizontal: 0 }]}
      >
        {title && (
          <View style={[styles.header, { marginHorizontal: contentPadding ? 0 : 20 }]}>
            <Text style={[styles.title, { color: theme === "dark" ? "#fff" : "#000" }]}>
              {title}
            </Text>
          </View>
        )}
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    marginBottom: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "poppins-semibold",
  },
});

export default AppModal;

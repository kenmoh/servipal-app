import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: string;
}

const AppModal = ({
  visible,
  onClose,
  children,
  height = "50%",
}: AppModalProps) => {
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => [height], [height]);
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
      index={0}
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
      <BottomSheetView style={styles.contentContainer}>
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
});

export default AppModal;

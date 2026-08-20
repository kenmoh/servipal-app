import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";

interface CartModalProps {
  onClose: () => void;
  children: React.ReactNode;
  height?: string;
}

const CartModal = forwardRef<BottomSheetModal, CartModalProps>(
  ({ onClose, children, height = "90%" }, ref) => {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const theme = useColorScheme();

    useImperativeHandle(ref, () => bottomSheetModalRef.current!);

    const snapPoints = useMemo(() => ["65%", "80%", height], [height]);

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
        <BottomSheetView style={styles.contentContainer}>
          {children}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
});

export default CartModal;

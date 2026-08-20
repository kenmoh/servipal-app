import React, { useEffect, useRef } from "react";
import { useUserStore } from "@/store/userStore";
import { promptBiometric } from "@/hooks/use-biometric";
import { router } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";

export default function BiometricLockOverlay() {
  const { setBiometricUnlocked, signOut } = useUserStore();
  const promptStartedRef = useRef(false);

  useEffect(() => {
    // Guard against double prompts (StrictMode double-invoke or a rapid
    // unmount/remount): only start the OS prompt once per mount.
    if (promptStartedRef.current) return;
    promptStartedRef.current = true;

    const authenticate = async () => {
      try {
        const success = await promptBiometric("Unlock ServiPal");
        if (success) {
          setBiometricUnlocked(true);
        }
      } catch (error) {
        // Fall through to UI — user can tap "Use Password"
      }
    };

    authenticate();
  }, [setBiometricUnlocked]);

  const handleUsePassword = async () => {
    try {
      await signOut();
    } catch {
      router.replace("/sign-in");
    }
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <View style={{ alignItems: "center", gap: 24 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(255, 140, 0, 0.1)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="finger-print" size={40} color="#FF8C00" />
        </View>
        <View style={{ alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: "600", color: "#fff" }}>
            ServiPal
          </Text>
          <Text style={{ fontSize: 14, color: "#999", textAlign: "center" }}>
            Use fingerprint to unlock
          </Text>
        </View>
        <ActivityIndicator color="#FF8C00" size="small" />
        <Text
          onPress={handleUsePassword}
          style={{
            fontSize: 14,
            color: "#FF8C00",
            marginTop: 16,
          }}
        >
          Use Password
        </Text>
      </View>
    </View>
  );
}

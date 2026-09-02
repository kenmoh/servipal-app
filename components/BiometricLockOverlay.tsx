import React, { useCallback, useEffect, useRef, useState } from "react";
import { useUserStore } from "@/store/userStore";
import { promptBiometric } from "@/hooks/use-biometric";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import * as Sentry from "@sentry/react-native";

const MAX_AUTO_RETRIES = 1;

export default function BiometricLockOverlay() {
  const {
    setBiometricUnlocked,
    setBiometricPromptActive,
    signOut,
  } = useUserStore();
  const [status, setStatus] = useState<"prompting" | "failed" | "error">(
    "prompting",
  );
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  const authenticate = useCallback(async () => {
    try {
      setStatus("prompting");
      const success = await promptBiometric("Unlock ServiPal");

      if (!mountedRef.current) return;

      if (success) {
        setBiometricUnlocked(true);
        return;
      }

      // Prompt returned false — either user cancelled or device failed
      if (retryCountRef.current < MAX_AUTO_RETRIES) {
        // Auto-retry once (handles transient device failures)
        retryCountRef.current += 1;
        setTimeout(() => {
          if (mountedRef.current) authenticate();
        }, 500);
      } else {
        setStatus("failed");
      }
    } catch (error) {
      if (!mountedRef.current) return;

      Sentry.captureException(error, { tags: { action: "biometric_prompt" } });

      if (retryCountRef.current < MAX_AUTO_RETRIES) {
        retryCountRef.current += 1;
        setTimeout(() => {
          if (mountedRef.current) authenticate();
        }, 500);
      } else {
        setStatus("error");
      }
    }
  }, [setBiometricUnlocked]);

  useEffect(() => {
    mountedRef.current = true;
    setBiometricPromptActive(true);
    authenticate();

    return () => {
      mountedRef.current = false;
      setBiometricPromptActive(false);
    };
  }, [authenticate, setBiometricPromptActive]);

  const handleRetry = () => {
    retryCountRef.current = 0;
    authenticate();
  };

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
            {status === "error"
              ? "Fingerprint unavailable. Use the options below."
              : "Use fingerprint to unlock"}
          </Text>
        </View>

        {status === "prompting" && (
          <ActivityIndicator color="#FF8C00" size="small" />
        )}

        {(status === "failed" || status === "error") && (
          <View style={{ alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={handleRetry}
              style={{
                backgroundColor: "rgba(255, 140, 0, 0.15)",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#FF8C00",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#FF8C00",
                }}
              >
                Try Again
              </Text>
            </Pressable>
            <Pressable onPress={handleUsePassword} style={{ padding: 8 }}>
              <Text
                style={{ fontSize: 14, color: "#999", marginTop: 4 }}
              >
                Use Password
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

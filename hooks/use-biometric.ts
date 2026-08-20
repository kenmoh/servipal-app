import * as LocalAuthentication from "expo-local-authentication";
import authStorage from "@/storage/auth-storage";

export async function hasBiometricHardware(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function getSupportedAuthType(): Promise<"face" | "fingerprint" | null> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "face";
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return "fingerprint";
  return null;
}

export async function promptBiometric(
  message = "Unlock ServiPal"
): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: message,
    cancelLabel: "Use password",
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function isBiometricEnabled(): Promise<boolean> {
  return authStorage.getBiometricEnabled();
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await authStorage.setBiometricEnabled(enabled);
}

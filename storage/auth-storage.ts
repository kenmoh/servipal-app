import { AuthUser } from "@/types/user-types";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ColorSchemeName } from "react-native";

const THEME_KEY = "theme";
const USER_KEY = "user";
const RESET_TOKEN_KEY = "reset_token";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";

// Supabase Storage Interface - Required methods
const getItem = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error getting item ${key}:`, error);
    return null;
  }
};

const setItem = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error setting item ${key}:`, error);
  }
};

const removeItem = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error removing item ${key}:`, error);
  }
};

// Theme storage (optional - keep if you use it)
const storeTheme = async (theme: ColorSchemeName) => {
  try {
    await SecureStore.setItemAsync(THEME_KEY, theme);
  } catch (error) {
    console.error("Error storing theme:", error);
  }
};

const getTheme = async (): Promise<ColorSchemeName> => {
  try {
    const theme = await SecureStore.getItemAsync(THEME_KEY);
    return theme as ColorSchemeName;
  } catch (error) {
    console.error("Error getting theme:", error);
    return "light";
  }
};

// User storage
const storeUser = async (user: AuthUser) => {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Error storing user:", error);
  }
};

const getUser = async (): Promise<AuthUser | null> => {
  try {
    const value = await SecureStore.getItemAsync(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

const removeUser = async () => {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.error("Error removing user:", error);
  }
};

// Password reset token storage (survives dev-server reloads)
const storeResetToken = async (token: string) => {
  try {
    await SecureStore.setItemAsync(RESET_TOKEN_KEY, token);
  } catch (error) {
    console.error("Error storing reset token:", error);
  }
};

const getResetToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(RESET_TOKEN_KEY);
  } catch (error) {
    console.error("Error getting reset token:", error);
    return null;
  }
};

const removeResetToken = async () => {
  try {
    await SecureStore.deleteItemAsync(RESET_TOKEN_KEY);
  } catch (error) {
    console.error("Error removing reset token:", error);
  }
};

// Biometric enabled storage
// The flag is a non-sensitive preference. SecureStore (Keystore-backed) can
// become unreadable on some Android devices (reboot while locked, lock-screen
// change, OEM cleanup) which would silently reset the toggle. We dual-write to
// AsyncStorage and fall back to it when SecureStore is unavailable.
const getBiometricEnabled = async (): Promise<boolean> => {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    if (value !== null) {
      return value === "true";
    }
  } catch (error) {
    console.error("Error getting biometric enabled:", error);
  }

  try {
    const fallback = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return fallback === "true";
  } catch (error) {
    console.error("Error getting biometric enabled (fallback):", error);
    return false;
  }
};

const setBiometricEnabled = async (enabled: boolean): Promise<void> => {
  const value = String(enabled);

  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, value);
  } catch (error) {
    console.error("Error setting biometric enabled:", error);
  }

  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, value);
  } catch (error) {
    console.error("Error setting biometric enabled (fallback):", error);
  }
};

export default {
  // Supabase required methods
  getItem,
  setItem,
  removeItem,
  // User methods
  storeUser,
  getUser,
  removeUser,
  // Reset token methods
  storeResetToken,
  getResetToken,
  removeResetToken,
  // Theme methods (optional)
  storeTheme,
  getTheme,
  // Biometric methods
  getBiometricEnabled,
  setBiometricEnabled,
};

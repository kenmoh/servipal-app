import { AuthUser } from "@/types/user-types";
import * as SecureStore from "expo-secure-store";

const THEME_KEY = "theme";
const USER_KEY = "user";

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
const storeTheme = async (theme: "light" | "dark" | "system") => {
  try {
    await SecureStore.setItemAsync(THEME_KEY, theme);
  } catch (error) {
    console.error("Error storing theme:", error);
  }
};

const getTheme = async (): Promise<"light" | "dark" | "system" | null> => {
  try {
    const theme = await SecureStore.getItemAsync(THEME_KEY);
    return theme as "light" | "dark" | "system" | null;
  } catch (error) {
    console.error("Error getting theme:", error);
    return null;
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

export default {
  // Supabase required methods
  getItem,
  setItem,
  removeItem,
  // User methods
  storeUser,
  getUser,
  removeUser,
  // Theme methods (optional)
  storeTheme,
  getTheme,
};
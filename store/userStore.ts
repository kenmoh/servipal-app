// @/stores/user-store.ts
import authStorage from "@/storage/auth-storage";
import { AuthUser, UserProfile, toAuthUser } from "@/types/user-types";
import { supabase } from "@/utils/supabase";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const FIRST_LAUNCH_KEY = "hasLaunched";

interface UserStore {
  // Auth State
  user: AuthUser | null;
  
  // Profile State
  profile: UserProfile | null;
  profileImageUrl: string | null;
  backdropImageUrl: string | null;
  
  // App State
  storeId: string | null;
  riderId: string | null;
  isReassign: boolean;
  storeAddress: string | null;
  isFirstLaunch: boolean;
  
  // Loading States
  hasHydrated: boolean;
  isLoading: boolean;
  isProfileLoading: boolean;
  
  // Error State
  profileError: string | null;

  // Auth Setters
  setUser: (user: AuthUser | null) => void;
  
  // Profile Setters
  setProfile: (profile: UserProfile | null) => void;
  setProfileImageUrl: (url: string | null) => void;
  setBackdropImageUrl: (url: string | null) => void;
  
  // App Setters
  setStoreId: (storeId: string | null) => void;
  setRiderId: (riderId: string | null) => void;
  setIsReassign: (isReassign: boolean) => void;
  setStoreAddress: (storeAddress: string | null) => void;

  // Actions
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
  checkFirstLaunch: () => Promise<boolean>;
  setFirstLaunchComplete: () => Promise<void>;
  refreshSession: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  initialize: () => () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  // Initial State
  user: null,
  profile: null,
  profileImageUrl: null,
  backdropImageUrl: null,
  storeId: null,
  riderId: null,
  isReassign: false,
  storeAddress: null,
  isFirstLaunch: true,
  hasHydrated: false,
  isLoading: false,
  isProfileLoading: false,
  profileError: null,

  // Auth Setters
  setUser: (user) => set({ user }),
  
  // Profile Setters
  setProfile: (profile) =>
    set({
      profile,
      profileImageUrl: profile?.profile_image_url ?? null,
      backdropImageUrl: profile?.backdrop_image_url ?? null,
    }),
  
  setProfileImageUrl: (url) => set({ profileImageUrl: url }),
  setBackdropImageUrl: (url) => set({ backdropImageUrl: url }),
  
  // App Setters
  setStoreId: (storeId) => set({ storeId }),
  setRiderId: (riderId) => set({ riderId }),
  setIsReassign: (isReassign) => set({ isReassign }),
  setStoreAddress: (storeAddress) => set({ storeAddress }),

  // First Launch Management
  checkFirstLaunch: async () => {
    try {
      const hasLaunched = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
      const isFirst = hasLaunched === null;
      set({ isFirstLaunch: isFirst });
      return isFirst;
    } catch (error) {
      console.error("❌ Error checking first launch:", error);
      set({ isFirstLaunch: true });
      return true;
    }
  },

  setFirstLaunchComplete: async () => {
    try {
      await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, "true");
      set({ isFirstLaunch: false });
    } catch (error) {
      console.error("❌ Error setting first launch complete:", error);
    }
  },

  // Fetch User Profile
  fetchProfile: async () => {
    const { user } = get();
    
    if (!user) {
      console.warn("⚠️ Cannot fetch profile: No authenticated user");
      return;
    }

    try {
      set({ isProfileLoading: true, profileError: null });
      console.log("🔄 Fetching user profile...");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        throw new Error(error.message || "Failed to fetch profile");
      }

      if (!data) {
        throw new Error("Profile not found");
      }

      const profile = data as UserProfile;   
      
      set({
        profile,
        profileImageUrl: profile.profile_image_url ?? null,
        backdropImageUrl: profile.backdrop_image_url ?? null,
        isProfileLoading: false,
        profileError: null,
      });

      console.log("✅ Profile fetched successfully");
    } catch (error: any) {
      console.error("❌ Error fetching profile:", error);
      set({
        profileError: error?.message || "Failed to load profile",
        isProfileLoading: false,
      });
    }
  },

  // Session Hydration
  hydrate: async () => {
    set({ isLoading: true });

    try {
      console.log("🔄 Hydrating user session...");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("❌ Session error:", sessionError);
        set({ user: null });
        return;
      }

      if (session?.user) {
        console.log("✅ Active session found:", session.user.id);

        const storedUser = await authStorage.getUser();

        if (storedUser && storedUser.id === session.user.id) {
          console.log("✅ Using stored user data");
          set({ user: storedUser });
        } else {
          console.log("🔄 Converting session user to AuthUser");
          const authUser = toAuthUser(session.user);
          await authStorage.storeUser(authUser);
          set({ user: authUser });
        }

        // Fetch user profile after setting user
        await get().fetchProfile();
      } else {
        console.log("ℹ️ No active session found");
        set({ user: null, profile: null });
      }

      const hasLaunched = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
      set({ isFirstLaunch: hasLaunched === null });

      console.log("✅ Hydration complete");
    } catch (error) {
      console.error("❌ Error during hydration:", error);
      set({ user: null, profile: null });
    } finally {
      set({ hasHydrated: true, isLoading: false });
    }
  },

  // Refresh Session
  refreshSession: async () => {
    try {
      console.log("🔄 Refreshing session...");

      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error("❌ Error refreshing session:", error);
        set({ user: null, profile: null });
        return;
      }

      if (session?.user) {
        const authUser = toAuthUser(session.user);
        await authStorage.storeUser(authUser);
        set({ user: authUser });
        
        // Refresh profile as well
        await get().fetchProfile();
        
        console.log("✅ Session refreshed successfully");
      }
    } catch (error) {
      console.error("❌ Error refreshing session:", error);
    }
  },

  // Sign Out
  signOut: async () => {
    try {
      console.log("🔄 Signing out...");
      set({ isLoading: true });

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("❌ Error during sign out:", error);
        throw error;
      }

      await authStorage.removeUser();

      set({
        user: null,
        profile: null,
        profileImageUrl: null,
        backdropImageUrl: null,
        storeId: null,
        riderId: null,
        isReassign: false,
        storeAddress: null,
        profileError: null,
      });

      console.log("✅ Sign out successful");
    } catch (error) {
      console.error("❌ Error signing out:", error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Initialize Auth State Listener
  initialize: () => {
    console.log("🔄 Initializing auth state listener...");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log("🔔 Auth state changed:", event);

      switch (event) {
        case "SIGNED_IN":
          if (session?.user) {
            const authUser = toAuthUser(session.user);
            await authStorage.storeUser(authUser);
            set({ user: authUser });
            // Fetch profile on sign in
            await get().fetchProfile();
            console.log("✅ User signed in");
          }
          break;

        case "SIGNED_OUT":
          await authStorage.removeUser();
          set({
            user: null,
            profile: null,
            profileImageUrl: null,
            backdropImageUrl: null,
            storeId: null,
            riderId: null,
            isReassign: false,
            storeAddress: null,
            profileError: null,
          });
          console.log("✅ User signed out");
          break;

        case "TOKEN_REFRESHED":
          if (session?.user) {
            const authUser = toAuthUser(session.user);
            await authStorage.storeUser(authUser);
            set({ user: authUser });
            console.log("✅ Token refreshed");
          }
          break;

        case "USER_UPDATED":
          if (session?.user) {
            const authUser = toAuthUser(session.user);
            await authStorage.storeUser(authUser);
            set({ user: authUser });
            // Refetch profile on user update
            await get().fetchProfile();
            console.log("✅ User updated");
          }
          break;

        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
      console.log("🧹 Auth state listener cleaned up");
    };
  },
}));
import { useToast } from "@/components/ToastProvider";
import authStorage from "@/storage/auth-storage";
import { useUserStore } from "@/store/userStore";
import { SignInFormValues } from "@/types/auth-types";
import { toAuthUser } from "@/types/user-types";
import { supabase } from "@/utils/supabase";
import { AuthError } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";

export const useSignIn = () => {
  const { showSuccess, showError } = useToast();
  const { setUser } = useUserStore();

  const signInMutation = useMutation({
    mutationFn: async ({ identifier, password }: SignInFormValues) => {
      const trimmed = identifier.trim();
      const isEmail = trimmed.includes("@");

      // Fix: Create proper credentials based on whether it's email or phone
      if (isEmail) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed.toLowerCase(),
          password,
        });

        if (error) throw error;
        if (!data.user || !data.session) {
          throw new Error("No user or session returned from login");
        }

        return data;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          phone: trimmed,
          password,
        });

        if (error) throw error;
        if (!data.user || !data.session) {
          throw new Error("No user or session returned from login");
        }

        return data;
      }
    },

    onError: (error: AuthError | Error) => {
      console.error("❌ Login error:", error);

      let errorMessage = "Login failed. Please try again.";

      if (error instanceof AuthError) {
        switch (error.message) {
          case "Invalid login credentials":
            errorMessage = "Invalid email/phone or password.";
            break;
          case "Email not confirmed":
            errorMessage = "Please verify your email before logging in.";
            break;
          case "User not found":
            errorMessage = "No account found with these credentials.";
            break;
          default:
            errorMessage = error.message;
        }
      }

      showError("Login Failed", errorMessage);
    },

    onSuccess: async (data) => {
      console.log("✅ Login success:", {
        userId: data.user.id,
        email: data.user.email,
      });

      try {
        const authUser = toAuthUser(data.user);
        await authStorage.storeUser(authUser);
        setUser(authUser);
        showSuccess("Welcome back!", "You've successfully logged in.");
      } catch (error) {
        console.error("❌ Error storing auth data:", error);
        showError("Error", "Failed to save login data. Please try again.");
        await supabase.auth.signOut();
      }
    },
  });

  return signInMutation;
};
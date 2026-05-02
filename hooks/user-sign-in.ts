import { useToast } from "@/components/ToastProvider";
import authStorage from "@/storage/auth-storage";
import { useUserStore } from "@/store/userStore";
import { SignInFormValues } from "@/types/auth-types";
import { toAuthUser } from "@/types/user-types";
import { supabase } from "@/utils/supabase";
import * as Sentry from "@sentry/react-native";
import { AuthError } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";

export const useSignIn = () => {
  const { showError } = useToast();
  const { setUser } = useUserStore();
  const posthog = usePostHog();

  const signInMutation = useMutation({
    mutationFn: async ({ identifier, password }: SignInFormValues) => {
      const trimmed = identifier.trim();
      const isEmail = trimmed.includes("@");

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
      Sentry.captureException(error, { tags: { action: "sign_in" } });
      posthog.capture("sign_in_failed", {
        error_message: error.message,
      });

      let errorMessage = "Login failed. Please try again.";

      if (error instanceof AuthError) {
        switch (error.message) {
          case "Invalid login credentials":
            errorMessage = "Invalid email or password.";
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
      Sentry.setUser({ id: data.user.id, email: data.user.email ?? undefined });
      Sentry.addBreadcrumb({
        category: "auth",
        message: "User signed in successfully",
        level: "info",
      });

      posthog.identify(data.user.id, {
        email: data.user.email,
        user_type: data.user.user_metadata?.user_type,
        $set_once: { first_sign_in_date: new Date().toISOString() },
      });
      posthog.capture("sign_in", {
        user_type: data.user.user_metadata?.user_type,
      });

      try {
        const authUser = toAuthUser(data.user);
        await authStorage.storeUser(authUser);
        setUser(authUser);
        // Explicitly replace the entire nav stack so there's no way to
        // navigate back to sign-in, user-selection, or any other auth screen.
        router.replace("/(tabs)/delivery/(top-tabs)");
      } catch (error) {
        showError("Error", "Failed to save login data. Please try again.");
        await supabase.auth.signOut();
      }
    },
  });

  return signInMutation;
};

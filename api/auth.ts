import { apiClient } from "@/utils/client";
import { supabase } from "@/utils/supabase";

export interface RecoverPassword {
  email: string;
}
export interface ResetPassword {
  token: string;
  newPassword: string;
}
export interface ChangePassword {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface Contact {
  emailCode: string;
  phoneCode: string;
}

export interface Register {
  email: string;
  phoneNumber: string;
  userType: string;
  password: string;
}
export interface RegisterRider {
  email: string;
  phoneNumber: string;
  bikeNumber: string;
  fullName: string;
  password: string;
}
export interface RegisterResponse {
  email: string;
  phoneNumber: string;
  userType?: string;
}
export interface ErrorResponse {
  detail: string;
}

interface LoginErrorResponse {
  detail: string;
}

const AUTH_URL = "/auth";

export const requestPasswordReset = async (email: string) => {
  const response = await apiClient.post(`${AUTH_URL}/forgot-password`, {
    email,
  });
  return response.data;
};

export const resetPassword = async (
  accessToken: string,
  newPassword: string,
) => {
  const response = await apiClient.post(`${AUTH_URL}/reset-password`, {
    access_token: accessToken,
    new_password: newPassword,
  });
  return response.data;
};

export const changeCurrentUserPassword = async (data: ChangePassword) => {
  const { data: session, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }
  if (!session.session?.access_token || !session.session?.user?.id) {
    throw new Error("No session found");
  }
  const response = await apiClient.post(
    `${AUTH_URL}/change-password`,
    {
      current_password: data.currentPassword,
      new_password: data.newPassword,
      confirm_password: data.confirmPassword,
    },
    {
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
      },
    },
  );
  return response.data;
};

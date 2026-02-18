import { apiClient } from "@/utils/client";

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

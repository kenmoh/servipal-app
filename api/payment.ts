import { apiClient } from "@/utils/client";
import { ApiResponse } from "apisauce";

export type PaymentVerifyStatus = "success" | "pending" | "failed";

export interface VerifyPaymentResponse {
  status: PaymentVerifyStatus;
  tx_ref: string;
  flw_ref?: string;
  amount?: number;
  gateway_status?: string;
  source?: string;
}

interface ErrorResponse {
  detail?: string;
}

/**
 * Verify a customer payment with the backend (which checks Flutterwave).
 * Used to confirm SDK redirect statuses instead of trusting the client alone.
 */
export const verifyCustomerPayment = async (
  txRef: string,
): Promise<VerifyPaymentResponse> => {
  const response: ApiResponse<VerifyPaymentResponse | ErrorResponse> =
    await apiClient.get(`/payments/verify/${txRef}`);

  const data = response.data;
  if (!response.ok || !data) {
    throw new Error("Failed to verify payment");
  }
  if ("detail" in data) {
    throw new Error(String((data as ErrorResponse).detail || "Failed to verify payment"));
  }

  return data as VerifyPaymentResponse;
};

import {
  InitBankTransferResponse,
  PaymentLink,
  PayWithWalletResponse,
} from "@/types/payment";
import { Bank } from "@/types/user-types";
import { apiClient } from "@/utils/client";
import { ApiResponse } from "apisauce";
import { ErrorResponse } from "./auth";

const BASE_URL = "/payment";

interface Amount {
  amount: number;
}

export interface FundWalletReturn extends Amount {
  id: string;
  payment_link: string;
}

// Fund wallet
// This function allows a user to fund their wallet with a specified amount.
// It takes an object with an amount property and returns a promise that resolves to the funded amount
// or throws an error if the funding fails.
// The function sends a POST request to the /fund-wallet endpoint with the amount in the request body.
// If the response is not ok or contains an error, it throws an error with a message
export const fundWallet = async (
  payData: Amount
): Promise<FundWalletReturn> => {
  const data = {
    amount: payData.amount,
  };
  try {
    const response: ApiResponse<FundWalletReturn | ErrorResponse> =
      await apiClient.post(`${BASE_URL}/fund-wallet`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error funding wallet. Please try again";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Pay with wallet
// This function allows a user to pay for an order using their wallet balance.
// It takes an orderId as a parameter and returns a promise that resolves to the amount paid
// or throws an error if the payment fails.
// The function sends a POST request to the /:orderId/pay-with-wallet endpoint.
export const payWithWallet = async (
  orderId: string
): Promise<PayWithWalletResponse> => {
  try {
    const response: ApiResponse<PayWithWalletResponse | ErrorResponse> =
      await apiClient.post(
        `${BASE_URL}/${orderId}/pay-with-wallet`,

        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error paying with wallet. Please try again";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Pay with bank transfer
export const payWithBankTransfer = async (
  orderId: string
): Promise<InitBankTransferResponse> => {
  try {
    const response: ApiResponse<InitBankTransferResponse | ErrorResponse> =
      await apiClient.post(
        `${BASE_URL}/${orderId}/init-bank-transfer`,

        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error paying with bank transfer. Please try again";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// With funds
export const withDrawFunds = async (): Promise<Amount> => {
  try {
    const response: ApiResponse<Amount | ErrorResponse> = await apiClient.post(
      `${BASE_URL}/withdraw-funds`,

      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error withdrawing funds. Please try again";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Get banks
export const getBanks = async (): Promise<Bank[]> => {
  try {
    const response: ApiResponse<Bank[] | ErrorResponse> = await apiClient.get(
      `/list-of-banks`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error cretrieving banks. Please try again";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};



interface Status {
  status: string
}
// Verify bank transfer
export const verifyBankTransfer = async (txRef: string): Promise<Status> => {

  try {
    const response: ApiResponse<Status | ErrorResponse> = await apiClient.get(
      `/verify-bank-transfer`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Transfer verification failed. Please contact support if you were debited.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

export const generateTransactionPaymentLink = async (
  transactionId: string
): Promise<PaymentLink> => {
  try {
    const response: ApiResponse<PaymentLink | ErrorResponse> =
      await apiClient.put(
        `${BASE_URL}/${transactionId}/generate-new-payment-link`,

        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error generating payment link.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

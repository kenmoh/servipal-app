export interface InitPaymentData {
  logo: string;
  email: string;
  distance: number;
  phonenumber: string;
  fullName: string;
  description: string;
  title: string;
  tx_ref: string;
  amount: number;
  public_key: string;
  receiver_phone: string;
  pickup_location: string;
  destination: string;
  package_name: string;
}

export interface WithdrawalResponse {
  status: string;
  message: string;
  transaction_id: string;
  amount: string;
  bank_name: string;
  account_number: string;
  beneficiary: string;
  timestamp: string;
}

export interface PayWithWalletResponse {
  amount: string;
}

export interface InitBankTransferResponse {
  status: string;
  message: string;
  transfer_reference: string;
  account_expiration: string;
  transfer_account: string;
  transfer_bank: string;
  transfer_amount: string;
  transfer_note: string;
  mode: string;
}

export interface PaymentLink {
  payment_link: string;
}

export interface InitiatePaymentResponse {
  tx_ref: string;
  amount: number;
  public_key: string;
  currency: string;
  customer: {
    email: string;
    phone_number: string;
    full_name: string;
  };
  customization: {
    title: string;
    description: string;
    logo: string;
  };
  message: string;
  // Service specific optional fields
  receiver_phone?: string;
  pickup_location?: string;
  destination?: string;
  distance?: string;
  duration?: string;
  package_name?: string;
}

export interface FlutterwavePayload {
  tx_ref: string;
  amount: number;
  currency: string;
  public_key: string;
  customer: {
    email: string;
    phonenumber: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
}

export interface PaymentSuccessResponse {
  status: "success";
  tx_ref: string;
  flw_ref?: string;
  amount: number;
}

export interface PaymentFailureResponse {
  status: "failed" | "cancelled";
  message?: string;
}

export interface RedirectParams {
  status: "successful" | "cancelled";
  transaction_id?: string;
  tx_ref: string;
}

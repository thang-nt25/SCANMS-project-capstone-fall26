import api from "./api";

export type PayoutStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface WalletSummary {
  pendingBalance: string;
  availableBalance: string;
  minimumWithdrawalAmount: string;
  kycStatus: "UNVERIFIED" | "VERIFIED" | "REJECTED";
  canWithdraw: boolean;
  bankAccount: {
    bankName: string;
    maskedAccountNumber: string;
    accountName: string;
  } | null;
}

export interface WithdrawalRequest {
  id: string;
  amount: string;
  status: PayoutStatus;
  createdAt: string;
  processedAt: string | null;
}

export interface WithdrawalHistory {
  requests: WithdrawalRequest[];
  total: number;
  page: number;
  limit: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export const walletService = {
  async getMyWallet(): Promise<WalletSummary> {
    return (
      await api.get<WalletSummary, ApiEnvelope<WalletSummary>>("/wallets/me")
    ).data;
  },

  async getMyWithdrawals(page = 1): Promise<WithdrawalHistory> {
    return (
      await api.get<WithdrawalHistory, ApiEnvelope<WithdrawalHistory>>(
        "/wallets/withdrawals",
        {
          params: { page, limit: 10 },
        },
      )
    ).data;
  },

  async createWithdrawal(amount: string) {
    return (
      await api.post<
        never,
        ApiEnvelope<{
          message: string;
          request: WithdrawalRequest;
          availableBalance: string;
        }>
      >("/wallets/withdrawals", { amount })
    ).data;
  },
};

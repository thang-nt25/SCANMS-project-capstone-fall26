import api from './api';

export interface CustomerWithdrawal {
  id: string;
  amount: string;
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  createdAt: string;
  processedAt?: string;
  bankRefCode?: string;
  note?: string;
  hasProof: boolean;
  customer?: { fullName: string; email: string };
}
export interface WithdrawalPage { items: CustomerWithdrawal[]; total: number; page: number; limit: number; summary: Partial<Record<CustomerWithdrawal['status'], { amount: string; count: number }>> }
export interface WithdrawalInput { requestKey: string; amount: number; bankName: string; bankAccountNumber: string; bankAccountName: string }
const prefix = (admin: boolean) => admin ? '/admin/customer-withdrawals' : '/customer/withdrawals';
export const customerWithdrawals = {
  async list(admin = false, page = 1, status = '', search = '') {
    return (await api.get<never, { data: WithdrawalPage }>(prefix(admin), { params: { page, limit: 10, ...(status ? { status } : {}), ...(search ? { search } : {}) }, headers: { 'x-skip-cache': 'true' } })).data;
  },
  async create(input: WithdrawalInput) { return (await api.post<never, { data: CustomerWithdrawal }>(prefix(false), input)).data; },
  async approve(id: string, proof: File, bankRefCode: string, note: string) {
    const form = new FormData();
    form.append('proof', proof); form.append('bankRefCode', bankRefCode); form.append('note', note);
    return api.post(`${prefix(true)}/${id}/approve`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
  },
  async reject(id: string, reason: string) { return api.post(`${prefix(true)}/${id}/reject`, { reason }); },
  async proof(id: string, admin = false) { return (await api.get<never, { data: { url: string } }>(`${prefix(admin)}/${id}/proof`, { headers: { 'x-skip-cache': 'true' } })).data.url; },
};

import { Building2, Copy } from 'lucide-react';
import { toast } from '../../utils/toast';
import { findBankByQuery, VIETNAM_BANKS } from '../../config/banks.config';

const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

export function PayoutBankAccount({ bankName, accountNumber, accountName, copyable = false }: { bankName: string; accountNumber: string; accountName: string; copyable?: boolean }) {
  const bank = findBankByQuery(bankName) || VIETNAM_BANKS.find(item => normalize(item.name) === normalize(bankName));
  return <div className="payout-bank-account">
    <span className="payout-bank-mark" aria-hidden="true"><Building2 size={17} strokeWidth={1.6}/></span>
    <div className="min-w-0"><span className="payout-bank-name" title={bankName}>{bank?.shortName || bankName.split(' (')[0]}</span><span className="payout-bank-number">{accountNumber}{copyable && <button type="button" className="payout-copy" aria-label="Sao chép số tài khoản" onClick={() => { void navigator.clipboard.writeText(accountNumber).then(() => toast.success('Đã sao chép số tài khoản')).catch(() => toast.error('Không thể sao chép')); }}><Copy size={12}/></button>}</span><span className="payout-bank-holder">{accountName}</span></div>
  </div>;
}

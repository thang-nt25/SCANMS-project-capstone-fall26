import { useId } from 'react';
import { FileCheck2, Upload } from 'lucide-react';
import { PayoutBankAccount } from './PayoutBankAccount';
import './payout-compact.css';

export function PayoutCompactSummary({ name, code, amount, bankName, accountNumber, accountName, detail }: {
  name?: string; code?: string; amount: string; bankName: string; accountNumber: string; accountName: string; detail?: string;
}) {
  return <div className="compact-payout-summary">
    <div className="compact-payout-total"><div>{name && <strong>{name}</strong>}{code && <span className="compact-payout-code">{code}</span>}</div><div className="compact-payout-money"><strong>{Number(amount).toLocaleString('vi-VN')} đ</strong>{detail && <span>{detail}</span>}</div></div>
    <PayoutBankAccount bankName={bankName} accountNumber={accountNumber} accountName={accountName}/>
  </div>;
}

export function PayoutProofField({ file, onChange, disabled, webp = false }: { file: File | null; onChange: (file: File | null) => void; disabled: boolean; webp?: boolean }) {
  const id = useId();
  return <div className="compact-payout-field"><span id={`${id}-label`}>Chứng từ *</span><label className="compact-proof-picker" htmlFor={id}>
    <input id={id} aria-labelledby={`${id}-label`} type="file" accept={`image/jpeg,image/png,application/pdf${webp ? ',image/webp' : ''}`} disabled={disabled} onChange={event => { onChange(event.target.files?.[0] ?? null); event.target.value = ''; }}/>
    {file ? <FileCheck2 size={17}/> : <Upload size={17}/>}<span title={file?.name}>{file?.name || 'Tải chứng từ'}</span>
  </label><small>Ảnh/PDF · ≤ 5 MB</small></div>;
}

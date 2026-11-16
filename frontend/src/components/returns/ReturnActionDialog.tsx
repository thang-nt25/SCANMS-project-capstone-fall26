import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../ui/Modal';

interface Props {
  title: string;
  children: ReactNode;
  busy?: boolean;
  choices?: Array<{ label: string; value: string; danger?: boolean }>;
  onSelect?: (value: string) => void;
}

/** Keep existing forms and validation intact; only change where they are presented. */
export function ReturnActionDialog({ title, children, busy = false, choices, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = choices || [{ label: title, value: title }];
  const close = () => { if (!busy) setSelected(null); };
  return <div className="min-w-0">
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
      {options.map(option => <button key={option.value} type="button" disabled={busy}
        className={`inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] ${option.danger ? 'border-[#DC2626] bg-white text-[#DC2626] hover:bg-red-50' : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#231D15] hover:border-[#C59B58]'}`}
        onClick={() => { onSelect?.(option.value); setSelected(option.value); }}>{option.label}</button>)}
    </div>
    {selected !== null && createPortal(<Modal isOpen onClose={close} stickyHeader maxWidth="xl"
      title={options.find(option => option.value === selected)?.label || title}
      subtitle="Kiểm tra thông tin trước khi xác nhận. Đóng cửa sổ để quay lại hồ sơ."
      footer={<button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-sm font-semibold text-[#7D715E] disabled:opacity-50">Quay lại hồ sơ</button>}>
      <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]">{children}</div>
    </Modal>, document.querySelector('dialog[open]') || document.body)}
  </div>;
}

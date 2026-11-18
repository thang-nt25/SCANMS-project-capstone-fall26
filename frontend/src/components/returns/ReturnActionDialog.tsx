import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../ui/Modal';

interface Props {
  title: string;
  children: ReactNode;
  busy?: boolean;
  choices?: Array<{ label: string; value: string; danger?: boolean; icon?: ReactNode; dialogTitle?: string }>;
  onSelect?: (value: string) => void;
  subtitle?: ReactNode;
  confirmation?: { formId: string; label: string; busyLabel: string; disabled?: boolean; width?: 600 | 640; danger?: boolean };
  compactChoices?: boolean;
}

/** Keep existing forms and validation intact; only change where they are presented. */
export function ReturnActionDialog({ title, children, busy = false, choices, onSelect, subtitle, confirmation, compactChoices = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = choices || [{ label: title, value: title }];
  const close = () => { if (!busy) setSelected(null); };
  return <div className="min-w-0">
    <div role={compactChoices ? 'group' : undefined} aria-label={compactChoices ? title : undefined} className={compactChoices ? 'grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3' : 'flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap'}>
      {options.map(option => <button key={option.value} type="button" disabled={busy}
        className={`inline-flex min-w-0 items-center justify-center border transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] ${compactChoices ? `h-[42px] min-h-[42px] w-full gap-2 rounded-[10px] px-3 py-0 text-[13px] font-medium [&_svg]:size-4 [&_svg]:shrink-0 ${option.danger ? 'border-[#EAE4D7] bg-white text-[#B91C1C] hover:border-[#FECACA] hover:bg-[#FEF2F2]' : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#231D15] hover:border-[#C59B58] hover:bg-[#F3EFE6]'}` : `min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold ${option.danger ? 'border-[#DC2626] bg-white text-[#DC2626] hover:bg-red-50' : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#231D15] hover:border-[#C59B58]'}`}`}
        onClick={() => { onSelect?.(option.value); setSelected(option.value); }}>{option.icon}{option.label}</button>)}
    </div>
    {selected !== null && createPortal(<Modal isOpen onClose={close} stickyHeader maxWidth="xl"
      className={confirmation ? confirmation.width === 640 ? 'max-w-[640px]' : 'max-w-[600px]' : undefined}
      title={options.find(option => option.value === selected)?.dialogTitle || options.find(option => option.value === selected)?.label || title}
      subtitle={confirmation ? subtitle : 'Kiểm tra thông tin trước khi xác nhận. Đóng cửa sổ để quay lại hồ sơ.'}
      footer={confirmation ? <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="button" disabled={busy} onClick={close} className="h-[42px] shrink-0 rounded-xl border border-[#EAE4D7] bg-white px-4 text-sm font-semibold text-[#7D715E] disabled:opacity-50">Quay lại</button>
        <button type="submit" form={confirmation.formId} disabled={busy || confirmation.disabled} className={`h-[42px] rounded-xl border px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] ${confirmation.danger ? 'border-[#DC2626] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]' : 'border-[#EEDFC6] bg-[#F3EFE6] text-[#231D15] hover:bg-[#EEDFC6]'}`}>{busy ? confirmation.busyLabel : confirmation.label}</button>
      </div> : <button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-sm font-semibold text-[#7D715E] disabled:opacity-50">Quay lại hồ sơ</button>}>
      <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]">{children}</div>
    </Modal>, document.querySelector('dialog[open]') || document.body)}
  </div>;
}

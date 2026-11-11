import { useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from './Modal';

interface Props {
  value: string;
  max: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function VietnamMonthPicker({ value, max, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const choose = (next: string) => { onChange(next); setOpen(false); };
  const control = 'flex size-11 items-center justify-center rounded-xl border border-[#EAE4D7] bg-white text-[#7D715E] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#B88E4F] disabled:opacity-35';

  return <>
    <button type="button" aria-label="Chọn kỳ thưởng" aria-haspopup="dialog" aria-expanded={open} disabled={disabled}
      onClick={() => { setYear(Number(value.slice(0, 4))); setOpen(true); }}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#EEDFC6] bg-white px-4 py-2 text-left transition hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#B88E4F] disabled:opacity-50 sm:w-auto sm:min-w-52">
      <CalendarDays size={20} className="shrink-0 text-[#B88E4F]" />
      <span className="flex-1"><span className="block text-xs text-[#7D715E]">Kỳ thưởng</span><span className="block text-sm font-semibold text-[#1A1612]">Tháng {Number(value.slice(5, 7))}/{value.slice(0, 4)}</span></span>
      <ChevronDown size={16} className="text-[#7D715E]" />
    </button>
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Chọn kỳ thưởng" maxWidth="sm">
      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-label="Năm trước" disabled={year <= 1900} className={control} onClick={() => setYear(year - 1)}><ChevronLeft size={18} /></button>
        <span aria-live="polite" className="text-base font-bold tabular-nums text-[#1A1612]">Năm {year}</span>
        <button type="button" aria-label="Năm sau" disabled={year >= Number(max.slice(0, 4))} className={control} onClick={() => setYear(year + 1)}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Các tháng năm ${year}`}>
        {Array.from({ length: 12 }, (_, index) => {
          const next = `${year}-${String(index + 1).padStart(2, '0')}`;
          const selected = value === next;
          return <button key={next} type="button" aria-pressed={selected} disabled={next > max} onClick={() => choose(next)}
            className={`flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm transition focus-visible:outline-2 focus-visible:outline-[#B88E4F] disabled:cursor-not-allowed disabled:opacity-30 ${selected ? 'border-[#B88E4F] bg-[#FBF5EB] font-semibold text-[#8C6226]' : 'border-[#EAE4D7] bg-white text-[#1A1612] hover:bg-[#FBF5EB]'}`}>
            {selected && <Check size={14} />}Tháng {index + 1}
          </button>;
        })}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#EAE4D7] pt-3">
        <span className="text-xs text-[#7D715E]">Theo giờ Việt Nam</span>
        <button type="button" onClick={() => choose(max)} className="min-h-11 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 text-sm font-semibold text-[#8C6226]">Tháng này</button>
      </div>
    </Modal>
  </>;
}

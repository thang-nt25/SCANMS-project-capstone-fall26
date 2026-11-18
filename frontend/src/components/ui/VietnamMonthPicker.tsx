import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from './Modal';

interface Props {
  value: string;
  max: string;
  min?: string;
  variant?: 'button' | 'field';
  disabled?: boolean;
  onChange: (value: string) => void;
  label?: string;
}

export function VietnamMonthPicker({ value, max, min = '1900-01', variant = 'button', disabled, onChange, label = 'Kỳ thưởng' }: Props) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const [draft, setDraft] = useState(`${value.slice(5, 7)}/${value.slice(0, 4)}`);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { setDraft(`${value.slice(5, 7)}/${value.slice(0, 4)}`); }, [value]);
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 7);
  const choose = (next: string) => { if (next < min || next > max) return; field.current?.setCustomValidity(''); setDraft(`${next.slice(5,7)}/${next.slice(0,4)}`); onChange(next); setOpen(false); };
  const control = 'flex size-11 items-center justify-center rounded-xl border border-[#EAE4D7] bg-white text-[#7D715E] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#B88E4F] disabled:opacity-35';

  return <>
    {variant === 'field' ? <div className="flex h-12 w-full items-center rounded-xl border border-[#EAE4D7] bg-white px-2 transition focus-within:border-[#C59B58] focus-within:ring-2 focus-within:ring-[#FBF5EB]">
      <span className="w-9 shrink-0" aria-hidden="true"/>
      <input ref={field} data-reward-month aria-label="Kỳ áp dụng, tháng và năm" required type="text" inputMode="numeric" placeholder="MM/YYYY" maxLength={7} pattern="(0[1-9]|1[0-2])/[0-9]{4}" value={draft} disabled={disabled}
        onChange={event => {
          const text = event.target.value; setDraft(text);
          const match = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(text);
          const next = match ? `${match[2]}-${match[1]}` : '';
          event.target.setCustomValidity(!match ? 'Nhập tháng/năm theo dạng MM/YYYY' : next < min || next > max ? 'Kỳ áp dụng phải từ tháng hiện tại trở đi' : '');
          if (match && next >= min && next <= max) onChange(next);
        }}
        className="h-full min-w-0 flex-1 border-0 bg-transparent text-center text-sm font-medium tabular-nums text-[#1A1612] outline-none"/>
      <button type="button" aria-label="Chọn kỳ áp dụng" aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={() => { setYear(Number(value.slice(0,4))); setOpen(true); }} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#B88E4F] transition hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#B88E4F]"><CalendarDays size={19}/></button>
    </div> : <button type="button" aria-label={`Chọn ${label.toLowerCase()}`} aria-haspopup="dialog" aria-expanded={open} disabled={disabled}
      onClick={() => { setYear(Number(value.slice(0, 4))); setOpen(true); }}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#EEDFC6] bg-white px-4 py-2 text-left transition hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#B88E4F] disabled:opacity-50 sm:w-auto sm:min-w-52">
      <CalendarDays size={20} className="shrink-0 text-[#B88E4F]" />
      <span className="flex-1"><span className="block text-xs text-[#7D715E]">{label}</span><span className="block text-sm font-semibold text-[#1A1612]">Tháng {Number(value.slice(5, 7))}/{value.slice(0, 4)}</span></span>
      <ChevronDown size={16} className="text-[#7D715E]" />
    </button>}
    {createPortal(<Modal isOpen={open} onClose={() => setOpen(false)} title={variant === 'field' ? 'Chọn kỳ áp dụng' : `Chọn ${label.toLowerCase()}`} maxWidth="sm">
      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-label="Năm trước" disabled={year <= Number(min.slice(0,4))} className={control} onClick={() => setYear(year - 1)}><ChevronLeft size={18} /></button>
        <label className="flex items-center gap-2 text-sm text-[#7D715E]">Năm<input aria-label="Năm thưởng" type="number" min={1900} max={Number(max.slice(0,4))} key={year} defaultValue={year} onBlur={event => { const value = Number(event.target.value); if (value >= 1900 && value <= Number(max.slice(0,4))) setYear(value); else event.target.value = String(year); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} className="h-11 w-24 rounded-xl border border-[#EAE4D7] bg-white text-center text-base font-semibold tabular-nums text-[#1A1612]"/></label>
        <button type="button" aria-label="Năm sau" disabled={year >= Number(max.slice(0, 4))} className={control} onClick={() => setYear(year + 1)}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Các tháng năm ${year}`}>
        {Array.from({ length: 12 }, (_, index) => {
          const next = `${year}-${String(index + 1).padStart(2, '0')}`;
          const selected = value === next;
          return <button key={next} type="button" aria-pressed={selected} disabled={next > max || next < min} onClick={() => choose(next)}
            className={`flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm transition focus-visible:outline-2 focus-visible:outline-[#B88E4F] disabled:cursor-not-allowed disabled:opacity-25 ${selected ? 'border-[#C59B58] bg-[#FBF5EB] font-semibold text-[#8C6226] shadow-sm' : 'border-[#EAE4D7] bg-white text-[#1A1612] hover:border-[#EEDFC6] hover:bg-[#FBF5EB]'}`}>
            {selected && <Check size={14} />}Tháng {index + 1}
          </button>;
        })}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#EAE4D7] pt-3">
        <span className="text-xs text-[#7D715E]">Theo giờ Việt Nam</span>
        <button type="button" onClick={() => choose(today > max ? max : today < min ? min : today)} className="min-h-11 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 text-sm font-semibold text-[#8C6226]">Tháng này</button>
      </div>
    </Modal>, document.body)}
  </>;
}

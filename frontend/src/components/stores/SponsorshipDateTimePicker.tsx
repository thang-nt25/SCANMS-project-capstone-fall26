import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react';

const pad = (value: number) => String(value).padStart(2, '0');
const localValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function SponsorshipDateTimePicker({ name, label, value, onChange }: {
  name: string; label: string; value: string; onChange: (value: string) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const [month, setMonth] = useState(new Date());
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((offset + length) / 7) * 7;
  const selectedDate = value ? new Date(value) : null;
  const choose = (date: Date) => {
    const next = new Date(draft);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setDraft(next);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };
  return <div className="sp-datetime relative min-w-0 scheme-light [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-solid [&_button:focus-visible]:outline-[#C59B58] [&_button:focus-visible]:outline-offset-[2px] [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-solid [&_select:focus-visible]:outline-[#C59B58] [&_select:focus-visible]:outline-offset-[2px] [&:last-child_.sp-date-panel]:left-auto [&:last-child_.sp-date-panel]:right-0" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); close(); }
  }}>
    <span className="sp-field-label block mb-[8px] text-[13px] font-semibold" id={`${id}-label`}>{label}</span>
    <input type="hidden" name={name} value={value} />
    <button ref={trigger} type="button" className={`sp-date-trigger flex w-full min-h-[48px] items-center gap-[9px] bg-white text-[#B88E4F] border border-[#EAE4D7] rounded-[10px] py-[10px] px-[12px] cursor-pointer text-left [&>span]:flex [&>span]:items-center [&>span]:justify-between [&>span]:gap-[8px] [&>span]:flex-1 [&>span]:min-w-0 [&_strong]:text-[13px] [&_strong]:font-semibold [&_strong]:text-[#1A1612] [&_small]:text-[12px] [&_small]:text-[#7D715E] [&_small]:border-l [&_small]:border-l-[#EAE4D7] [&_small]:pl-[8px] [&.is-open]:border-[#C59B58] [&.is-open]:shadow-[0_0_0_3px_#FBF5EB]${open ? ' is-open' : ''}`}
      aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-panel`}
      onClick={() => {
        if (open) { close(); return; }
        const initial = value ? new Date(value) : new Date();
        setDraft(initial); setMonth(new Date(initial.getFullYear(), initial.getMonth(), 1)); setOpen(true);
      }}>
      <CalendarDays size={17} />
      <span id={`${id}-value`}>{selectedDate
        ? <><strong>{selectedDate.toLocaleDateString('vi-VN')}</strong><small>{pad(selectedDate.getHours())}:{pad(selectedDate.getMinutes())}</small></>
        : <span className="sp-date-placeholder text-[12px] text-[#7D715E]">Chọn ngày và giờ</span>}</span>
      <Clock3 size={15} />
    </button>
    {open && <section id={`${id}-panel`} className="sp-date-panel absolute top-[calc(100%_+_8px)] left-0 z-[30] w-[310px] max-w-[calc(100vw_-_64px)] p-[16px] box-border bg-white border border-[#EEDFC6] rounded-[14px] shadow-[0_12px_36px_#7D715E24] [@media(max-width:520px)]:static [@media(max-width:520px)]:w-full [@media(max-width:520px)]:max-w-none [@media(max-width:520px)]:mt-[8px] [@media(max-width:520px)]:shadow-none" aria-label={`Chọn ${label.toLowerCase()}`}>
      <div className="sp-calendar-heading flex items-center justify-between mb-[14px] gap-[8px] [&_strong]:text-[14px] [&_strong]:text-[#1A1612] [&>div]:flex [&>div]:gap-[3px] [&_button]:w-[28px] [&_button]:h-[28px] [&_button]:grid [&_button]:place-items-center [&_button]:bg-[#FAF8F5] [&_button]:text-[#7D715E] [&_button]:border [&_button]:border-[#EAE4D7] [&_button]:rounded-[7px] [&_button]:cursor-pointer">
        <strong>Tháng {month.getMonth() + 1}, {month.getFullYear()}</strong>
        <div><button type="button" aria-label="Tháng trước" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={17} /></button>
          <button type="button" aria-label="Tháng sau" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={17} /></button>
          <button type="button" aria-label="Đóng lịch" onClick={close}><X size={16} /></button></div>
      </div>
      <div className="sp-calendar-week grid grid-cols-7 gap-[3px] text-center text-[#7D715E] text-[10px] font-semibold mb-[6px]">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="sp-calendar-grid grid grid-cols-7 gap-[3px] [&_button]:h-[32px] [&_button]:p-0 [&_button]:border [&_button]:border-[transparent] [&_button]:rounded-[8px] [&_button]:bg-white [&_button]:text-[#1A1612] [&_button]:cursor-pointer [&_button]:text-[12px] [&_button:hover]:bg-[#FBF5EB] [&_button:hover]:border-[#EEDFC6] [&_.is-other-month]:text-[#B6AD9E] [&_.is-today]:border-[#C59B58] [&_.is-selected]:bg-[#F3EFE6] [&_.is-selected]:border-[#C59B58] [&_.is-selected]:font-extrabold [&_.is-selected]:text-[#6C4D20]" role="grid" aria-label="Ngày trong tháng">
        {Array.from({ length: cells }, (_, index) => {
          const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1);
          const selected = date.toDateString() === draft.toDateString();
          const today = date.toDateString() === new Date().toDateString();
          return <button type="button" role="gridcell" key={index}
            aria-label={date.toLocaleDateString('vi-VN')} aria-selected={selected} aria-current={today ? 'date' : undefined}
            className={`${date.getMonth() !== month.getMonth() ? 'is-other-month' : ''} ${selected ? 'is-selected' : ''} ${today ? 'is-today' : ''}`}
            onClick={() => choose(date)} onKeyDown={event => {
              const shift: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
              if (shift[event.key]) {
                event.preventDefault();
                const next = new Date(date); next.setDate(next.getDate() + shift[event.key]); choose(next);
                requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
              }
            }}>{date.getDate()}</button>;
        })}
      </div>
      <div className="sp-time-row flex justify-between items-center mt-[14px] pt-[12px] border-t border-t-[#EAE4D7] gap-[10px] [&>span]:flex [&>span]:items-center [&>span]:gap-[6px] [&>span]:text-[12px] [&>span]:text-[#7D715E] [&>div]:flex [&>div]:gap-[5px] [&>div]:items-center [&_select]:appearance-auto [&_select]:bg-[#FAF8F5] [&_select]:border [&_select]:border-[#EAE4D7] [&_select]:text-[#1A1612] [&_select]:rounded-[7px] [&_select]:py-[7px] [&_select]:px-[4px] [&_select]:text-[12px]"><span><Clock3 size={15} /> Giờ chạy</span><div>
        <select aria-label={`Giờ ${label.toLowerCase()}`} value={draft.getHours()} onChange={e => { const next = new Date(draft); next.setHours(Number(e.target.value)); setDraft(next); }}>
          {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{pad(hour)}</option>)}
        </select><span>:</span>
        <select aria-label={`Phút ${label.toLowerCase()}`} value={draft.getMinutes()} onChange={e => { const next = new Date(draft); next.setMinutes(Number(e.target.value)); setDraft(next); }}>
          {Array.from({ length: 60 }, (_, minute) => <option key={minute} value={minute}>{pad(minute)}</option>)}
        </select></div></div>
      <div className="sp-calendar-footer flex items-center justify-between gap-[12px] mt-[14px] [&_button]:cursor-pointer [&_button]:border-0 [&_button]:rounded-[8px] [&_button]:py-[8px] [&_button]:px-[12px] [&_button]:bg-white [&_button]:text-[#7D715E] [&_button]:text-[12px] [&_.sp-date-confirm]:bg-[#FBF5EB] [&_.sp-date-confirm]:border [&_.sp-date-confirm]:border-[#EEDFC6] [&_.sp-date-confirm]:text-[#6C4D20] [&_.sp-date-confirm]:font-bold"><button type="button" onClick={() => choose(new Date())}>Hôm nay</button>
        <button type="button" className="sp-date-confirm" onClick={() => { onChange(localValue(draft)); close(); }}>Xác nhận</button></div>
    </section>}
  </div>;
}

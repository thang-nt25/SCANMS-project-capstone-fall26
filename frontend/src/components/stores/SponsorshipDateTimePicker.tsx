import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { Select } from '../ui/Select';

const pad = (value: number) => String(value).padStart(2, '0');
const localValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const dateLabel = (date: Date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeLabel = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const dayLabel = (date: Date) => date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const navigationClass = 'grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#EAE4D7] bg-white text-[#655A49] transition-colors hover:bg-[#FBF5EB]';
const timeFieldClass = 'h-10 min-h-10 w-full justify-center gap-1 rounded-lg px-1 py-0 text-center text-sm tabular-nums shadow-none [&>span]:font-semibold [&>svg]:size-2.5';
const timeMenuClass = '[&_[role=listbox]]:max-h-36 [&_[role=listbox]]:rounded-lg [&_[role=listbox]]:py-1 [&_[role=listbox]]:shadow-md [&_[role=option]]:min-h-8 [&_[role=option]]:justify-center [&_[role=option]]:px-1 [&_[role=option]]:py-1 [&_[role=option]]:tabular-nums [&_[role=option]>span]:pr-0 [&_[role=option]>svg]:hidden';

export function SponsorshipDateTimePicker({ name, label, value, onChange, earlierValue }: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  earlierValue?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const [month, setMonth] = useState(new Date());

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePress(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePress);
    root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [open]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const monthLength = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const weekCount = Math.ceil((offset + monthLength) / 7);
  const selection = value ? new Date(value) : null;
  const today = new Date();
  const draftValue = localValue(draft);
  const tooEarly = Boolean(earlierValue && draftValue <= earlierValue);
  const field = label.toLowerCase();

  function choose(date: Date) {
    const next = new Date(draft);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setDraft(next);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  return (
    <div ref={root}
      className="sp-datetime min-w-0 scheme-light [&_:is(button,select):focus-visible]:outline-2 [&_:is(button,select):focus-visible]:outline-offset-2 [&_:is(button,select):focus-visible]:outline-[#C59B58] sm:[&:last-child_.sp-date-panel]:right-0 sm:[&:last-child_.sp-date-panel]:left-auto"
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          close();
        }
      }}>
      <span id={`${id}-label`} className="sp-field-label mb-1.5 block text-xs font-semibold text-[#655A49]">{label}</span>
      <input type="hidden" name={name} value={value} />
      <button ref={trigger} type="button"
        className={`sp-date-trigger flex min-h-[42px] w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-xs transition-colors ${open ? 'border-[#C59B58] ring-2 ring-[#FBF5EB]' : 'border-[#EAE4D7] hover:border-[#C59B58]'}`}
        aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={open ? `${id}-panel` : undefined}
        onClick={() => {
          if (open) { close(); return; }
          const initial = selection ?? new Date();
          setDraft(initial);
          setMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
          setOpen(true);
        }}>
        <CalendarDays size={16} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
        <span id={`${id}-value`} className={`min-w-0 flex-1 tabular-nums ${selection ? 'font-semibold text-[#1A1612]' : 'text-[#7D715E]'}`}>
          {selection ? `${dateLabel(selection)} · ${timeLabel(selection)}` : 'Chọn ngày và giờ'}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-[#7D715E] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <section id={`${id}-panel`}
          className="sp-date-panel @container mt-2 min-w-0 rounded-xl border border-[#EEDFC6] bg-white text-[#1A1612] sm:absolute sm:top-full sm:left-0 sm:z-30 sm:w-[470px] sm:max-w-full sm:shadow-[0_12px_30px_#231D1526]"
          aria-labelledby={`${id}-title`}>
          <h3 id={`${id}-title`} className="border-b border-[#EAE4D7] px-3.5 py-2.5 text-sm font-semibold">Chọn thời điểm {field}</h3>
          <div className="grid @min-[410px]:grid-cols-[minmax(0,1fr)_148px]">
            <div className="min-w-0 px-3.5 py-3">
              <div className="sp-calendar-heading mb-2 flex items-center justify-between gap-2">
                <button type="button" className={navigationClass} aria-label="Tháng trước" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
                <strong className="text-sm" aria-live="polite">Tháng {month.getMonth() + 1}/{month.getFullYear()}</strong>
                <button type="button" className={navigationClass} aria-label="Tháng sau" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
              </div>
              <div className="sp-calendar-grid space-y-0.5" role="grid" aria-label="Ngày trong tháng">
                <div className="sp-calendar-week grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-[#7D715E]" role="row">
                  {dayNames.map(day => <span key={day} role="columnheader">{day}</span>)}
                </div>
                {Array.from({ length: weekCount }, (_, week) => (
                  <div key={week} role="row" className="grid grid-cols-7 gap-0.5">
                    {dayNames.map((day, weekday) => {
                      const date = new Date(month.getFullYear(), month.getMonth(), week * 7 + weekday - offset + 1);
                      const selected = date.toDateString() === draft.toDateString();
                      const isToday = date.toDateString() === today.toDateString();
                      return (
                        <button type="button" role="gridcell" key={day}
                          aria-label={date.toLocaleDateString('vi-VN')} aria-selected={selected} aria-current={isToday ? 'date' : undefined}
                          className={`relative grid h-8 min-w-0 cursor-pointer place-items-center rounded-md border text-xs tabular-nums transition-colors ${selected ? 'border-[#C59B58] bg-[#FBF5EB] font-bold text-[#6C4D20]' : 'border-transparent hover:bg-[#FAF8F5]'} ${!selected && date.getMonth() !== month.getMonth() ? 'text-[#7D715E]' : ''}`}
                          onClick={() => choose(date)}
                          onKeyDown={event => {
                            const shift: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                            const move = shift[event.key];
                            if (!move) return;
                            event.preventDefault();
                            date.setDate(date.getDate() + move);
                            choose(date);
                            requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
                          }}>
                          {date.getDate()}
                          {isToday && <span className="absolute bottom-0.5 size-1 rounded-full bg-[#B88E4F]" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="sp-time-row flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t border-[#EAE4D7] bg-[#FAF8F5] px-3.5 py-3 @min-[410px]:block @min-[410px]:space-y-2 @min-[410px]:border-t-0 @min-[410px]:border-l">
              <p className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#655A49]"><Clock3 size={14} className="text-[#B88E4F]" aria-hidden="true" /> Giờ {field}</p>
              <div className={`grid min-w-[116px] grid-cols-[1fr_auto_1fr] items-center gap-1 text-[#655A49] ${timeMenuClass}`}>
                <Select placement="bottom" searchable={false} className={timeFieldClass} aria-label={`Giờ ${field}`} value={String(draft.getHours())} onChange={event => {
                  const next = new Date(draft);
                  next.setHours(Number(event.target.value));
                  setDraft(next);
                }}>
                  {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{pad(hour)}</option>)}
                </Select>
                <span className="text-sm font-semibold" aria-hidden="true">:</span>
                <Select placement="bottom" searchable={false} className={timeFieldClass} aria-label={`Phút ${field}`} value={String(draft.getMinutes())} onChange={event => {
                  const next = new Date(draft);
                  next.setMinutes(Number(event.target.value));
                  setDraft(next);
                }}>
                  {Array.from({ length: 60 }, (_, minute) => <option key={minute} value={minute}>{pad(minute)}</option>)}
                </Select>
              </div>
              <button type="button" onClick={() => choose(today)} className="cursor-pointer rounded px-1 py-1 text-xs font-semibold text-[#795A2D] hover:bg-[#FBF5EB]">Hôm nay</button>
              {tooEarly && <p role="alert" className="w-full text-xs text-[#DC2626]">Chọn thời điểm kết thúc sau lúc bắt đầu.</p>}
            </div>
          </div>
          <footer className="sp-calendar-footer flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE4D7] px-3.5 py-2.5">
            <p className="text-xs tabular-nums text-[#655A49]" aria-live="polite">{dayLabel(draft)} · <strong className="text-[#1A1612]">{timeLabel(draft)}</strong></p>
            <button type="button" disabled={tooEarly} className="sp-date-confirm h-9 cursor-pointer rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 text-xs font-semibold text-[#6C4D20] transition-colors hover:bg-[#F3EFE6] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => { onChange(draftValue); close(); }}>
              Xác nhận
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}

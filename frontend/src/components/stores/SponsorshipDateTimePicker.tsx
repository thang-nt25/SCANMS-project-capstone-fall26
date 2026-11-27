import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';

const pad = (value: number) => String(value).padStart(2, '0');
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dateLabel = (date: Date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeLabel = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const dayLabel = (date: Date) => date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const navigationClass = 'grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#EAE4D7] bg-white text-[#655A49] transition-colors hover:bg-[#FBF5EB]';
const timeFields = [
  { part: 'hour', label: 'Giờ', max: 23 },
  { part: 'minute', label: 'Phút', max: 59 },
] as const;
const quickMinutes = [0, 15, 30, 45];
const timeArrows: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -6, ArrowDown: 6 };
const validTimeField = (value: string, max: number) => /^\d{1,2}$/.test(value) && Number(value) <= max;
const timeOptionClass = 'grid min-h-9 min-w-0 cursor-pointer place-items-center rounded-md border border-[#EAE4D7] bg-white text-[13px] font-semibold tabular-nums text-[#655A49] hover:border-[#C59B58] hover:bg-[#FBF5EB] aria-checked:border-[#B88E4F] aria-checked:bg-[#C59B58] aria-checked:text-[#231D15] aria-pressed:border-[#B88E4F] aria-pressed:bg-[#C59B58] aria-pressed:text-[#231D15]';

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
  const optionGrid = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const [month, setMonth] = useState(new Date());
  const [time, setTime] = useState({ hour: '', minute: '' });
  const [activePart, setActivePart] = useState<'hour' | 'minute'>('hour');

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

  useEffect(() => {
    const grid = optionGrid.current;
    if (!open || activePart !== 'minute' || !grid) return;
    const selected = grid.querySelector<HTMLElement>('[aria-checked="true"]');
    grid.scrollTop = selected ? selected.offsetTop - (grid.clientHeight - selected.offsetHeight) / 2 : 0;
  }, [open, activePart]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const monthLength = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const weekCount = Math.ceil((offset + monthLength) / 7);
  const selection = value ? new Date(value) : null;
  const today = new Date();
  const timeValid = timeFields.every(({ part, max }) => validTimeField(time[part], max));
  const choosingMinute = activePart === 'minute';
  const optionCount = choosingMinute ? 60 : 24;
  const unit = choosingMinute ? 'phút' : 'giờ';
  const selectedOption = validTimeField(time[activePart], optionCount - 1) ? Number(time[activePart]) : null;
  const chosenTime = timeValid ? `${pad(Number(time.hour))}:${pad(Number(time.minute))}` : '';
  const draftValue = chosenTime ? `${localDate(draft)}T${chosenTime}` : '';
  const tooEarly = Boolean(earlierValue && draftValue && draftValue <= earlierValue);
  const field = label.toLowerCase();

  function confirm() {
    if (!timeValid || tooEarly) return;
    onChange(draftValue);
    close();
  }

  function choose(date: Date) {
    const next = new Date(draft);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setDraft(next);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  return (
    <div ref={root}
      className="sp-datetime min-w-0 scheme-light [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#795A2D] sm:[&:last-child_.sp-date-panel]:right-0 sm:[&:last-child_.sp-date-panel]:left-auto"
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
          setActivePart('hour');
          setTime({ hour: pad(initial.getHours()), minute: pad(initial.getMinutes()) });
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
          className="sp-date-panel @container mt-2 min-w-0 rounded-2xl border border-[#EEDFC6] bg-white text-[#1A1612] shadow-[0_12px_30px_#231D1514] sm:absolute sm:top-full sm:left-0 sm:z-30 sm:w-[580px] sm:max-w-full"
          aria-labelledby={`${id}-title`}>
          <h3 id={`${id}-title`} className="border-b border-[#EAE4D7] px-4 py-3 text-sm font-semibold">Chọn thời điểm {field}</h3>
          <div className="grid @min-[500px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0 px-4 py-3.5">
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
              <button type="button" onClick={() => choose(today)} className="mt-3 min-h-9 cursor-pointer rounded-md border border-[#EEDFC6] px-3 text-xs font-semibold text-[#795A2D] hover:bg-[#FBF5EB]">Hôm nay</button>
            </div>
            <div className="sp-time-row min-w-0 border-t border-[#EAE4D7] bg-[#FAF8F5] px-4 py-3.5 @min-[500px]:border-t-0 @min-[500px]:border-l">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#655A49]"><Clock3 size={15} className="text-[#B88E4F]" aria-hidden="true" /> Giờ {field}</p>
              <div className="mb-3 grid grid-cols-2 gap-2">
                {timeFields.map(({ part, label: timeLabel, max }) => (
                  <label key={part} data-active={activePart === part} className="flex min-w-0 cursor-pointer items-center gap-1 rounded-lg border border-[#EEDFC6] bg-white px-2 data-[active=true]:border-[#B88E4F] data-[active=true]:bg-[#FBF5EB] focus-within:ring-2 focus-within:ring-[#EEDFC6]">
                    <span className="text-xs font-semibold text-[#655A49]">{timeLabel}</span>
                    <input
                      aria-label={`${timeLabel} ${field}`}
                      aria-controls={`${id}-time-options`}
                      aria-invalid={!validTimeField(time[part], max)}
                      aria-describedby={!timeValid ? `${id}-time-error` : undefined}
                      type="text"
                      inputMode="none"
                      maxLength={2}
                      value={time[part]}
                      onFocus={event => {
                        setActivePart(part);
                        event.currentTarget.select();
                      }}
                      onChange={event => setTime({ ...time, [part]: event.currentTarget.value.replace(/[^0-9]/g, '') })}
                      onKeyDown={event => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        confirm();
                      }}
                      onBlur={() => {
                        if (validTimeField(time[part], max)) setTime(current => ({ ...current, [part]: pad(Number(current[part])) }));
                      }}
                      className="h-11 min-w-0 flex-1 rounded-sm bg-transparent text-center text-2xl font-bold tabular-nums text-[#231D15] outline-none! aria-invalid:text-[#DC2626]"
                    />
                  </label>
                ))}
              </div>
              <div key={activePart} ref={optionGrid} id={`${id}-time-options`} role="radiogroup" aria-label={`Chọn ${unit}`}
                className={`relative grid grid-cols-6 gap-1.5 ${choosingMinute ? 'max-h-[210px] overflow-y-auto overscroll-contain p-1 [scrollbar-color:#C59B58_#F3EFE6] [scrollbar-width:thin]' : ''}`}>
                {Array.from({ length: optionCount }, (_, option) => (
                  <button key={option} type="button" role="radio" aria-label={`${pad(option)} ${unit}`} aria-checked={selectedOption === option}
                    tabIndex={option === (selectedOption ?? 0) ? 0 : -1} data-time-option={option}
                    onClick={() => setTime(current => ({ ...current, [activePart]: pad(option) }))}
                    onKeyDown={event => {
                      const offset = timeArrows[event.key];
                      if (!offset) return;
                      event.preventDefault();
                      const next = (option + offset + optionCount) % optionCount;
                      setTime(current => ({ ...current, [activePart]: pad(next) }));
                      optionGrid.current?.querySelector<HTMLButtonElement>(`[data-time-option="${next}"]`)?.focus();
                    }}
                    className={timeOptionClass}>{pad(option)}</button>
                ))}
              </div>
              {!choosingMinute && <div role="group" aria-label="Chọn nhanh phút" className="mt-3 grid grid-cols-4 gap-1.5">
                {quickMinutes.map(minute => (
                  <button key={minute} type="button" aria-pressed={validTimeField(time.minute, 59) && Number(time.minute) === minute}
                    onClick={() => setTime(current => ({ ...current, minute: pad(minute) }))}
                    className={timeOptionClass}>{pad(minute)} phút</button>
                ))}
              </div>}
              {!timeValid && <p id={`${id}-time-error`} className="mt-2 text-xs text-[#B91C1C]" role="alert">Nhập giờ từ 00 đến 23 và phút từ 00 đến 59.</p>}
            </div>
          </div>
          <footer className="sp-calendar-footer flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[#EAE4D7] px-4 py-3">
            {tooEarly && <p role="alert" className="w-full text-xs text-[#B91C1C]">Chọn thời điểm kết thúc sau lúc bắt đầu.</p>}
            <p className="text-xs tabular-nums text-[#655A49]" aria-live="polite">{dayLabel(draft)}{chosenTime && <> · <strong className="text-sm text-[#1A1612]">{chosenTime}</strong></>}</p>
            <button type="button" disabled={!timeValid || tooEarly} className="sp-date-confirm inline-flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#C59B58]! px-3 text-xs font-bold text-[#231D15] hover:bg-[#B88E4F]! disabled:cursor-not-allowed disabled:opacity-50"
              onClick={confirm}>
              <Check size={15} aria-hidden="true" /> Xác nhận
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, FileSearch, Search, SlidersHorizontal, X } from 'lucide-react';
import { DateTimePicker } from '@/components/common/DateTimePicker';
import api from '@/services/api';
import type { ChatMessage } from '@/types/chat.types';
import { chatContentUrl } from '@/utils/chat-explorer';
import { ChatExplorerContent, Highlight } from './ChatExplorerContent';

const kinds = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'IMAGE', label: 'Ảnh' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'DOCUMENT', label: 'Tài liệu' },
] as const;
type Kind = typeof kinds[number]['value'];
const defaultFilters = { sender: 'ALL', from: '', to: '' };
const field = 'h-9 w-full rounded-lg border border-[#EAE4D7] bg-white px-2 text-sm text-[#1A1612] focus:outline-none focus:ring-1 focus:ring-[#C59B58]';

export function ConversationExplorer({
  conversationId,
  partnerName,
  onClose,
  onJump,
}: {
  conversationId?: string;
  partnerName: string;
  onClose: () => void;
  onJump: (message: ChatMessage) => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [draft, setDraft] = useState(defaultFilters);
  const [filters, setFilters] = useState(defaultFilters);
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(Boolean(conversationId));
  const [error, setError] = useState<{ cursor?: string } | null>(null);
  const [validationError, setValidationError] = useState('');
  const request = useRef<AbortController | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const term = query.trim();
  const advancedCount = Number(filters.sender !== 'ALL') + Number(Boolean(filters.from || filters.to));
  const hasFilter = Boolean(term || kind !== 'ALL' || advancedCount);

  useEffect(() => {
    if (window.innerWidth >= 640 && window.matchMedia('(pointer: fine)').matches) {
      input.current?.focus({ preventScroll: true });
    } else {
      panel.current?.focus({ preventScroll: true });
    }
  }, []);

  const load = useCallback(async (cursor?: string) => {
    if (!conversationId) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/explore`, {
        params: { q: term || undefined, kind, ...filters, cursor },
        signal: controller.signal,
        headers: { 'x-skip-cache': '1' },
      });
      if (controller.signal.aborted) return;
      const result = (response.data ?? response) as {
        items: ChatMessage[];
        nextCursor: string | null;
      };
      if (!Array.isArray(result.items)) throw new Error('Invalid conversation content');
      setItems(previous => {
        const combined = cursor ? [...previous, ...result.items] : result.items;
        return [...new Map(combined.map(item => [item.id, item])).values()];
      });
      setNextCursor(result.nextCursor ?? null);
    } catch {
      if (!controller.signal.aborted) setError({ cursor });
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, [conversationId, filters, kind, term]);

  useEffect(() => {
    if (!conversationId) return;
    setItems([]);
    setNextCursor(null);
    setError(null);
    setBusy(true);
    list.current?.scrollTo({ top: 0 });
    const timer = window.setTimeout(() => void load(), term ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      request.current?.abort();
    };
  }, [conversationId, load, term]);

  const reset = () => {
    setQuery('');
    setKind('ALL');
    setDraft(defaultFilters);
    setFilters(defaultFilters);
    setValidationError('');
    setShowFilters(false);
  };

  return (
    <div
      id="chat-content-explorer"
      ref={panel}
      role="region"
      aria-labelledby="chat-content-explorer-title"
      tabIndex={-1}
      onKeyDown={event => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        const calendar = panel.current?.querySelector<HTMLElement>('[role="button"][aria-haspopup="dialog"][aria-expanded="true"]');
        if (calendar) {
          calendar.click();
          calendar.focus();
        } else {
          onClose();
        }
      }}
      className="absolute inset-x-0 bottom-0 z-40 flex h-[min(75dvh,calc(100%-2rem))] min-h-0 flex-col overflow-hidden rounded-t-xl border border-[#EAE4D7] bg-white text-[#1A1612] shadow-[0_-8px_30px_#231D1526] outline-none sm:inset-y-0 sm:left-auto sm:h-auto sm:w-[min(400px,55%)] sm:rounded-none sm:border-y-0 sm:border-r-0 sm:shadow-[-8px_0_24px_#231D151a] xl:static xl:w-[380px] xl:shrink-0 xl:shadow-none"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-3.5 py-2">
        <h2 id="chat-content-explorer-title" className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <FileSearch size={16} aria-hidden="true" className="shrink-0 text-[#B88E4F]" />
          <span className="truncate" title={partnerName}>Nội dung hội thoại · {partnerName}</span>
        </h2>
        <button type="button" aria-label="Đóng kho nội dung" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-md text-[#7D715E] hover:bg-[#F3EFE6]">
          <X size={16} />
        </button>
      </header>

      {conversationId ? (
        <>
          <div className="flex shrink-0 gap-2 px-3.5 pb-2">
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#EAE4D7] px-2.5 focus-within:border-[#B88E4F]">
              <Search size={15} aria-hidden="true" className="shrink-0 text-[#7D715E]" />
              <input ref={input} aria-label="Tìm nội dung hoặc tên tệp" placeholder="Tìm tin nhắn, tên tệp…" maxLength={200} value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#7D715E]" />
            </label>
            <button type="button" aria-expanded={showFilters} aria-controls={showFilters ? 'chat-explorer-filters' : undefined} onClick={() => {
              setDraft(filters);
              setValidationError('');
              setShowFilters(value => !value);
            }} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#EAE4D7] px-2.5 text-xs font-semibold text-[#765629] hover:bg-[#FBF5EB] aria-expanded:bg-[#FBF5EB]">
              <SlidersHorizontal size={14} aria-hidden="true" /> Bộ lọc{advancedCount > 0 && <span className="tabular-nums">({advancedCount})</span>}
            </button>
          </div>

          <div role="group" aria-label="Loại nội dung" className="mx-3.5 mb-2 grid shrink-0 grid-cols-4 gap-1">
            {kinds.map(option => (
              <button key={option.value} type="button" aria-pressed={kind === option.value} onClick={() => setKind(option.value)} className="min-h-8 rounded-md border border-transparent px-1 text-xs font-semibold text-[#665948] hover:bg-[#FAF8F5] aria-pressed:border-[#EEDFC6] aria-pressed:bg-[#FBF5EB] aria-pressed:text-[#765629]">
                {option.label}
              </button>
            ))}
          </div>

          {showFilters && (
            <form id="chat-explorer-filters" className="max-h-[45%] shrink-0 space-y-2 overflow-y-auto border-t border-[#EAE4D7] bg-[#FAF8F5] px-3.5 py-2.5" onSubmit={event => {
              event.preventDefault();
              if (draft.from && draft.to && draft.from > draft.to) {
                setValidationError('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
                return;
              }
              setFilters(draft);
              setShowFilters(false);
              input.current?.focus({ preventScroll: true });
            }}>
              <label className="block text-xs text-[#7D715E]">
                Người gửi
                <select className={`${field} mt-1`} value={draft.sender} onChange={event => setDraft(previous => ({ ...previous, sender: event.target.value }))}>
                  <option value="ALL">Tất cả người gửi</option>
                  <option value="ME">Do tôi gửi</option>
                  <option value="OTHER">Người còn lại gửi</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="min-w-0 text-xs text-[#7D715E]">
                  Từ ngày
                  <DateTimePicker mode="date" smallCalendar compact className="mt-1" placeholder="Chọn ngày" popoverTitle="Chọn ngày bắt đầu" popoverPortalRef={panel} value={draft.from} onChange={from => { setValidationError(''); setDraft(previous => ({ ...previous, from })); }} />
                </label>
                <label className="min-w-0 text-xs text-[#7D715E]">
                  Đến ngày
                  <DateTimePicker mode="date" smallCalendar compact className="mt-1" placeholder="Chọn ngày" popoverTitle="Chọn ngày kết thúc" popoverPortalRef={panel} minDateTime={draft.from || undefined} value={draft.to} onChange={to => { setValidationError(''); setDraft(previous => ({ ...previous, to })); }} />
                </label>
              </div>
              {validationError && <p role="alert" className="text-xs text-[#DC2626]">{validationError}</p>}
              <div className="flex justify-end">
                <button type="submit" className="rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-1.5 text-xs font-semibold text-[#765629]">Áp dụng</button>
              </div>
            </form>
          )}

          <div ref={list} aria-busy={busy} className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[#EAE4D7]">
            <div className="flex items-center justify-between gap-2 px-3.5 py-2 text-[11px] text-[#7D715E]">
              <p aria-live="polite">
                {busy ? 'Đang tải nội dung…' : error && !items.length ? '' : hasFilter
                  ? `${items.length} kết quả${nextCursor ? ' đã tải' : ''}` : 'Nội dung gần đây'}
              </p>
              {hasFilter && <button type="button" onClick={reset} className="rounded px-1 py-0.5 font-semibold text-[#765629] hover:bg-[#FBF5EB]">Xóa bộ lọc</button>}
            </div>
            <div className="divide-y divide-[#EAE4D7]">
              {items.map(item => {
                const url = chatContentUrl(item.mediaUrl, window.location.href);
                return (
                  <article key={item.id} className="min-w-0 space-y-1.5 px-3.5 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[#7D715E]">
                      <span className="font-semibold text-[#665948]">{item.sender?.fullName || 'Người gửi'}</span>
                      <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>
                    </div>
                    {url && item.mediaType === 'IMAGE' && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 break-all text-xs font-semibold text-[#765629]">
                        <img src={url} loading="lazy" alt="" className="h-12 w-16 shrink-0 rounded-md border border-[#EAE4D7] object-cover" />
                        <Highlight text={item.mediaName || 'Mở ảnh'} query={term} />
                      </a>
                    )}
                    {url && item.mediaType === 'VIDEO' && <video src={url} controls preload="metadata" aria-label={item.mediaName || 'Video đã chia sẻ'} className="max-h-36 w-full rounded-md bg-[#FAF8F5]" />}
                    {url && item.mediaType !== 'IMAGE' && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 break-all text-xs font-semibold text-[#765629]">
                        <ExternalLink size={14} aria-hidden="true" className="shrink-0" />
                        <Highlight text={item.mediaName || 'Mở tệp đính kèm'} query={term} />
                      </a>
                    )}
                    {item.messageText && <ChatExplorerContent text={item.messageText} query={term} />}
                    {item.mediaUrl && !url && <p className="text-xs text-[#DC2626]">Không mở được liên kết đính kèm.</p>}
                    <div className="flex justify-end">
                      <button type="button" onClick={() => onJump(item)} className="rounded-md px-2 py-1 text-xs font-semibold text-[#765629] hover:bg-[#FBF5EB]">Về tin nhắn</button>
                    </div>
                  </article>
                );
              })}
            </div>
            {error && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3 text-xs text-[#DC2626]">
                <p>Chưa tải được nội dung.</p>
                <button type="button" onClick={() => void load(error.cursor)} className="rounded-md px-2 py-1 font-semibold text-[#765629] hover:bg-[#FBF5EB]">Thử lại</button>
              </div>
            )}
            {!busy && !error && !items.length && <p className="px-3.5 py-3 text-sm text-[#7D715E]">{hasFilter ? 'Không tìm thấy nội dung phù hợp.' : 'Hội thoại chưa có nội dung.'}</p>}
            {nextCursor && !busy && !error && (
              <button type="button" onClick={() => void load(nextCursor)} className="mx-3.5 my-2.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-1.5 text-xs font-semibold text-[#765629]">Xem nội dung cũ hơn</button>
            )}
          </div>
        </>
      ) : (
        <p className="border-t border-[#EAE4D7] px-3.5 py-4 text-sm text-[#7D715E]">Hội thoại chưa có nội dung.</p>
      )}
    </div>
  );
}

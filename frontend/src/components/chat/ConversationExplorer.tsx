import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FileSearch,
  Search,
  X,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { DateTimePicker } from "@/components/common/DateTimePicker";
import api from "@/services/api";
import type { ChatMessage } from "@/types/chat.types";
import { chatContentUrl } from "@/utils/chat-explorer";
import { ChatExplorerContent, Highlight } from "./ChatExplorerContent";

type Filters = {
  q: string;
  kind: string;
  sender: string;
  from: string;
  to: string;
};
const defaults: Filters = {
  q: "",
  kind: "ALL",
  sender: "ALL",
  from: "",
  to: "",
};
const field =
  "w-full rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-sm text-[#1A1612] focus:outline-none focus:ring-2 focus:ring-[#C59B58]";

/** Mounted per conversation: filters and pending responses cannot cross threads. */
export function ConversationExplorer({
  conversationId,
  partnerName,
  onClose,
}: {
  conversationId: string;
  partnerName: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(defaults);
  const [applied, setApplied] = useState<Filters>(defaults);
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [reload, setReload] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const openPicker = dialog.current?.querySelector<HTMLElement>('[role="button"][aria-haspopup="dialog"][aria-expanded="true"]');
        if (openPicker) {
          event.preventDefault();
          openPicker.click();
          openPicker.focus();
          return;
        }
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, a[href], [tabindex="0"]',
        ) || [],
      ).filter(element => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      request.current?.abort();
      sequence.current++;
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);

  async function load(filters: Filters, cursor?: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const ticket = ++sequence.current;
    setBusy(true);
    setError("");
    if (!cursor) {
      setItems([]);
      setNextCursor(null);
    }
    try {
      const response = await api.get(
        `/chat/conversations/${conversationId}/explore`,
        {
          params: { ...filters, cursor },
          signal: controller.signal,
          headers: { "x-skip-cache": "1" },
        },
      );
      if (ticket !== sequence.current) return;
      const result = (response.data ?? response) as {
        items: ChatMessage[];
        nextCursor: string | null;
      };
      if (!Array.isArray(result.items)) throw new Error('Invalid conversation content');
      setItems((previous) => {
        const combined = cursor ? [...previous, ...result.items] : result.items;
        return [...new Map(combined.map((item) => [item.id, item])).values()];
      });
      setNextCursor(result.nextCursor);
    } catch {
      if (ticket === sequence.current && !controller.signal.aborted) {
        setError("Không tải được nội dung. Kiểm tra kết nối rồi thử lại.");
      }
    } finally {
      if (ticket === sequence.current) setBusy(false);
    }
  }

  useEffect(() => {
    if (!hasSearched) return;
    void load(applied);
    return () => {
      request.current?.abort();
      sequence.current++;
    };
    // load depends only on the conversation and the explicitly applied filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, conversationId, reload, hasSearched]);

  const update = (key: keyof Filters, value: string) => {
    setValidationError('');
    setDraft((old) => ({ ...old, [key]: value }));
  };

  const clearFilters = () => {
    request.current?.abort();
    sequence.current++;
    const reset = { ...defaults };
    setDraft(reset);
    setApplied(reset);
    setError("");
    setValidationError("");
    setNextCursor(null);
    setItems([]);
    setBusy(false);
    setHasSearched(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#231D15]/40 p-3 backdrop-blur-[2px] sm:p-6"
      onClick={onClose}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Kho nội dung hội thoại"
        onClick={(e) => e.stopPropagation()}
        className="relative flex min-h-0 w-full max-w-[720px] max-h-[calc(100dvh-48px)] flex-col overflow-hidden rounded-[24px] border border-[#EAE4D7] bg-[#FAF8F5] text-[#1A1612] shadow-[0_24px_80px_rgba(35,29,21,0.2)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng kho nội dung"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1A1612] hover:bg-[#F3EFE6]"
        >
          <X size={20} />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <header className="flex items-center gap-3 border-b border-[#EAE4D7] bg-white p-5 pr-16 sm:p-6 sm:pr-20">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]"><FileSearch className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-lg font-bold tracking-tight text-[#1A1612]">Kho nội dung hội thoại</h2>
            <p className="truncate text-sm text-[#7D715E]">{partnerName}</p>
          </div>
        </header>
        <form
          className="space-y-4 p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.from && draft.to && draft.from > draft.to) {
              setValidationError("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
              return;
            }
            setValidationError('');
            setApplied({ ...draft, q: draft.q.trim() });
            setHasSearched(true);
          }}
        >
          <label className="block text-xs text-[#7D715E]">
            Tìm nội dung hoặc tên tệp
            <input
              ref={input}
              className={`${field} mt-1`}
              value={draft.q}
              maxLength={200}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Ví dụ: kịch bản, báo giá, review..."
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs text-[#7D715E]">
              Loại nội dung
              <select
                className={`${field} mt-1`}
                value={draft.kind}
                onChange={(e) => update("kind", e.target.value)}
              >
                <option value="ALL">Tất cả nội dung</option>
                <option value="IMAGE">Hình ảnh</option>
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Tài liệu</option>
              </select>
            </label>
            <label className="text-xs text-[#7D715E]">
              Người gửi
              <select
                className={`${field} mt-1`}
                value={draft.sender}
                onChange={(e) => update("sender", e.target.value)}
              >
                <option value="ALL">Tất cả người gửi</option>
                <option value="ME">Do tôi gửi</option>
                <option value="OTHER">Người còn lại gửi</option>
              </select>
            </label>
            <label className="text-xs text-[#7D715E]">
              Từ ngày
              <DateTimePicker
                mode="date"
                compact
                className="mt-1"
                placeholder="Chọn ngày"
                popoverTitle="Chọn ngày bắt đầu"
                popoverPortalRef={dialog}
                value={draft.from}
                onChange={(value) => update("from", value)}
              />
            </label>
            <label className="text-xs text-[#7D715E]">
              Đến ngày
              <DateTimePicker
                mode="date"
                compact
                className="mt-1"
                placeholder="Chọn ngày"
                popoverTitle="Chọn ngày kết thúc"
                popoverPortalRef={dialog}
                minDateTime={draft.from || undefined}
                value={draft.to}
                onChange={(value) => update("to", value)}
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#C59B58] px-4 py-2 text-sm font-semibold text-[#231D15] hover:bg-[#B88E4F]">
              <Search size={16} />
              Tìm kiếm
            </button>
            <button
              type="button"
              onClick={clearFilters}
              aria-label="Đặt lại điều kiện lọc; nội dung hội thoại sẽ không bị xóa"
              className="cursor-pointer rounded-xl px-3 py-2 text-sm text-[#7D715E] transition-colors hover:bg-[#F3EFE6] hover:text-[#1A1612]"
            >
              Đặt lại bộ lọc
            </button>
            <button
              type="button"
              onClick={() => setReload((n) => n + 1)}
              aria-label="Làm mới kết quả"
              disabled={!hasSearched}
              className="ml-auto rounded-xl p-2 hover:bg-[#F3EFE6] disabled:opacity-40"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          {validationError && <p role="alert" className="text-sm text-[#DC2626]">{validationError}</p>}
        </form>
        {hasSearched && <div className="border-t border-[#EAE4D7] p-5 sm:p-6" aria-busy={busy}>
          <p className="mb-3 text-xs text-[#7D715E]" aria-live="polite">
            {busy ? "Đang tìm kiếm…" : `${items.length} kết quả${nextCursor ? ' đã tải' : ''}`}
            {nextCursor ? " · Còn kết quả phía sau" : ""}
          </p>
          {error && (
            <div
              role="alert"
              className="mb-3 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700"
            >
              {error}
              <button
                className="ml-2 underline"
                onClick={() => void load(applied, nextCursor || undefined)}
              >
                Thử lại
              </button>
            </div>
          )}
          {!busy && !error && items.length === 0 && (
            <div className="py-12 text-center text-[#7D715E]">
              <FileSearch className="mx-auto mb-3 h-10 w-10 text-[#C59B58]" />
              <p>Chưa có nội dung phù hợp.</p>
              <p className="mt-1 text-xs">
                Thử từ khóa ngắn hơn hoặc mở rộng khoảng ngày.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {items.map((item) => {
              const url = chatContentUrl(item.mediaUrl, window.location.href);
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#EAE4D7] bg-white p-4"
                >
                  <div className="mb-2 flex flex-wrap justify-between gap-1 text-xs">
                    <span className="font-semibold text-[#1A1612]">
                      {item.sender.fullName}
                    </span>
                    <time dateTime={item.createdAt} className="text-[#7D715E]">
                      {new Date(item.createdAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </time>
                  </div>
                  {item.messageText && (
                    <ChatExplorerContent text={item.messageText} query={applied.q} />
                  )}
                  {url && item.mediaType === "IMAGE" && (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        loading="lazy"
                        src={url}
                        alt={item.mediaName || "Ảnh đã chia sẻ"}
                        className="mt-3 max-h-52 rounded-xl object-contain"
                      />
                    </a>
                  )}
                  {url && item.mediaType === "VIDEO" && (
                    <video
                      src={url}
                      controls
                      preload="none"
                      className="mt-3 max-h-52 w-full rounded-xl"
                    />
                  )}
                  {item.mediaUrl && !url && <p className="mt-3 text-sm text-[#DC2626]">Liên kết tệp đính kèm không hợp lệ.</p>}
                  {url && item.mediaType !== 'IMAGE' && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-2 break-all rounded-xl bg-[#FBF5EB] p-3 text-sm text-[#7D715E]"
                    >
                      <ExternalLink size={16} className="shrink-0" />
                      <Highlight
                        text={item.mediaName || "Mở tệp đính kèm"}
                        query={applied.q}
                      />
                    </a>
                  )}
                </article>
              );
            })}
          </div>
          {busy && (
            <div
              role="status"
              className="flex items-center justify-center gap-2 py-6 text-sm text-[#7D715E]"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải nội dung...
            </div>
          )}
          {nextCursor && !busy && !error && (
            <button
              onClick={() => void load(applied, nextCursor)}
              className="mt-4 w-full rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] py-3 text-sm text-[#1A1612]"
            >
              Xem nội dung cũ hơn
            </button>
          )}
        </div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

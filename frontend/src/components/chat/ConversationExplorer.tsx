import { useEffect, useRef, useState } from "react";
import {
  FileSearch,
  Search,
  X,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import api from "@/services/api";
import type { ChatMessage } from "@/types/chat.types";

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

function safeMediaUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function Highlight({ text, query }: { text: string; query: string }) {
  const at = query
    ? text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase())
    : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-[#EEDFC6] text-[#1A1612]">
        {text.slice(at, at + query.length)}
      </mark>
      {text.slice(at + query.length)}
    </>
  );
}

function readableText(text: string) {
  try {
    const card = JSON.parse(text);
    if (card?.type)
      return (
        card.message ||
        card.productTitle ||
        card.campaignName ||
        "Thẻ nội dung được chia sẻ"
      );
  } catch {
    /* Ordinary text messages are not JSON. */
  }
  return text;
}

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
  const [reload, setReload] = useState(0);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const elements = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, a[href], [tabindex="0"]',
        ) || [],
      );
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
      const result = response.data as {
        items: ChatMessage[];
        nextCursor: string | null;
      };
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
    void load(applied);
    return () => {
      request.current?.abort();
      sequence.current++;
    };
    // load depends only on the conversation and the explicitly applied filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, conversationId, reload]);

  const update = (key: keyof Filters, value: string) =>
    setDraft((old) => ({ ...old, [key]: value }));
  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-[#231D15]/40"
      onClick={onClose}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Kho nội dung hội thoại"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col bg-[#FAF8F5] shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-[#EAE4D7] bg-white p-5">
          <FileSearch className="h-6 w-6 text-[#B88E4F]" />
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-[#1A1612]">Kho nội dung hội thoại</h2>
            <p className="truncate text-sm text-[#7D715E]">{partnerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng kho nội dung"
            className="rounded-xl p-2 hover:bg-[#F3EFE6]"
          >
            <X size={20} />
          </button>
        </header>
        <form
          className="space-y-3 border-b border-[#EAE4D7] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.from && draft.to && draft.from > draft.to) {
              setError("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
              return;
            }
            setApplied({ ...draft, q: draft.q.trim() });
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
          <div className="grid grid-cols-2 gap-3">
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
                <option value="OTHER">Đối tác gửi</option>
              </select>
            </label>
            <label className="text-xs text-[#7D715E]">
              Từ ngày
              <input
                type="date"
                className={`${field} mt-1`}
                value={draft.from}
                onChange={(e) => update("from", e.target.value)}
              />
            </label>
            <label className="text-xs text-[#7D715E]">
              Đến ngày
              <input
                type="date"
                min={draft.from || undefined}
                className={`${field} mt-1`}
                value={draft.to}
                onChange={(e) => update("to", e.target.value)}
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
              onClick={() => {
                setDraft(defaults);
                setApplied({ ...defaults });
              }}
              className="rounded-xl px-3 py-2 text-sm text-[#7D715E] hover:bg-[#F3EFE6]"
            >
              Xóa bộ lọc
            </button>
            <button
              type="button"
              onClick={() => setReload((n) => n + 1)}
              aria-label="Làm mới kết quả"
              className="ml-auto rounded-xl p-2 hover:bg-[#F3EFE6]"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <p className="text-xs text-[#7D715E]">
            Ngày theo giờ Việt Nam · Kết quả mới nhất trước
          </p>
        </form>
        <div className="flex-1 overflow-y-auto p-4" aria-busy={busy}>
          <p className="mb-3 text-xs text-[#7D715E]" aria-live="polite">
            Đã tải {items.length} nội dung
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
              const url = safeMediaUrl(item.mediaUrl);
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
                    <p className="whitespace-pre-wrap break-words text-sm text-[#1A1612]">
                      <Highlight
                        text={String(readableText(item.messageText))}
                        query={applied.q}
                      />
                    </p>
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
                  {url && (
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
          {nextCursor && !busy && (
            <button
              onClick={() => void load(applied, nextCursor)}
              className="mt-4 w-full rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] py-3 text-sm text-[#1A1612]"
            >
              Xem nội dung cũ hơn
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

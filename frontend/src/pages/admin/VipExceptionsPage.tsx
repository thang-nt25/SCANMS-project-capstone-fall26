import { useCallback, useEffect, useState, type FormEvent } from "react";
import api from "../../services/api";
import {
  requestError,
  unwrap,
} from "../../services/enterprise-pricing.service";
import { Modal } from "../../components/ui/Modal";
export default function VipExceptionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [approve, setApprove] = useState(true);
  const [note, setNote] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(
        unwrap(
          await api.get("/affiliate-deals/exceptions", {
            headers: { "x-skip-cache": "1" },
          }),
        ),
      );
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.patch(
        `/affiliate-deals/${selected.id}/exception-review`,
        { approve, note: note.trim() },
        { timeout: 95000 },
      );
      setSelected(null);
      await load();
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="space-y-5 bg-[#FAF8F5] p-6 text-[#1A1612]">
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Duyệt ngoại lệ VIP</h1>
          <p className="mt-2 text-sm text-[#7D715E]">
            Thỏa thuận trên 16% đã được đối tác chấp thuận. Trần cuối cùng 25%;
            chưa cấp link/coupon trong thời gian chờ.
          </p>
        </div>
        <button
          disabled={loading || busy}
          onClick={() => void load()}
          className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-2"
        >
          Làm mới
        </button>
      </header>
      {error && !selected && (
        <p role="alert" className="text-[#DC2626]">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải đề nghị…</p>
      ) : !items.length ? (
        <p className="text-[#7D715E]">Không có đề nghị chờ duyệt ngoại lệ.</p>
      ) : (
        items.map((item) => (
          <article
            key={item.id}
            className="space-y-3 rounded-2xl border border-[#EAE4D7] bg-white p-5"
          >
            <div className="flex justify-between gap-3">
              <h2 className="font-semibold">
                {item.store.name} · {item.collaborator.fullName}
              </h2>
              <strong className="text-xl text-[#B88E4F]">
                {Number(item.proposedCommissionRate)}%
              </strong>
            </div>
            <p>
              {item.scopeType === "STORE_WIDE"
                ? "Toàn gian hàng, bao gồm sản phẩm mới"
                : item.scopeType === "SELECTED_PRODUCTS"
                  ? item.scopeProducts
                      .map((entry: any) => entry.product.title)
                      .join(", ")
                  : item.product.title}
            </p>
            <p className="text-sm text-[#7D715E]">
              Doanh thu cam kết{" "}
              {Number(item.targetRevenue).toLocaleString("vi-VN")} đ /{" "}
              {item.commitmentDays} ngày
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {item.salesCommitment}
            </p>
            <div className="flex gap-2">
              {[true, false].map((decision) => (
                <button
                  key={String(decision)}
                  onClick={() => {
                    setSelected(item);
                    setApprove(decision);
                    setNote("");
                    setError("");
                  }}
                  className={
                    decision
                      ? "rounded-xl bg-[#C59B58] px-4 py-2 font-semibold hover:bg-[#B88E4F]"
                      : "rounded-xl border border-[#EAE4D7] px-4 py-2"
                  }
                >
                  {decision ? "Duyệt ngoại lệ" : "Từ chối"}
                </button>
              ))}
            </div>
          </article>
        ))
      )}
      {selected && (
        <Modal
          isOpen
          title={
            approve ? "Xác nhận duyệt ngoại lệ VIP" : "Từ chối ngoại lệ VIP"
          }
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
            <p>
              {selected.collaborator.fullName} ·{" "}
              {Number(selected.proposedCommissionRate)}% · {selected.store.name}
            </p>
            <label className="block">
              Căn cứ quyết định
              <textarea
                required
                minLength={10}
                maxLength={1000}
                disabled={busy}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#EAE4D7] p-3"
              />
            </label>
            {error && (
              <p role="alert" className="text-[#DC2626]">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[#C59B58] px-4 py-2 font-semibold disabled:opacity-50"
            >
              {busy ? "Đang xử lý…" : "Xác nhận quyết định"}
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}

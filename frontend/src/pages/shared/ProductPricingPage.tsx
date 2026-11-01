import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  pricingApi,
  requestError,
} from "../../services/enterprise-pricing.service";
import { Modal } from "../../components/ui/Modal";

const input =
  "mt-1 w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-sm text-[#1A1612] focus:border-[#C59B58] focus:outline-none";
const button =
  "rounded-xl bg-[#C59B58] px-4 py-2 font-semibold text-[#1A1612] hover:bg-[#B88E4F] disabled:opacity-50";
const money = (value: unknown) =>
  value == null
    ? "Chưa cấu hình"
    : `${Number(value).toLocaleString("vi-VN")} đ`;
const names: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt · chờ bắt đầu",
  ACTIVE: "Đang áp dụng",
  REJECTED: "Đã từ chối",
  EXPIRED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};
const localDate = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

/** Same pricing workspace, with reviewer actions controlled by the route and API. */
export default function ProductPricingPage({
  reviewer = false,
}: {
  reviewer?: boolean;
}) {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<
    "floor" | "promotion" | "review" | "cancel" | null
  >(null);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [price, setPrice] = useState("");
  const [floors, setFloors] = useState<Record<string, string>>({});
  const [budget, setBudget] = useState("1000000");
  const [startsAt, setStartsAt] = useState(
    localDate(new Date(Date.now() + 300000)),
  );
  const [endsAt, setEndsAt] = useState(
    localDate(new Date(Date.now() + 86400000)),
  );
  const [note, setNote] = useState("");
  const [approve, setApprove] = useState(true);
  const product = catalog.find((item) => item.id === productId);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [items, requests] = await Promise.all([
        pricingApi.catalog(),
        pricingApi.promotions(),
      ]);
      setCatalog(items);
      setPromotions(requests);
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function open(kind: typeof modal, item?: any, decision = true) {
    setSelected(item || null);
    setProductId(item?.id || catalog[0]?.id || "");
    setVariantId("");
    setPrice(kind === "floor" ? String(item?.floorPrice || "") : "");
    setFloors(
      Object.fromEntries(
        (item?.variants || []).map((variant: any) => [
          variant.id,
          String(variant.floorPrice ?? item?.floorPrice ?? ""),
        ]),
      ),
    );
    setNote("");
    setError("");
    setApprove(decision);
    setModal(kind);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (modal === "floor")
        await pricingApi.floor(productId, {
          floorPrice: Number(price),
          variants: Object.entries(floors)
            .filter(([, value]) => value !== "")
            .map(([variantId, value]) => ({
              variantId,
              floorPrice: Number(value),
            })),
          reason: note.trim(),
        });
      if (modal === "promotion")
        await pricingApi.create({
          productId,
          ...(variantId ? { variantId } : {}),
          proposedPrice: Number(price),
          budgetTotal: Number(budget),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          reason: note.trim(),
        });
      if (modal === "review")
        await pricingApi.review(selected.id, { approve, note: note.trim() });
      if (modal === "cancel") await pricingApi.cancel(selected.id);
      setModal(null);
      await load();
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="space-y-6 bg-[#FAF8F5] p-4 text-[#1A1612] sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {reviewer
              ? "Giá sàn & duyệt khuyến mãi"
              : "Giá bán & khuyến mãi sản phẩm"}
          </h1>
          <p className="mt-1 text-sm text-[#7D715E]">
            Giá tiền hàng sau giảm phải đạt MAP; ngân sách được giữ khi đặt đơn
            và hoàn khi hủy.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={button}
            disabled={loading || busy}
            onClick={() => void load()}
          >
            Làm mới
          </button>
          {!reviewer && (
            <button
              className={button}
              disabled={loading || !catalog.length}
              onClick={() => open("promotion")}
            >
              Đề xuất khuyến mãi
            </button>
          )}
        </div>
      </header>
      {error && !modal && (
        <p role="alert" className="text-[#DC2626]">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải giá và yêu cầu…</p>
      ) : (
        <>
          <section className="overflow-x-auto rounded-2xl border border-[#EAE4D7] bg-white">
            <table className="w-full min-w-[650px] text-left text-sm">
              <caption className="p-4 text-left font-semibold">
                Danh mục giá
              </caption>
              <thead className="bg-[#F3EFE6]">
                <tr>
                  {[
                    "Sản phẩm / gian hàng",
                    "Giá niêm yết",
                    "Giá hiện tại",
                    "Giá sàn MAP",
                    "Thao tác",
                  ].map((label) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.map((item) => (
                  <tr key={item.id} className="border-t border-[#EAE4D7]">
                    <td className="p-3 font-medium">
                      {item.title}
                      <p className="text-xs font-normal text-[#7D715E]">
                        {item.store?.name}
                      </p>
                    </td>
                    <td className="p-3">
                      {money(item.listPrice ?? item.price)}
                    </td>
                    <td className="p-3">{money(item.price)}</td>
                    <td className="p-3">{money(item.floorPrice)}</td>
                    <td className="p-3">
                      {reviewer ? (
                        <button
                          className={button}
                          onClick={() => open("floor", item)}
                        >
                          Cấu hình MAP
                        </button>
                      ) : (
                        <span className="text-xs text-[#7D715E]">
                          {item.variants.length} phân loại
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!catalog.length && (
              <p className="p-4 text-[#7D715E]">
                Chưa có sản phẩm trong phạm vi quản lý.
              </p>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Yêu cầu khuyến mãi</h2>
            {!promotions.length && (
              <p className="text-[#7D715E]">Chưa có yêu cầu.</p>
            )}
            {promotions.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[#EAE4D7] bg-white p-4"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {item.product.title}{" "}
                      {item.variant
                        ? `· ${item.variant.name}`
                        : "· Tất cả phân loại"}
                    </h3>
                    <p className="text-sm text-[#7D715E]">
                      {item.store.name} · {names[item.status] || item.status}
                    </p>
                  </div>
                  <strong>{money(item.proposedPrice)}</strong>
                </div>
                <p className="mt-2 text-sm">
                  {new Date(item.startsAt).toLocaleString("vi-VN")} →{" "}
                  {new Date(item.endsAt).toLocaleString("vi-VN")}
                </p>
                <p className="text-sm text-[#7D715E]">
                  Ngân sách: {money(item.budgetUsed)} /{" "}
                  {money(item.budgetTotal)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {item.reason}
                </p>
                {item.reviewNote && (
                  <p className="mt-2 text-sm text-[#7D715E]">
                    Phản hồi: {item.reviewNote}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  {reviewer && item.status === "PENDING" && (
                    <>
                      <button
                        className={button}
                        onClick={() => open("review", item)}
                      >
                        Duyệt
                      </button>
                      <button
                        className="rounded-xl border border-[#EAE4D7] px-4 py-2"
                        onClick={() => open("review", item, false)}
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  {["PENDING", "APPROVED", "ACTIVE"].includes(item.status) && (
                    <button
                      className="rounded-xl border border-[#EAE4D7] px-4 py-2"
                      onClick={() => open("cancel", item)}
                    >
                      Hủy khuyến mãi
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        </>
      )}
      {modal && (
        <Modal
          isOpen
          onClose={() => {
            if (!busy) setModal(null);
          }}
          title={
            modal === "floor"
              ? "Cấu hình giá sàn MAP"
              : modal === "promotion"
                ? "Đề xuất giá khuyến mãi"
                : modal === "cancel"
                  ? "Hủy khuyến mãi"
                  : approve
                    ? "Duyệt khuyến mãi"
                    : "Từ chối khuyến mãi"
          }
          maxWidth="lg"
        >
          <form className="space-y-4" onSubmit={submit} aria-busy={busy}>
            {modal === "promotion" && (
              <>
                <label className="block">
                  Sản phẩm
                  <select
                    className={input}
                    value={productId}
                    required
                    disabled={busy}
                    onChange={(e) => {
                      setProductId(e.target.value);
                      setVariantId("");
                    }}
                  >
                    {catalog.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.title} · {item.store?.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  Phạm vi phân loại
                  <select
                    className={input}
                    value={variantId}
                    disabled={busy}
                    onChange={(e) => setVariantId(e.target.value)}
                  >
                    <option value="">Tất cả phân loại</option>
                    {product?.variants.map((item: any) => (
                      <option value={item.id} key={item.id}>
                        {item.name} · MAP{" "}
                        {money(item.floorPrice ?? product.floorPrice)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    Bắt đầu
                    <input
                      className={input}
                      type="datetime-local"
                      value={startsAt}
                      required
                      disabled={busy}
                      onChange={(e) => setStartsAt(e.target.value)}
                    />
                  </label>
                  <label>
                    Kết thúc
                    <input
                      className={input}
                      type="datetime-local"
                      value={endsAt}
                      min={startsAt}
                      required
                      disabled={busy}
                      onChange={(e) => setEndsAt(e.target.value)}
                    />
                  </label>
                </div>
                <label className="block">
                  Ngân sách giảm giá (đ)
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    max="1000000000000"
                    className={input}
                    value={budget}
                    required
                    disabled={busy}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </label>
              </>
            )}
            {["floor", "promotion"].includes(modal) && (
              <label className="block">
                {modal === "floor" ? "Giá sàn chung (đ)" : "Giá khuyến mãi (đ)"}
                <input
                  aria-label="Giá cấu hình"
                  type="number"
                  min="1"
                  step="0.01"
                  max="1000000000000"
                  className={input}
                  value={price}
                  required
                  disabled={busy}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            )}
            {modal === "floor" &&
              product?.variants.map((variant: any) => (
                <label className="block" key={variant.id}>
                  MAP {variant.name} · niêm yết{" "}
                  {money(variant.listPrice ?? variant.price)}
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={floors[variant.id] || ""}
                    disabled={busy}
                    placeholder="Dùng giá sàn chung"
                    className={input}
                    onChange={(e) =>
                      setFloors((current) => ({
                        ...current,
                        [variant.id]: e.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            {modal === "cancel" ? (
              <p>
                Giá sẽ được tính lại theo các khuyến mãi còn hiệu lực. Đơn đã
                tạo giữ nguyên giá.
              </p>
            ) : (
              <label className="block">
                Căn cứ / lý do
                <textarea
                  className={input}
                  rows={3}
                  minLength={10}
                  maxLength={1000}
                  value={note}
                  required
                  disabled={busy}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            )}
            {error && (
              <p role="alert" className="text-[#DC2626]">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-xl border border-[#EAE4D7] px-4 py-2"
                onClick={() => setModal(null)}
              >
                Đóng
              </button>
              <button type="submit" disabled={busy} className={button}>
                {busy ? "Đang lưu…" : "Xác nhận"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}

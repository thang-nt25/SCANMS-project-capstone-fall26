import { useEffect, useRef, useState, type FormEvent } from "react";
import api from "../../services/api";
import { Modal } from "../ui/Modal";

type Choice = { id: string; fullName: string };
type ProductChoice = {
  id: string;
  title: string;
  storeId: string;
  moderationStatus: string;
  isActive: boolean;
};
interface Props {
  collaborator?: Choice;
  productId?: string;
  storeId?: string;
  onClose: () => void;
  onSuccess: (conversationId: string) => void;
  mode?: "offer" | "proposal";
  initialProductIds?: string[];
}
const field =
  "mt-1 w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-sm text-[#1A1612] focus:border-[#C59B58] focus:outline-none";

/** A product-specific VIP offer. Campaign invitations remain a separate action. */
export function ExclusiveOfferModal({
  collaborator,
  productId,
  storeId,
  onClose,
  onSuccess,
  mode = "offer",
  initialProductIds = [],
}: Props) {
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [creators, setCreators] = useState<Choice[]>([]);
  const [selectedProduct, setSelectedProduct] = useState(productId || "");
  const [selectedCreator, setSelectedCreator] = useState(
    collaborator?.id || "",
  );
  const [rate, setRate] = useState("11");
  const [targetRevenue, setTargetRevenue] = useState(10000000);
  const [scopeType, setScopeType] = useState(
    initialProductIds.length > 1 ? "SELECTED_PRODUCTS" : "SINGLE_PRODUCT",
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialProductIds);
  const [days, setDays] = useState(30);
  const [plan, setPlan] = useState(
    "Thực hiện video review sản phẩm và đạt mục tiêu đơn hàng trong kỳ cam kết.",
  );
  const [discount, setDiscount] = useState(5);
  const [budget, setBudget] = useState(1000000);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      api.get(mode === "proposal" ? "/referral-links/products" : "/products", {
        params: { limit: 100, ...(storeId ? { storeId } : {}) },
        headers: { "x-skip-cache": "1" },
      }),
      mode === "proposal" || collaborator
        ? Promise.resolve(null)
        : api.get("/chat/search-collaborators"),
    ])
      .then(([productResponse, creatorResponse]: any[]) => {
        if (!active) return;
        const body =
          productResponse?.data?.data ||
          productResponse?.data ||
          productResponse;
        const items = (Array.isArray(body) ? body : body?.items || [])
          .map((p: any) => ({
            ...p,
            storeId: p.storeId || p.store?.id,
            isActive: mode === "proposal" ? true : p.isActive,
            moderationStatus:
              mode === "proposal" ? "APPROVED" : p.moderationStatus,
          }))
          .filter(
            (p: ProductChoice) =>
              p.isActive &&
              p.moderationStatus === "APPROVED" &&
              (!storeId || p.storeId === storeId),
          );
        setProducts(items);
        setSelectedProduct((current) =>
          items.some((p: ProductChoice) => p.id === current)
            ? current
            : items[0]?.id || "",
        );
        const people = creatorResponse?.data || creatorResponse;
        setCreators(
          collaborator ? [collaborator] : Array.isArray(people) ? people : [],
        );
      })
      .catch(() => {
        if (active)
          setError(
            "Không tải được sản phẩm hoặc KOC. Đóng và mở lại để thử lại.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [collaborator, storeId, mode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      lock.current ||
      !selectedProduct ||
      (mode === "offer" && !selectedCreator)
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const ids = [...new Set([selectedProduct, ...selectedIds])];
      if (scopeType === "SELECTED_PRODUCTS" && ids.length < 2)
        throw new Error("Chọn ít nhất hai sản phẩm cùng gian hàng.");
      const response: any = await api.post(
        mode === "proposal"
          ? "/affiliate-deals/proposals"
          : "/affiliate-deals/offers",
        {
          ...(mode === "offer"
            ? {
                collaboratorId: selectedCreator,
                couponTerms: { discountPercent: discount, budgetTotal: budget },
              }
            : {}),
          productId: selectedProduct,
          proposedCommissionRate: Number(rate),
          scopeType,
          ...(scopeType === "SELECTED_PRODUCTS" ? { productIds: ids } : {}),
          targetRevenue,
          commitmentDays: days,
          videoReviewCommitment: true,
          salesCommitment: plan.trim(),
        },
        { timeout: 95000 },
      );
      const offer = response?.data?.data || response?.data || response;
      if (!offer?.conversationId)
        throw new Error("Phản hồi chưa có mã cuộc hội thoại.");
      onSuccess(offer.conversationId);
    } catch (caught: any) {
      const message = caught?.response?.data?.message || caught?.message;
      setError(
        Array.isArray(message)
          ? message.join(". ")
          : message || "Không gửi được đề nghị VIP.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy) onClose();
      }}
      title={
        mode === "proposal"
          ? "Đề xuất thỏa thuận VIP"
          : "Đề nghị thỏa thuận VIP"
      }
      subtitle="Đến 16%: đối tác chấp thuận. Trên 16%: chờ Admin duyệt ngoại lệ."
      maxWidth="lg"
      className="border-[#EAE4D7]"
    >
      <form
        onSubmit={submit}
        className="space-y-4 text-sm text-[#1A1612]"
        aria-busy={busy || loading}
      >
        {loading ? (
          <p role="status" className="text-[#7D715E]">
            Đang tải sản phẩm và KOC…
          </p>
        ) : (
          <>
            {mode === "offer" && (
              <label className="block">
                KOC nhận đề nghị
                <select
                  aria-label="KOC nhận đề nghị"
                  required
                  disabled={busy || Boolean(collaborator)}
                  value={selectedCreator}
                  onChange={(e) => setSelectedCreator(e.target.value)}
                  className={field}
                >
                  <option value="">Chọn KOC</option>
                  {creators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              Sản phẩm đại diện
              <select
                aria-label="Sản phẩm áp dụng"
                required
                disabled={busy}
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  setSelectedIds([]);
                }}
                className={field}
              >
                <option value="">Chọn sản phẩm đã duyệt</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Phạm vi áp dụng
              <select
                aria-label="Phạm vi VIP"
                value={scopeType}
                disabled={busy}
                onChange={(e) => setScopeType(e.target.value)}
                className={field}
              >
                <option value="SINGLE_PRODUCT">Một sản phẩm</option>
                <option value="SELECTED_PRODUCTS">Nhóm sản phẩm đã chọn</option>
                <option value="STORE_WIDE">
                  Toàn gian hàng, gồm sản phẩm mới sau này
                </option>
              </select>
            </label>
            {scopeType === "SELECTED_PRODUCTS" && (
              <fieldset className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-[#EAE4D7] p-3">
                <legend>Chọn sản phẩm cùng gian hàng</legend>
                {products
                  .filter(
                    (p) =>
                      p.storeId ===
                      products.find((item) => item.id === selectedProduct)
                        ?.storeId,
                  )
                  .map((p) => (
                    <label key={p.id} className="flex gap-2">
                      <input
                        type="checkbox"
                        checked={
                          p.id === selectedProduct || selectedIds.includes(p.id)
                        }
                        disabled={busy || p.id === selectedProduct}
                        onChange={(e) =>
                          setSelectedIds((ids) =>
                            e.target.checked
                              ? [...ids, p.id]
                              : ids.filter((id) => id !== p.id),
                          )
                        }
                      />
                      {p.title}
                    </label>
                  ))}
              </fieldset>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label>
                Thù lao VIP (%)
                <input
                  aria-label="Thù lao VIP"
                  type="number"
                  min="10"
                  max="25"
                  step="0.01"
                  required
                  disabled={busy}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className={field}
                />
              </label>
              <label>
                Mục tiêu doanh thu (đ)
                <input
                  aria-label="Mục tiêu doanh thu"
                  type="number"
                  min="1"
                  max="1000000000000"
                  step="0.01"
                  required
                  disabled={busy}
                  value={targetRevenue}
                  onChange={(e) => setTargetRevenue(Number(e.target.value))}
                  className={field}
                />
              </label>
              <label>
                Kỳ cam kết (ngày)
                <input
                  aria-label="Kỳ cam kết"
                  type="number"
                  min="1"
                  max="366"
                  required
                  disabled={busy}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className={field}
                />
              </label>
              {mode === "offer" && (
                <label>
                  Coupon giảm (%)
                  <input
                    aria-label="Coupon giảm"
                    type="number"
                    min="1"
                    max="20"
                    required
                    disabled={busy}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className={field}
                  />
                </label>
              )}
            </div>
            {mode === "offer" && (
              <label className="block">
                Ngân sách coupon (đ)
                <input
                  aria-label="Ngân sách coupon"
                  type="number"
                  min="1"
                  required
                  disabled={busy}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className={field}
                />
              </label>
            )}
            <label className="block">
              Cam kết video và kế hoạch bán hàng
              <textarea
                aria-label="Kế hoạch hợp tác"
                required
                minLength={5}
                maxLength={900}
                disabled={busy}
                rows={3}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className={field}
              />
            </label>
            <p className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#7D715E]">
              KPI tính doanh thu tiền hàng từ đơn đã hoàn tất trong phạm vi thỏa
              thuận, sau kỳ đối soát 14 ngày; loại phí ship và hàng hoàn. Bạn
              cam kết thực hiện video review. Link và coupon chỉ cấp sau khi
              duyệt xong, không đổi hoa hồng đơn cũ.{" "}
              {Number(rate) > 16 && (
                <strong>Mức này cần Admin duyệt ngoại lệ.</strong>
              )}
            </p>
          </>
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
            onClick={onClose}
            className="rounded-xl border border-[#EAE4D7] px-4 py-2"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={
              loading ||
              busy ||
              (mode === "offer" && !selectedCreator) ||
              !selectedProduct
            }
            className="rounded-xl bg-[#C59B58] px-4 py-2 font-semibold text-[#1A1612] hover:bg-[#B88E4F] disabled:opacity-50"
          >
            {busy ? "Đang gửi…" : "Gửi đề nghị VIP"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

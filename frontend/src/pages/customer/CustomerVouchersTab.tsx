import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Copy, Ticket, Store, Clock3 } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { formatMoney } from '../../utils/marketplace.utils';

interface AvailableVoucher {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  remainingUses: number | null;
  expiresAt: string | null;
  scopeType: string;
  fundingSource: string;
  benefitType: 'GOODS' | 'SHIPPING';
  store: { id: string; name: string; slug: string };
}

export function CustomerVouchersTab() {
  const [vouchers, setVouchers] = useState<AvailableVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/coupons/available', { headers: { 'x-skip-cache': 'true' } }),
      api.get('/coupons/saved', { headers: { 'x-skip-cache': 'true' } }),
      api.get('/coupons/saved/details', { headers: { 'x-skip-cache': 'true' } }),
    ]).then(([availableResponse, savedResponse, savedDetailsResponse]: any[]) => {
        const data = availableResponse?.data?.data || availableResponse?.data || availableResponse;
        const saved = savedResponse?.data?.data || savedResponse?.data || savedResponse;
        const savedDetails = savedDetailsResponse?.data?.data || savedDetailsResponse?.data || savedDetailsResponse;
        if (active) {
          const merged = [...(Array.isArray(data) ? data : []), ...(Array.isArray(savedDetails) ? savedDetails : [])];
          setVouchers([...new Map(merged.map((voucher: AvailableVoucher) => [voucher.id, voucher])).values()]);
          setSavedIds(Array.isArray(saved) ? saved : []);
        }
      })
      .catch(() => { if (active) setError('Chưa tải được voucher. Vui lòng thử lại sau.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggleSaved = async (voucher: AvailableVoucher) => {
    setSavingId(voucher.id);
    try {
      if (savedIds.includes(voucher.id)) {
        await api.delete(`/coupons/saved/${voucher.id}`);
        setSavedIds((ids) => ids.filter((id) => id !== voucher.id));
      } else {
        await api.post(`/coupons/saved/${voucher.id}`);
        setSavedIds((ids) => [...ids, voucher.id]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Chưa lưu được voucher. Vui lòng thử lại.');
    } finally {
      setSavingId('');
    }
  };

  const visibleVouchers = showSaved ? vouchers.filter((voucher) => savedIds.includes(voucher.id)) : vouchers;

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Đã sao chép mã ${code}`);
    } catch {
      toast.error('Chưa thể sao chép. Bạn có thể nhập mã khi thanh toán.');
    }
  };

  return (
    <section className="@container/vouchers grid gap-[14px] w-full max-w-[1120px] min-w-0 text-[#1A1612] text-left max-md:pb-[64px]" aria-labelledby="customer-vouchers-title">
      <header className="flex items-center gap-[11px] p-[4px_0_14px] border-b border-[#EAE4D7]">
        <span className="grid place-items-center shrink-0 w-[40px] h-[42px] border border-[#EEDFC6] rounded-[11px] bg-white text-[#B88E4F]" aria-hidden="true">
          <Ticket size={21} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-[9px]">
            <h1 id="customer-vouchers-title" className="m-0 font-inherit text-[20px] @max-[499px]:text-[19px] font-[650] leading-[1.4] tracking-[-0.4px] text-[#1A1612]">Kho voucher</h1>
            <span className="p-[3px_7px] rounded-[6px] bg-[#F3EFE6] text-[#7D715E] text-[11px] leading-[1.5] whitespace-nowrap">
              {vouchers.length} ưu đãi
            </span>
          </div>
          <p className="m-0 mt-[3px] text-[#7D715E] text-[12px] leading-[1.5]">Ưu đãi từ SCANMS và các gian hàng đối tác.</p>
        </div>
      </header>
      <div className="flex gap-2 pb-4">
        <button type="button" aria-pressed={!showSaved} onClick={() => setShowSaved(false)} className={`rounded-full px-4 py-1.5 text-xs font-semibold cursor-pointer transition ${!showSaved ? 'bg-[#C59B58] text-white' : 'bg-[#F3EFE6] text-[#1A1612] hover:bg-[#EAE4D7]'}`}>Tất cả ({vouchers.length})</button>
        <button type="button" aria-pressed={showSaved} onClick={() => setShowSaved(true)} className={`rounded-full px-4 py-1.5 text-xs font-semibold cursor-pointer transition ${showSaved ? 'bg-[#C59B58] text-white' : 'bg-[#F3EFE6] text-[#1A1612] hover:bg-[#EAE4D7]'}`}>Đã lưu ({savedIds.filter((id) => vouchers.some((voucher) => voucher.id === id)).length})</button>
      </div>
      {loading && <p className="text-xs text-[#7D715E] py-4">Đang tải voucher...</p>}
      {error && <p role="alert" className="text-xs text-[#DC2626] py-2">{error}</p>}
      {!loading && !error && visibleVouchers.length === 0 && <p className="text-xs text-[#7D715E] py-4">{showSaved ? 'Bạn chưa lưu voucher khả dụng nào.' : 'Hiện chưa có voucher khả dụng.'}</p>}
      <div className="grid grid-cols-2 @max-[899px]:grid-cols-1 items-start gap-[14px] min-w-0">
        {visibleVouchers.map((voucher) => {
          const copied = copiedCode === voucher.code;
          const value = voucher.discountType === 'PERCENTAGE'
            ? `${voucher.discountValue}%` : formatMoney(voucher.discountValue);
          const minimum = voucher.minimumOrderAmount > 0
            ? `Đơn từ ${formatMoney(voucher.minimumOrderAmount)}` : 'Không yêu cầu đơn tối thiểu';
          const expiry = voucher.expiresAt
            ? new Date(voucher.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn';
          return (
            <article className="grid grid-cols-[68px_minmax(0,1fr)_auto] @max-[499px]:grid-cols-[66px_minmax(0,1fr)] items-center gap-[10px_14px] @max-[499px]:gap-[10px_12px] min-w-0 p-[14px_16px_0] @max-[499px]:p-[14px_14px_0] border border-[#EAE4D7] hover:border-[#EEDFC6] rounded-[13px] bg-white shadow-[0_2px_5px_rgba(35,29,21,0.02)] transition-colors" key={voucher.id}>
              <div className="flex flex-col items-center justify-center gap-[4px] min-h-[68px] p-[8px_4px] border border-[#EEDFC6] rounded-[10px] bg-[#FBF5EB] text-[#B88E4F]">
                <strong className="text-[20px] @max-[499px]:text-[18px] leading-[1.15] tracking-[-0.8px] font-[650]">{value}</strong>
                <span className="text-[10px] leading-[1.5] text-[#7D715E]">{voucher.benefitType === 'SHIPPING' ? 'Cước GHN' : 'Tiền hàng'}</span>
              </div>
              <div className="grid gap-[3px] min-w-0">
                <span className="inline-flex items-center gap-[5px] text-[11px] leading-[1.5] text-[#B88E4F]">
                  <Store size={13} className="shrink-0" aria-hidden="true" />
                  {voucher.store.name}
                </span>
                <h2 className="m-0 font-inherit text-[14px] font-[600] leading-[1.45] break-words text-[#1A1612]">
                  {voucher.fundingSource === 'PLATFORM_FUNDED' ? 'Voucher sàn SCANMS' : 'Ưu đãi tại ' + voucher.store.name}
                </h2>
                <p className="m-0 text-[#7D715E] text-[11px] leading-[1.5]">{minimum}</p>
              </div>
              <div className="flex flex-col @max-[499px]:col-span-full @max-[499px]:flex-row @max-[499px]:items-center @max-[499px]:justify-between @max-[499px]:flex-wrap items-stretch gap-[5px] @max-[499px]:gap-[8px] min-w-0">
                <button
                  type="button"
                  disabled={savingId === voucher.id}
                  onClick={() => void toggleSaved(voucher)}
                  className="inline-flex items-center justify-center gap-[6px] min-h-[28px] px-2.5 py-1 border border-[#EEDFC6] rounded-[8px] text-[11px] font-semibold bg-[#FBF5EB] text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer disabled:opacity-50"
                >
                  {savedIds.includes(voucher.id) ? 'Bỏ lưu' : 'Lưu mã'}
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center justify-center gap-[6px] min-h-[28px] px-2.5 py-1 border rounded-[8px] text-[11px] font-[550] whitespace-nowrap cursor-pointer transition-colors ${
                    copied
                      ? 'border-[#C59B58] bg-[#FBF5EB] text-[#B88E4F]'
                      : 'border-transparent bg-white text-[#1A1612] hover:bg-[#FBF5EB] hover:border-[#C59B58]'
                  }`}
                  onClick={() => void copyCode(voucher.code)}
                  aria-label={`Sao chép mã ${voucher.code}`}
                  title={copied ? 'Đã sao chép' : 'Sao chép mã'}
                >
                  {copied ? <Check size={14} className="shrink-0 text-[#059669]" /> : <Copy size={14} className="shrink-0 text-[#B88E4F]" />}
                  <span className="tracking-[0.3px]">{voucher.code}</span>
                </button>
                <Link
                  className="inline-flex items-center justify-center gap-[6px] min-h-[28px] px-2.5 py-1 border border-[#EEDFC6] rounded-[8px] text-[11px] font-semibold bg-[#FBF5EB] text-[#1A1612] hover:border-[#C59B58] hover:bg-[#F3EFE6] transition whitespace-nowrap no-underline"
                  to={`/shop/${voucher.store.slug}`}
                >
                  <span>Dùng ngay</span>
                  <ArrowRight size={13} className="shrink-0 text-[#B88E4F]" />
                </Link>
              </div>
              <details className="col-span-full min-w-0 border-t border-[#EAE4D7] mt-0 group">
                <summary
                  className="flex items-center justify-between flex-wrap gap-[5px_10px] min-h-[34px] p-[8px_0] list-none text-[10px] leading-[1.5] text-[#7D715E] hover:text-[#B88E4F] cursor-pointer select-none [&::-webkit-details-marker]:hidden"
                  aria-label={`Điều kiện mã ${voucher.code}, hạn dùng ${expiry}`}
                >
                  <span className="inline-flex items-center gap-[5px]">
                    Điều kiện
                    <ChevronDown size={13} className="group-open:rotate-180 transition-transform duration-200" aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-[5px] whitespace-nowrap">
                    <Clock3 size={12} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
                    HSD: {expiry}
                  </span>
                </summary>
                <dl className="grid gap-[7px] m-[0_0_12px] p-[10px_12px] rounded-[8px] bg-[#FAF8F5] text-[11px] leading-[1.6]">
                  <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-[8px]">
                    <dt className="text-[#7D715E]">Áp dụng</dt>
                    <dd className="m-0 text-[#1A1612] break-words">{voucher.store.name}</dd>
                  </div>
                  <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-[8px]">
                    <dt className="text-[#7D715E]">Giá trị đơn</dt>
                    <dd className="m-0 text-[#1A1612] break-words">{minimum}</dd>
                  </div>
                  {voucher.maximumDiscountAmount !== null && (
                    <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-[8px]">
                      <dt className="text-[#7D715E]">Giảm tối đa</dt>
                      <dd className="m-0 text-[#1A1612] break-words">{formatMoney(voucher.maximumDiscountAmount)}</dd>
                    </div>
                  )}
                  {voucher.remainingUses !== null && (
                    <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-[8px]">
                      <dt className="text-[#7D715E]">Lượt còn</dt>
                      <dd className="m-0 text-[#1A1612] break-words">{voucher.remainingUses}</dd>
                    </div>
                  )}
                </dl>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}

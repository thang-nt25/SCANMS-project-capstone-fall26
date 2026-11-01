import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, MessageSquare, Crown } from 'lucide-react';
import { aiRecommendationService, type KolMatchResult } from '../../services/ai-recommendation.service';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';
import type { Product } from '../../services/product.service';
import { KolMatchRadar } from '../ai/KolMatchRadar';
import { ExclusiveOfferModal } from '../chat/ExclusiveOfferModal';

interface Props { product: Product | null; isOpen: boolean; onClose: () => void }

/** Product context is preserved; empty/denied requests never fall back to invented rankings. */
export function ProductAiMatchDrawer({ product, isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<KolMatchResult[]>([]);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [offering, setOffering] = useState<KolMatchResult | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen || !product?.id) return;
    let active = true;
    setLoading(true); setError(''); setRecommendations([]); setOffering(null);
    aiRecommendationService.getRecommendationsForProduct(product.id, { limit: 5 }, true)
      .then(result => {
        if (!active) return;
        if (result.targetProduct?.productId !== product.id || !Array.isArray(result.recommendedKols)) throw new Error('Kết quả gợi ý không khớp sản phẩm.');
        setRecommendations(result.recommendedKols);
      }).catch((caught: any) => { if (active) setError(caught?.response?.data?.message || caught?.message || 'Không tải được gợi ý KOC.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen, product?.id, reload]);
  useEffect(() => {
    if (!isOpen || offering) return;
    const previous = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = scroll; window.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [isOpen, offering, onClose]);
  if (!isOpen || !product) return null;
  return <>
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div ref={dialog} tabIndex={-1} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ai-drawer-title" className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-[#EAE4D7] bg-[#FAF8F5] shadow-xl outline-none">
        <header className="flex items-center justify-between border-b border-[#EAE4D7] bg-white p-4">
          <h2 id="ai-drawer-title" className="flex items-center gap-2 font-bold text-[#1A1612]"><Sparkles size={18} className="text-[#B88E4F]" />Gợi ý KOC cho sản phẩm</h2>
          <button type="button" onClick={onClose} aria-label="Đóng gợi ý KOC" className="rounded-lg p-2 text-[#7D715E] hover:bg-[#F3EFE6]"><X size={18} /></button>
        </header>
        <div className="flex items-center gap-3 border-b border-[#EAE4D7] bg-white p-4">
          <img className="h-14 w-14 rounded-xl border border-[#EAE4D7] object-cover" src={getSafeProductImageUrl(product.imageUrl)} alt="" />
          <div className="min-w-0"><p className="text-xs text-[#7D715E]">{product.categoryName}</p><h3 className="break-words font-semibold text-[#1A1612]">{product.title}</h3></div>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-busy={loading}>
          <p className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#7D715E]">Điểm 4 trục dùng để xếp hạng tham khảo, không phải xác suất chốt đơn. Độ đầy đủ dữ liệu hiển thị riêng cho từng KOC.</p>
          {loading ? <p role="status" className="py-8 text-center text-sm text-[#7D715E]">Đang phân tích…</p> : error ? <div role="alert" className="text-sm text-[#DC2626]"><p>{error}</p><button type="button" onClick={() => setReload(v => v + 1)} className="mt-2 rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-[#1A1612]">Thử lại</button></div> : recommendations.length === 0 ? <p className="py-8 text-center text-sm text-[#7D715E]">Chưa có KOC phù hợp với ngành hàng này.</p> : recommendations.map(kol => <article key={kol.collaboratorId} className="rounded-2xl border border-[#EAE4D7] bg-white p-4" data-kol-recommendation={kol.collaboratorId}>
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="break-words font-semibold text-[#1A1612]">{kol.fullName}</h4><p className="text-xs text-[#7D715E]">{kol.tierName}{kol.isRisingStar ? ' · Tiềm năng mới' : ''}</p></div><span className="shrink-0 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-1 font-bold text-[#B88E4F]">{kol.matchScore}/100</span></div>
            <KolMatchRadar scores={kol.scoreBreakdown} />
            {kol.scoringMode && <p className="text-xs text-[#7D715E]">{kol.scoringMode === 'COLD_START' ? 'Dưới 5 đơn: 70% ngành hàng + 30% quy mô kênh.' : 'Từ 5 đơn: 70% hiệu suất đơn hàng + 30% hồ sơ.'} Radar thể hiện các chỉ số thành phần.</p>}
            <dl className="grid grid-cols-3 gap-2 text-xs text-[#7D715E]"><div><dt>Đơn đã giao/hoàn tất</dt><dd className="mt-1 font-semibold text-[#1A1612]">{kol.lifetimeStats.totalOrders.toLocaleString('vi-VN')}</dd></div><div><dt>CR thực tế</dt><dd className="mt-1 font-semibold text-[#1A1612]">{kol.lifetimeStats.conversionRate}%</dd></div><div><dt>Dữ liệu</dt><dd className="mt-1 font-semibold text-[#1A1612]">{({ HIGH: 'Đầy đủ', MEDIUM: 'Trung bình', LOW: 'Còn ít' } as Record<string, string>)[kol.lifetimeStats.dataConfidence || 'LOW']}</dd></div></dl>
            <p className="mt-3 text-xs leading-relaxed text-[#7D715E]">{kol.aiReasoning}</p>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => navigate('/merchant/kol-hub?kol=' + encodeURIComponent(kol.collaboratorId) + '&tab=messages')} className="inline-flex items-center gap-1 rounded-xl border border-[#EAE4D7] px-3 py-2 text-xs text-[#1A1612]"><MessageSquare size={14} />Trao đổi hợp tác</button><button type="button" onClick={() => setOffering(kol)} className="inline-flex items-center gap-1 rounded-xl bg-[#C59B58] px-3 py-2 text-xs font-semibold text-[#1A1612] hover:bg-[#B88E4F]"><Crown size={14} />Đề nghị VIP</button></div>
          </article>)}
        </div>
        <footer className="border-t border-[#EAE4D7] bg-white p-4"><button type="button" onClick={() => navigate('/merchant/kol-hub?mode=ai-matching&productId=' + encodeURIComponent(product.id))} className="w-full rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2 text-sm font-semibold text-[#1A1612]">Mở trang so sánh KOC</button></footer>
      </div>
    </div>
    {offering && <ExclusiveOfferModal collaborator={{ id: offering.collaboratorId, fullName: offering.fullName }} productId={product.id} onClose={() => setOffering(null)} onSuccess={() => { setOffering(null); navigate('/merchant/kol-hub?kol=' + encodeURIComponent(offering.collaboratorId) + '&tab=messages'); }} />}
  </>;
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ClipboardCheck, ExternalLink, Eye, Image as ImageIcon, Package, RefreshCw, Search, Store, XCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { productService, type Product } from '../../services/product.service';
import { toast } from '../../utils/toast';
import { authService } from '../../services/auth.service';
import { isOwnProductSubmission } from '../../utils/product-moderation.policy';

type ModerationProduct = Product & {
  createdAt?: string;
  moderationStatus?: 'DRAFT' | 'APPROVED' | 'REJECTED';
  moderationReason?: string | null;
  moderatedAt?: string | null;
  store?: Product['store'] & {
    slug?: string;
    logoUrl?: string | null;
    owner?: { id: string; fullName?: string | null; email?: string | null };
  };
  mediaAssets?: Array<{ id: string; urlOrContent: string; title?: string | null }>;
  variants?: Array<{ id: string; name: string; sku: string; price: number | string | null; imageUrl?: string | null; stockQuantity: number }>;
};

type FilterStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'ALL';

const FILTERS: Array<{ value: FilterStatus; label: string }> = [
  { value: 'DRAFT', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: 'ALL', label: 'Tất cả' },
];

function extractItems(response: any): ModerationProduct[] {
  const body = response?.data ?? response;
  const items = Array.isArray(body) ? body : body?.items;
  return Array.isArray(items) ? items : [];
}

function money(value?: number) {
  return Number(value || 0).toLocaleString('vi-VN') + ' ₫';
}

function imageUrl(product: ModerationProduct) {
  return product.imageUrl || product.mediaAssets?.[0]?.urlOrContent || '';
}

export default function ProductModerationPage() {
  const actorId = authService.getCurrentUser()?.id;
  const [filter, setFilter] = useState<FilterStatus>('DRAFT');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ModerationProduct[]>([]);
  const [selected, setSelected] = useState<ModerationProduct | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<ModerationProduct | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [reviewTab, setReviewTab] = useState<'INFO' | 'EVIDENCE' | 'DESCRIPTION' | 'VARIANTS'>('INFO');
  useEffect(() => { setGalleryIndex(0); setReviewTab('INFO'); }, [selected?.id]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productService.getModerationProducts(filter);
      setProducts(extractItems(response));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Không tải được hàng đợi kiểm duyệt sản phẩm.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');
    if (!keyword) return products;
    return products.filter((product) => [
      product.title,
      product.sku,
      product.store?.name,
      product.store?.owner?.fullName,
      product.store?.owner?.email,
    ].some((value) => String(value || '').toLocaleLowerCase('vi-VN').includes(keyword)));
  }, [products, search]);

  const moderate = async (product: ModerationProduct, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    if (isOwnProductSubmission(product, actorId)) {
      toast.error('Hồ sơ do bạn tạo hoặc gửi. Cần người kiểm duyệt độc lập.'); return;
    }
    setSavingId(product.id);
    try {
      await productService.moderateProduct(product.id, status, reason);
      toast.success(status === 'APPROVED' ? 'Đã duyệt sản phẩm và đưa lên sàn.' : 'Đã từ chối sản phẩm và gửi lý do cho Shop.');
      setSelected(null);
      setRejectionTarget(null);
      setRejectionReason('');
      await loadProducts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Không thể lưu quyết định kiểm duyệt.');
    } finally {
      setSavingId(null);
    }
  };

  const submitRejection = (event: React.FormEvent) => {
    event.preventDefault();
    if (!rejectionTarget || rejectionReason.trim().length < 3) return;
    void moderate(rejectionTarget, 'REJECTED', rejectionReason.trim());
  };

  const isPending = selected?.moderationStatus === 'DRAFT';
  const gallery = selected
    ? [...new Set([selected.imageUrl, ...(selected.mediaAssets || []).map((asset) => asset.urlOrContent), ...(selected.subImages || []), ...(selected.variants || []).map((variant) => variant.imageUrl)].filter(Boolean) as string[])]
    : [];

  return (
    <div id="product-moderation-page" className="w-full min-w-0 text-[#1A1612] pb-6 space-y-3.5">
      <div className="flex items-center justify-between gap-2 pb-0.5">
        <span className="text-xs font-semibold text-[#7D715E]">
          Danh sách sản phẩm nội bộ cần thẩm định
        </span>
        <span className="whitespace-nowrap rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-1.5 text-[11px] font-semibold text-[#8C6226]">
          {loading ? 'Đang tải hồ sơ…' : `${filteredProducts.length} hồ sơ · ${FILTERS.find(item => item.value === filter)?.label}`}
        </span>
      </div>
      <div className="space-y-4">
        <section className="moderation-toolbar rounded-2xl border border-[#EAE4D7] bg-white p-3 sm:p-3.5">
          <div className="moderation-toolbar-row flex flex-wrap items-center justify-between gap-3.5">
            <div className="moderation-tabs flex flex-wrap gap-1 rounded-xl border border-[#EAE4D7] bg-[#F3EFE6] p-1 max-sm:w-full" role="group" aria-label="Lọc trạng thái kiểm duyệt">
              {FILTERS.map((item) => (
                <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className="min-h-9 cursor-pointer whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-[#7D715E] transition hover:bg-white hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58] aria-pressed:border-[#EEDFC6] aria-pressed:bg-white aria-pressed:text-[#8C6226] aria-pressed:shadow-sm max-sm:flex-1 max-sm:px-2 max-sm:text-[11px]">
                  {item.label}
                </button>
              ))}
            </div>
            <div className="moderation-filter-controls flex min-w-0 flex-[1_1_330px] items-center justify-end gap-2.5">
              <label className="moderation-search relative block min-w-0 max-w-[440px] flex-1 max-sm:max-w-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7D715E]" />
                <input aria-label="Tìm sản phẩm, SKU hoặc Shop" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm, SKU, Shop…" className="h-11 w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] py-2 pl-9 pr-3 text-xs outline-none focus:border-[#C59B58]" />
              </label>
              <button
                type="button"
                onClick={() => void loadProducts()}
                disabled={loading}
                aria-label={loading ? 'Đang tải danh sách sản phẩm' : 'Làm mới danh sách sản phẩm'}
                className="moderation-refresh inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3.5 py-2.5 text-xs font-semibold text-[#1A1612] transition hover:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58] disabled:cursor-wait disabled:opacity-60 max-sm:px-3 [&>span]:max-sm:hidden"
              >
                <RefreshCw className={'h-3.5 w-3.5 text-[#B88E4F]' + (loading ? ' animate-spin' : '')} />
                <span>{loading ? 'Đang tải…' : 'Làm mới'}</span>
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-12 text-center text-sm text-[#7D715E]">Đang tải hồ sơ sản phẩm...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="moderation-empty flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[#EAE4D7] bg-white px-6 py-10 text-center">
            <span className="moderation-empty-icon grid size-16 place-items-center rounded-[20px] border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]"><ClipboardCheck size={30} /></span>
            <p className="mt-4 font-bold">{search.trim() ? 'Không tìm thấy hồ sơ phù hợp' : 'Không có sản phẩm trong danh sách này'}</p>
            <p className="mt-2 text-sm text-[#7D715E]">{search.trim() ? 'Thử tìm bằng tên sản phẩm, mã SKU hoặc tên gian hàng khác.' : filter === 'DRAFT' ? 'Sản phẩm Shop gửi kiểm duyệt sẽ xuất hiện ở mục “Chờ duyệt”.' : 'Chọn trạng thái khác để xem các hồ sơ còn lại.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredProducts.map((product) => {
              const pending = product.moderationStatus === 'DRAFT';
              const rejected = product.moderationStatus === 'REJECTED';
              return (
                <article key={product.id} data-moderation-product={product.id} className="flex flex-col min-w-0 rounded-xl border border-[#EAE4D7] bg-white shadow-xs">
                  <div className="flex gap-3 p-4">
                    <div className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-lg border border-[#EAE4D7] bg-white">
                      {imageUrl(product) ? <img src={imageUrl(product)} alt={product.title} className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-[#B88E4F]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="moderation-product-meta flex flex-wrap items-center gap-1.5">
                        <span className="moderation-status inline-flex items-center gap-1 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-1 text-[10px] font-semibold leading-snug text-[#8C6226]">{pending ? <ClipboardCheck size={12} /> : rejected ? <XCircle size={12} /> : <BadgeCheck size={12} />}{pending ? 'Chờ duyệt' : rejected ? 'Đã từ chối' : 'Đã duyệt'}</span>
                        <span className="moderation-sku max-w-full truncate text-[10px] text-[#7D715E]" title={`SKU: ${product.sku || '—'}`}>SKU: {product.sku || '—'}</span>
                        {product.variants?.length ? <span className="moderation-variant-count text-[10px] text-[#7D715E]">{product.variants.length} SKU</span> : null}
                      </div>
                      <h2 className="moderation-product-title my-2 line-clamp-2 text-sm font-bold leading-relaxed text-[#1A1612]" title={product.title}>{product.title}</h2>
                      <p className="moderation-store flex min-w-0 items-center gap-1.5 text-[11px] text-[#7D715E] [&>svg]:shrink-0 [&>span]:truncate" title={product.store?.name}><Store size={13} /><span>{product.store?.name || 'Chưa có thông tin Shop'}</span></p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 px-4 py-2 border-t border-[#EAE4D7] text-xs">
                    <div><dt className="text-[#7D715E]">Giá bán</dt><dd className="font-semibold text-[#1A1612]">{money(product.price)}</dd></div>
                    <div><dt className="text-[#7D715E]">Tồn kho</dt><dd className="font-semibold text-[#1A1612]">{Number(product.stockQuantity || 0).toLocaleString('vi-VN')}</dd></div>
                    <div><dt className="text-[#7D715E]">Ngày gửi</dt><dd className="text-[#7D715E]">{product.createdAt ? new Date(product.createdAt).toLocaleDateString('vi-VN') : 'Chưa có thông tin'}</dd></div>
                  </dl>
                  {rejected && product.moderationReason && <p className="mx-4 mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Lý do từ chối: {product.moderationReason}</p>}
                  <div className="mt-auto mx-4 flex flex-wrap items-center gap-2 border-t border-[#EAE4D7] py-3">
                    <Button size="sm" variant="outline" icon={<Eye className="h-4 w-4" />} onClick={() => setSelected(product)}>Xem hồ sơ</Button>
                    {pending && <>
                      <Button className="text-[#DC2626] border-[#EAE4D7] hover:bg-rose-50 hover:border-rose-200" size="sm" variant="outline" disabled={savingId === product.id || isOwnProductSubmission(product, actorId)} icon={<XCircle className="h-4 w-4" />} onClick={() => { setRejectionTarget(product); setRejectionReason(''); }}>Từ chối</Button>
                      <Button size="sm" variant="dark" icon={<BadgeCheck className="h-4 w-4" />} loading={savingId === product.id} disabled={isOwnProductSubmission(product, actorId)} onClick={() => void moderate(product, 'APPROVED')}>Phê duyệt</Button>
                    </>}
                  </div>
                  {isOwnProductSubmission(product, actorId) && <p className="mx-4 mb-3 text-xs text-[#7D715E]">Hồ sơ do bạn tạo/gửi. Cần người kiểm duyệt khác.</p>}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Hồ sơ kiểm duyệt sản phẩm" subtitle={selected?.store?.name || 'Thông tin do Shop cung cấp'} icon={<ClipboardCheck className="h-5 w-5" />} maxWidth="3xl" stickyHeader className="moderation-review-modal max-w-[1020px]"
        footer={selected && <div className="moderation-review-footer flex flex-wrap items-center justify-between gap-3.5 py-1 [&>p]:max-w-[340px] [&>p]:text-[11px] [&>p]:leading-7 [&>p]:text-[#7D715E] [&>div]:flex [&>div]:flex-wrap [&>div]:gap-2 [&>div]:max-sm:w-full [&_button]:min-h-10 [&_button]:max-sm:flex-[1_1_150px]"><p>{isOwnProductSubmission(selected, actorId) ? 'Hồ sơ do bạn tạo/gửi. Cần người kiểm duyệt khác.' : isPending ? 'Sản phẩm chỉ lên sàn sau khi được duyệt.' : selected.moderationStatus === 'REJECTED' ? 'Hồ sơ đã bị từ chối.' : 'Hồ sơ đã được phê duyệt.'}</p>{isPending && <div><Button variant="outline" className="moderation-review-reject" disabled={savingId === selected.id || isOwnProductSubmission(selected, actorId)} icon={<XCircle size={14} />} onClick={() => { setRejectionTarget(selected); setRejectionReason(''); }}>Từ chối có lý do</Button><Button variant="gold" icon={<BadgeCheck size={14} />} loading={savingId === selected.id} disabled={isOwnProductSubmission(selected, actorId)} onClick={() => void moderate(selected, 'APPROVED')}>Phê duyệt sản phẩm</Button></div>}</div>}>
        {selected && <div className="moderation-review-content flex flex-col gap-5">
          <div className="moderation-review-overview grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <div className="moderation-review-gallery min-w-0">
              <div className="moderation-review-photo grid aspect-square place-items-center overflow-hidden rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] text-[#B88E4F] max-sm:max-h-[280px] [&>a]:size-full [&_img]:size-full [&_img]:object-contain">{gallery[galleryIndex] ? <a href={gallery[galleryIndex]} target="_blank" rel="noreferrer" aria-label="Mở ảnh sản phẩm lớn"><img src={gallery[galleryIndex]} alt={selected.title} /></a> : <ImageIcon size={40} />}</div>
              {gallery.length > 1 && <div className="moderation-review-thumbnails mt-2.5 flex gap-2 overflow-x-auto pb-1 [&>button]:size-13 [&>button]:shrink-0 [&>button]:cursor-pointer [&>button]:overflow-hidden [&>button]:rounded-lg [&>button]:border [&>button]:border-[#EAE4D7] [&>button]:bg-white [&>button[aria-pressed=true]]:border-2 [&>button[aria-pressed=true]]:border-[#C59B58] [&_img]:size-full [&_img]:object-contain">{gallery.map((url,index) => <button type="button" key={url} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={galleryIndex === index} onClick={() => setGalleryIndex(index)}><img src={url} alt={`Ảnh sản phẩm ${index + 1}`} /></button>)}</div>}
              <p className="moderation-review-image-hint mt-2.5 flex items-center gap-1.5 text-[10px] text-[#7D715E]"><ImageIcon size={13} />{gallery.length} ảnh sản phẩm · Bấm ảnh để phóng to</p>
            </div>
            <div className="moderation-review-workspace min-w-0">
            <div className="moderation-review-summary [&>h2]:mt-3 [&>h2]:mb-5 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:leading-relaxed [&>h2]:wrap-anywhere">
              <span className="moderation-status inline-flex items-center gap-1 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-1 text-[10px] font-semibold leading-snug text-[#8C6226]">{isPending ? 'Chờ duyệt' : selected.moderationStatus === 'REJECTED' ? 'Đã từ chối' : 'Đã duyệt'}</span>
              <h2>{selected.title}</h2>
              <dl className="moderation-review-facts grid grid-cols-2 gap-4 [&_dt]:mb-1.5 [&_dt]:text-[11px] [&_dt]:text-[#7D715E] [&_dd]:text-[13px] [&_dd]:font-semibold [&_dd]:wrap-anywhere">
                <div><dt>Giá bán</dt><dd className="moderation-review-price text-xl!">{money(selected.price)}</dd></div>
                <div><dt>Tồn kho</dt><dd>{Number(selected.stockQuantity || 0).toLocaleString('vi-VN')}</dd></div>
                <div><dt>SKU</dt><dd>{selected.sku || 'Chưa cung cấp'}</dd></div>
                <div><dt>Danh mục</dt><dd>{selected.categoryName || 'Chưa cung cấp'}</dd></div>
              </dl>
            </div>
            </div>
          </div>
          <div className="moderation-review-tabs flex flex-wrap gap-1.5 rounded-xl border border-[#EAE4D7] bg-[#F3EFE6] p-1.5" role="group" aria-label="Các nhóm thông tin hồ sơ">{([
            { value:'INFO', label:'Thông tin' }, { value:'EVIDENCE', label:'Minh chứng' }, { value:'DESCRIPTION', label:'Mô tả' }, { value:'VARIANTS', label:'Phân loại' },
          ] as const).map(tab => <button key={tab.value} type="button" className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#7D715E] transition aria-pressed:bg-white aria-pressed:text-[#8C6226] aria-pressed:shadow-sm focus-visible:outline-2 focus-visible:outline-[#C59B58] max-sm:flex-1 max-sm:px-2 max-sm:text-[11px] [&>span]:rounded [&>span]:bg-[#FBF5EB] [&>span]:px-1 [&>span]:text-[10px]" aria-pressed={reviewTab === tab.value} aria-controls="moderation-review-tab-content" onClick={() => setReviewTab(tab.value)}>{tab.label}{tab.value === 'VARIANTS' && <span>{selected.variants?.length || 0}</span>}</button>)}</div>
          <div id="moderation-review-tab-content" className="moderation-review-tab-content min-h-[150px]" role="region" aria-label={reviewTab === 'INFO' ? 'Thông tin sản phẩm và gian hàng' : reviewTab === 'EVIDENCE' ? 'Tài liệu minh chứng' : reviewTab === 'DESCRIPTION' ? 'Mô tả sản phẩm' : 'Phân loại sản phẩm'}>
            {reviewTab === 'INFO' && <div className="moderation-review-info-grid grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <section className="moderation-review-declarations [&>h3]:mb-3.5 [&>h3]:text-[13px] [&>h3]:font-bold [&>div]:grid [&>div]:gap-3.5"><h3>Thông tin công bố</h3><div><ReviewField title="Xuất xứ" value={selected.origin} /><ReviewField title="Thành phần" value={selected.ingredients} /><ReviewField title="Nhãn mác" value={selected.labelInfo} /></div></section>
              <div className="moderation-review-shop-card self-start rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] p-4 [&>span]:mb-3 [&>span]:flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:text-[11px] [&>span]:text-[#7D715E] [&>strong]:text-[13px] [&>strong]:leading-7 [&_dl]:mt-4 [&_dl]:grid [&_dl]:gap-3 [&_dt]:mb-1 [&_dt]:text-[10px] [&_dt]:text-[#7D715E] [&_dd]:text-xs [&_dd]:wrap-anywhere [&>p]:mt-4 [&>p]:border-t [&>p]:border-[#EAE4D7] [&>p]:pt-3 [&>p]:text-[10px] [&>p]:text-[#7D715E]"><span><Store size={16} />Gian hàng cung cấp</span><strong>{selected.store?.name || 'Chưa cung cấp'}</strong><dl><div><dt>Chủ gian hàng</dt><dd>{selected.store?.owner?.fullName || 'Chưa cung cấp'}</dd></div>{selected.store?.owner?.email && <div><dt>Email liên hệ</dt><dd>{selected.store.owner.email}</dd></div>}</dl><p>{selected.createdAt ? 'Gửi ngày ' + new Date(selected.createdAt).toLocaleString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh' }) : 'Chưa có ngày gửi hồ sơ'}</p></div>
            </div>}
            {reviewTab === 'EVIDENCE' && <div className="moderation-review-evidence grid grid-cols-1 gap-4 sm:grid-cols-2"><ProofReviewField title="Nguồn gốc / xuất xứ" links={selected.originProofLinks} images={selected.originProofImages} /><ProofReviewField title="Nhãn mác / thông tin công bố" links={selected.labelProofLinks} images={selected.labelProofImages} /></div>}
            {reviewTab === 'DESCRIPTION' && <ReviewField title="Nội dung mô tả sản phẩm" value={selected.description} />}
            {reviewTab === 'VARIANTS' && (selected.variants?.length ? <div className="moderation-review-variants grid gap-2.5 [&>div]:flex [&>div]:items-center [&>div]:gap-3 [&>div]:rounded-xl [&>div]:border [&>div]:border-[#EAE4D7] [&>div]:p-3 [&>div>div]:min-w-0 [&>div>div]:flex-1 [&_strong]:text-xs [&_p]:mt-1 [&_p]:text-[10px] [&_p]:text-[#7D715E] [&>div>span:last-child]:text-xs [&>div>span:last-child]:font-semibold">{selected.variants.map(variant => <div key={variant.id}><span className="moderation-review-variant-image grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#EAE4D7] text-[#B88E4F] [&>img]:size-full [&>img]:object-contain">{variant.imageUrl ? <img src={variant.imageUrl} alt={variant.name} /> : <ImageIcon size={20} />}</span><div><strong>{variant.name}</strong><p>SKU: {variant.sku} · Tồn: {Number(variant.stockQuantity || 0).toLocaleString('vi-VN')}</p></div><span>{money(Number(variant.price ?? selected.price))}</span></div>)}</div> : <div className="moderation-review-no-variants grid justify-items-center gap-3 rounded-2xl border border-dashed border-[#EEDFC6] bg-[#FBF5EB] p-6 text-center text-xs [&>p]:leading-7 [&>p]:text-[#7D715E]"><Package size={24} /><strong>Không có phân loại riêng</strong><p>Sản phẩm sử dụng SKU, giá bán và tồn kho trong phần tóm tắt.</p></div>)}
          </div>
          {selected.moderationStatus === 'REJECTED' && selected.moderationReason && <p className="moderation-rejection-note rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3.5 text-xs leading-7 text-[#1A1612]">Lý do từ chối: {selected.moderationReason}</p>}
        </div>}
      </Modal>

      <Modal isOpen={Boolean(rejectionTarget)} onClose={() => setRejectionTarget(null)} title="Từ chối sản phẩm" subtitle={rejectionTarget?.title} icon={<XCircle className="h-5 w-5" />} maxWidth="lg">
        <form onSubmit={submitRejection} className="space-y-4">
          <p className="text-sm text-[#7D715E]">Nêu rõ thông tin cần sửa hoặc tiêu chuẩn chưa đạt. Lý do này sẽ được gửi cho Shop và hiển thị trong quản lý sản phẩm.</p>
          <label className="block text-sm font-semibold">Lý do từ chối <span className="text-rose-600">*</span>
            <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} minLength={3} maxLength={1000} required rows={5} placeholder="Ví dụ: Thiếu thông tin thành phần hoặc xuất xứ chưa rõ ràng..." className="mt-1 w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3 py-2 text-sm outline-none focus:border-[#C59B58]" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRejectionTarget(null)}>Hủy</Button>
            <Button type="submit" variant="danger" loading={savingId === rejectionTarget?.id} disabled={rejectionReason.trim().length < 3 || isOwnProductSubmission(rejectionTarget, actorId)}>Gửi lý do & từ chối</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ReviewField({ title, value }: { title: string; value?: string | null }) {
  return (
    <section className="moderation-review-field [&>h4]:mb-1.5 [&>h4]:text-[11px] [&>h4]:font-semibold [&>h4]:text-[#7D715E] [&>p]:text-xs [&>p]:leading-7 [&>p]:whitespace-pre-wrap [&>p]:wrap-anywhere">
      <h4>{title}</h4>
      <p>{value?.trim() || <span className="moderation-review-missing italic text-[#7D715E]">Chưa cung cấp</span>}</p>
    </section>
  );
}

function ProofReviewField({ title, links = [], images = [] }: { title: string; links?: string[]; images?: string[] }) {
  const hasEvidence = links.length > 0 || images.length > 0;
  return (
    <div className="min-w-0 rounded-lg border border-[#EAE4D7] bg-white p-3">
      <h4 className="text-xs font-semibold text-[#1A1612]">{title}</h4>
      {!hasEvidence ? (
        <p className="mt-2 text-xs italic text-[#9A8E7C]">Shop chưa gửi minh chứng.</p>
      ) : (
        <>
          {links.length > 0 && <ul className="mt-2 space-y-1.5">{links.map((url, index) => <li key={`${url}-${index}`} className="truncate text-xs"><a href={url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-[#8C6226] underline underline-offset-2"><ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{url}</span></a></li>)}</ul>}
          {images.length > 0 && <div className="mt-2 grid grid-cols-4 gap-2">{images.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" aria-label={`Mở ảnh minh chứng ${index + 1}`} className="aspect-square overflow-hidden rounded-md border border-[#EAE4D7]"><img src={url} alt={`${title} ${index + 1}`} className="h-full w-full object-cover" /></a>)}</div>}
        </>
      )}
    </div>
  );
}

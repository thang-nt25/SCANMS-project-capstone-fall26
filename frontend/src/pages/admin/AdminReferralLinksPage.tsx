import { publicWebsiteUrl } from '@/utils/public-url';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Link2,
  MoreHorizontal,
  ShieldAlert,
  Search,
  User,
  Store,
  AlertCircle,
  Info,
  Loader2,
  CheckCircle2,
  Copy,
  ExternalLink,
  TrendingUp,
  ShoppingBag,
  Clock3,
  LockKeyhole,
  UnlockKeyhole,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { referralLinksService } from '../../services/referral-links.service';
import type { ReferralLinkItem } from '../../services/referral-links.service';
import { toast } from '../../utils/toast';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';

export default function AdminReferralLinksPage() {
  const [links, setLinks] = useState<ReferralLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);


  const [search, setSearch] = useState('');
  const [query,setQuery] = useState('');
  const [detailLink,setDetailLink] = useState<ReferralLinkItem|null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalLinks, setTotalLinks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);


  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState<{ link: ReferralLinkItem; top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const [unblockLink, setUnblockLink] = useState<ReferralLinkItem | null>(null);
  const [unblocking, setUnblocking] = useState(false);
  useEffect(() => {
    if (!actionMenu) return;
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node) && !menuTrigger.current?.contains(event.target as Node)) setActionMenu(null); };
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { setActionMenu(null); menuTrigger.current?.focus(); } };
    const dismiss = () => setActionMenu(null);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    menuRef.current?.querySelector('button')?.focus();
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); window.removeEventListener('scroll', dismiss, true); window.removeEventListener('resize', dismiss); };
  }, [actionMenu]);
  const [selectedLinkToBlock, setSelectedLinkToBlock] = useState<ReferralLinkItem | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  const fetchAdminLinks = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await referralLinksService.getAdminReferralLinks({
        page,
        limit: 10,
        status: statusFilter || undefined,
        channel: channelFilter || undefined,
        search: query || undefined,
      });
      setLinks(res.data);
      setTotalLinks(res.meta.total);
      setTotalPages(Math.max(1, Number(res.meta.totalPages) || 1));
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.status === 403) {
        setErrorMsg('Bạn không có quyền quản trị cấp sàn (SYSTEM_ADMIN hoặc SYSTEM_MANAGER) để truy cập dữ liệu liên kết tiếp thị này.');
      } else {
        setErrorMsg(err.message || 'Lỗi khi tải danh sách liên kết tiếp thị toàn hệ thống');
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, channelFilter, query]);

  useEffect(() => {
    fetchAdminLinks();
  }, [fetchAdminLinks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  };


  const handleOpenBlockModal = (link: ReferralLinkItem) => {
    setSelectedLinkToBlock(link);
    setBlockReason('');
    setIsBlockModalOpen(true);
  };


  const handleConfirmBlock = async () => {
    if (!selectedLinkToBlock || isSubmittingBlock || blockReason.trim().length < 5 || blockReason.trim().length > 255) return;
    setIsSubmittingBlock(true);
    try {
      await referralLinksService.blockLinkByAdmin(selectedLinkToBlock.id, blockReason.trim());
      setIsBlockModalOpen(false);
      setSelectedLinkToBlock(null);
      setBlockReason('');
      toast.success('Đã khóa liên kết tiếp thị vi phạm thành công');
      fetchAdminLinks();
    } catch (err: any) {
      toast.error(err.message || 'Không thể khóa liên kết tiếp thị này');
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleUnblock = async () => {
    if (!unblockLink || unblocking) return;
    setUnblocking(true);
    try {
      await referralLinksService.unblockLinkByAdmin(unblockLink.id);
      setUnblockLink(null);
      toast.success('Đã mở khóa liên kết tiếp thị');
      void fetchAdminLinks();
    } catch (err: any) {
      toast.error(err.message || 'Không thể mở khóa liên kết tiếp thị');
    } finally { setUnblocking(false); }
  };

  const handleCopy = async (shortCode: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(shortCode);
      toast.success('Đã sao chép liên kết');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Không thể sao chép liên kết. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    if (!isBlockModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmittingBlock) setIsBlockModalOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isBlockModalOpen, isSubmittingBlock]);

  return (
    <div id="admin-referral-links" className="grid gap-4 min-w-0 text-[#1A1612]">
      <div className="referral-summary-grid grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <article className="flex items-center gap-3 min-w-0 p-4 border border-[#EAE4D7] rounded-xl bg-white shadow-sm">
          <span className="hidden sm:grid place-items-center w-8.5 h-8.5 shrink-0 border border-[#EEDFC6] rounded-lg text-[#B88E4F] bg-white"><Link2 size={18} /></span>
          <div><p className="text-[#7D715E] text-xs leading-relaxed">{search || statusFilter || channelFilter ? 'Liên kết phù hợp' : 'Liên kết trên hệ thống'}</p><strong className="block mt-1 text-2xl font-semibold tabular-nums text-[#1A1612]">{totalLinks.toLocaleString('vi-VN')}</strong></div>
        </article>
        <article className="flex items-center gap-3 min-w-0 p-4 border border-[#EAE4D7] rounded-xl bg-white shadow-sm">
          <span className="hidden sm:grid place-items-center w-8.5 h-8.5 shrink-0 border border-[#EEDFC6] rounded-lg text-[#B88E4F] bg-white"><TrendingUp size={18} /></span>
          <div><p className="text-[#7D715E] text-xs leading-relaxed">Lượt nhấp ghi nhận{totalPages > 1 ? ' · trang ' + page : ''}</p><strong className="block mt-1 text-2xl font-semibold tabular-nums text-[#1A1612]">{links.reduce((sum, link) => sum + (link.totalClicks || 0), 0).toLocaleString('vi-VN')}</strong></div>
        </article>
        <article className="flex items-center gap-3 min-w-0 p-4 border border-[#EAE4D7] rounded-xl bg-white shadow-sm">
          <span className="hidden sm:grid place-items-center w-8.5 h-8.5 shrink-0 border border-[#EEDFC6] rounded-lg text-[#B88E4F] bg-white"><ShoppingBag size={18} /></span>
          <div><p className="text-[#7D715E] text-xs leading-relaxed">Đơn hàng chuyển đổi{totalPages > 1 ? ' · trang ' + page : ''}</p><strong className="block mt-1 text-2xl font-semibold tabular-nums text-[#1A1612]">{links.reduce((sum, link) => sum + (link.totalOrders || 0), 0).toLocaleString('vi-VN')}</strong></div>
        </article>
      </div>

      <div className="referral-workspace">
      <div className="referral-filter-toolbar">
        <form onSubmit={handleSearch} className="flex gap-2 min-w-0">
          <div className="relative min-w-0 flex-1">
            <Search size={15} aria-hidden="true" className="absolute left-3 top-3 text-[#7D715E] pointer-events-none" />
            <input id="admin-referral-search" aria-label="Tìm liên kết tiếp thị" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã link, sản phẩm hoặc nhãn…" className="w-full h-[38px] pl-8.5 pr-2.5 py-2 border border-[#EAE4D7] rounded-lg bg-white text-[#1A1612] text-xs outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#FBF5EB]" />
          </div>
        </form>
        <div className="referral-select-filters">
          <Select aria-label="Lọc trạng thái liên kết" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="w-full">
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="PAUSED">Tạm dừng</option>
            <option value="BLOCKED">Bị khóa</option>
            <option value="EXPIRED">Hết hạn</option>
          </Select>
          <Select aria-label="Lọc kênh tiếp thị" value={channelFilter} onChange={(event) => { setChannelFilter(event.target.value); setPage(1); }} className="w-full">
            <option value="">Tất cả kênh</option>
            <option value="TIKTOK">TikTok</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="ZALO">Zalo</option>
            <option value="OTHER">Khác</option>
          </Select>

        </div>
      </div>

      <section className="referral-list-section min-w-0 overflow-hidden bg-white" aria-label="Danh sách liên kết tiếp thị">
        {errorMsg ? (
          <div className="flex items-start gap-2.5 p-5 text-[#DC2626] text-xs leading-relaxed" role="alert"><AlertCircle size={18} className="shrink-0 mt-0.5" /><p>{errorMsg}</p></div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-2.5 py-12 px-5 text-[#7D715E] text-center" role="status"><Loader2 size={24} className="animate-spin text-[#B88E4F]" /><p className="text-xs">Đang tải liên kết tiếp thị…</p></div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 py-12 px-5 text-[#7D715E] text-center"><Link2 size={28} className="text-[#B88E4F]" /><h3 className="text-sm font-semibold text-[#1A1612]">Không tìm thấy liên kết</h3><p className="text-xs">Thử thay đổi từ khóa hoặc bộ lọc để xem kết quả.</p></div>
        ) : (
          <>
            <div className="referral-table-region" role="region" aria-label="Bảng liên kết tiếp thị">
              <table className="block w-full table-fixed border-collapse text-left lg:table [&_th]:px-3 [&_th]:text-xs [&_th]:font-medium [&_td]:min-w-0 [&_td]:p-3 [&_td]:align-middle [&_td]:text-xs">
                <caption className="sr-only">Liên kết tiếp thị trên hệ thống SCANMS</caption>
                <colgroup className="hidden lg:table-column-group"><col style={{width:'16%'}}/><col style={{width:'27%'}}/><col style={{width:'17%'}}/><col style={{width:'8%'}}/><col style={{width:'7%'}}/><col style={{width:'5%'}}/><col style={{width:'12%'}}/><col style={{width:'8%'}}/></colgroup>
                <thead className="hidden bg-[#FAF8F5] lg:table-header-group"><tr>
                  <th scope="col" className="h-11 px-3 py-2.5 border-b border-[#EAE4D7] text-[#7D715E] text-xs font-medium whitespace-nowrap">Mã link</th>
                  <th scope="col" className="h-11 px-3 py-2.5 border-b border-[#EAE4D7] text-[#7D715E] text-xs font-medium whitespace-nowrap">Sản phẩm & gian hàng</th>
                  <th scope="col" className="h-11 px-3 py-2.5 border-b border-[#EAE4D7] text-[#7D715E] text-xs font-medium whitespace-nowrap">KOL tiếp thị</th>
                  <th scope="col" className="h-11 px-3 py-2.5 border-b border-[#EAE4D7] text-[#7D715E] text-xs font-medium whitespace-nowrap">Nguồn</th>
                  <th scope="col" className="h-11 px-3 py-2.5 border-b border-[#EAE4D7] text-[#7D715E] text-xs font-medium whitespace-nowrap text-right">Lượt nhấp</th>
                  <th scope="col" className="h-11 px-3 py-2.5 border-b border-[#EAE4D7] text-[#7D715E] text-xs font-medium whitespace-nowrap text-right">Đơn</th>
                  <th scope="col" className="h-11 px-3 py-2.5 border-b border-[#EAE4D7] text-[#7D715E] text-xs font-medium whitespace-nowrap">Trạng thái</th>
                  <th scope="col" className="h-11 px-3 py-2.5 border-b border-[#EAE4D7] text-[#7D715E] text-xs font-medium whitespace-nowrap text-right">Thao tác</th>
                </tr></thead>
                <tbody className="block lg:table-row-group">
                  {links.map((link) => {
                    const fullUrl = publicWebsiteUrl('/r/' + link.shortCode);
                    const statusLabel = link.status === 'BLOCKED' ? 'Bị khóa' : link.status === 'PAUSED' ? 'Tạm dừng' : link.status === 'EXPIRED' ? 'Hết hạn' : 'Hoạt động';
                    return (
                      <tr key={link.id} className="grid min-h-[76px] grid-cols-2 items-center gap-y-1 border-b border-[#EAE4D7] transition-colors last:border-b-0 hover:bg-[#FAF8F5] lg:table-row">
                        <td data-label="Mã link" className="p-3 text-xs align-middle">
                          <div className="flex min-w-0 items-center gap-1">
                            <button type="button" className="min-w-0 flex-1 truncate text-left font-mono text-xs font-semibold text-[#805B27]" onClick={()=>setDetailLink(link)} title="Xem thông tin liên kết"><code className="whitespace-nowrap">{link.shortCode}</code></button>
                            <button type="button" onClick={() => { void handleCopy(link.shortCode, fullUrl); }} aria-label={'Sao chép liên kết ' + link.shortCode} title="Sao chép liên kết" className="grid place-items-center w-7 h-7 shrink-0 rounded text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#FBF5EB] cursor-pointer">
                              {copiedCode === link.shortCode ? <CheckCircle2 size={14} className="text-[#059669]" /> : <Copy size={14} />}
                            </button>
                            <a href={fullUrl} target="_blank" rel="noreferrer" aria-label={'Mở liên kết ' + link.shortCode + ' trong tab mới'} title="Mở liên kết" className="grid place-items-center w-7 h-7 shrink-0 rounded text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#FBF5EB] cursor-pointer"><ExternalLink size={13} /></a>
                          </div>
                          <p className="mt-0.5 truncate text-[#7D715E] text-[10px]">{new Date(link.createdAt).toLocaleDateString('vi-VN')}</p>
                        </td>
                        <td data-label="Sản phẩm & gian hàng" className="col-span-2 p-3 text-xs align-middle">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {link.product?.imageUrl && <img src={link.product.imageUrl} alt={link.product.title} onError={(event) => { event.currentTarget.classList.add('hidden'); event.currentTarget.nextElementSibling?.classList.remove('hidden'); }} className="w-10 h-10 shrink-0 border border-[#EAE4D7] rounded-lg bg-white object-contain" />}
                            <span className={'grid place-items-center w-10 h-10 shrink-0 border border-[#EAE4D7] rounded-lg bg-white text-[#B88E4F] ' + (link.product?.imageUrl ? 'hidden' : '')}><ShoppingBag size={18} /></span>
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-xs font-medium leading-relaxed" title={link.product?.title}>{link.product?.title || 'Sản phẩm không rõ'}</p>
                              <p className="flex items-center gap-1 mt-1 text-[#7D715E] text-[10px]"><Store size={11} className="text-[#B88E4F] shrink-0" /><span title={link.store?.name} className="truncate">{link.store?.name || 'Gian hàng'}</span></p>
                            </div>
                          </div>
                        </td>
                        <td data-label="KOL tiếp thị" className="p-3 text-xs align-middle">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="grid place-items-center w-8 h-8 shrink-0 border border-[#EEDFC6] rounded-full bg-white text-[#B88E4F] text-xs font-medium">{link.collaborator?.fullName?.charAt(0) || <User size={14} />}</span>
                            <div className="min-w-0"><p className="line-clamp-2 text-xs font-medium leading-relaxed" title={link.collaborator?.fullName}>{link.collaborator?.fullName || 'Ẩn danh'}</p><p className="truncate text-[#7D715E] text-[10px]" title={link.collaborator?.email}>{link.collaborator?.email || ''}</p></div>
                          </div>
                        </td>
                        <td data-label="Nguồn" className="p-3 text-xs align-middle">
                          <span className="inline-block max-w-full px-1.5 py-0.5 border border-[#EAE4D7] rounded bg-white text-[#7D715E] text-[10px] leading-normal">{({ TIKTOK: 'TikTok', FACEBOOK: 'Facebook', YOUTUBE: 'YouTube', INSTAGRAM: 'Instagram', ZALO: 'Zalo', OTHER: 'Khác' } as Record<string, string>)[link.channel || ''] || link.channel || 'Chưa xác định'}</span>
                          {link.utmSource && <p className="mt-0.5 truncate text-[#7D715E] text-[10px]" title={link.utmSource}>Nguồn: {link.utmSource}</p>}
                        </td>
                        <td data-label="Lượt nhấp" className="p-3 text-xs align-middle text-right tabular-nums">
                          <strong className="text-xs font-semibold">{(link.totalClicks || 0).toLocaleString('vi-VN')}</strong><p className="text-[10px] text-[#7D715E]">{(link.uniqueClicks || 0).toLocaleString('vi-VN')} duy nhất</p>
                        </td>
                        <td data-label="Đơn" className="p-3 text-xs align-middle text-right tabular-nums"><strong className="text-xs font-semibold">{(link.totalOrders || 0).toLocaleString('vi-VN')}</strong></td>
                        <td data-label="Trạng thái" className="p-3 text-xs align-middle">
                          <span className={'inline-flex items-center gap-1.5 text-xs leading-5 whitespace-nowrap ' + (link.status === 'BLOCKED' ? 'text-[#DC2626]' : 'text-[#655A49]')}>
                            {link.status === 'BLOCKED' ? <ShieldAlert size={12} className="text-[#DC2626] shrink-0" /> : link.status === 'PAUSED' ? <Clock3 size={12} className="text-[#B88E4F] shrink-0" /> : link.status !== 'EXPIRED' ? <CheckCircle2 size={12} className="text-[#059669] shrink-0" /> : null}
                            {statusLabel}
                          </span>
                          {link.status === 'BLOCKED' && link.disabledReason && <p className="line-clamp-2 mt-1 text-[#DC2626] text-[10px]" title={link.disabledReason}>{link.disabledReason}</p>}
                        </td>
                        <td data-label="Thao tác" className="p-3 text-xs align-middle text-right">
                          <button type="button" aria-label={`Thao tác liên kết ${link.shortCode}`} aria-haspopup="dialog" aria-expanded={actionMenu?.link.id === link.id} onClick={(event) => {
                            if (actionMenu?.link.id === link.id) { setActionMenu(null); return; }
                            menuTrigger.current = event.currentTarget;
                            const rect = event.currentTarget.getBoundingClientRect();
                            setActionMenu({ link, left: Math.max(8, Math.min(rect.right - 208, window.innerWidth - 216)), top: rect.bottom + 58 < window.innerHeight ? rect.bottom + 6 : rect.top - 58 });
                          }} className="inline-flex size-[34px] items-center justify-center rounded-lg border border-[#EAE4D7] bg-white text-[#655A49] hover:bg-[#FBF5EB]"><MoreHorizontal size={17} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-between items-center gap-2.5 p-3 border-t border-[#EAE4D7] text-[#7D715E] text-xs">
              <span>{links.length} / {totalLinks.toLocaleString('vi-VN')} liên kết · Trang {page}</span>
              {totalPages > 1 && <div className="flex items-center gap-2.5">
                <button type="button" aria-label="Trang trước" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="grid place-items-center w-7 h-7 border border-[#EAE4D7] rounded bg-white text-[#7D715E] hover:border-[#C59B58] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"><ChevronLeft size={14} /></button>
                <span>{page} / {totalPages}</span>
                <button type="button" aria-label="Trang tiếp" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} className="grid place-items-center w-7 h-7 border border-[#EAE4D7] rounded bg-white text-[#7D715E] hover:border-[#C59B58] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"><ChevronRight size={14} /></button>
              </div>}
            </div>
          </>
        )}
      </section>
      </div>

      {detailLink && <Modal isOpen onClose={()=>setDetailLink(null)} title="Thông tin liên kết" subtitle={detailLink.shortCode} maxWidth="lg" stickyHeader><dl className="referral-detail-facts">{[['Tiêu đề',detailLink.label],['Sản phẩm',detailLink.product?.title],['Cửa hàng',detailLink.store?.name],['KOL',detailLink.collaborator?.fullName],['Kênh',detailLink.channel],['UTM source',detailLink.utmSource],['UTM medium',detailLink.utmMedium],['UTM campaign',detailLink.utmCampaign],['UTM content',detailLink.utmContent],['Ngày tạo',new Date(detailLink.createdAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})],['Hết hạn',detailLink.expiresAt?new Date(detailLink.expiresAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Không thiết lập']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Chưa có thông tin'}</dd></div>)}</dl></Modal>}

      {actionMenu && createPortal(
        <div ref={menuRef} role="dialog" aria-label="Thao tác liên kết" style={{ top: actionMenu.top, left: actionMenu.left }} className="fixed z-[60] w-52 rounded-lg border border-[#EAE4D7] bg-white p-1.5 shadow-lg">
          <button type="button" onClick={() => { const link = actionMenu.link; setActionMenu(null); if (link.status === 'BLOCKED') setUnblockLink(link); else handleOpenBlockModal(link); }} className={`flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] hover:bg-[#FAF8F5] ${actionMenu.link.status === 'BLOCKED' ? 'text-[#8F682E]' : 'text-[#DC2626]'}`}>
            {actionMenu.link.status === 'BLOCKED' ? <UnlockKeyhole size={15} /> : <LockKeyhole size={15} />}{actionMenu.link.status === 'BLOCKED' ? 'Mở khóa liên kết' : 'Khóa liên kết'}
          </button>
        </div>, document.body
      )}
      {isBlockModalOpen && selectedLinkToBlock && (
        <Modal isOpen title="Khóa liên kết tiếp thị" maxWidth="xl" className="max-w-[520px]" stickyHeader bodyClassName="p-5 sm:p-5" onClose={() => { if (!isSubmittingBlock) setIsBlockModalOpen(false); }}
          footer={<div className="flex justify-end gap-2">
            <button type="button" disabled={isSubmittingBlock} onClick={() => setIsBlockModalOpen(false)} className="h-10 rounded-lg border border-[#EAE4D7] bg-white px-5 text-sm text-[#655A49] disabled:opacity-50">Hủy</button>
            <button type="submit" form="block-referral-form" disabled={isSubmittingBlock || blockReason.trim().length < 5 || blockReason.trim().length > 255} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#DC2626] px-5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50">{isSubmittingBlock && <Loader2 size={15} className="animate-spin" />}{isSubmittingBlock ? 'Đang khóa…' : 'Khóa liên kết'}</button>
          </div>}>
          <form id="block-referral-form" onSubmit={(event) => { event.preventDefault(); void handleConfirmBlock(); }} className="space-y-4">
            <div className="flex items-center gap-3">
              {selectedLinkToBlock.product?.imageUrl ? <img src={selectedLinkToBlock.product.imageUrl} alt="" className="size-9 shrink-0 rounded-lg border border-[#EAE4D7] object-contain" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} /> : <ShoppingBag size={28} className="shrink-0 text-[#B88E4F]" />}
              <div className="min-w-0"><p className="m-0 text-sm font-semibold leading-5">{selectedLinkToBlock.product?.title || 'Chưa có thông tin sản phẩm'}</p><p className="m-0 mt-1 text-xs text-[#7D715E]">{selectedLinkToBlock.store?.name || 'Chưa có thông tin cửa hàng'}</p></div>
            </div>
            <dl className="m-0 space-y-2 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-[#7D715E]">KOL</dt><dd className="m-0 text-right font-medium">{selectedLinkToBlock.collaborator?.fullName || 'Chưa cập nhật'}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-[#7D715E]">Mã link</dt><dd className="m-0 inline-flex items-center gap-2"><code className="font-semibold text-[#805B27]">{selectedLinkToBlock.shortCode}</code><button type="button" aria-label="Sao chép liên kết đang chọn" className="flex size-7 items-center justify-center rounded hover:bg-[#FBF5EB]" onClick={() => void handleCopy(selectedLinkToBlock.shortCode, publicWebsiteUrl('/r/' + selectedLinkToBlock.shortCode))}><Copy size={14} /></button></dd></div>
            </dl>
            <p className="m-0 flex items-center gap-2 rounded-lg bg-[#FBF5EB] px-3 py-2 text-xs leading-5 text-[#7D715E]"><Info size={15} className="shrink-0" />Link sẽ ngừng hoạt động sau khi khóa.</p>
            <div><label htmlFor="admin-referral-block-reason" className="mb-1.5 block text-[13px] font-medium">Lý do khóa <span className="text-[#DC2626]">*</span></label><textarea id="admin-referral-block-reason" required minLength={5} maxLength={255} rows={3} value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Mô tả căn cứ khóa liên kết…" className="h-20 w-full resize-y rounded-lg border border-[#EAE4D7] bg-white p-3 text-[13px] leading-5 outline-none focus:border-[#C59B58]" /><p className="m-0 mt-1 flex justify-between text-[11px] text-[#7D715E]"><span>5–255 ký tự</span><span className="tabular-nums">{blockReason.length}/255</span></p></div>
          </form>
        </Modal>
      )}
      {unblockLink && <Modal isOpen title="Mở khóa liên kết" maxWidth="lg" stickyHeader onClose={() => { if (!unblocking) setUnblockLink(null); }} footer={<div className="flex justify-end gap-2"><button type="button" disabled={unblocking} onClick={() => setUnblockLink(null)} className="h-10 rounded-lg border border-[#EAE4D7] px-4 text-sm">Hủy</button><button type="button" disabled={unblocking} onClick={() => void handleUnblock()} className="h-10 rounded-lg bg-[#C59B58] px-4 text-sm font-semibold text-[#231D15] disabled:opacity-50">{unblocking ? 'Đang mở khóa…' : 'Mở khóa liên kết'}</button></div>}><p className="text-sm leading-6">Cho phép liên kết <strong className="font-mono">{unblockLink.shortCode}</strong> hoạt động trở lại.</p></Modal>}

    </div>
  );
}

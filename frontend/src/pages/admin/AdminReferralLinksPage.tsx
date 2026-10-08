import { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  ShieldAlert,
  Search,
  User,
  Store,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
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
import './AdminReferralLinksPage.css';

export default function AdminReferralLinksPage() {
  const [links, setLinks] = useState<ReferralLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);


  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalLinks, setTotalLinks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);


  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedLinkToBlock, setSelectedLinkToBlock] = useState<ReferralLinkItem | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  const fetchAdminLinks = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await referralLinksService.getAdminReferralLinks({
        page,
        limit: 20,
        status: statusFilter || undefined,
        channel: channelFilter || undefined,
        search: search.trim() || undefined,
      });
      setLinks(res.data);
      setTotalLinks(res.meta.total);
      setTotalPages(Math.max(1, Number(res.meta.totalPages) || 1));
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.status === 403) {
        setErrorMsg('Bạn không có quyền quản trị cấp sàn (SYSTEM_ADMIN hoặc SYSTEM_MANAGER) để truy cập dữ liệu liên kết tiếp thị này.');
      } else {
        setErrorMsg(err.message || 'Lỗi khi tải danh sách liên kết tiếp thị toàn sàn');
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, channelFilter, search]);

  useEffect(() => {
    fetchAdminLinks();
  }, [fetchAdminLinks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAdminLinks();
  };


  const handleOpenBlockModal = (link: ReferralLinkItem) => {
    setSelectedLinkToBlock(link);
    setBlockReason('');
    setIsBlockModalOpen(true);
  };


  const handleConfirmBlock = async () => {
    if (!selectedLinkToBlock || !blockReason.trim()) return;
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

  const handleUnblock = async (link: ReferralLinkItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn mở khóa liên kết ${link.shortCode} không?`)) return;
    try {
      await referralLinksService.unblockLinkByAdmin(link.id);
      toast.success('Đã mở khóa liên kết tiếp thị thành công');
      fetchAdminLinks();
    } catch (err: any) {
      toast.error(err.message || 'Không thể mở khóa liên kết tiếp thị');
    }
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
    <div className="admin-referrals-page">
      <div className="admin-referral-metrics">
        <article>
          <span className="admin-referral-metric-icon"><Link2 size={18} /></span>
          <div><p>{search || statusFilter || channelFilter ? 'Liên kết phù hợp' : 'Liên kết trên sàn'}</p><strong>{totalLinks.toLocaleString('vi-VN')}</strong></div>
        </article>
        <article>
          <span className="admin-referral-metric-icon"><TrendingUp size={18} /></span>
          <div><p>Lượt nhấp ghi nhận{totalPages > 1 ? ' · trang ' + page : ''}</p><strong>{links.reduce((sum, link) => sum + (link.totalClicks || 0), 0).toLocaleString('vi-VN')}</strong></div>
        </article>
        <article>
          <span className="admin-referral-metric-icon"><ShoppingBag size={18} /></span>
          <div><p>Đơn hàng chuyển đổi{totalPages > 1 ? ' · trang ' + page : ''}</p><strong>{links.reduce((sum, link) => sum + (link.totalOrders || 0), 0).toLocaleString('vi-VN')}</strong></div>
        </article>
      </div>

      <div className="admin-referral-toolbar">
        <form onSubmit={handleSearch} className="admin-referral-search">
          <div>
            <Search size={15} aria-hidden="true" />
            <input id="admin-referral-search" aria-label="Tìm liên kết tiếp thị" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã link, sản phẩm hoặc nhãn…" />
          </div>
          <button type="submit">Tìm</button>
        </form>
        <div className="admin-referral-filters">
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
          <button type="button" className="admin-referral-refresh" onClick={() => fetchAdminLinks()} disabled={loading} title="Làm mới dữ liệu">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
        </div>
      </div>

      <section className="admin-referral-panel" aria-label="Danh sách liên kết tiếp thị">
        {errorMsg ? (
          <div className="admin-referral-error" role="alert"><AlertCircle size={18} /><p>{errorMsg}</p></div>
        ) : loading ? (
          <div className="admin-referral-empty" role="status"><Loader2 size={24} className="animate-spin" /><p>Đang tải liên kết tiếp thị…</p></div>
        ) : links.length === 0 ? (
          <div className="admin-referral-empty"><Link2 size={28} /><h3>Không tìm thấy liên kết</h3><p>Thử thay đổi từ khóa hoặc bộ lọc để xem kết quả.</p></div>
        ) : (
          <>
            <div className="admin-referral-table-region" role="region" tabIndex={0} aria-label="Bảng liên kết tiếp thị">
              <table className="admin-referral-table">
                <caption className="sr-only">Liên kết tiếp thị trên sàn SCANMS</caption>
                <colgroup>
                  <col style={{ width: '170px' }} /><col /><col style={{ width: '180px' }} /><col style={{ width: '110px' }} />
                  <col style={{ width: '90px' }} /><col style={{ width: '60px' }} /><col style={{ width: '115px' }} /><col style={{ width: '105px' }} />
                </colgroup>
                <thead><tr>
                  <th scope="col">Mã link</th><th scope="col">Sản phẩm & gian hàng</th><th scope="col">KOL tiếp thị</th><th scope="col">Kênh / UTM</th>
                  <th scope="col" className="admin-referral-numeric">Nhấp</th><th scope="col" className="admin-referral-numeric">Đơn</th><th scope="col">Trạng thái</th><th scope="col" className="admin-referral-action-cell">Thao tác</th>
                </tr></thead>
                <tbody>
                  {links.map((link) => {
                    const fullUrl = window.location.origin + '/r/' + link.shortCode;
                    const statusLabel = link.status === 'BLOCKED' ? 'Bị khóa' : link.status === 'PAUSED' ? 'Tạm dừng' : link.status === 'EXPIRED' ? 'Hết hạn' : 'Hoạt động';
                    return (
                      <tr key={link.id}>
                        <td data-label="Mã link" className="admin-referral-code-cell">
                          <div className="admin-referral-code-row">
                            <code>{link.shortCode}</code>
                            <button type="button" onClick={() => { void handleCopy(link.shortCode, fullUrl); }} aria-label={'Sao chép liên kết ' + link.shortCode} title="Sao chép liên kết">
                              {copiedCode === link.shortCode ? <CheckCircle2 size={14} className="admin-referral-copied" /> : <Copy size={14} />}
                            </button>
                            <a href={fullUrl} target="_blank" rel="noreferrer" aria-label={'Mở liên kết ' + link.shortCode + ' trong tab mới'} title="Mở liên kết"><ExternalLink size={13} /></a>
                          </div>
                          {link.label && <p className="admin-referral-label" title={link.label}>{link.label.replaceAll('_', ' ')}</p>}
                          <p className="admin-referral-secondary">{new Date(link.createdAt).toLocaleDateString('vi-VN')}</p>
                        </td>
                        <td data-label="Sản phẩm & gian hàng" className="admin-referral-product-cell">
                          <div className="admin-referral-identity">
                            {link.product?.imageUrl && <img src={link.product.imageUrl} alt={link.product.title} onError={(event) => { event.currentTarget.classList.add('hidden'); event.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />}
                            <span className={'admin-referral-product-placeholder ' + (link.product?.imageUrl ? 'hidden' : '')}><ShoppingBag size={18} /></span>
                            <div>
                              <p className="admin-referral-product-name" title={link.product?.title}>{link.product?.title || 'Sản phẩm không rõ'}</p>
                              <p className="admin-referral-store"><Store size={11} /><span title={link.store?.name}>{link.store?.name || 'Gian hàng'}</span></p>
                            </div>
                          </div>
                        </td>
                        <td data-label="KOL tiếp thị" className="admin-referral-creator-cell">
                          <div className="admin-referral-identity">
                            <span className="admin-referral-avatar">{link.collaborator?.fullName?.charAt(0) || <User size={14} />}</span>
                            <div><p className="admin-referral-creator-name" title={link.collaborator?.fullName}>{link.collaborator?.fullName || 'Ẩn danh'}</p><p className="admin-referral-secondary" title={link.collaborator?.email}>{link.collaborator?.email || ''}</p></div>
                          </div>
                        </td>
                        <td data-label="Kênh / UTM">
                          <span className="admin-referral-channel">{link.channel || 'Chưa xác định'}</span>
                          {link.utmSource && <p className="admin-referral-secondary" title={link.utmSource}>Nguồn: {link.utmSource}</p>}
                        </td>
                        <td data-label="Nhấp" className="admin-referral-numeric">
                          <strong>{(link.totalClicks || 0).toLocaleString('vi-VN')}</strong><p className="admin-referral-secondary">{(link.uniqueClicks || 0).toLocaleString('vi-VN')} duy nhất</p>
                        </td>
                        <td data-label="Đơn" className="admin-referral-numeric"><strong>{(link.totalOrders || 0).toLocaleString('vi-VN')}</strong></td>
                        <td data-label="Trạng thái">
                          <span className={'admin-referral-status ' + (link.status === 'BLOCKED' ? 'is-blocked' : '')}>
                            {link.status === 'BLOCKED' ? <ShieldAlert size={12} /> : link.status === 'PAUSED' ? <Clock3 size={12} /> : link.status !== 'EXPIRED' ? <CheckCircle2 size={12} className="admin-referral-copied" /> : null}
                            {statusLabel}
                          </span>
                          {link.status === 'BLOCKED' && link.disabledReason && <p className="admin-referral-block-reason" title={link.disabledReason}>{link.disabledReason}</p>}
                        </td>
                        <td data-label="Thao tác" className="admin-referral-action-cell">
                          {link.status === 'BLOCKED' ? (
                            <button type="button" className="admin-referral-unblock" onClick={() => handleUnblock(link)}><UnlockKeyhole size={13} /> Mở khóa</button>
                          ) : (
                            <button type="button" className="admin-referral-block" onClick={() => handleOpenBlockModal(link)}><LockKeyhole size={13} /> Khóa link</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="admin-referral-pagination">
              <span>{links.length} / {totalLinks.toLocaleString('vi-VN')} liên kết · Trang {page}</span>
              {totalPages > 1 && <div>
                <button type="button" aria-label="Trang trước" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={14} /></button>
                <span>{page} / {totalPages}</span>
                <button type="button" aria-label="Trang tiếp" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}><ChevronRight size={14} /></button>
              </div>}
            </div>
          </>
        )}
      </section>

      {isBlockModalOpen && selectedLinkToBlock && (
        <div className="admin-referral-modal-backdrop">
          <div className="admin-referral-block-modal" role="dialog" aria-modal="true" aria-labelledby="admin-referral-block-title">
            <header><div><ShieldAlert size={18} /><h3 id="admin-referral-block-title">Khóa liên kết tiếp thị</h3></div>
              <button type="button" aria-label="Đóng cửa sổ" disabled={isSubmittingBlock} onClick={() => setIsBlockModalOpen(false)}><X size={18} /></button>
            </header>
            <p className="admin-referral-block-notice">Sau khi khóa, khách hàng không thể mở sản phẩm qua link này và các lượt truy cập mới không được ghi nhận hoa hồng.</p>
            <div className="admin-referral-block-code"><span>Mã link</span><code>{selectedLinkToBlock.shortCode}</code></div>
            <label htmlFor="admin-referral-block-reason">Lý do khóa <span className="text-[#DC2626]">*</span></label>
            <textarea id="admin-referral-block-reason" rows={3} value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Mô tả vi phạm cần xử lý…" />
            <footer>
              <button type="button" disabled={isSubmittingBlock} onClick={() => setIsBlockModalOpen(false)}>Hủy bỏ</button>
              <button type="button" className="admin-referral-confirm-block" onClick={handleConfirmBlock} disabled={isSubmittingBlock || !blockReason.trim()}>
                {isSubmittingBlock ? <><Loader2 size={13} className="animate-spin" /> Đang khóa…</> : 'Xác nhận khóa'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

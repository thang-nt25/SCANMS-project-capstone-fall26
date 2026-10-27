import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import './SocialChannelsPage.css';
import { useNavigate } from 'react-router-dom';
import {
  Share2,
  Users,
  Star,
  Search,
  Plus,
  ExternalLink,
  Trash2,
  CheckCircle2,
  X,
  Link2,
  Video,
  Loader2,
} from 'lucide-react';
import { socialService, type SocialChannel } from '../../services/social.service';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../utils/toast';

interface SocialChannelsPageProps {
  loadedData?: SocialChannel[];
  isRefreshing?: boolean;
  onCreateLink?: () => void;
}

const SocialChannelsPage = forwardRef<{ refresh: () => Promise<void> }, SocialChannelsPageProps>(function SocialChannelsPage({ loadedData, isRefreshing = false, onCreateLink }, ref) {
  const navigate = useNavigate();

  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<SocialChannel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const loadSequence = useRef(0);

  const [platformName, setPlatformName] = useState('TIKTOK');
  const [channelName, setChannelName] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [followerCount, setFollowerCount] = useState<number | ''>('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    const sequenceRef = loadSequence;
    if (loadedData) {
      setChannels(loadedData);
      setHasLoaded(true);
      setLoading(false);
      setLoadError('');
      return;
    }
    void loadChannels().catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Không thể tải các kênh xã hội.');
    });
    return () => { sequenceRef.current++; };
  }, [loadedData]);

  const loadChannels = async (forceRefresh = false) => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoadError('');
    try {
      const list = await socialService.getMyChannels({ forceRefresh });
      if (sequence !== loadSequence.current) return;
      if (!Array.isArray(list)) throw new Error('Dữ liệu danh sách kênh không hợp lệ.');
      setChannels(list);
      setHasLoaded(true);
    } catch (err: unknown) {
      if (sequence === loadSequence.current) {
        setLoadError(err instanceof Error ? err.message : 'Không thể tải các kênh xã hội.');
      }
      throw err;
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  };


  useImperativeHandle(ref, () => ({ refresh: () => loadChannels(true) }));

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await socialService.addChannel({
        platformName,
        channelName,
        channelUrl,
        followerCount: Number(followerCount),
        isPrimary,
      });
      showToast('Đã liên kết kênh mạng xã hội thành công!');
      setShowModal(false);
      setChannelName('');
      setChannelUrl('');
      setFollowerCount('');
      setIsPrimary(false);
      await loadChannels(true);
    } catch (err: any) {
      showToast(err.message || 'Lỗi liên kết kênh');
    }
  };

  const handleConfirmDelete = async () => {
    if (!channelToDelete?.id) return;
    setIsDeleting(true);
    try {
      await socialService.deleteChannel(channelToDelete.id);
      showToast('Đã ngắt kết nối kênh mạng xã hội thành công.');
      setChannelToDelete(null);
      await loadChannels(true);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi ngắt kết nối kênh');
    } finally {
      setIsDeleting(false);
    }
  };

  const displayChannels = channels;

  const filtered = displayChannels.filter((c) => {
    const matchSearch =
      (c.channelName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.channelUrl || '').toLowerCase().includes(search.toLowerCase());
    const matchPlatform =
      filterPlatform === 'ALL' || c.platformName === filterPlatform;
    return matchSearch && matchPlatform;
  });

  const totalFollowers = channels.reduce((sum, c) => sum + (c.followerCount || 0), 0);
  const verifiedChannelsCount = channels.filter((c: any) => c.verifiedAt).length;
  const primaryChannel = channels.find((c) => c.isPrimary);

  const getPlatformBadge = (plat: string) => {
    const labels: Record<string, string> = { TIKTOK: 'TikTok', FACEBOOK: 'Facebook', YOUTUBE: 'YouTube', INSTAGRAM: 'Instagram', THREADS: 'Threads', ZALO: 'Zalo' };
    return <span className="px-1.5 py-0.5 border border-[#EAE4D7] rounded bg-[#FAF8F5] text-[#7D715E] text-[10px] shrink-0">{labels[plat.toUpperCase()] || plat}</span>;
  };

  if (loading && !hasLoaded) {
    return (
      <section className="flex items-center gap-2 p-3 sm:px-3.5 border border-[#EAE4D7] rounded-xl bg-white text-[#7D715E] text-xs" role="status" aria-busy="true">
        <Loader2 size={16} className="animate-spin text-[#B88E4F] shrink-0" aria-hidden="true" />
        <span>Đang tải dữ liệu kênh xã hội…</span>
      </section>
    );
  }

  if (!hasLoaded && loadError) {
    return <section className="p-3 border border-red-200 rounded-xl bg-white text-red-600 text-xs" role="alert">{loadError}</section>;
  }

  return (
    <div className="social-channels-page flex flex-col gap-3 text-left min-w-0" aria-busy={loading || isRefreshing}>
      {loading && (
        <section className="flex items-center gap-2 p-3 sm:px-3.5 border border-[#EAE4D7] rounded-xl bg-white text-[#7D715E] text-xs" role="status">
          <Loader2 size={16} className="animate-spin text-[#B88E4F] shrink-0" aria-hidden="true" />
          <span>Đang tải dữ liệu kênh xã hội…</span>
        </section>
      )}

      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-white text-[#1A1612] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 border border-[#EEDFC6]">
          <CheckCircle2 className="w-4 h-4 text-[#B88E4F]" />
          <span>{toastMsg}</span>
        </div>
      )}

      <section className="social-overview" aria-label="Tổng quan kênh mạng xã hội">
        <div className="flex items-center gap-3 p-3.5 sm:p-4 min-w-0">
          <span className="grid place-items-center w-[34px] h-[34px] shrink-0 rounded-lg bg-[#FBF5EB] text-[#B88E4F]"><Share2 size={17} /></span>
          <div className="min-w-0">
            <span className="block text-[#7D715E] text-[11px] leading-relaxed">Kênh đã liên kết</span>
            <strong className="block mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-[#1A1612] tabular-nums">{channels.length} <small className="text-xs text-[#7D715E] font-normal">kênh</small></strong>
            <p className="mt-0.5 text-[#7D715E] text-[10px] leading-relaxed">{verifiedChannelsCount > 0 ? `${verifiedChannelsCount} kênh đã xác minh` : 'Chưa có kênh xác minh'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 sm:p-4 min-w-0">
          <span className="grid place-items-center w-[34px] h-[34px] shrink-0 rounded-lg bg-[#FBF5EB] text-[#B88E4F]"><Users size={17} /></span>
          <div className="min-w-0">
            <span className="block text-[#7D715E] text-[11px] leading-relaxed">Tổng người theo dõi</span>
            <strong className="block mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-[#1A1612] tabular-nums">{totalFollowers.toLocaleString('vi-VN')}</strong>
            <p className="mt-0.5 text-[#7D715E] text-[10px] leading-relaxed">Từ tất cả kênh đã liên kết</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 sm:p-4 min-w-0 sm:col-span-2 lg:col-span-1">
          <span className="grid place-items-center w-[34px] h-[34px] shrink-0 rounded-lg bg-[#FBF5EB] text-[#B88E4F]"><Star size={17} /></span>
          <div className="min-w-0">
            <span className="block text-[#7D715E] text-[11px] leading-relaxed">Kênh chính</span>
            <strong className="block mt-0.5 text-sm sm:text-base font-semibold text-[#1A1612] truncate" title={primaryChannel?.channelName}>{primaryChannel?.channelName || 'Chưa thiết lập'}</strong>
            <p className="mt-0.5 text-[#7D715E] text-[10px] leading-relaxed truncate">{primaryChannel ? `${primaryChannel.platformName} · ${(primaryChannel.followerCount || 0).toLocaleString('vi-VN')} người theo dõi` : 'Thêm kênh để bắt đầu kết nối'}</p>
          </div>
        </div>
      </section>

      <div className="social-toolbar">
        <div className="relative min-w-0">
          <Search className="w-4 h-4 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Tìm kênh mạng xã hội"
            placeholder="Tìm tên kênh, @username hoặc liên kết..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 bg-[#FAF8F5] border border-[#EAE4D7] rounded-lg pl-9 pr-3 text-xs text-[#1A1612] outline-none hover:border-[#B88E4F]/50 focus:border-[#B88E4F] transition"
          />
        </div>

        <div className="social-platform-control">
          <Select
            id="social-platform-filter"
            aria-label="Lọc nền tảng"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="w-full sm:w-44 h-9 text-xs font-medium"
          >
            <option value="ALL">Tất cả nền tảng</option>
            <option value="TIKTOK">TikTok</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="THREADS">Threads</option>
            <option value="ZALO">Zalo</option>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5 text-[#B88E4F]" />}
            onClick={() => setShowModal(true)}
            className="social-add-button"
          >
            Thêm kênh mới
          </Button>
        </div>
      </div>

      <section className="social-channel-list" aria-label="Danh sách kênh mạng xã hội">
        <div className="social-list-heading">
          <h2>Kênh đã liên kết <span>{filtered.length}</span></h2>
        </div>
        {!loading && filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
            <span className="grid place-items-center w-[34px] h-[34px] rounded-lg bg-[#FBF5EB] text-[#B88E4F]"><Share2 size={20} /></span>
            <h3 className="text-sm font-semibold text-[#1A1612] mt-1">{channels.length === 0 ? 'Chưa có kênh mạng xã hội' : 'Không tìm thấy kênh phù hợp'}</h3>
            <p className="max-w-md text-xs text-[#7D715E] leading-relaxed mb-2">{channels.length === 0
              ? 'Liên kết kênh sáng tạo để gian hàng tìm hiểu nội dung và kết nối với bạn.'
              : 'Thử một tên kênh khác hoặc thay đổi bộ lọc nền tảng.'}</p>
            <Button variant="outline" size="sm" onClick={() => {
              if (channels.length === 0) setShowModal(true);
              else { setSearch(''); setFilterPlatform('ALL'); }
            }}>
              {channels.length === 0 ? 'Thêm kênh mới' : 'Xóa bộ lọc'}
            </Button>
          </div>
        ) : filtered.map((c, idx) => (
          <article key={c.id || idx} className="social-channel-row">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid place-items-center w-[34px] h-[34px] shrink-0 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-[#B88E4F]"><Video size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <h3 className="font-semibold text-sm text-[#1A1612] break-all">{c.channelName || c.platformName}</h3>
                  {c.isPrimary && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-[#EEDFC6] rounded bg-[#FBF5EB] text-[#B88E4F] text-[9px] font-medium whitespace-nowrap">
                      <Star size={11} /> Kênh chính
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 min-w-0 mt-1">
                  {getPlatformBadge(c.platformName)}
                  <span title={c.channelUrl} className="truncate text-xs text-[#7D715E] min-w-0">{c.channelUrl}</span>
                </div>
              </div>
            </div>
            <div className="social-channel-metric">
              <span className="block text-[10px] text-[#7D715E]">Người theo dõi</span>
              <strong className="block mt-1 text-sm font-semibold text-[#1A1612] tabular-nums">{(c.followerCount || 0).toLocaleString('vi-VN')}</strong>
            </div>
            <div className="social-channel-verification">
              <span className="block text-[10px] text-[#7D715E]">Xác minh kênh</span>
              {(c as any).verifiedAt ? (
                <strong className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 border border-[#EAE4D7] rounded-md bg-[#FAF8F5] text-[#059669] text-[10px] font-medium whitespace-nowrap"><CheckCircle2 size={12} /> Đã xác minh</strong>
              ) : <strong className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 border border-[#EAE4D7] rounded-md bg-[#FAF8F5] text-[#7D715E] text-[10px] font-medium whitespace-nowrap">Tự khai báo</strong>}
            </div>
            <div className="social-channel-actions">
              <Button variant="outline" size="sm" icon={<Link2 size={13} className="text-[#B88E4F]" />} onClick={() => onCreateLink ? onCreateLink() : navigate('/collaborator/marketing?tab=links&action=create')} className="h-8 text-[11px]">Tạo link</Button>
              <a href={c.channelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 h-8 px-2.5 border border-[#EAE4D7] rounded-lg bg-white text-[#1A1612] text-[11px] font-medium hover:bg-[#FBF5EB] hover:border-[#EEDFC6] transition-colors"><span>Xem kênh</span><ExternalLink size={13} className="text-[#B88E4F]" /></a>
              {c.id && (
                <button type="button" onClick={() => setChannelToDelete(c)} title="Ngắt kết nối kênh" aria-label={`Ngắt kết nối ${c.channelName || c.platformName}`} className="inline-flex items-center justify-center w-8 h-8 border border-[#EAE4D7] rounded-lg bg-white text-[#7D715E] hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors ml-auto md:ml-0">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </article>
        ))}
      </section>

      {showModal && (
        <div className="social-modal-backdrop fixed inset-0 z-50">
          <div className="social-add-dialog" role="dialog" aria-modal="true" aria-labelledby="add-social-channel-title">
            <div className="social-dialog-heading">
              <span className="grid place-items-center w-[38px] h-[38px] shrink-0 rounded-xl bg-[#FBF5EB] text-[#B88E4F]" aria-hidden="true"><Share2 size={19} /></span>
              <div className="flex-1 min-w-0">
                <h3 id="add-social-channel-title" className="text-base sm:text-lg font-semibold text-[#1A1612] tracking-tight">Thêm kênh mạng xã hội</h3>
                <p className="text-xs text-[#7D715E] mt-0.5">Kết nối kênh sáng tạo của bạn với SCANMS.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Đóng cửa sổ thêm kênh"
                className="grid place-items-center w-8 h-8 rounded-lg border border-[#EAE4D7] text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="social-add-form">
              <div>
                <label htmlFor="add-social-platform" className="text-xs font-medium text-[#7D715E] mb-1.5 block">
                  Nền tảng
                </label>
                <Select
                  id="add-social-platform"
                  aria-label="Nền tảng của kênh mới"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full h-10 text-xs font-semibold"
                >
                  <option value="TIKTOK">TikTok</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="THREADS">Threads</option>
                  <option value="ZALO">Zalo Official Account</option>
                </Select>
              </div>

              <div>
                <label htmlFor="add-social-name" className="text-xs font-medium text-[#7D715E] mb-1.5 block">
                  Tên hiển thị kênh
                </label>
                <input
                  id="add-social-name"
                  type="text"
                  placeholder="VD: Tuấn Review Skincare"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full h-10 bg-white border border-[#EAE4D7] rounded-lg px-3 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="add-social-url" className="text-xs font-medium text-[#7D715E] mb-1.5 block">
                  Đường dẫn kênh (URL)
                </label>
                <input
                  id="add-social-url"
                  type="url"
                  placeholder="https://tiktok.com/@tuanaffiliate"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  className="w-full h-10 bg-white border border-[#EAE4D7] rounded-lg px-3 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="add-social-followers" className="text-xs font-medium text-[#7D715E] mb-1.5 block">
                  Số người theo dõi
                </label>
                <input
                  id="add-social-followers"
                  type="number"
                  placeholder="VD: 10000"
                  value={followerCount}
                  onChange={(e) => setFollowerCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full h-10 bg-white border border-[#EAE4D7] rounded-lg px-3 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20"
                  required
                />
              </div>

              <label className="social-primary-option">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 accent-[#C59B58] cursor-pointer"
                />
                <span className="text-xs font-medium text-[#1A1612]">
                  Đặt làm kênh chính
                </span>
                <Star size={15} aria-hidden="true" />
              </label>

              <div className="social-dialog-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowModal(false)}
                  className="h-10 text-xs font-semibold"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="md"
                  className="h-10 text-xs font-semibold"
                >
                  Xác nhận liên kết
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Ngắt kết nối kênh mạng xã hội chuẩn SCANMS */}
      <ConfirmModal
        isOpen={Boolean(channelToDelete)}
        onClose={() => !isDeleting && setChannelToDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Ngắt kết nối kênh mạng xã hội"
        message={`Bạn có chắc chắn muốn ngắt kết nối kênh "${channelToDelete?.channelName || 'này'}"? Các link tiếp thị liên kết đã tạo vẫn tiếp tục được ghi nhận hoa hồng đơn hàng bình thường.`}
        confirmText="Ngắt kết nối"
        variant="danger"
      />
    </div>
  );
});

export default SocialChannelsPage;

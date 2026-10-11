import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import './KolProfile.css';
import './SocialChannelsPage.css';
import {
  Share2,
  Users,
  Star,
  Search,
  Plus,
  RotateCcw,
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
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../utils/toast';

interface SocialChannelsPageProps {
  loadedData?: SocialChannel[];
  isRefreshing?: boolean;
}

const SocialChannelsPage = forwardRef<{ refresh: () => Promise<void> }, SocialChannelsPageProps>(function SocialChannelsPage({ loadedData, isRefreshing = false }, ref) {

  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<SocialChannel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const refreshInFlight = useRef(false);
  const loadSequence = useRef(0);

  const [platformName, setPlatformName] = useState('TIKTOK');
  const [channelName, setChannelName] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [followerCount, setFollowerCount] = useState<number | ''>('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
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
    return () => { loadSequence.current++; };
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

  const refreshChannels = async () => {
    if (loading || isRefreshing || refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    try {
      await loadChannels(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải lại kênh xã hội.');
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
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
  const primaryChannel = channels.find((c) => c.isPrimary) || channels[0];

  const getPlatformBadge = (plat: string) => {
    const labels: Record<string, string> = { TIKTOK: 'TikTok', FACEBOOK: 'Facebook', YOUTUBE: 'YouTube', INSTAGRAM: 'Instagram', THREADS: 'Threads', ZALO: 'Zalo' };
    return <span className="sc-platform-badge">{labels[plat.toUpperCase()] || plat}</span>;
  };

  if (loading && !hasLoaded) {
    return (
      <section className="kol-profile-loading" role="status" aria-busy="true">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        <span>Đang tải dữ liệu kênh xã hội…</span>
      </section>
    );
  }

  if (!hasLoaded && loadError) {
    return <section className="kol-profile-load-error" role="alert">{loadError}</section>;
  }

  return (
    <div className="kol-social-page flex flex-col gap-4 text-left" aria-busy={loading || isRefreshing}>
      {loading && (
        <section className="kol-profile-loading" role="status">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          <span>Đang tải dữ liệu kênh xã hội…</span>
        </section>
      )}

      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-white text-[#1A1612] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 border border-[#EEDFC6]">
          <CheckCircle2 className="w-4 h-4 text-[#B88E4F]" />
          <span>{toastMsg}</span>
        </div>
      )}

      <section className="sc-summary" aria-label="Tổng quan kênh mạng xã hội">
        <div className="sc-summary-item">
          <span className="sc-summary-icon"><Share2 size={17} /></span>
          <div>
            <span className="sc-summary-label">Kênh đã liên kết</span>
            <strong>{channels.length} <small>kênh</small></strong>
            <p>{verifiedChannelsCount > 0 ? `${verifiedChannelsCount} kênh đã xác minh` : 'Chưa có kênh xác minh'}</p>
          </div>
        </div>
        <div className="sc-summary-item">
          <span className="sc-summary-icon"><Users size={17} /></span>
          <div>
            <span className="sc-summary-label">Tổng người theo dõi</span>
            <strong>{totalFollowers.toLocaleString('vi-VN')}</strong>
            <p>Từ tất cả kênh đã liên kết</p>
          </div>
        </div>
        <div className="sc-summary-item sc-primary-summary">
          <span className="sc-summary-icon"><Star size={17} /></span>
          <div>
            <span className="sc-summary-label">Kênh chính</span>
            <strong title={primaryChannel?.channelName}>{primaryChannel?.channelName || 'Chưa thiết lập'}</strong>
            <p>{primaryChannel ? `${primaryChannel.platformName} · ${(primaryChannel.followerCount || 0).toLocaleString('vi-VN')} người theo dõi` : 'Thêm kênh để bắt đầu kết nối'}</p>
          </div>
        </div>
      </section>
      <Card className="kol-social-filters p-3 bg-white">
        <div className="kol-social-search relative">
          <Search className="w-4 h-4 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Tìm kênh mạng xã hội"
            placeholder="Tìm tên kênh, @username hoặc liên kết..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1A1612] outline-none hover:border-[#B88E4F]/50 focus:border-[#B88E4F] transition"
          />
        </div>

        <div className="kol-social-platform flex items-center gap-2">
          <label htmlFor="social-platform-filter" className="text-xs font-semibold text-[#7D715E]">Nền tảng:</label>
          <Select
            id="social-platform-filter"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="w-44 text-xs font-bold"
          >
            <option value="ALL">Tất cả nền tảng</option>
            <option value="TIKTOK">TikTok</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="INSTAGRAM">Instagram</option>
          </Select>
        </div>

        <div className="kol-social-filter-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            loading={refreshing || loading || isRefreshing}
            onClick={() => void refreshChannels()}
          >
            Làm mới
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowModal(true)}
          >
            Thêm kênh mới
          </Button>
        </div>
      </Card>

      <section className="sc-list" aria-label="Danh sách kênh mạng xã hội">
        {!loading && filtered.length === 0 ? (
          <div className="sc-empty">
            <span className="sc-summary-icon"><Share2 size={20} /></span>
            <h3>{channels.length === 0 ? 'Chưa có kênh mạng xã hội' : 'Không tìm thấy kênh phù hợp'}</h3>
            <p>{channels.length === 0
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
          <article key={c.id || idx} className="sc-row">
            <div className="sc-channel-identity">
              <span className="sc-channel-icon"><Video size={17} /></span>
              <div className="sc-channel-copy">
                <div className="sc-channel-title">
                  <h3>{c.channelName || c.platformName}</h3>
                  {c.isPrimary && <span className="sc-role"><Star size={11} /> Kênh chính</span>}
                </div>
                <div className="sc-channel-link">
                  {getPlatformBadge(c.platformName)}
                  <span title={c.channelUrl}>{c.channelUrl}</span>
                </div>
              </div>
            </div>
            <div className="sc-followers">
              <span>Người theo dõi</span>
              <strong>{(c.followerCount || 0).toLocaleString('vi-VN')}</strong>
            </div>
            <div className="sc-verification">
              <span>Xác minh kênh</span>
              {(c as any).verifiedAt ? (
                <strong className="sc-verified"><CheckCircle2 size={12} /> Đã xác minh</strong>
              ) : <strong>Tự khai báo</strong>}
            </div>
            <div className="sc-actions">
              <Button variant="outline" size="sm" icon={<Link2 size={13} />} onClick={() => window.location.href = '/collaborator/referral-links'}>Tạo link</Button>
              <a href={c.channelUrl} target="_blank" rel="noreferrer"><span>Xem kênh</span><ExternalLink size={13} /></a>
              {c.id && (
                <button type="button" className="sc-disconnect" onClick={() => setChannelToDelete(c)} title="Ngắt kết nối kênh" aria-label={`Ngắt kết nối ${c.channelName || c.platformName}`}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
      {showModal && (
        <div className="kol-channel-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="kol-channel-modal" role="dialog" aria-modal="true" aria-labelledby="add-social-channel-title">
            <div className="kol-channel-modal-heading">
              <span className="kol-channel-modal-icon" aria-hidden="true"><Share2 /></span>
              <div>
                <h3 id="add-social-channel-title">Thêm kênh mạng xã hội</h3>
                <p>Kết nối kênh sáng tạo của bạn với SCANMS.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Đóng cửa sổ thêm kênh"
                className="text-[#7D715E] hover:text-[#1A1612] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="kol-channel-modal-form flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-[#1A1612] mb-1.5 block">
                  Nền tảng truyền thông
                </label>
                <Select
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full text-xs font-semibold"
                >
                  <option value="TIKTOK">TikTok (Khuyên dùng cho video ngắn)</option>
                  <option value="FACEBOOK">Facebook (Fanpage / Group)</option>
                  <option value="YOUTUBE">YouTube (Shorts &amp; Video dài)</option>
                  <option value="INSTAGRAM">Instagram (Reels / Story)</option>
                  <option value="THREADS">Threads</option>
                  <option value="ZALO">Zalo Official Account</option>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] mb-1.5 block">
                  Tên hiển thị kênh
                </label>
                <input
                  type="text"
                  placeholder="VD: Tuấn Review Skincare"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs font-semibold text-[#1A1612] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] mb-1.5 block">
                  Đường dẫn kênh (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://tiktok.com/@tuanaffiliate"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs font-semibold text-[#1A1612] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] mb-1.5 block">
                  Số người theo dõi
                </label>
                <input
                  type="number"
                  placeholder="VD: 10000"
                  value={followerCount}
                  onChange={(e) => setFollowerCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs font-semibold text-[#1A1612] outline-none"
                  required
                />
              </div>

              <label className="kol-channel-primary-option flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded border-[#EAE4D7] text-[#B88E4F] focus:ring-[#B88E4F]"
                />
                <span className="text-xs font-medium text-[#1A1612]">
                  Đặt làm kênh chính
                </span>
              </label>

              <div className="kol-channel-modal-footer grid grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="md"
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

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, Eye, FileText, Image, Loader2, Sparkles, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import type { MediaAsset } from '../../services/media.service';
import { loadStoreMediaLibrary } from '../../utils/store-media-library';
import { isExternalMediaVideo, mediaSourceUrl } from '../../utils/media-asset.utils';
import { downloadMediaFile } from '../../utils/media-pack.utils';
import { MediaAssetViewer } from './MediaAssetViewer';

const categories = [
  { type: 'VIDEO', label: 'Video', icon: Video },
  { type: 'IMAGE', label: 'Hình ảnh', icon: Image },
] as const;

export function StoreMediaLibrary({ storeId, onCount }: {
  storeId: string;
  onCount: (storeId: string, count: number | null) => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [category, setCategory] = useState<MediaAsset['assetType']>('VIDEO');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const actionBusy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setAssets([]);
    setPreview(null);
    onCount(storeId, null);
    void loadStoreMediaLibrary(storeId, page => api.get('/media', {
      params: { storeId, scope: 'visual-library', page, limit: 100 },
      signal: controller.signal,
      headers: { 'x-skip-cache': 'true' },
    })).then(items => {
      if (controller.signal.aborted) return;
      const visibleItems = items.filter(asset => asset.assetType === 'VIDEO' || asset.assetType === 'IMAGE');
      setAssets(visibleItems);
      onCount(storeId, visibleItems.length);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setError('Chưa tải được kho nội dung. Vui lòng thử lại.');
        onCount(storeId, null);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [storeId, attempt, onCount]);

  useEffect(() => {
    const refresh = () => setAttempt(value => value + 1);
    window.addEventListener('scanms_media_updated', refresh);
    return () => window.removeEventListener('scanms_media_updated', refresh);
  }, []);

  useEffect(() => {
    if (!preview || !dialog.current) return;
    const element = dialog.current;
    element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previous; };
  }, [preview]);

  const actionLabel = (asset: MediaAsset) => isExternalMediaVideo(asset, window.location.href) ? 'Mở video gốc' : 'Tải xuống';
  const performAction = async (asset: MediaAsset) => {
    const source = mediaSourceUrl(asset, window.location.href);
    if (!source) { toast.error('Liên kết tài nguyên không hợp lệ.'); return; }
    if (isExternalMediaVideo(asset, window.location.href)) {
      window.open(source, '_blank', 'noopener,noreferrer');
      return;
    }
    if (actionBusy.current) return;
    actionBusy.current = true;
    setDownloadingId(asset.id);
    try { await downloadMediaFile(asset, window.location.href); toast.success('Đã chuẩn bị tệp tải xuống.'); }
    catch (failure) { toast.error(`${failure instanceof Error ? failure.message : 'Không thể tải tệp.'} Bạn có thể mở nguồn trong Xem trước.`); }
    finally { actionBusy.current = false; setDownloadingId(null); }
  };
  const visible = assets.filter(asset => asset.assetType === category);

  return <div className="grid gap-3 min-w-0 text-[#1A1612]">
    <header className="flex items-center flex-wrap gap-2.5 p-3 border border-[#EAE4D7] rounded-xl bg-white">
      <div className="flex items-center gap-2.25 mr-auto [&>span]:grid [&>span]:place-items-center [&>span]:w-[34px] [&>span]:h-[34px] [&>span]:border [&>span]:border-[#EEDFC6] [&>span]:rounded-[9px] [&>span]:bg-[#FBF5EB] [&>span]:text-[#B88E4F] [&_h3]:m-0 [&_h3]:text-[13px] [&_h3]:leading-5 [&_h3]:font-semibold"><span><Sparkles size={18} aria-hidden="true" /></span><h3>Kho nội dung sáng tạo</h3></div>
      <div className="flex gap-[3px] p-[3px] border border-[#EAE4D7] rounded-lg bg-[#FAF8F5] max-sm:order-3 max-sm:flex-[1_1_100%] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-1.25 [&_button]:min-h-[32px] [&_button]:px-2.25 [&_button]:py-1.5 [&_button]:border [&_button]:rounded-[7px] [&_button]:text-[11px] [&_button]:leading-4 [&_button]:cursor-pointer [&_button:disabled]:opacity-55 [&_button:disabled]:cursor-default focus-visible:[&_button]:outline-2 focus-visible:[&_button]:outline-[#C59B58] focus-visible:[&_button]:outline-offset-2 max-sm:[&_button]:flex-1 max-sm:[&_button]:gap-1 max-sm:[&_button]:p-1.5 max-sm:[&_button]:text-[10px] max-sm:[&_button]:whitespace-nowrap transition-colors [&_button[aria-pressed=true]]:border-[#EEDFC6] [&_button[aria-pressed=true]]:bg-white [&_button[aria-pressed=true]]:text-[#1A1612] [&_button[aria-pressed=false]]:border-transparent [&_button[aria-pressed=false]]:bg-transparent [&_button[aria-pressed=false]]:text-[#7D715E] hover:[&_button[aria-pressed=false]]:border-[#C59B58] hover:[&_button[aria-pressed=false]]:bg-[#FBF5EB]" role="group" aria-label="Loại tài nguyên">
        {categories.map(({ type, label, icon: Icon }) => <button key={type} type="button" aria-pressed={category === type} onClick={() => setCategory(type)}>
          <Icon size={14} aria-hidden="true" /><span>{label}</span><span className="text-[#7D715E] text-[10px] tabular-nums">{loading || error ? '—' : assets.filter(asset => asset.assetType === type).length}</span>
        </button>)}
      </div>
    </header>
    {loading ? <div className="grid place-items-center content-center gap-2.25 min-h-[180px] p-5.5 border border-[#EAE4D7] rounded-xl bg-white text-[#7D715E] text-center [&_h4]:m-0 [&_h4]:text-xs [&_h4]:leading-[19px] [&_h4]:text-[#1A1612] [&_h4]:font-semibold [&_p]:m-0 [&_p]:text-xs [&_p]:leading-[19px] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-1.25 [&_button]:min-h-[32px] [&_button]:px-2.25 [&_button]:py-1.5 [&_button]:border [&_button]:border-[#EAE4D7] [&_button]:rounded-[7px] [&_button]:bg-white [&_button]:text-[#795A2D] [&_button]:text-[11px] [&_button]:leading-4 [&_button]:cursor-pointer hover:[&_button]:border-[#C59B58] hover:[&_button]:bg-[#FBF5EB]" role="status"><Loader2 size={20} className="animate-spin" /><p>Đang tải kho nội dung…</p></div>
      : error ? <div className="grid place-items-center content-center gap-2.25 min-h-[180px] p-5.5 border border-[#EAE4D7] rounded-xl bg-white text-[#7D715E] text-center [&_h4]:m-0 [&_h4]:text-xs [&_h4]:leading-[19px] [&_h4]:text-[#1A1612] [&_h4]:font-semibold [&_p]:m-0 [&_p]:text-xs [&_p]:leading-[19px] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-1.25 [&_button]:min-h-[32px] [&_button]:px-2.25 [&_button]:py-1.5 [&_button]:border [&_button]:border-[#EAE4D7] [&_button]:rounded-[7px] [&_button]:bg-white [&_button]:text-[#795A2D] [&_button]:text-[11px] [&_button]:leading-4 [&_button]:cursor-pointer hover:[&_button]:border-[#C59B58] hover:[&_button]:bg-[#FBF5EB]" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div>
      : !visible.length ? <div className="grid place-items-center content-center gap-2.25 min-h-[180px] p-5.5 border border-[#EAE4D7] rounded-xl bg-white text-[#7D715E] text-center [&_h4]:m-0 [&_h4]:text-xs [&_h4]:leading-[19px] [&_h4]:text-[#1A1612] [&_h4]:font-semibold [&_p]:m-0 [&_p]:text-xs [&_p]:leading-[19px] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-1.25 [&_button]:min-h-[32px] [&_button]:px-2.25 [&_button]:py-1.5 [&_button]:border [&_button]:border-[#EAE4D7] [&_button]:rounded-[7px] [&_button]:bg-white [&_button]:text-[#795A2D] [&_button]:text-[11px] [&_button]:leading-4 [&_button]:cursor-pointer hover:[&_button]:border-[#C59B58] hover:[&_button]:bg-[#FBF5EB]"><FileText size={23} aria-hidden="true" /><h4>{assets.length ? 'Chưa có tài nguyên thuộc nhóm này' : 'Shop chưa có nội dung được duyệt'}</h4><p>Tài nguyên sẽ xuất hiện khi được Shop cung cấp và duyệt.</p></div>
      : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch gap-3">{visible.map(asset => {
        const Icon = isExternalMediaVideo(asset, window.location.href) ? ExternalLink : Download;
        return <article key={asset.id} className="flex flex-col min-w-0 overflow-hidden border border-[#EAE4D7] rounded-xl bg-white">
          <div className="grid items-center aspect-[16/10] overflow-hidden bg-[#FAF8F5] [&>img]:w-full [&>img]:h-full [&>img]:min-h-0 [&>img]:object-contain [&>video]:w-full [&>video]:h-full [&>video]:min-h-0 [&>video]:object-contain"><MediaAssetViewer key={asset.id} asset={asset} /></div>
          <div className="flex flex-col flex-1 gap-2 p-3 [&_h4]:m-0 [&_h4]:text-[12px] [&_h4]:leading-[19px] [&_h4]:font-semibold [&_h4]:[overflow-wrap:anywhere]"><h4>{asset.title}</h4>{asset.caption && <p className="line-clamp-2 m-0 text-[#7D715E] text-[11px] leading-[18px]">{asset.caption}</p>}
            <div className="grid grid-cols-2 gap-1.75 mt-auto pt-1 [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-1.25 [&_button]:min-h-[32px] [&_button]:px-2.25 [&_button]:py-1.5 [&_button]:border [&_button]:border-[#EAE4D7] [&_button]:rounded-[7px] [&_button]:bg-white [&_button]:text-[#795A2D] [&_button]:text-[11px] [&_button]:leading-4 [&_button]:cursor-pointer hover:[&_button]:border-[#C59B58] hover:[&_button]:bg-[#FBF5EB] focus-visible:[&_button]:outline-2 focus-visible:[&_button]:outline-[#C59B58] focus-visible:[&_button]:outline-offset-2 [&_button:last-child]:border-[#EEDFC6] [&_button:last-child]:bg-[#FBF5EB]"><button type="button" onClick={() => setPreview(asset)}><Eye size={14} />Xem trước</button>
              <button type="button" disabled={Boolean(downloadingId)} onClick={() => void performAction(asset)}>
                {downloadingId === asset.id ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}{downloadingId === asset.id ? 'Đang tải…' : actionLabel(asset)}
              </button></div>
          </div>
        </article>;
      })}</div>}
    {preview && createPortal(<dialog ref={dialog} className="fixed inset-0 w-[min(520px,calc(100vw-28px))] max-h-[84dvh] m-auto p-0 overflow-hidden border border-[#EAE4D7] rounded-[15px] bg-white text-[#1A1612] shadow-[0_16px_50px_rgb(35_29_21_/_14%)] backdrop:bg-[rgb(35_29_21_/_35%)] backdrop:backdrop-blur-xs" aria-labelledby="store-media-preview-title" onCancel={() => setPreview(null)} onClick={event => { if (event.target === event.currentTarget) setPreview(null); }}>
      <div className="flex flex-col max-h-[84dvh] [&>header]:flex [&>header]:shrink-0 [&>header]:items-center [&>header]:justify-between [&>header]:gap-3 [&>header]:px-3.25 [&>header]:py-2.75 [&>header]:border-b [&>header]:border-[#EAE4D7] [&_h3]:m-0 [&_h3]:text-[13px] [&_h3]:leading-5 [&_h3]:font-semibold [&_h3]:[overflow-wrap:anywhere] [&>header>button]:shrink-0 [&>header>button]:w-8 [&>header>button]:h-8 [&>header>button]:p-1.25 [&>header>button]:inline-flex [&>header>button]:items-center [&>header>button]:justify-center [&>header>button]:border [&>header>button]:border-[#EEDFC6] [&>header>button]:rounded-lg [&>header>button]:bg-[#FBF5EB] [&>header>button]:text-[#795A2D] [&>header>button]:cursor-pointer [&_footer]:flex [&_footer]:shrink-0 [&_footer]:justify-end [&_footer]:px-3.25 [&_footer]:py-2.25 [&_footer]:border-t [&_footer]:border-[#EAE4D7] [&_footer_button]:inline-flex [&_footer_button]:items-center [&_footer_button]:justify-center [&_footer_button]:min-h-[32px] [&_footer_button]:px-2.5 [&_footer_button]:py-1.75 [&_footer_button]:border [&_footer_button]:border-[#EEDFC6] [&_footer_button]:rounded-lg [&_footer_button]:bg-[#FBF5EB] [&_footer_button]:text-[#795A2D] [&_footer_button]:text-xs [&_footer_button]:cursor-pointer hover:[&_footer_button]:bg-[#F3EFE6]"><header><h3 id="store-media-preview-title">{preview.title}</h3><button type="button" onClick={() => setPreview(null)} aria-label="Đóng xem trước"><X size={19} /></button></header>
        <div className="min-h-0 overflow-y-auto p-3 [&>video]:block [&>video]:w-full [&>video]:max-h-[min(50dvh,300px)] [&>video]:m-auto [&>video]:border [&>video]:border-[#EAE4D7] [&>video]:rounded-[9px] [&>video]:bg-[#FAF8F5] [&>video]:object-contain [&>img]:block [&>img]:w-full [&>img]:max-h-[min(50dvh,300px)] [&>img]:m-auto [&>img]:border [&>img]:border-[#EAE4D7] [&>img]:rounded-[9px] [&>img]:bg-[#FAF8F5] [&>img]:object-contain [&>p]:mt-3 [&>p]:whitespace-pre-wrap [&>p]:[overflow-wrap:anywhere] [&>p]:text-[#7D715E] [&>p]:text-xs [&>p]:leading-5"><MediaAssetViewer key={preview.id} asset={preview} />{preview.caption && <p>{preview.caption}</p>}</div>
        <footer><button type="button" disabled={Boolean(downloadingId)} onClick={() => void performAction(preview)}>{downloadingId === preview.id ? 'Đang tải…' : actionLabel(preview)}</button></footer>
      </div>
    </dialog>, document.body)}
  </div>;
}

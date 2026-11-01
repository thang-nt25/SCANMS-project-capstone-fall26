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
import './StoreMediaLibrary.css';

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

  return <div className="store-media-library">
    <header className="store-media-toolbar">
      <div className="store-media-heading"><span><Sparkles size={18} aria-hidden="true" /></span><h3>Kho nội dung sáng tạo</h3></div>
      <div className="store-media-categories" role="group" aria-label="Loại tài nguyên">
        {categories.map(({ type, label, icon: Icon }) => <button key={type} type="button" aria-pressed={category === type} onClick={() => setCategory(type)}>
          <Icon size={14} aria-hidden="true" /><span>{label}</span><span className="store-media-count">{loading || error ? '—' : assets.filter(asset => asset.assetType === type).length}</span>
        </button>)}
      </div>
    </header>
    {loading ? <div className="store-media-state" role="status"><Loader2 size={20} className="animate-spin" /><p>Đang tải kho nội dung…</p></div>
      : error ? <div className="store-media-state" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div>
      : !visible.length ? <div className="store-media-state"><FileText size={23} aria-hidden="true" /><h4>{assets.length ? 'Chưa có tài nguyên thuộc nhóm này' : 'Shop chưa có nội dung được duyệt'}</h4><p>Tài nguyên sẽ xuất hiện khi được Shop cung cấp và duyệt.</p></div>
      : <div className="store-media-grid">{visible.map(asset => {
        const Icon = isExternalMediaVideo(asset, window.location.href) ? ExternalLink : Download;
        return <article key={asset.id} className="store-media-card">
          <div className="store-media-thumbnail"><MediaAssetViewer key={asset.id} asset={asset} /></div>
          <div className="store-media-card-body"><h4>{asset.title}</h4>{asset.caption && <p className="store-media-caption">{asset.caption}</p>}
            <div className="store-media-actions"><button type="button" onClick={() => setPreview(asset)}><Eye size={14} />Xem trước</button>
              <button type="button" disabled={Boolean(downloadingId)} onClick={() => void performAction(asset)}>
                {downloadingId === asset.id ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}{downloadingId === asset.id ? 'Đang tải…' : actionLabel(asset)}
              </button></div>
          </div>
        </article>;
      })}</div>}
    {preview && createPortal(<dialog ref={dialog} className="store-media-preview" aria-labelledby="store-media-preview-title" onCancel={() => setPreview(null)} onClick={event => { if (event.target === event.currentTarget) setPreview(null); }}>
      <div className="store-media-preview-panel"><header><h3 id="store-media-preview-title">{preview.title}</h3><button type="button" onClick={() => setPreview(null)} aria-label="Đóng xem trước"><X size={19} /></button></header>
        <div className="store-media-preview-body"><MediaAssetViewer key={preview.id} asset={preview} />{preview.caption && <p>{preview.caption}</p>}</div>
        <footer><button type="button" disabled={Boolean(downloadingId)} onClick={() => void performAction(preview)}>{downloadingId === preview.id ? 'Đang tải…' : actionLabel(preview)}</button></footer>
      </div>
    </dialog>, document.body)}
  </div>;
}

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { MediaAsset } from '../../services/media.service';
import { isExternalMediaVideo, mediaSourceUrl } from '../../utils/media-asset.utils';

export function MediaAssetViewer({ asset }: { asset: MediaAsset }) {
  const [failed, setFailed] = useState(false);
  const source = mediaSourceUrl(asset, window.location.href);
  if (asset.assetType === 'COPYWRITE_TEXT') return <div className="w-full max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-[#FAF8F5] p-4 text-xs leading-relaxed text-[#1A1612]">{asset.urlOrContent}</div>;
  if (!source || failed || isExternalMediaVideo(asset, window.location.href)) return <div className="grid justify-items-center gap-3 p-6 text-center text-xs text-[#7D715E]">
    <p>{!source ? 'Liên kết tài nguyên không hợp lệ.' : failed ? 'Không xem trước được tài nguyên này.' : 'Video được lưu trên nền tảng bên ngoài.'}</p>
    {source && <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-white px-3 py-2 text-[#795A2D]"><ExternalLink size={14} />Mở nguồn tài nguyên</a>}
  </div>;
  return asset.assetType === 'VIDEO'
    ? <video controls preload="metadata" src={source} poster={asset.posterUrl || undefined} onError={() => setFailed(true)} className="max-h-80 w-full rounded-lg object-contain" />
    : <img src={source} alt={asset.title} onError={() => setFailed(true)} className="max-h-80 w-full rounded-lg object-contain" />;
}

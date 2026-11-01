import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Video, X } from 'lucide-react';

export type ReviewEvidenceImage = { id: string; file: File; preview: string; uploadedUrl?: string };

export function EvidenceImageViewer({ url, onClose, video = false }: { url: string; onClose: () => void; video?: boolean }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onClose(); }
      if (event.key === 'Tab') {
        const media = close.current?.parentElement?.querySelector('video');
        if (!media || (!event.shiftKey && document.activeElement === media) || (event.shiftKey && document.activeElement === close.current)) { event.preventDefault(); (event.shiftKey && media ? media : close.current)?.focus(); }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('keydown', key, true); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [onClose]);
  return createPortal(<div role="dialog" aria-modal="true" aria-label={video ? 'Xem video bằng chứng' : 'Xem ảnh bằng chứng'} className="fixed inset-0 z-[150] flex items-center justify-center bg-[#231D15]/75 p-5" onClick={onClose}>
    <button ref={close} type="button" aria-label={video ? 'Đóng video bằng chứng' : 'Đóng ảnh bằng chứng'} onClick={event => { event.stopPropagation(); onClose(); }} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white text-[#1A1612]"><X size={20} /></button>
    {video ? <video src={url} controls playsInline preload="metadata" tabIndex={0} aria-label="Video bằng chứng" className="max-h-[80dvh] w-full max-w-4xl rounded-xl bg-[#231D15]" onClick={event => event.stopPropagation()} /> : <img src={url} alt="Ảnh bằng chứng phóng lớn" className="max-h-[85dvh] max-w-full rounded-xl object-contain" onClick={event => event.stopPropagation()} />}
  </div>, document.body);
}

export function ReviewEvidenceImages({ images, onChange, disabled, kind = 'image' }: { images: ReviewEvidenceImage[]; onChange: (images: ReviewEvidenceImage[]) => void; disabled: boolean; kind?: 'image' | 'video' }) {
  const isVideo = kind === 'video';
  const label = isVideo ? 'video' : 'ảnh';
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<string | null>(null);
  return <div className="space-y-3 rounded-xl border border-[#EAE4D7] bg-white p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold">{isVideo ? 'Video bằng chứng' : 'Ảnh bằng chứng'} {images.length > 0 && <span className="text-[#B88E4F]">({images.length})</span>}</p><p className="mt-1 text-[11px] text-[#7D715E]">{isVideo ? 'MP4, MOV · Tối đa 50 MB mỗi video' : 'JPG, PNG, WebP · Tối đa 5 MB mỗi ảnh'}</p></div>
      <label className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 text-xs font-semibold text-[#795A2D] focus-within:ring-2 focus-within:ring-[#C59B58] ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-[#F3EFE6]'}`}>{isVideo ? <Video size={16} /> : <ImagePlus size={16} />}Thêm {label} bằng chứng
        <input className="sr-only" type="file" aria-label={`Thêm ${label} bằng chứng`} accept={isVideo ? 'video/mp4,video/quicktime,.mp4,.mov' : 'image/jpeg,image/png,image/webp'} multiple disabled={disabled} onChange={event => {
          const files = [...(event.target.files || [])];
          event.target.value = '';
          const valid: ReviewEvidenceImage[] = [];
          const invalid: string[] = [];
          for (const file of files) {
            const validType = isVideo ? ['video/mp4', 'video/quicktime'].includes(file.type) || (!file.type && /\.(mp4|mov)$/i.test(file.name)) : ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
            if (!validType || file.size > (isVideo ? 50 : 5) * 1024 * 1024 || !file.size) { invalid.push(file.name); continue; }
            const attachment = isVideo && !file.type ? new File([file], file.name, { type: /\.mov$/i.test(file.name) ? 'video/quicktime' : 'video/mp4', lastModified: file.lastModified }) : file;
            valid.push({ id: crypto.randomUUID(), file: attachment, preview: URL.createObjectURL(attachment) });
          }
          setError(invalid.length ? `Không thêm được: ${invalid.join(', ')}. ${isVideo ? 'Chọn video MP4/MOV không quá 50 MB mỗi video.' : 'Chọn ảnh JPG/PNG/WebP không quá 5 MB mỗi ảnh.'}` : '');
          onChange([...images, ...valid]);
        }} />
      </label>
    </div>
    {error && <p role="alert" className="text-xs text-[#DC2626]">{error}</p>}
    {images.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{images.map((image, index) => <div key={image.id} className="relative min-w-0">
      <button type="button" aria-label={`Xem ${label} bằng chứng ${index + 1}`} onClick={() => setViewing(image.preview)} className="grid aspect-square w-full place-items-center overflow-hidden rounded-lg border border-[#EAE4D7] bg-[#FAF8F5]">{isVideo ? <span className="flex flex-col items-center gap-1 text-[#B88E4F]"><Video size={24} /><span className="text-[10px]">Xem video</span></span> : <img src={image.preview} alt={`Ảnh bằng chứng ${index + 1}`} className="h-full w-full object-cover" />}</button>
      <button type="button" aria-label={`Xóa ${label} bằng chứng ${index + 1}`} disabled={disabled} onClick={() => onChange(images.filter(item => item.id !== image.id))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full border border-[#EAE4D7] bg-white shadow-sm disabled:opacity-50"><X size={13} /></button>
      <p className="mt-1 truncate text-[10px] text-[#7D715E]" title={image.file.name}>{image.file.name}</p>
    </div>)}</div>}
    {viewing && <EvidenceImageViewer url={viewing} video={isVideo} onClose={() => setViewing(null)} />}
  </div>;
}

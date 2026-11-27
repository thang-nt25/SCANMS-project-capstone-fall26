import { Copy, ExternalLink, Store } from 'lucide-react';
import { handleStoreImageError } from '@/utils/image-fallback.utils';

export function StorefrontSettingsSection({ name, logoUrl, url, path, onCopy }: {
  name: string;
  logoUrl: string;
  url: string;
  path: string;
  onCopy: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-[#EAE4D7] px-4 py-4 sm:px-6">
      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-[#B88E4F] sm:size-14">
        {logoUrl ? <img src={logoUrl} onError={handleStoreImageError} alt="Logo gian hàng" className="size-full object-contain" /> : <Store size={20} aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-[1_1_180px]">
        <h1 className="break-words text-base font-semibold text-[#1A1612] sm:text-lg">{name || 'Cài đặt gian hàng'}</h1>
        {url && (
          <div className="flex min-w-0 items-center gap-1">
            <span title={url} className="min-w-0 truncate text-xs text-[#7D715E] select-all">{url}</span>
            <button type="button" aria-label="Sao chép đường dẫn gian hàng" title="Sao chép đường dẫn gian hàng" onClick={onCopy} className="grid size-8 shrink-0 place-items-center rounded-md text-[#765629] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58]"><Copy size={15} /></button>
          </div>
        )}
      </div>
      {path && <a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#EAE4D7] px-3 text-xs font-semibold text-[#765629] hover:border-[#C59B58] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58]">Mở gian hàng <ExternalLink size={14} aria-hidden="true" /></a>}
    </header>
  );
}

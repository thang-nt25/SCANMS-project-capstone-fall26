import { Copy, ExternalLink, Globe, Link2 } from 'lucide-react';

export function StorefrontSettingsSection({ url, path, description, onDescriptionChange, onCopy }: {
  url: string; path: string; description: string;
  onDescriptionChange: (value: string) => void;
  onCopy: () => void;
}) {
  return <section className="sf-settings overflow-hidden rounded-xl border border-[#EAE4D7] bg-white text-[#1A1612]" aria-labelledby="storefront-settings-title">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]"><Globe size={17} /></span>
        <h2 id="storefront-settings-title" className="m-0 text-sm font-semibold">Trang gian hàng</h2>
      </div>
      {path && <a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[#B88E4F] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58]">Mở gian hàng <ExternalLink size={13} /></a>}
    </header>
    <div className="space-y-4 p-4">
      <div>
        <label htmlFor="storefront-url" className="mb-2 flex items-center gap-1.5 text-xs font-medium"><Link2 size={14} className="text-[#B88E4F]" />Đường dẫn trên SCANMS</label>
        <div className="flex min-w-0 items-center gap-1 rounded-lg border border-[#EAE4D7] bg-white p-1 focus-within:border-[#C59B58] focus-within:ring-2 focus-within:ring-[#C59B58]/10">
          <input id="storefront-url" type="text" readOnly value={url} placeholder="Đang tải đường dẫn…" onFocus={event => event.currentTarget.select()} className="h-8 min-w-0 flex-1 border-0 bg-transparent px-2 text-xs text-[#1A1612] outline-none" />
          <button type="button" aria-label="Sao chép đường dẫn gian hàng" disabled={!url} onClick={onCopy} className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-[#B88E4F] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58] disabled:cursor-not-allowed disabled:opacity-40"><Copy size={15} /></button>
        </div>
      </div>
      <div className="border-t border-[#EAE4D7] pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="storefront-description" className="text-xs font-medium">Giới thiệu gian hàng</label>
          <span className="text-[10px] tabular-nums text-[#7D715E]">{description.length.toLocaleString('vi-VN')} ký tự</span>
        </div>
        <textarea id="storefront-description" value={description} rows={2} placeholder="Giới thiệu ngắn gọn về gian hàng…" onChange={event => onDescriptionChange(event.target.value)} className="block min-h-[72px] w-full resize-y rounded-lg border border-[#EAE4D7] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#1A1612] outline-none placeholder:text-[#A39784] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/10" />
      </div>
    </div>
  </section>;
}

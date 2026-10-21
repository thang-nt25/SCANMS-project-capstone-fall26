import type { LucideIcon } from 'lucide-react';
import { ChevronDown, RefreshCw } from 'lucide-react';

export function WalletSectionHeader({ id, title, description, count, icon: Icon, expanded, onToggle, onRefresh, refreshing }: {
  id: string; title: string; description: string; count: string; icon: LucideIcon;
  expanded: boolean; onToggle: () => void; onRefresh?: () => void; refreshing?: boolean;
}) {
  return <div className={`wallet-section-header flex! items-center! gap-[8px]! bg-[#fff]! p-[3px_14px_3px_3px]! [&.is-open]:[border-bottom:1px_solid_#eae4d7]! [&.is-open_.wallet-section-chevron]:[transform:rotate(180deg)]! ${expanded ? ' is-open' : ''}`}>
    <h2 className="wallet-section-heading flex-1! min-w-0! m-[0]! ">
      <button type="button" className="wallet-section-toggle flex! items-center! gap-[12px]! w-full! p-[14px]! rounded-[10px]! bg-[transparent]! text-left! cursor-pointer! [transition:background_150ms_ease]! [&:hover]:bg-[#faf8f5]! [&:focus-visible]:[outline:2px_solid_#c59b58]! [&:focus-visible]:outline-offset-[-2px]! [@media(max-width:639px)]:p-[11px_8px]! [@media(max-width:639px)]:gap-[9px]! motion-reduce:[&&]:[transition:none]! " aria-expanded={expanded} aria-controls={id} onClick={onToggle}>
        <span className="wallet-section-icon grid! place-items-center! shrink-0! w-[38px]! h-[38px]! [border:1px_solid_#eedfc6]! rounded-[12px]! text-[#b88e4f]! bg-[#fbf5eb]! "><Icon size={19} strokeWidth={1.6} /></span>
        <span className="wallet-section-copy block! flex-1! min-w-0! "><span className="wallet-section-title flex! flex-wrap! items-center! gap-[8px]! text-[#1a1612]! text-[length:14px]! font-[650]! leading-[21px]! [@media(max-width:639px)]:text-[length:13px]! ">{title}<span className="wallet-section-count p-[1px_8px]! rounded-[6px]! bg-[#faf8f5]! text-[#7d715e]! text-[length:10px]! font-[500]! leading-[18px]! ">{count}</span></span><span className="wallet-section-description block! mt-[3px]! text-[#7d715e]! text-[length:11px]! font-[400]! leading-[17px]! [@media(max-width:639px)]:text-[length:10px]! ">{description}</span></span>
        <ChevronDown className="wallet-section-chevron shrink-0! text-[#b88e4f]! [transition:transform_180ms_ease]! motion-reduce:[&&]:[transition:none]! " size={17} aria-hidden="true" />
      </button>
    </h2>
    {onRefresh && <button type="button" className="wallet-section-refresh [&:focus-visible]:[outline:2px_solid_#c59b58]! [&:focus-visible]:outline-offset-[-2px]! inline-flex! items-center! justify-center! gap-[6px]! h-[34px]! p-[0_10px]! [border:1px_solid_#eae4d7]! rounded-[9px]! text-[#7d715e]! bg-[#fff]! text-[length:11px]! cursor-pointer! [&:hover]:bg-[#fbf5eb]! [&:disabled]:opacity-[.5]! [&:disabled]:cursor-default! [@media(max-width:639px)]:[&_span]:hidden! " disabled={refreshing} onClick={onRefresh} title="Làm mới dữ liệu" aria-label={`Làm mới ${title.toLowerCase()}`}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /><span>Làm mới</span></button>}
  </div>;
}

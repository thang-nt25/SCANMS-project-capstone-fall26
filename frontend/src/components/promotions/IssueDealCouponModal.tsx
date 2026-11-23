import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Loader2, Search, UserRound } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { referralLinksService, type ExclusiveDealProposal } from '../../services/referral-links.service';

interface Props {
  partners: { id?: string; userId?: string; collaboratorId?: string; fullName?: string; email?: string; collaborator?: { id: string; fullName: string; email?: string } }[];
  storeId: string; selectedId: string; code: string; discount: number;
  maxDiscount: number; expiresAt: string; busy: boolean;
  onSelect: (id: string) => void; onCode: (value: string) => void; onDiscount: (value: number) => void;
  onMaxDiscount: (value: number) => void; onExpiresAt: (value: string) => void;
  onClose: () => void; onSubmit: (event: FormEvent) => void;
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

export function IssueDealCouponModal(props: Props) {
  const formId = useId();
  const [deals, setDeals] = useState<ExclusiveDealProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [choosing, setChoosing] = useState(!props.selectedId);
  useEffect(() => {
    let live = true; setLoading(true); setError(false);
    referralLinksService.getShopExclusiveDeals().then(rows => {
      if (live) setDeals(rows.filter(row => row.storeId === props.storeId && row.status === 'APPROVED' && row.scopeType === 'STORE_WIDE' && !row.closedAt && row.isCurrentDeal !== false));
    }).catch(() => { if (live) setError(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [props.storeId, revision]);
  const options = [...new Map(deals.map(deal => [deal.collaboratorId || deal.collaborator?.id, deal])).entries()].filter(([id]) => !!id);
  const selected = options.find(([id]) => id === props.selectedId)?.[1];
  const candidates = new Map(props.partners.map(partner => {
    const id = partner.collaboratorId || partner.collaborator?.id || partner.id || partner.userId || '';
    return [id, { id, name: partner.collaborator?.fullName || partner.fullName || 'KOL', email: partner.collaborator?.email || partner.email || '', deal: options.find(([key]) => key === id)?.[1] }];
  }));
  for (const [id, deal] of options) candidates.set(id!, { id: id!, name: deal.collaborator?.fullName || deal.collaboratorName || candidates.get(id!)?.name || 'KOL', email: deal.collaborator?.email || candidates.get(id!)?.email || '', deal });
  const all = [...candidates.values()].filter(row => !!row.id).sort((a, b) => Number(!!b.deal) - Number(!!a.deal) || a.name.localeCompare(b.name, 'vi'));
  const visible = all.filter(row => (!onlyEligible || row.deal) && normalize(`${row.name} ${row.email}`).includes(normalize(search.trim())));
  return <Modal isOpen title="Cấp mã độc quyền" subtitle="Áp dụng cho Deal toàn cửa hàng đã duyệt" maxWidth="2xl" stickyHeader onClose={() => { if (!props.busy) props.onClose(); }} footer={<div className="flex justify-end gap-2"><button type="button" disabled={props.busy} onClick={props.onClose} className="min-h-10 rounded-xl border border-[#EAE4D7] bg-white px-5 text-sm text-[#7D715E]">Hủy</button><button type="submit" form={formId} disabled={props.busy || loading || error || !selected || !props.code.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-5 text-sm font-semibold text-[#715126] hover:bg-[#F3EFE6] disabled:opacity-40">{props.busy && <Loader2 size={15} className="animate-spin"/>}{props.busy ? 'Đang cấp…' : 'Cấp mã'}</button></div>}>
    <form id={formId} onSubmit={event => { if (!selected) { event.preventDefault(); return; } props.onSubmit(event); }} className="grid gap-4">
      <div className="grid gap-2"><span className="text-sm font-medium text-[#1A1612]">KOL thụ hưởng *</span>
        {!choosing && selected ? <div className="flex items-center gap-3 rounded-xl border border-[#EEDFC6] bg-[#FDFAF5] p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#EAE4D7] bg-white text-[#B88E4F]"><UserRound size={18}/></span><div className="min-w-0 flex-1"><strong className="block text-sm">{selected.collaborator?.fullName || selected.collaboratorName}</strong><span className="block truncate text-xs text-[#7D715E]">{selected.collaborator?.email}</span><span className="mt-1 block text-xs text-[#8C6226]">Deal toàn cửa hàng · {selected.approvedCommissionRate ?? selected.proposedCommissionRate}%</span></div><button type="button" disabled={props.busy} onClick={() => { setChoosing(true); setSearch(''); }} className="rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-xs text-[#715126]">Đổi</button></div> : <div className="overflow-hidden rounded-xl border border-[#EAE4D7] bg-white">
          <label className="flex items-center gap-2 border-b border-[#EAE4D7] px-3"><Search size={17} className="shrink-0 text-[#7D715E]"/><input aria-label="Tìm KOL theo tên hoặc email" placeholder="Tìm tên hoặc email KOL…" value={search} disabled={props.busy} onChange={event => setSearch(event.target.value)} className="h-11 min-w-0 flex-1 border-0 bg-white text-sm outline-none"/></label>
          <div className="flex flex-wrap items-center gap-2 border-b border-[#EAE4D7] bg-[#FDFCF9] px-3 py-2"><button type="button" aria-pressed={!onlyEligible} onClick={() => setOnlyEligible(false)} className={`rounded-lg px-2.5 py-1 text-xs ${!onlyEligible ? 'border border-[#EEDFC6] bg-white font-semibold text-[#715126]' : 'text-[#7D715E]'}`}>Tất cả đối tác ({all.length})</button><button type="button" aria-pressed={onlyEligible} onClick={() => setOnlyEligible(true)} className={`rounded-lg px-2.5 py-1 text-xs ${onlyEligible ? 'border border-[#EEDFC6] bg-white font-semibold text-[#715126]' : 'text-[#7D715E]'}`}>Đủ điều kiện ({options.length})</button></div>
          <div className="max-h-[220px] overflow-y-auto overscroll-contain p-1.5" role="group" aria-label="Danh sách đối tác KOL">
            {loading ? <p role="status" className="px-3 py-4 text-sm text-[#7D715E]">Đang tải KOL…</p> : error ? <p role="alert" className="px-3 py-4 text-xs text-red-600">Chưa tải được Deal. <button type="button" className="underline" onClick={() => setRevision(value => value + 1)}>Thử lại</button></p> : !visible.length ? <p className="px-3 py-4 text-sm text-[#7D715E]">{search ? 'Không tìm thấy KOL phù hợp.' : 'Chưa có đối tác phù hợp với bộ lọc.'}</p> : visible.map(row => <button key={row.id} type="button" disabled={props.busy || !row.deal} aria-pressed={props.selectedId === row.id} onClick={() => { props.onSelect(row.id); setChoosing(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left focus-visible:outline-[#B88E4F] ${row.deal ? 'hover:bg-[#FBF5EB]' : 'cursor-not-allowed bg-[#FAF8F5]/60'}`}><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium text-[#1A1612]">{row.name}</strong><span className="block truncate text-xs text-[#7D715E]">{row.email || 'Đối tác cửa hàng'}</span>{!row.deal && <span className="mt-1 block text-[11px] text-[#A56B17]">Chưa có Deal toàn cửa hàng đã duyệt</span>}</span>{row.deal && <span className="shrink-0 text-right text-xs text-[#8C6226]"><span className="block">Đề xuất chọn</span><span>{row.deal.approvedCommissionRate ?? row.deal.proposedCommissionRate}%</span></span>}{props.selectedId === row.id && row.deal && <Check size={15} className="text-[#B88E4F]"/>}</button>)}

          </div>
        </div>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Tên mã ưu đãi *<input required disabled={props.busy} value={props.code} onChange={event => props.onCode(event.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="Ví dụ: THAONHI10" className="h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm font-semibold outline-none focus:border-[#C59B58]"/></label><fieldset disabled={props.busy} className="m-0 min-w-0 border-0 p-0"><legend className="mb-2 text-sm font-medium">Mức giảm giá (3% – 20%) *</legend><div className="grid grid-cols-5 gap-1.5">{[5, 10, 15, 20].map(value => <button key={value} type="button" aria-pressed={props.discount === value} onClick={() => props.onDiscount(value)} className={`h-11 rounded-xl border text-xs font-medium ${props.discount === value ? 'border-[#D7BD94] bg-[#FBF5EB] text-[#715126]' : 'border-[#EAE4D7] bg-white text-[#7D715E]'}`}>{value}%</button>)}<input type="number" min={3} max={20} required value={props.discount} onChange={event => props.onDiscount(Math.min(20, Math.max(3, Number(event.target.value) || 3)))} className="h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-2 text-center text-sm font-semibold outline-none focus:border-[#C59B58]" aria-label="Nhập phần trăm giảm"/></div></fieldset></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Giảm tối đa / đơn (₫) *<input required type="number" min={10000} step={10000} disabled={props.busy} value={props.maxDiscount} onChange={event => props.onMaxDiscount(Math.max(10000, Number(event.target.value) || 10000))} className="h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm font-semibold outline-none focus:border-[#C59B58]"/></label>
        <label className="grid gap-2 text-sm font-medium">Ngày hết hạn chiến dịch *<input required type="datetime-local" disabled={props.busy} value={props.expiresAt} onChange={event => props.onExpiresAt(event.target.value)} className="h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm font-semibold outline-none focus:border-[#C59B58]"/></label>
      </div>
      {props.discount > 10 && <p className="m-0 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs font-semibold text-[#D97706]">Mức giảm {props.discount}% (&gt; 10%): Sau khi cấp sẽ tự động chuyển System Admin duyệt ngoại lệ.</p>}
      <p className="m-0 text-xs leading-relaxed text-[#7D715E]">Mã hoạt động không giới hạn lượt dùng trong suốt thời hạn hiệu lực (hạch toán trừ doanh thu đơn hàng). Cấp mã mới sẽ thay thế mã hiện tại của KOL tại cửa hàng.</p>
    </form>
  </Modal>;
}

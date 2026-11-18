import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Warehouse } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useReturnAction } from '../../hooks/useReturnDetail';
import { returnService, type ReturnAddress, type ReturnDetail } from '../../services/return.service';
import { VietnamAddressSelects } from './VietnamAddressSelects';

const input = 'mt-1 h-[42px] w-full min-w-0 rounded-lg border border-[#EAE4D7] bg-white px-3 text-sm text-[#1A1612] outline-none focus:border-[#C59B58]';
const button = 'inline-flex h-[42px] items-center justify-center rounded-lg border border-[#EAE4D7] bg-white px-4 text-sm font-semibold text-[#7D715E] disabled:opacity-50';
const streetAddress = (value: ReturnAddress) => value.address.split(',').map(part => part.trim()).filter(part =>
  ![value.wardName, value.districtName, value.provinceName].some(region => region?.trim().toLocaleLowerCase('vi') === part.toLocaleLowerCase('vi'))).join(', ');
const fullAddress = (value: ReturnAddress) => [...new Set([streetAddress(value), value.wardName, value.districtName, value.provinceName].filter(Boolean))].join(', ');

export function ReturnWarehouseCard({ request, triggerOnly = false, title = 'Kho nhận hàng trả', onSaved }: { request: ReturnDetail; triggerOnly?: boolean; title?: string; onSaved?: (value: ReturnAddress) => void }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(request.returnWarehouse);
  const [form, setForm] = useState<ReturnAddress>({ name: '', phone: '', address: '', provinceName: '', wardName: '', districtName: '' });
  const [addressValid, setAddressValid] = useState(false);
  const saving = useRef(false);
  const action = useReturnAction(request.id, returnService.saveWarehouse);
  const formId = `return-warehouse-${request.id}`;
  useEffect(() => { setSaved(request.returnWarehouse); }, [request.returnWarehouse]);
  const close = () => { if (!saving.current) setOpen(false); };
  const edit = () => {
    const value = saved || { name: request.order.storeName, phone: '', address: '', provinceName: '', wardName: '', districtName: '' };
    setForm({ ...value, address: streetAddress(value) });
    action.reset();
    setOpen(true);
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !addressValid) return;
    saving.current = true;
    const value = { ...form, name: form.name.trim(), phone: form.phone.trim(), address: fullAddress(form),
      provinceName: form.provinceName.trim(), wardName: form.wardName.trim(), districtName: form.districtName?.trim() || undefined };
    try { await action.mutateAsync(value); setSaved(value); onSaved?.(value); setOpen(false); }
    catch { /* Preserve the draft and show the API error. */ }
    finally { saving.current = false; }
  }
  return <>
    {triggerOnly ? <button type="button" onClick={edit} className="exchange-edit-address" aria-label={`Chỉnh sửa ${title.toLowerCase()}`}><Pencil size={14} />Chỉnh sửa</button> : <section aria-label="Kho nhận hàng trả" className="min-w-0 rounded-xl border border-[#EAE4D7] bg-white p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-[#1A1612]"><span className="flex size-8 items-center justify-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]"><Warehouse size={18} /></span>Kho nhận hàng trả</h3>
        <button type="button" onClick={edit} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[#EAE4D7] px-3 text-xs font-semibold text-[#79592C] hover:bg-[#FBF5EB]"><Pencil size={14} />{saved ? 'Chỉnh sửa' : 'Thêm kho'}</button>
      </div>
      {saved ? <div className="mt-2 space-y-1 [overflow-wrap:anywhere]">
        <p className="font-medium text-[#1A1612]">{saved.name}<span className="mx-2 text-[#7D715E]">·</span><span className="whitespace-nowrap tabular-nums">{saved.phone}</span></p>
        <p className="leading-relaxed text-[#7D715E]">{fullAddress(saved)}</p>
      </div> : <p className="mt-2 text-[#7D715E]">Chưa có kho nhận hàng trả.</p>}
    </section>}
    {open && createPortal(<Modal isOpen onClose={close} title={title} stickyHeader maxWidth="2xl" className="max-w-[640px]"
      footer={<div className="flex justify-end gap-2"><button type="button" onClick={close} disabled={action.isPending} className={button}>Hủy</button>
        <button type="submit" form={formId} disabled={action.isPending || !addressValid} className={`${button} border-[#EEDFC6]! bg-[#F3EFE6]! text-[#231D15]! hover:bg-[#EEDFC6]!`}>{action.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>}>
      <form id={formId} onSubmit={event => void submit(event)}>
        <fieldset disabled={action.isPending} className="grid min-w-0 gap-4 sm:grid-cols-2 disabled:opacity-60">
          <label className="min-w-0 text-sm font-medium">Người nhận<input required minLength={2} maxLength={150} autoComplete="name" value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} className={input} /></label>
          <label className="min-w-0 text-sm font-medium">Số điện thoại<input required type="tel" pattern="\+?[0-9]{9,15}" autoComplete="tel" maxLength={16} value={form.phone} onChange={e => setForm(current => ({ ...current, phone: e.target.value }))} className={input} /></label>
          <label className="min-w-0 text-sm font-medium sm:col-span-2">Địa chỉ chi tiết<input required minLength={2} maxLength={350} autoComplete="street-address" placeholder="Số nhà, tên đường" value={form.address} onChange={e => setForm(current => ({ ...current, address: e.target.value }))} className={input} /></label>
          <VietnamAddressSelects value={form} onChange={value => setForm(current => ({ ...current, ...value }))} onValidityChange={setAddressValid} />
        </fieldset>
        {action.error && <p role="alert" className="mt-3 text-sm text-[#DC2626]">{action.error instanceof Error ? action.error.message : 'Chưa lưu được kho. Vui lòng thử lại.'}</p>}
      </form>
    </Modal>, document.querySelector('dialog[open]') || document.body)}
  </>;
}

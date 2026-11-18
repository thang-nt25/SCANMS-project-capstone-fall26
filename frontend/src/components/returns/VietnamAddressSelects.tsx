import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVietnamLocalities, type AddressVersion } from '../../services/vietnam-localities.service';

interface Value { provinceName: string; wardName: string; districtName?: string }
interface Props {
  value: Value;
  onChange: (value: Value) => void;
  onValidityChange: (valid: boolean) => void;
}
const selectClass = 'mt-1 h-[42px] w-full min-w-0 rounded-lg border border-[#EAE4D7] bg-white px-3 text-sm text-[#1A1612] outline-none focus:border-[#C59B58] disabled:bg-[#FAF8F5] disabled:text-[#7D715E]';

export function VietnamAddressSelects({ value, onChange, onValidityChange }: Props) {
  const id = useId();
  const [version, setVersion] = useState<AddressVersion>(value.districtName ? 'v1' : 'v2');
  const provinces = useQuery({ queryKey: ['vn-localities', version, 'provinces'], queryFn: ({ signal }) => getVietnamLocalities(version, 'provinces', undefined, signal), staleTime: 86400000, retry: 1 });
  const province = provinces.data?.find(item => item.name === value.provinceName);
  const districts = useQuery({ queryKey: ['vn-localities', version, 'districts', province?.code], enabled: version === 'v1' && Boolean(province), queryFn: ({ signal }) => getVietnamLocalities(version, 'districts', province!.code, signal), staleTime: 86400000, retry: 1 });
  const district = districts.data?.find(item => item.name === value.districtName);
  const parentCode = version === 'v1' ? district?.code : province?.code;
  const wards = useQuery({ queryKey: ['vn-localities', version, 'wards', parentCode], enabled: parentCode !== undefined, queryFn: ({ signal }) => getVietnamLocalities(version, 'wards', parentCode, signal), staleTime: 86400000, retry: 1 });
  const ward = wards.data?.find(item => item.name === value.wardName);
  const valid = Boolean(province && ward && (version === 'v2' || district) && !provinces.isError && !wards.isError && (version === 'v2' || !districts.isError));
  useEffect(() => { onValidityChange(valid); }, [valid, onValidityChange]);
  const failed = [provinces, ...(version === 'v1' && province ? [districts] : []), ...(parentCode !== undefined ? [wards] : [])].filter(query => query.isError);
  return <div className="vietnam-address-selects grid min-w-0 gap-4 sm:col-span-2 sm:grid-cols-2">
    <label className="min-w-0 text-sm font-medium sm:col-span-2" htmlFor={`${id}-version`}>Danh mục địa chỉ
      <select id={`${id}-version`} className={selectClass} value={version} onChange={event => { setVersion(event.target.value as AddressVersion); onChange({ provinceName: '', districtName: '', wardName: '' }); onValidityChange(false); }}>
        <option value="v2">Địa chỉ hiện hành · Tỉnh / thành phố, phường / xã</option>
        <option value="v1">Địa chỉ cũ · Có quận / huyện</option>
      </select>
    </label>
    <label className="min-w-0 text-sm font-medium" htmlFor={`${id}-province`}>Tỉnh / thành phố
      <select required id={`${id}-province`} data-address-province className={selectClass} value={province?.code ?? ''} disabled={provinces.isPending || provinces.isError} onChange={event => { const selected = provinces.data?.find(item => String(item.code) === event.target.value); onChange({ provinceName: selected?.name || '', districtName: '', wardName: '' }); onValidityChange(false); }}>
        <option value="">{provinces.isPending ? 'Đang tải tỉnh / thành phố…' : 'Chọn tỉnh / thành phố'}</option>
        {provinces.data?.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
    </label>
    {version === 'v1' && <label className="min-w-0 text-sm font-medium" htmlFor={`${id}-district`}>Quận / huyện
      <select required id={`${id}-district`} data-address-district className={selectClass} value={district?.code ?? ''} disabled={!province || districts.isPending || districts.isError} onChange={event => { const selected = districts.data?.find(item => String(item.code) === event.target.value); onChange({ ...value, districtName: selected?.name || '', wardName: '' }); onValidityChange(false); }}>
        <option value="">{province && districts.isPending ? 'Đang tải quận / huyện…' : 'Chọn quận / huyện'}</option>
        {districts.data?.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
    </label>}
    <label className={`min-w-0 text-sm font-medium ${version === 'v1' ? 'sm:col-span-2' : ''}`} htmlFor={`${id}-ward`}>Phường / xã
      <select required id={`${id}-ward`} data-address-ward className={selectClass} value={ward?.code ?? ''} disabled={parentCode === undefined || wards.isPending || wards.isError} onChange={event => { const selected = wards.data?.find(item => String(item.code) === event.target.value); onChange({ ...value, wardName: selected?.name || '' }); onValidityChange(Boolean(selected && province && (version === 'v2' || district))); }}>
        <option value="">{parentCode !== undefined && wards.isPending ? 'Đang tải phường / xã…' : 'Chọn phường / xã'}</option>
        {wards.data?.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
    </label>
    {failed.length > 0 && <p role="alert" className="text-xs text-[#DC2626] sm:col-span-2">Chưa tải được danh sách địa phương. <button type="button" className="font-semibold underline" onClick={() => failed.forEach(query => void query.refetch())}>Thử lại</button></p>}
  </div>;
}

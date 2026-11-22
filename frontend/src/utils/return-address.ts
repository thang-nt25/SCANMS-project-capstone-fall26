import type { ReturnAddress } from '../services/return.service';
import { getVietnamLocalities, type Locality } from '../services/vietnam-localities.service';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\bthanh pho\b|\btp\.?|\btinh\b|\bquan\b|\bhuyen\b|\bphuong\b|\bxa\b/g, '').replace(/[.\s]+/g, ' ').trim();
const same = (a: string, b: string) => normalize(a) === normalize(b);
export const returnStreet = (value: ReturnAddress) => value.address.split(',').map(part => part.trim()).filter(part => ![value.wardName, value.districtName, value.provinceName].some(region => region && same(region, part))).join(', ');
export const returnFullAddress = (value: ReturnAddress) => [returnStreet(value), value.wardName, value.districtName, value.provinceName].filter(Boolean).join(', ');
export const completeReturnAddress = (value: ReturnAddress) => Boolean(value.name.trim().length >= 2 && /^\+?[0-9]{9,15}$/.test(value.phone.trim()) && value.address.trim().length >= 2 && value.provinceName && value.wardName);

/** Match saved names within each parent branch; never fuzzy-match or invent a locality. */
export async function resolveSavedReturnAddress(value: ReturnAddress, signal?: AbortSignal): Promise<ReturnAddress | null> {
  const parts = value.address.split(',').map(part => part.trim()).filter(Boolean);
  const legacy = Boolean(value.districtName || parts.some(part => /^(quận|huyện|thị xã)\s/i.test(part)));
  const version = legacy ? 'v1' : 'v2';
  const find = (items: Locality[], name?: string) => {
    const matches = items.filter(item => (name ? [name] : parts).some(part => same(item.name, part)));
    return matches.length === 1 ? matches[0] : undefined;
  };
  const province = find(await getVietnamLocalities(version, 'provinces', undefined, signal), value.provinceName);
  if (!province) return null;
  const district = legacy ? find(await getVietnamLocalities('v1', 'districts', province.code, signal), value.districtName) : undefined;
  if (legacy && !district) return null;
  const ward = find(await getVietnamLocalities(version, 'wards', district?.code ?? province.code, signal), value.wardName);
  if (!ward) return null;
  const result = { ...value, provinceName: province.name, wardName: ward.name, districtName: district?.name || '' };
  return { ...result, address: returnStreet(result) };
}

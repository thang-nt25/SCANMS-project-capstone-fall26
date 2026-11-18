export interface Locality { code: number; name: string }
export type AddressVersion = 'v1' | 'v2';

/** Fetch only the selected branch, rather than the entire national ward tree. */
export async function getVietnamLocalities(version: AddressVersion, kind: 'provinces' | 'districts' | 'wards', parentCode?: number, signal?: AbortSignal): Promise<Locality[]> {
  const path = kind === 'provinces' ? '/' : kind === 'districts' || version === 'v2' ? `/p/${parentCode}` : `/d/${parentCode}`;
  const url = new URL(`https://provinces.open-api.vn/api/${version}${path}`);
  url.searchParams.set('depth', kind === 'provinces' ? '1' : '2');
  const response = await fetch(url, { signal: AbortSignal.any([AbortSignal.timeout(15000), ...(signal ? [signal] : [])]) });
  if (!response.ok) throw new Error('Không tải được danh sách địa phương.');
  const data = await response.json();
  const list: unknown = kind === 'provinces' ? data : data?.[kind];
  if (!Array.isArray(list) || !list.length || !list.every(value => typeof value?.code === 'number' && typeof value?.name === 'string')) {
    throw new Error('Danh sách địa phương không hợp lệ.');
  }
  return list;
}

import type { MediaAsset } from '../services/media.service';

export async function loadStoreMediaLibrary(
  storeId: string,
  fetchPage: (page: number) => Promise<unknown>,
) {
  const assets = new Map<string, MediaAsset>();
  let page = 1;
  let totalPages = 1;
  do {
    const response: any = await fetchPage(page);
    const data = response?.data ?? response;
    const items = Array.isArray(data) ? data : data?.items;
    if (!Array.isArray(items)) throw new Error('Không đọc được kho nội dung của gian hàng.');
    for (const asset of items as MediaAsset[]) {
      if (asset.storeId === storeId && asset.status === 'APPROVED' &&
          ['VIDEO', 'IMAGE', 'COPYWRITE_TEXT'].includes(asset.assetType)) assets.set(asset.id, asset);
    }
    totalPages = Number(data?.pagination?.totalPages) || 1;
    page++;
  } while (page <= totalPages);
  return [...assets.values()];
}

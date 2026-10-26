export interface MediaPage<T> {
  items: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

/** Fetch every authorised page before declaring a pack complete. No partial ZIP on failure. */
export async function fetchAllMediaPages<T extends { id: string }>(
  fetchPage: (page: number, limit: number) => Promise<MediaPage<T>>,
  options: { signal?: AbortSignal; onProgress?: (loaded: number, total: number) => void } = {},
): Promise<T[]> {
  const items = new Map<string, T>();
  let total = 0, pages = 1;
  const checkAbort = () => { if (options.signal?.aborted) throw new DOMException('Đã hủy tải tài nguyên.', 'AbortError'); };
  for (let page = 1; page <= pages; page++) {
    checkAbort();
    const response = await fetchPage(page, 100);
    checkAbort();
    const pagination = response?.pagination;
    if (!Array.isArray(response?.items) || !pagination || pagination.page !== page ||
        !Number.isSafeInteger(pagination.total) || pagination.total < 0 ||
        !Number.isSafeInteger(pagination.limit) || pagination.limit <= 0 ||
        pagination.totalPages !== Math.ceil(pagination.total / pagination.limit)) {
      throw new Error('Máy chủ trả về phân trang tài nguyên không hợp lệ. Vui lòng thử lại.');
    }
    if (page === 1) { total = pagination.total; pages = pagination.totalPages; }
    if (pagination.total !== total || pagination.totalPages !== pages) throw new Error('Kho nội dung vừa thay đổi. Vui lòng tải lại để lấy đủ tài nguyên.');
    for (const item of response.items) {
      if (!item?.id) throw new Error('Tài nguyên thiếu mã định danh. Vui lòng tải lại.');
      items.set(item.id, item);
    }
    options.onProgress?.(items.size, total);
  }
  if (items.size !== total) throw new Error('Chưa tải đủ tài nguyên hoặc danh sách vừa thay đổi. Vui lòng tải lại trước khi tải Pack.');
  return [...items.values()];
}

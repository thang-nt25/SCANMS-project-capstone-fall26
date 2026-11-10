export interface DealPage<T> { items: T[]; total: number; page: number; pageSize: number; nextCursor?: string | null }
/** Existing combined hubs need every proposal to compute their filters and counts. */
export async function readDealPages<T extends { id: string | number }>(fetchPage: (page: number, after?: string) => Promise<DealPage<T>>): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string | number>();
  const cursors = new Set<string>();
  let after: string | undefined;
  let initialTotal: number | undefined;
  let cursorMode: boolean | undefined;
  let page = 1;
  while (true) {
    const result = await fetchPage(page, after);
    if (!Array.isArray(result.items) || result.page !== page || !Number.isSafeInteger(result.pageSize) || result.pageSize < 1 || !Number.isSafeInteger(result.total) || result.total < 0)
      throw new Error('Dữ liệu phân trang thỏa thuận không hợp lệ. Vui lòng tải lại.');
    const hasCursor = Object.prototype.hasOwnProperty.call(result, 'nextCursor');
    if (cursorMode === undefined) { cursorMode = hasCursor; initialTotal = result.total; }
    if (cursorMode !== hasCursor || (!cursorMode && initialTotal !== result.total))
      throw new Error('Danh sách thỏa thuận vừa thay đổi. Vui lòng tải lại để lấy đủ dữ liệu.');
    for (const item of result.items) {
      if (!item || (typeof item.id !== 'string' && typeof item.id !== 'number') || seen.has(item.id))
        throw new Error('Danh sách thỏa thuận vừa thay đổi. Vui lòng tải lại để lấy đủ dữ liệu.');
      seen.add(item.id);
    }
    items.push(...result.items);
    if (cursorMode) {
      if (result.nextCursor === null) return items;
      if (typeof result.nextCursor !== 'string' || !result.nextCursor || cursors.has(result.nextCursor) || !result.items.length)
        throw new Error('Mốc phân trang thỏa thuận không hợp lệ. Vui lòng tải lại.');
      cursors.add(result.nextCursor);
      after = result.nextCursor;
      page++;
      continue;
    }
    if (page * result.pageSize >= result.total) return items;
    if (!result.items.length) throw new Error('Danh sách thỏa thuận vừa thay đổi. Vui lòng tải lại để lấy đủ dữ liệu.');
    page++;
  }
}

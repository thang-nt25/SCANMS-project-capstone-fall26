/** Keep structured chat cards readable in notifications; never expose raw JSON. */
export function chatNotificationPreview(
  text: string,
  mediaType?: string,
): string {
  let preview = text.trim();
  try {
    const card: unknown = JSON.parse(preview);
    if (card && typeof card === 'object' && 'type' in card) {
      const value = card as Record<string, unknown>;
      if (value.type === 'PRODUCT_INQUIRY') {
        preview =
          typeof value.message === 'string'
            ? value.message
            : 'Đã gửi một sản phẩm';
      } else if (value.type === 'COUPON_VOUCHER') {
        preview = 'Đã gửi mã giảm giá';
      } else {
        preview = 'Đã gửi nội dung chia sẻ';
      }
    }
  } catch {
    // Ordinary text is not JSON.
  }
  return (
    preview ||
    (mediaType === 'IMAGE'
      ? 'Đã gửi hình ảnh'
      : mediaType === 'VIDEO'
        ? 'Đã gửi video'
        : 'Đã gửi tệp đính kèm')
  ).slice(0, 200);
}

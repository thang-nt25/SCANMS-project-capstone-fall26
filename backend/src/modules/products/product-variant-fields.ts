const CATEGORY_FIELDS: Record<string, Array<[string, string]>> = {
  'Mỹ phẩm & Chăm sóc da': [
    ['volume', 'Dung tích / khối lượng'],
    ['formula', 'Dạng / công thức'],
    ['package', 'Quy cách'],
  ],
  'Trang điểm & Làm đẹp': [
    ['shade', 'Màu / tông'],
    ['finish', 'Chất / hiệu ứng'],
    ['volume', 'Dung tích / khối lượng'],
  ],
  'Chăm sóc cơ thể & Tóc': [
    ['volume', 'Dung tích / khối lượng'],
    ['scent', 'Mùi hương'],
    ['formula', 'Dạng sản phẩm'],
  ],
  'Thực phẩm chức năng & Sức khỏe': [
    ['weight', 'Khối lượng / số lượng'],
    ['flavor', 'Vị / hương'],
    ['package', 'Quy cách đóng gói'],
  ],
  'Thiết bị điện tử & Phụ kiện': [
    ['model', 'Mẫu / phiên bản'],
    ['color', 'Màu sắc'],
    ['capacity', 'Cấu hình / dung lượng'],
  ],
  'Thời trang & Phụ kiện': [
    ['color', 'Màu sắc'],
    ['size', 'Size'],
    ['style', 'Kiểu / mẫu'],
  ],
};
/** Shared by product validation and the native form contract to avoid category drift. */
export function productVariantFields(
  category?: string | null,
): Array<[string, string]> {
  return (
    CATEGORY_FIELDS[category?.trim() || ''] || [
      ['type', 'Loại / mẫu'],
      ['specification', 'Kích thước / quy cách'],
      ['color', 'Màu / phiên bản'],
    ]
  );
}

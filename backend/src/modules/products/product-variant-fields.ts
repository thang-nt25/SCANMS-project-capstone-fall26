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
  const cat = category?.trim() || '';
  if (CATEGORY_FIELDS[cat]) return CATEGORY_FIELDS[cat];
  const lower = cat.toLowerCase();
  if (lower.includes('mỹ phẩm') || lower.includes('skincare') || lower.includes('da') || lower.includes('serum') || lower.includes('cosmetic')) {
    return CATEGORY_FIELDS['Mỹ phẩm & Chăm sóc da'];
  }
  if (lower.includes('trang điểm') || lower.includes('làm đẹp') || lower.includes('makeup') || lower.includes('son')) {
    return CATEGORY_FIELDS['Trang điểm & Làm đẹp'];
  }
  if (lower.includes('cơ thể') || lower.includes('tóc') || lower.includes('body') || lower.includes('tắm') || lower.includes('gội')) {
    return CATEGORY_FIELDS['Chăm sóc cơ thể & Tóc'];
  }
  if (lower.includes('thực phẩm') || lower.includes('dinh dưỡng') || lower.includes('sức khỏe') || lower.includes('thảo mộc') || lower.includes('health') || lower.includes('nutrition')) {
    return CATEGORY_FIELDS['Thực phẩm chức năng & Sức khỏe'];
  }
  if (lower.includes('thời trang') || lower.includes('may mặc') || lower.includes('áo') || lower.includes('quần') || lower.includes('thể thao') || lower.includes('activewear') || lower.includes('apparel')) {
    return CATEGORY_FIELDS['Thời trang & Phụ kiện'];
  }
  if (lower.includes('gia dụng') || lower.includes('đồ bếp') || lower.includes('thiết bị') || lower.includes('điện tử') || lower.includes('living') || lower.includes('smart')) {
    return CATEGORY_FIELDS['Thiết bị điện tử & Phụ kiện'];
  }
  return [
    ['type', 'Loại / mẫu'],
    ['specification', 'Kích thước / quy cách'],
    ['color', 'Màu / phiên bản'],
  ];
}

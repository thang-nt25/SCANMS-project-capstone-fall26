// Product groups refine the store's industry; they never replace categoryName.
export function productGroupsForCategory(category: string): string[] {
  const name = category.toLocaleLowerCase('vi-VN');
  if (/mỹ phẩm|chăm sóc da/.test(name)) return ['Serum', 'Kem dưỡng', 'Sữa rửa mặt', 'Kem chống nắng', 'Tẩy trang', 'Toner', 'Mặt nạ'];
  if (/trang điểm|làm đẹp/.test(name)) return ['Son môi', 'Kem nền', 'Phấn phủ', 'Trang điểm mắt', 'Dụng cụ trang điểm'];
  if (/cơ thể|tóc/.test(name)) return ['Chăm sóc cơ thể', 'Dầu gội', 'Dầu xả', 'Chăm sóc tóc', 'Nước hoa'];
  if (/thời trang|phụ kiện thời trang/.test(name)) return ['Áo', 'Quần', 'Váy & Đầm', 'Đồ thể thao', 'Giày dép', 'Túi & Phụ kiện'];
  if (/thực phẩm|sức khỏe|dinh dưỡng/.test(name)) return ['Thực phẩm dinh dưỡng', 'Vitamin & Khoáng chất', 'Thảo mộc', 'Đồ uống', 'Hỗ trợ sức khỏe'];
  if (/điện tử|thiết bị|gia dụng/.test(name)) return ['Thiết bị gia dụng', 'Thiết bị nhà thông minh', 'Bàn phím & Chuột', 'Tai nghe & Âm thanh', 'Phụ kiện điện tử'];
  return [];
}

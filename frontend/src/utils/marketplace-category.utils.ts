export const HOME_CATEGORY_GROUPS = [
  { id: 'makeup', label: 'Trang điểm', image: '/assets/categories/makeup-v1.png', terms: ['trang diem', 'makeup', 'son moi', 'phan mat', 'mascara'] },
  { id: 'body', label: 'Chăm sóc cơ thể', image: '/assets/categories/body-v1.png', terms: ['co the', 'cham soc toc', 'body care', 'sua tam', 'dau goi'] },
  { id: 'skin', label: 'Chăm sóc da', image: '/assets/categories/skin-v1.png', terms: ['cham soc da', 'duong da', 'skincare', 'serum', 'my pham', 'sua rua mat', 'chong nang', 'kem duong'] },
  { id: 'fashion', label: 'Thời trang & Phụ kiện', image: '/assets/products/real/linen-dress.jpg', terms: ['thoi trang', 'may mac'] },
  { id: 'electronics', label: 'Điện tử & Gia dụng', image: '/assets/products/real/wireless-earbuds.jpg', terms: ['dien tu', 'gia dung', 'thiet bi', 'ban phim', 'tai nghe', 'noi chien'] },
  { id: 'health', label: 'Sức khỏe & Dinh dưỡng', image: '/assets/categories/health-v1.png', terms: ['suc khoe', 'thuc pham bo sung', 'thuc pham chuc nang', 'vitamin', 'health', 'dinh duong'] },
] as const;

export interface CatalogCategory {
  name: string;
  count: number;
}

export function normalizeCategory(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

export function matchesHomeCategory(category: string, groupId: string): boolean {
  return !HOME_CATEGORY_GROUPS.some((group) => group.id === groupId) || getHomeCategoryGroup(category)?.id === groupId;
}

export function getHomeCategoryGroup(category: string) {
  const normalized = normalizeCategory(category || '');
  return HOME_CATEGORY_GROUPS.find((group) => group.terms.some((term) => normalized.includes(term)));
}

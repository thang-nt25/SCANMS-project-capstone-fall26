export const HOME_CATEGORY_GROUPS = [
  { id: 'skin', label: 'Chăm sóc da', terms: ['cham soc da', 'duong da', 'skincare', 'serum', 'my pham', 'sua rua mat', 'chong nang', 'kem duong'] },
  { id: 'makeup', label: 'Trang điểm', terms: ['trang diem', 'makeup', 'son', 'phan', 'mascara', 'beauty', 'lam dep'] },
  { id: 'body', label: 'Cơ thể & Thiết bị', terms: ['co the', 'body', 'sua tam', 'dau goi', 'thoi trang', 'may mac', 'gia dung', 'thiet bi', 'ban phim', 'tai nghe', 'noi chien'] },
  { id: 'health', label: 'Sức khỏe & Dinh dưỡng', terms: ['suc khoe', 'thuc pham bo sung', 'thuc pham chuc nang', 'vitamin', 'health', 'dinh duong', 'uong'] },
] as const;

export function normalizeCategory(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

export function matchesHomeCategory(category: string, groupId: string): boolean {
  const group = HOME_CATEGORY_GROUPS.find((candidate) => candidate.id === groupId);
  if (!group) return true;
  const normalized = normalizeCategory(category || '');
  return group.terms.some((term) => normalized.includes(term));
}

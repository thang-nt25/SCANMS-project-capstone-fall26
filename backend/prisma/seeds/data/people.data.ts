export const CREATOR_NAMES = [
  'Đinh Thảo Nhi',
  'Trần Thu Hà',
  'Lê Ngọc Linh',
  'Phạm Hoàng Nam',
  'Vũ Thanh Huyền',
  'Đặng Bảo Ngọc',
  'Bùi Minh Anh',
  'Đỗ Khánh Linh',
  'Hồ Gia Hân',
  'Ngô Quỳnh Chi',
  'Dương Tuấn Anh',
  'Lý Phương Thảo',
  'Phan Hải Yến',
  'Trịnh Đức Huy',
  'Mai Thùy Dung',
  'Nguyễn Mai Anh',
  'Võ Minh Khang',
  'Cao Bích Ngọc',
  'Tạ Ngọc Anh',
  'Đoàn Anh Thư',
] as const;

export const CUSTOMER_NAMES = [
  'Nguyễn Văn An',
  'Trần Thị Mai',
  'Lê Hoàng Nam',
  'Phạm Thu Trang',
  'Vũ Minh Đức',
  'Đặng Thanh Tâm',
  'Bùi Ngọc Lan',
  'Đỗ Tuấn Kiệt',
  'Hồ Phương Anh',
  'Ngô Nhật Minh',
  'Dương Thị Hồng',
  'Lý Quốc Bảo',
  'Phan Thanh Hà',
  'Trịnh Hải Đăng',
  'Mai Quỳnh Như',
  'Đinh Đức Long',
  'Võ Thị Hạnh',
  'Cao Minh Châu',
  'Tạ Gia Bảo',
  'Đoàn Thùy Linh',
  'Nguyễn Hải Yến',
  'Trần Hoàng Phúc',
  'Lê Ngọc Trâm',
  'Phạm Thành Đạt',
  'Vũ Thảo Nguyên',
  'Đặng Quốc Hưng',
  'Bùi Khánh Vy',
  'Đỗ Minh Quân',
  'Hồ Thu Phương',
  'Ngô Bảo Châu',
] as const;

export const TIERS = [
  { name: 'Đồng', count: 5, bonus: 0, threshold: 0 },
  { name: 'Bạc', count: 7, bonus: 1, threshold: 5_000_000 },
  { name: 'Vàng', count: 5, bonus: 2, threshold: 20_000_000 },
  { name: 'Kim Cương', count: 3, bonus: 3, threshold: 50_000_000 },
] as const;

export const CREATOR_AVATARS = [
  'kol-avatar-maianh.jpg',
  'kol-avatar-ha.jpg',
  'kol-avatar-linh.jpg',
  'kol-avatar-nam.jpg',
  'kol-avatar-depxinh.jpg',
  'kol-avatar-nghia.jpg',
  'kol-avatar-thang.jpg',
  'kol-avatar-tuan.jpg',
  'kol-avatar-nhat.jpg',
] as const;

// Synthetic contact details. The seed never sends OTPs, email, SMS or payouts.
export const demoPhone = (group: number, index: number): string =>
  `${['09', '03', '07', '08'][group % 4]}990${String(index + 1).padStart(5, '0')}`;

export function tierIndexForCreator(index: number): number {
  return index < 5 ? 0 : index < 12 ? 1 : index < 17 ? 2 : 3;
}

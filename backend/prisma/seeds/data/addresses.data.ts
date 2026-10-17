export interface SeedAddress {
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
  detailAddress: string;
}

/** Verified against GHN /master-data/province, /district and /ward on 2026-10-16.
 * These are provider identifiers, not administrative codes from a different API.
 */
export const ADDRESSES: readonly SeedAddress[] = [
  {
    provinceCode: '202',
    provinceName: 'Hồ Chí Minh',
    districtCode: '1442',
    districtName: 'Quận 1',
    wardCode: '20110',
    wardName: 'Phường Tân Định',
    detailAddress: '12 Hai Bà Trưng',
  },
  {
    provinceCode: '201',
    provinceName: 'Hà Nội',
    districtCode: '1484',
    districtName: 'Quận Ba Đình',
    wardCode: '1A0114',
    wardName: 'Phường Vĩnh Phúc',
    detailAddress: '24 Hoàng Hoa Thám',
  },
  {
    provinceCode: '203',
    provinceName: 'Đà Nẵng',
    districtCode: '1526',
    districtName: 'Quận Hải Châu',
    wardCode: '91579',
    wardName: 'Phường Hải Châu',
    detailAddress: '36 Lê Duẩn',
  },
  {
    provinceCode: '220',
    provinceName: 'Cần Thơ',
    districtCode: '1572',
    districtName: 'Quận Ninh Kiều',
    wardCode: '550113',
    wardName: 'Phường Xuân Khánh',
    detailAddress: '48 Đường 3 Tháng 2',
  },
];

export const addressFor = (index: number): SeedAddress => ({
  ...ADDRESSES[index % ADDRESSES.length],
  detailAddress: `${12 + index * 2} ${ADDRESSES[index % ADDRESSES.length].detailAddress.replace(/^\d+\s/, '')}`,
});

export const fullAddress = (address: SeedAddress): string =>
  [
    address.detailAddress,
    address.wardName,
    address.districtName,
    address.provinceName,
  ].join(', ');

/** Public editorial references, NOT registered/verified SCANMS partners.
 * Names and channel links were cross-checked against the linked creator-network profiles.
 * No follower, identity, bank or address data is copied from these people.
 */
export const CREATOR_REFERENCES = [
  ['Trinh Phạm', 'https://www.youtube.com/@TrinhPhamFamily', 'trinh-pham-898'],
  ['Call Me Duy', 'https://www.youtube.com/c/CallMeDuy', 'call-me-duy-676'],
  ['Chloe Nguyễn', 'https://www.youtube.com/c/ChloeNguyen', 'chloe-nguyen-684'],
  [
    'An Phương',
    'https://www.youtube.com/@Letsplaymakeupchannel',
    'an-phuong-981',
  ],
  ['Quỳnh Thi', 'https://www.youtube.com/c/quynhthi', 'quynh-thi-899'],
  [
    'Choco Trúc Phương',
    'https://www.youtube.com/@chocotrucphuongofficial5161',
    'choco-truc-phuong-949',
  ],
  ['Con Thỏ', 'https://www.youtube.com/@CONTHO', 'con-tho-1028'],
  [
    'Quỳnh Anh Shyn',
    'https://www.youtube.com/@QuynhAnhShynY1',
    'quynh-anh-shyn-1047',
  ],
  ['Dương Fynn', 'https://www.youtube.com/@duongfynn97', 'duong-fynn-993'],
  ['Lena', 'https://www.youtube.com/@LenavietnamOfficial', 'lena-1005'],
  ['Sĩ Thanh', 'https://www.youtube.com/@SiThanhOfficial', 'si-thanh-1115'],
  ['Cuội', 'https://www.youtube.com/@cuoi', 'cuoi-1011'],
  ['Dược sĩ Tiến', 'https://www.youtube.com/@DuocsiTien', 'duoc-si-tien-987'],
  [
    'Phí Phương Anh',
    'https://www.youtube.com/@phiphuonganhofficial8696',
    'phi-phuong-anh-953',
  ],
  ['Cara', 'https://www.youtube.com/c/CARADREAMS', 'cara-704'],
  ['Tóc Tiên', 'https://www.youtube.com/@toctien1305', 'toc-tien-1113'],
  [
    'Thảo Nhi Lê',
    'https://www.youtube.com/@daphalefashion',
    'thao-nhi-le-1091',
  ],
  ['Châu Muối', 'https://www.youtube.com/@ChauMuoi', 'chau-muoi-884'],
  ['Dino Vũ / Dinology', 'https://www.youtube.com/c/Dinology', 'dinology-671'],
  [
    'Fabo Nguyễn',
    'https://www.youtube.com/c/FaboNguyenOfficial',
    'fabo-nguyen-653',
  ],
].map(([name, channelUrl, source]) => ({
  name,
  channelUrl,
  sourceUrl: `https://metub.net/blog/${source}.html`,
  sourceCheckedAt: '2026-10-18',
  verification: 'AGENCY_LISTED' as const,
}));

export function creatorReferenceMetadata(index: number) {
  return {
    ...CREATOR_REFERENCES[index],
    purpose: 'PUBLIC_REFERENCE_FOR_CAPSTONE_TESTING',
    ownershipVerified: false,
    partnershipVerified: false,
    metricsSource: 'SYNTHETIC_CAPSTONE',
    avatarSource: 'GENERIC_TEST_AVATAR',
    warning:
      'Tên/kênh chỉ để tham khảo. Tài khoản, KYC, cấp bậc, follower và giao dịch là dữ liệu kiểm thử, không thuộc creator thật.',
  };
}

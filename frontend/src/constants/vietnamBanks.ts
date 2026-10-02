export interface VietnamBank {
  code: string;
  shortName: string;
  name: string;
}

export const VIETNAM_BANKS: VietnamBank[] = [
  // Top Ngân hàng phổ biến nhất
  { code: 'VCB', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
  { code: 'MB', shortName: 'MBBank', name: 'Ngân hàng TMCP Quân đội' },
  { code: 'TCB', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
  { code: 'CTG', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công thương Việt Nam' },
  { code: 'BIDV', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { code: 'ACB', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
  { code: 'VPB', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { code: 'TPB', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong' },
  { code: 'STB', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { code: 'HDB', shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM' },
  { code: 'VIB', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam' },
  { code: 'VBA', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp & Phát triển Nông thôn Việt Nam' },

  // Nhóm Ngân hàng TMCP Việt Nam
  { code: 'SHB', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { code: 'MSB', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
  { code: 'OCB', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông' },
  { code: 'LPB', shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam' },
  { code: 'SSB', shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á' },
  { code: 'NAB', shortName: 'Nam A Bank', name: 'Ngân hàng TMCP Nam Á' },
  { code: 'BAB', shortName: 'Bac A Bank', name: 'Ngân hàng TMCP Bắc Á' },
  { code: 'PVB', shortName: 'PVcomBank', name: 'Ngân hàng TMCP Đại Chúng Việt Nam' },
  { code: 'KLB', shortName: 'Kienlongbank', name: 'Ngân hàng TMCP Kiên Long' },
  { code: 'BVB', shortName: 'BVBank', name: 'Ngân hàng TMCP Bản Việt' },
  { code: 'VBB', shortName: 'VietBank', name: 'Ngân hàng TMCP Việt Nam Thương Tín' },
  { code: 'BAOVIET', shortName: 'BaoViet Bank', name: 'Ngân hàng TMCP Bảo Việt' },
  { code: 'SGB', shortName: 'Saigonbank', name: 'Ngân hàng TMCP Sài Gòn Công Thương' },
  { code: 'PGB', shortName: 'PGBank', name: 'Ngân hàng TMCP Thịnh Vượng và Phát triển' },
  { code: 'SCB', shortName: 'SCB', name: 'Ngân hàng TMCP Sài Gòn' },
  { code: 'DAB', shortName: 'DongA Bank', name: 'Ngân hàng TMCP Đông Á' },
  { code: 'GPB', shortName: 'GPBank', name: 'Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu' },
  { code: 'OCEANBANK', shortName: 'OceanBank', name: 'Ngân hàng Thương mại TNHH MTV Đại Dương' },
  { code: 'CBB', shortName: 'CBBank', name: 'Ngân hàng Thương mại TNHH MTV Xây dựng Việt Nam' },

  // Nhóm Ngân hàng Quốc tế & Liên doanh tại Việt Nam
  { code: 'SHINHAN', shortName: 'Shinhan Bank', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam' },
  { code: 'HSBC', shortName: 'HSBC Việt Nam', name: 'Ngân hàng TNHH MTV HSBC Việt Nam' },
  { code: 'SCVN', shortName: 'Standard Chartered', name: 'Ngân hàng TNHH MTV Standard Chartered Việt Nam' },
  { code: 'WOORI', shortName: 'Woori Bank', name: 'Ngân hàng TNHH MTV Woori Việt Nam' },
  { code: 'UOB', shortName: 'UOB Việt Nam', name: 'Ngân hàng United Overseas Bank Việt Nam' },
  { code: 'CIMB', shortName: 'CIMB Bank', name: 'Ngân hàng TNHH MTV CIMB Việt Nam' },
  { code: 'HLBVN', shortName: 'Hong Leong Bank', name: 'Ngân hàng TNHH MTV Hong Leong Việt Nam' },
  { code: 'PBVN', shortName: 'Public Bank', name: 'Ngân hàng TNHH MTV Public Bank Việt Nam' },
  { code: 'IVB', shortName: 'Indovina Bank', name: 'Ngân hàng TNHH Indovina' },
  { code: 'VRB', shortName: 'VRB', name: 'Ngân hàng Liên doanh Việt - Nga' },
  { code: 'KB', shortName: 'Kookmin Bank', name: 'Ngân hàng Kookmin - Chi nhánh TP.HCM / Hà Nội' },
  { code: 'IBK', shortName: 'IBK Bank', name: 'Ngân hàng Công nghiệp Hàn Quốc' },
  { code: 'HANA', shortName: 'KEB Hana Bank', name: 'Ngân hàng KEB Hana' },

  // Ngân hàng số & Ví điện tử
  { code: 'CAKE', shortName: 'Cake by VPBank', name: 'Ngân hàng số Cake by VPBank' },
  { code: 'TIMO', shortName: 'Timo by BVBank', name: 'Ngân hàng số Timo by BVBank' },
  { code: 'VIETTELMONEY', shortName: 'Viettel Money', name: 'Tổng công ty Dịch vụ số Viettel' },
  { code: 'VNPTMONEY', shortName: 'VNPT Money', name: 'Tập đoàn Bưu chính Viễn thông Việt Nam' },
];

export const VIETNAM_BANK_OPTIONS = VIETNAM_BANKS.map((b) => ({
  value: b.shortName,
  label: `${b.shortName} (${b.code}) - ${b.name}`,
}));

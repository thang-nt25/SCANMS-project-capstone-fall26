/**
 * TIỆN ÍCH TÍNH TOÁN NGÀY NGHỈ LỄ CHÍNH THỨC VIỆT NAM & ĐỘNG CƠ BẢO CHỨNG ESCROW LINH HOẠT
 * (Adaptive Holiday-Aware Escrow Engine - SCANMS)
 * 
 * Đáp ứng phản biện của GVHD ThS. Tôn Thất Hoàng Minh:
 * Cơ chế 14 ngày cứng sẽ bị hổng trong các dịp Lễ, Tết khi các đơn vị vận chuyển (GHN, GHTK, Viettel Post)
 * và các Gian hàng tạm ngừng hoạt động từ 1 - 2 tuần.
 * 
 * Thuật toán: availableAt = eligibleAt + 14 ngày + Delta_Holidays
 */

export interface HolidayRange {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Lịch nghỉ lễ, Tết chính thức của Việt Nam theo thông báo của Bộ Lao động - Thương binh & Xã hội
 * Được cập nhật cho các năm học & vận hành hệ thống (2025, 2026, 2027).
 */
export const VIETNAM_OFFICIAL_HOLIDAYS: HolidayRange[] = [
  // --- NĂM 2025 ---
  { name: 'Tết Dương Lịch 2025', startDate: '2025-01-01', endDate: '2025-01-01' },
  { name: 'Tết Nguyên Đán Ất Tỵ 2025 (9 ngày)', startDate: '2025-01-25', endDate: '2025-02-02' },
  { name: 'Giỗ Tổ Hùng Vương 2025', startDate: '2025-04-07', endDate: '2025-04-07' },
  { name: 'Giải Phóng Miền Nam & Quốc Tế Lao Động 2025', startDate: '2025-04-30', endDate: '2025-05-04' },
  { name: 'Quốc Khánh 2025', startDate: '2025-08-30', endDate: '2025-09-02' },

  // --- NĂM 2026 (Năm hiện tại của dự án SCANMS) ---
  { name: 'Tết Dương Lịch 2026', startDate: '2026-01-01', endDate: '2026-01-01' },
  { name: 'Tết Nguyên Đán Bính Ngọ 2026 (9 ngày)', startDate: '2026-02-14', endDate: '2026-02-22' },
  { name: 'Giỗ Tổ Hùng Vương 2026', startDate: '2026-04-26', endDate: '2026-04-26' },
  { name: 'Giải Phóng Miền Nam & Quốc Tế Lao Động 2026', startDate: '2026-04-30', endDate: '2026-05-03' },
  { name: 'Quốc Khánh 2026', startDate: '2026-09-01', endDate: '2026-09-03' },

  // --- NĂM 2027 ---
  { name: 'Tết Dương Lịch 2027', startDate: '2027-01-01', endDate: '2027-01-01' },
  { name: 'Tết Nguyên Đán Đinh Mùi 2027 (9 ngày)', startDate: '2027-02-05', endDate: '2027-02-14' },
  { name: 'Giỗ Tổ Hùng Vương 2027', startDate: '2027-04-16', endDate: '2027-04-16' },
  { name: 'Giải Phóng Miền Nam & Quốc Tế Lao Động 2027', startDate: '2027-04-30', endDate: '2027-05-02' },
  { name: 'Quốc Khánh 2027', startDate: '2027-09-01', endDate: '2027-09-03' },
];

/**
 * Định dạng Date sang chuỗi YYYY-MM-DD theo múi giờ Việt Nam (UTC+7)
 */
export function formatDateToYMD(date: Date): string {
  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().split('T')[0];
}

/**
 * Kiểm tra xem một ngày có nằm trong kỳ nghỉ Lễ/Tết của Việt Nam hay không
 */
export function isVietnamHoliday(date: Date): { isHoliday: boolean; holidayName?: string } {
  const ymd = formatDateToYMD(date);
  for (const h of VIETNAM_OFFICIAL_HOLIDAYS) {
    if (ymd >= h.startDate && ymd <= h.endDate) {
      return { isHoliday: true, holidayName: h.name };
    }
  }
  return { isHoliday: false };
}

export interface AdaptiveEscrowResult {
  startDate: Date;
  availableAt: Date;
  baseHoldDays: number;
  holidayDaysAdded: number;
  totalHoldDays: number;
  holidaysEncountered: string[];
  isCurrentlyHoliday: boolean;
  currentHolidayName?: string;
}

/**
 * Tính toán thời điểm giải ngân Quỹ Bảo Chứng Escrow tự thích ứng với ngày nghỉ Lễ/Tết
 * 
 * @param startDate Thời điểm đơn hàng bắt đầu đủ điều kiện (COMPLETED / DELIVERED)
 * @param baseHoldDays Số ngày bảo chứng cơ sở (Mặc định: 14 ngày)
 */
export function calculateAdaptiveEscrowReleaseDate(
  startDate: Date,
  baseHoldDays: number = 14,
): AdaptiveEscrowResult {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  let currentDate = new Date(startDate.getTime());
  let addedHolidayDays = 0;
  const holidaysFound = new Set<string>();

  // Duyệt qua từng ngày tính từ ngày bắt đầu
  let effectiveWorkingDaysPassed = 0;
  while (effectiveWorkingDaysPassed < baseHoldDays) {
    currentDate = new Date(currentDate.getTime() + ONE_DAY_MS);
    const holidayCheck = isVietnamHoliday(currentDate);

    if (holidayCheck.isHoliday) {
      addedHolidayDays++;
      if (holidayCheck.holidayName) {
        holidaysFound.add(holidayCheck.holidayName);
      }
      // Ngày nghỉ lễ không được tính là ngày làm việc để đối soát khiếu nại
    } else {
      effectiveWorkingDaysPassed++;
    }
  }

  const nowCheck = isVietnamHoliday(new Date());

  return {
    startDate,
    availableAt: currentDate,
    baseHoldDays,
    holidayDaysAdded: addedHolidayDays,
    totalHoldDays: baseHoldDays + addedHolidayDays,
    holidaysEncountered: Array.from(holidaysFound),
    isCurrentlyHoliday: nowCheck.isHoliday,
    currentHolidayName: nowCheck.holidayName,
  };
}

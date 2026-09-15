/**
 * Profanity & Fraud Filter (Bộ lọc từ ngữ thô tục & Chống lừa đảo chuyển khoản STK)
 * - Ngăn chặn ngôn từ thô tục, chửi thề, lăng mạ (Tiếng Việt & Tiếng Anh, teencode, viết tắt).
 * - Cấm chia sẻ số tài khoản ngân hàng (STK), thông tin chuyển khoản trực tiếp nhằm chống gian lận/lừa đảo.
 */

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');
}

const BAD_WORDS: string[] = [
  // Viết tắt / Acronyms / Teencode chửi thề
  'dm', 'dcm', 'dkm', 'cmm', 'clm', 'vcl', 'vcc', 'vkl', 'vl', 'ccl', 'clgt', 'dmm', 'đmm', 'đcm', 'đm', 'đkm', 'cc', 'cl', 'cđmm', 'cdmm',
  
  // Các biến thể của Vãi ...
  'vai lon', 'vai loz', 'vai lozz', 'vai l', 'vai lz', 'vai cut', 'vai ca lon', 'vai ca loz', 'vai buoi', 'vai dai', 'vai lol', 'vai chuong', 'vai ca chuong', 'vai hang',

  // Đéo / Dell
  'deo', 'dell', 'deoo', 'delll',

  // Lol / Lz / Loz / Lồn
  'lol', 'lolz', 'lozl', 'loll', 'loz', 'lz', 'lon', 'cai lon', 'con lon', 'do lon', 'ham lon', 'lon me', 'lon ma', 'thang lon',

  // Buồi / Cặc / Chim / Cu
  'cac', 'cak', 'cack', 'buoi', 'dau buoi', 'dau cac', 'dam tac', 'cu to', 'chim to', 'cuc cut',

  // Cụm từ chửi thề: Đụ / Địt
  'du', 'dume', 'duma', 'du me', 'du ma', 'du cha', 'du ba', 'du con me', 'du me may', 'du me m', 'du me no',
  'dit', 'ditme', 'dit me', 'dit ma', 'dit ba', 'dit con me', 'dit cu', 'dit me may', 'dit me m', 'dit nhau', 'dit ba may',

  // Cụm từ xúc phạm: Mẹ / Bố / Con mẹ / Tiên sư / Cút
  'con me m', 'con me may', 'con me no', 'con me', 'me may', 'me m', 'me no', 'me cha', 'me kiep',
  'bo may', 'bo m', 'to cha', 'to su', 'tien su', 'to me', 'tien me', 'mat day', 'mat nap', 'chet me', 'chet tiet', 'chet cha', 'chet ba',
  'cut di', 'cut me di', 'cut', 'bien di', 'bien me di', 'khon nan', 'do khon', 'vo hoc', 'do hen', 'do ban',

  // Lăng mạ, sỉ nhục
  'cho de', 'cho chet', 'cho ngu', 'cho dien', 'cho ma', 'oc cho', 'suc vat', 'do ngu', 'do cho', 'thang cho', 'con cho', 'thang khung', 'con khung', 'con di', 'di tho', 'cave', 'gai goi', 'gai bao', 'lam di',

  // Tiếng Anh
  'fuck', 'fucking', 'fucker', 'fck', 'shit', 'bullshit', 'bitch', 'btch', 'asshole', 'bastard', 'dick', 'pussy', 'cunt', 'slut', 'whore', 'motherfucker'
];

// Từ khóa liên quan đến chuyển khoản ngân hàng & STK lừa đảo
const BANK_FRAUD_KEYWORDS = [
  'stk', 'so tai khoan', 'sotaikhoan', 'so tk', 'sotk', 'tk ngan hang', 'tai khoan ngan hang',
  'chuyen khoan', 'chuyen tien', 'chuyen vao tk', 'ck vao', 'bank qua', 'bank cho', 'chuyen qua stk',
  'vietcombank', 'vcb', 'mbbank', 'mb bank', 'techcombank', 'tcb', 'vietinbank', 'bidv', 'tpbank',
  'vpbank', 'agribank', 'acb', 'sacombank', 'shb', 'hdbank', 'vib', 'ocb', 'msb', 'seabank', 'momo', 'zalopay'
];

/**
 * Kiểm tra xem chuỗi văn bản có chứa từ ngữ thô tục hoặc thông tin tài khoản ngân hàng (STK) lừa đảo
 */
export function checkProfanity(text: string): {
  isProfane: boolean;
  isFraudRisk?: boolean;
  matched?: string;
  errorMessage?: string;
} {
  if (!text) return { isProfane: false };

  // Cho phép định dạng JSON của thẻ chiến dịch VIP (FR-27)
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && parsed.type?.startsWith('CAMPAIGN_')) {
      return { isProfane: false };
    }
  } catch {}

  const raw = text.toLowerCase();
  const unaccented = removeAccents(raw)
    .replace(/[@]/g, 'a')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[._\-*~`+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Kiểm tra lừa đảo: Gửi Số tài khoản ngân hàng (STK) / Chuyển khoản ngoài luồng
  // Dãy số tài khoản liên tiếp từ 8 đến 16 số
  const bankNumberRegex = /\b\d{8,18}\b/;
  const separatedBankNumberRegex = /\b\d{3,6}[\s.-]\d{3,6}[\s.-]\d{3,6}([\s.-]\d{3,6})?\b/;

  const hasBankKeywords = BANK_FRAUD_KEYWORDS.some((kw) => {
    const escaped = kw.replace(/\s+/g, '\\s+');
    const regex = new RegExp('(^|\\s|[.,:!?])' + escaped + '($|\\s|[.,:!?])', 'i');
    return regex.test(unaccented) || regex.test(raw);
  });

  const hasBankNumber = bankNumberRegex.test(raw) || separatedBankNumberRegex.test(raw);

  if (hasBankNumber || (hasBankKeywords && /\d{4,}/.test(raw))) {
    return {
      isProfane: true,
      isFraudRisk: true,
      matched: 'BANK_ACCOUNT_STK',
      errorMessage: 'Tin nhắn bị chặn: Không được phép gửi số tài khoản ngân hàng (STK) hoặc yêu cầu chuyển tiền ngoài hệ thống nhằm phòng chống lừa đảo và bảo vệ an toàn giao dịch.',
    };
  }

  // 2. Kiểm tra từ ngữ thô tục, chửi thề
  for (const bw of BAD_WORDS) {
    const escaped = bw.replace(/\s+/g, '\\s+');
    const regex = new RegExp('(^|\\s|[.,!?])' + escaped + '($|\\s|[.,!?])', 'i');
    if (regex.test(unaccented) || regex.test(raw)) {
      return {
        isProfane: true,
        matched: bw,
        errorMessage: 'Tin nhắn bị chặn: Vui lòng không sử dụng từ ngữ thô tục, chửi thề hoặc vi phạm chuẩn mực văn minh.',
      };
    }
  }

  return { isProfane: false };
}

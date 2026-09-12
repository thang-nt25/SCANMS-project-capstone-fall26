/**
 * Profanity Filter (Bộ lọc từ ngữ thô tục & vi phạm chuẩn mực cộng đồng)
 * Hỗ trợ nhận diện các từ ngữ thô tục, xúc phạm, chửi thề (Tiếng Việt & Tiếng Anh, teencode, viết tắt, không dấu).
 */

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');
}

const BAD_WORDS: string[] = [
  // Viết tắt & teencode chửi bậy
  'dm',
  'dcm',
  'dkm',
  'cmm',
  'clm',
  'vcl',
  'vcc',
  'vkl',
  'vl',
  'cl',
  'cc',
  'ccl',
  'clgt',
  'dmm',
  'đmm',
  'đcm',
  'đm',
  'đkm',

  // Cụm từ chửi thề: Đụ / Địt
  'du me',
  'du ma',
  'du cha',
  'du ba',
  'du con me',
  'dume',
  'duma',
  'du me may',
  'du me m',
  'du',
  'dit me',
  'dit ma',
  'dit ba',
  'dit con me',
  'dit cu',
  'ditme',
  'dit me may',
  'dit me m',
  'dit',

  // Cụm từ xúc phạm: Con mẹ / Mẹ mày / Bố mày
  'con me m',
  'con me may',
  'con me no',
  'con me',
  'me may',
  'me m',
  'bo may',
  'bo m',
  'to cha',
  'to su',
  'tien su',
  'mat day',
  'mat nap',
  'chet me',
  'chet tiet',

  // Bộ phận nhạy cảm / Thô tục
  'cac',
  'cak',
  'cack',
  'buoi',
  'loz',
  'lz',
  'lon me',
  'lon ma',
  'lon',
  'dam tac',
  'cu to',

  // Lăng mạ, sỉ nhục
  'cho de',
  'cho chet',
  'cho ngu',
  'cho dien',
  'oc cho',
  'suc vat',
  'do ngu',
  'do cho',
  'thang cho',
  'con cho',
  'thang khung',
  'con khung',
  'con di',
  'di tho',
  'cave',
  'gai goi',
  'gai bao',
  'lam di',

  // Tiếng Anh
  'fuck',
  'fucking',
  'fucker',
  'fck',
  'shit',
  'bullshit',
  'bitch',
  'btch',
  'asshole',
  'bastard',
  'dick',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'motherfucker',
];

/**
 * Kiểm tra xem chuỗi văn bản có chứa từ ngữ thô tục hay không
 */
export function checkProfanity(text: string): { isProfane: boolean; matched?: string } {
  if (!text) return { isProfane: false };

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

  for (const bw of BAD_WORDS) {
    const escaped = bw.replace(/\s+/g, '\\s+');
    const regex = new RegExp('(^|\\s|[.,!?])' + escaped + '($|\\s|[.,!?])', 'i');
    if (regex.test(unaccented) || regex.test(raw)) {
      return { isProfane: true, matched: bw };
    }
  }

  return { isProfane: false };
}

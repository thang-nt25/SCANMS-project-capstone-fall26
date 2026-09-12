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
  // Viết tắt / Acronyms / Teencode
  'dm',
  'dcm',
  'dkm',
  'cmm',
  'clm',
  'vcl',
  'vcc',
  'vkl',
  'vl',
  'ccl',
  'clgt',
  'dmm',
  'đmm',
  'đcm',
  'đm',
  'đkm',

  // Đéo / Dell
  'deo',
  'dell',

  // Lol / Lz / Loz / Lồn
  'lol',
  'lolz',
  'lozl',
  'loll',
  'loz',
  'lz',
  'lon me',
  'lon ma',
  'cai lon',
  'con lon',
  'do lon',
  'ham lon',

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
  'dit me',
  'dit ma',
  'dit ba',
  'dit con me',
  'dit cu',
  'ditme',
  'dit me may',
  'dit me m',
  'dit nhau',

  // Cụm từ xúc phạm: Mẹ / Bố / Con mẹ / Tiên sư / Cút
  'con me m',
  'con me may',
  'con me no',
  'con me',
  'me may',
  'me m',
  'me no',
  'me cha',
  'me kiep',
  'bo may',
  'bo m',
  'to cha',
  'to su',
  'tien su',
  'to me',
  'tien me',
  'mat day',
  'mat nap',
  'chet me',
  'chet tiet',
  'chet cha',
  'chet ba',
  'cut di',
  'cut me di',
  'cut',
  'bien di',
  'bien me di',
  'khon nan',
  'do khon',
  'vo hoc',
  'do hen',
  'do ban',

  // Bộ phận nhạy cảm / Thô tục
  'cac',
  'cak',
  'cack',
  'buoi',
  'dam tac',
  'cu to',

  // Lăng mạ, sỉ nhục
  'cho de',
  'cho chet',
  'cho ngu',
  'cho dien',
  'cho ma',
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

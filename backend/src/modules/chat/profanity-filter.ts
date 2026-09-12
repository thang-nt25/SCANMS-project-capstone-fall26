/**
 * Profanity Filter (Bộ lọc từ ngữ thô tục & vi phạm chuẩn mực cộng đồng)
 * Hỗ trợ nhận diện các từ ngữ thô tục, xúc phạm, chửi thề (Tiếng Việt & Tiếng Anh, teencode, ký tự che giấu).
 */

const PROFANITY_PATTERNS: RegExp[] = [
  // Tiếng Việt chửi thề / thô tục viết tắt & biến thể
  /\b(đ[iị]t|d[iị]t|d[iị]ch)\b/i,
  /\b(đ[uụ]\s*m[aá]|d[uụ]\s*m[aá]|duma|dume|đume|đụ|dụ\s*má)\b/i,
  /\b(đ[oồ]ng\s*ch[ií]\s*đ[oồ]ng\s*b[aà]o)?\b(đ[iị]t\s*m[eẹ]|ditme|dcm|đcm|dm|đm|dkm|đkm|vcl|vcc|vl|cl|ccl)\b/i,
  /\b(c[aặ][c̣k]|k[aặ][c̣k]|bu[oồ]i|b[uù]i|d[aá]i|d[aá]y|c[uụ]|chim)\b/i,
  /\b(l[oồ]n|l[oồ]ng|loz|lz|l0n|l0z)\b/i,
  /\b(ch[oó]\s*đ[eẻ]|ch[oó]\s*m[aá]|ch[oó]\s*ngu|óc\s*ch[oó]|oc\s*cho|s[uú]c\s*v[aậ]t|suc\s*vat)\b/i,
  /\b(con\s*đ[iĩ]|đ[iĩ]\s*th[oỏ]|c[aà]ve|g[aá]i\s*b[aao]o|g[aá]i\s*g[oọ]i)\b/i,
  /\b(m[eẹ]\s*m[aà]y|b[oố]\s*m[aà]y|t[oổ]\s*s[uư]|m[aẹ]\s*ki[eế]p)\b/i,
  /\b(ngu\s*nh[uư]\s*ch[oó]|ngu\s*d[oố]t|đ[oồ]\s*ch[oó]|đ[oồ]\s*ngu)\b/i,
  /\b(th[aằ]ng\s*ch[oó]|con\s*ch[oó]|th[aằ]ng\s*kh[oồ]ng|con\s*m[eẹ]\s*n[oó])\b/i,

  // Tiếng Anh
  /\b(fuck|fucking|fucker|fck|f\*ck|motherfucker)\b/i,
  /\b(shit|bullshit|bitch|btch|asshole|bastard|dick|pussy|cunt|slut|whore)\b/i,
];

/**
 * Kiểm tra xem chuỗi văn bản có chứa từ ngữ thô tục hay không
 */
export function checkProfanity(text: string): { isProfane: boolean; matched?: string } {
  if (!text) return { isProfane: false };

  // Chuẩn hóa văn bản loại bỏ khoảng trắng thừa và ký tự đặc biệt lặp
  const normalized = text
    .toLowerCase()
    .replace(/[@]/g, 'a')
    .replace(/[0]/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[$]/g, 's')
    .replace(/[*_~`]/g, '');

  for (const pattern of PROFANITY_PATTERNS) {
    const match = normalized.match(pattern) || text.match(pattern);
    if (match) {
      return {
        isProfane: true,
        matched: match[0],
      };
    }
  }

  return { isProfane: false };
}

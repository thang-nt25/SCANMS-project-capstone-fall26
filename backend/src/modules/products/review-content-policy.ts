// Rating is deliberately not an input: dissatisfaction is never a violation.
// Conservative triage only; ambiguous cases are decided by platform staff.
export function reviewContentIssue(text: string): string | null {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  if (/\b(dm|dmm|dcm|dit me|du ma|con cac|fuck you)\b/.test(normalized)) return 'Có dấu hiệu ngôn từ xúc phạm; cần sàn kiểm tra ngữ cảnh';
  if (/\b(tao se giet|giet ca nha|kill you)\b/.test(normalized)) return 'Có dấu hiệu đe dọa';
  if (/https?:\/\/|\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b|(?:\+84|0)[\s.-]?(?:\d[\s.-]?){8,10}\d/.test(text)) return 'Có liên kết hoặc thông tin liên hệ cần sàn kiểm tra';
  return null;
}

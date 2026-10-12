// Shared category families bridge catalog labels and creator profile wording.
const CATEGORY_FAMILIES = [
  ['my pham', 'lam dep', 'cham soc da', 'cham soc co the', 'cham soc toc', 'skincare', 'skin care', 'beauty', 'cosmetic', 'cosmetics', 'makeup'],
  ['thoi trang', 'fashion', 'trang suc', 'quan ao'],
  ['gia dung', 'noi that', 'home decor'],
  ['cong nghe', 'thiet bi so', 'may tinh', 'am thanh', 'dien tu', 'tai nghe', 'technology', 'tech review'],
  ['am thuc', 'an vat', 'food', 'nau an'],
  ['sach', 'van phong pham', 'book', 'books'],
  ['me va be', 'me be', 'tre em', 'em be'],
  ['the thao', 'da ngoai', 'fitness', 'gym'],
];

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/&/g, ' va ').replace(/[^a-z0-9]+/g, ' ').trim();
const containsPhrase = (text: string, phrase: string) => Boolean(phrase && ` ${text} `.includes(` ${phrase} `));

export function textMatchesCategory(text: string | null | undefined, category: string): boolean {
  const normalizedText = normalize(text || '');
  const normalizedCategory = normalize(category);
  if (!normalizedText || !normalizedCategory) return false;
  if (containsPhrase(normalizedText, normalizedCategory)) return true;
  return CATEGORY_FAMILIES.some(family => family.some(alias => containsPhrase(normalizedCategory, alias)) && family.some(alias => containsPhrase(normalizedText, alias)));
}

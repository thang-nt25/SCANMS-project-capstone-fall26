import { Prisma } from '@prisma/client';
import { SEARCH_INTENTS } from './catalog-search-intents';

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}

// Product types, not seed IDs: new products/shops are matched against their
// current public metadata too. Only declared information is searchable.
const categoryGroups = [
  { aliases: ['mỹ phẩm', 'làm đẹp', 'sắc đẹp', 'beauty', 'cosmetic', 'cosmetics'], terms: ['mỹ phẩm', 'làm đẹp', 'chăm sóc da', 'trang điểm', 'chăm sóc cơ thể', 'chăm sóc tóc', 'skincare', 'makeup'] },
  { aliases: ['chăm sóc da', 'dưỡng da', 'skincare', 'skin care'], terms: ['chăm sóc da', 'dưỡng da', 'skincare'] },
  { aliases: ['trang điểm', 'makeup', 'make up'], terms: ['trang điểm', 'makeup'] },
  { aliases: ['chăm sóc cơ thể', 'body care'], terms: ['chăm sóc cơ thể', 'body care'] },
  { aliases: ['chăm sóc tóc', 'hair care'], terms: ['chăm sóc tóc', 'hair care'] },
  { aliases: ['thực phẩm sức khỏe', 'sức khỏe', 'dinh dưỡng', 'healthy food', 'health food'], terms: ['thực phẩm sức khỏe', 'dinh dưỡng'] },
];
const productGroups = [
  ['serum', 'tinh chất', 'essence', 'huyết thanh'],
  ['sữa rửa mặt', 'srm', 'cleanser', 'face wash', 'facial cleanser', 'gel rửa mặt'],
  ['chống nắng', 'kem chống nắng', 'kcn', 'sunscreen', 'sunblock', 'sun cream', 'suncream'],
  ['kem dưỡng', 'kem dưỡng ẩm', 'kem cấp ẩm', 'moisturizer', 'moisturiser', 'face cream'],
  ['kem', 'cream'],
  ['tẩy trang', 'makeup remover', 'cleansing oil', 'dầu tẩy trang'],
  ['toner', 'nước hoa hồng', 'nước cân bằng', 'nước cân bằng da'],
  ['mặt nạ', 'mask', 'face mask', 'sheet mask'],
  ['ampoule', 'tinh chất cô đặc'],
  ['vitamin c', 'vit c', 'vitc'], ['niacinamide', 'vitamin b3', 'b3'],
  ['rau má', 'centella', 'cica'], ['tràm trà', 'tea tree'], ['hoa cúc', 'chamomile', 'chrysanthemum'],
  ['granola', 'ngũ cốc', 'ngũ cốc hạt', 'hạt dinh dưỡng', 'cereal'],
  ['trà hoa cúc', 'trà cúc', 'chamomile tea', 'chrysanthemum tea'],
  ['trà', 'tea'],
  ['son môi', 'lipstick'], ['dầu gội', 'shampoo'],
];
interface Unit { terms: string[]; category: boolean; partial?: string; intent?: string }
const aliases: (Unit & { alias: string })[] = [
  ...categoryGroups.flatMap(group => group.aliases.map(alias => ({ alias: normalizeSearch(alias), terms: group.terms.map(normalizeSearch), category: true }))),
  ...productGroups.flatMap(group => group.map(alias => ({ alias: normalizeSearch(alias), terms: group.map(normalizeSearch), category: false }))),
  ...SEARCH_INTENTS.flatMap(intent => intent.aliases.map(alias => ({ alias: normalizeSearch(alias), terms: intent.terms.map(normalizeSearch), category: false, intent: intent.id }))),
].flatMap(entry => [entry, ...(entry.alias.includes(' ') ? [{ ...entry, alias: entry.alias.replace(/ /g, '') }] : [])])
  .sort((a, b) => b.alias.length - a.alias.length);

export function searchUnits(search: string): Unit[] {
  let rest = normalizeSearch(search.trim().slice(0, 80))
    .replace(/\bspf\s+(\d+)\b/g, 'spf$1')
    .replace(/^(?:(?:toi|minh) (?:muon |can )?(?:mua |tim )?|tim (?:cho (?:toi|minh) )?|cho (?:toi|minh) )+/, '')
    .replace(/\b(?:san pham|thuong hieu|cua)\b/g, ' ').trim().replace(/\s+/g, ' ');
  if (aliases.some(entry => entry.intent && ` ${rest} `.includes(` ${entry.alias} `))) {
    rest = rest.replace(/\b(?:danh cho|ho tro|va|cho)\b/g, ' ').trim().replace(/\s+/g, ' ');
  }
  const units: Unit[] = [];
  while (rest) {
    const distinctCondition = /^(?:(?:dieu tri|tri|giam) )?(mun (?:coc|thit)|warts?)(?= |$)/.exec(rest);
    if (distinctCondition) {
      units.push({ terms: [distinctCondition[1]], category: false });
      rest = rest.slice(distinctCondition[0].length).trimStart();
      continue;
    }
    const entry = aliases.find(entry => rest === entry.alias || rest.startsWith(entry.alias + ' '));
    if (entry) {
      units.push({ terms: entry.terms, category: entry.category, ...(entry.intent ? { intent: entry.intent } : {}) });
      rest = rest.slice(entry.alias.length).trimStart();
    } else {
      const end = rest.indexOf(' ');
      const word = end < 0 ? rest : rest.slice(0, end);
      const prefixes = word.length >= 3 ? aliases.filter(entry => !entry.category && !entry.intent && /^[a-z]{5,}$/.test(entry.alias) && entry.alias.startsWith(word)) : [];
      units.push({ terms: [...new Set([word, ...prefixes.flatMap(entry => entry.terms)])], category: false, ...(prefixes.length ? { partial: word } : {}) });
      rest = end < 0 ? '' : rest.slice(end + 1);
    }
  }
  return units;
}

// Standard PostgreSQL Unicode normalization; no extension/schema change needed.
// Keep punctuation so SQL wildcard input remains literal.
export function normalizedSql(value: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`translate(replace(lower(normalize(coalesce(${value}, ''), NFD)), 'đ', 'd'), ${'\u0300\u0301\u0302\u0303\u0306\u0309\u031b\u0323\u0308\u0327'}, '')`;
}
const like = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// One edit only on alphabetic words >=5 characters. Never correct numbers/SKUs
// or short words. Exact matches always win over this fallback.
export function typoPattern(word: string): string | null {
  if (!/^[a-z]{5,18}$/.test(word)) return null;
  const forms = new Set<string>([word]);
  for (let i = 0; i < word.length; i++) {
    forms.add(word.slice(0, i) + word.slice(i + 1));
    forms.add(word.slice(0, i) + '[a-z]' + word.slice(i + 1));
    forms.add(word.slice(0, i) + '[a-z]' + word.slice(i));
    if (i + 1 < word.length) forms.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  }
  forms.add(word + '[a-z]');
  return `\\m(${[...forms].join('|')})\\M`;
}

export function catalogSearchSql(search: string, fuzzy = false, titleOnly = false, wholeWords = false, related = false): Prisma.Sql {
  const units = searchUnits(search);
  if (!units.length) return Prisma.sql`false`;
  if (related && (!units.some(unit => unit.intent) || /\b(mun (coc|thit)|warts?)\b/.test(normalizeSearch(search)))) return Prisma.sql`false`;
  const clauses = units.map(unit => {
    const intent = SEARCH_INTENTS.find(intent => intent.id === unit.intent);
    if (related && intent) {
      const matches = intent.relatedTypes.map(type => Prisma.sql`b.search_title ~ ${`\\m${escapeRegex(normalizeSearch(type)).replace(/ /g, '[[:space:]]+')}\\M`}`);
      const allowed = 'exclude' in intent ? Prisma.sql`AND NOT b.search_claims ~ ${intent.exclude}` : Prisma.empty;
      return Prisma.sql`((${Prisma.join(matches, ' OR ')}) AND b.search_category ~ ${'cham soc|my pham|lam dep|skincare|beauty'} ${allowed})`;
    }
    const field = titleOnly ? Prisma.sql`b.search_title` : intent ? Prisma.sql`b.search_claims` : unit.category ? Prisma.sql`b.search_category` : Prisma.sql`b.search_text`;
    const terms = [...unit.terms];
    if (fuzzy && !unit.category && !intent && terms.length === 1) {
      const pattern = typoPattern(terms[0]);
      if (pattern) for (const entry of aliases) {
        if (!entry.category && !entry.intent && new RegExp(pattern.replace('\\m', '^(?:').replace('\\M', ')$')).test(entry.alias)) terms.push(...entry.terms);
      }
    }
    const matches = [...new Set(terms)].map(term => {
      const wordMatch = Prisma.sql`${field} ~ ${`\\m${escapeRegex(term).replace(/ /g, '[[:space:]]+')}\\M`}`;
      if (wholeWords) return wordMatch;
      const compact = term.replace(/[ -]/g, '');
      const exact = (unit.category || unit.terms.length > 1) && term !== unit.partial ? wordMatch
        : compact ? Prisma.sql`(${field} LIKE ${like(term)} OR replace(replace(${field}, ' ', ''), '-', '') LIKE ${like(compact)})`
          : Prisma.sql`${field} LIKE ${like(term)}`;
      const typo = fuzzy && !unit.category && !intent ? typoPattern(term) : null;
      return typo ? Prisma.sql`(${exact} OR ${field} ~ ${typo})` : exact;
    });
    const allowed = intent && 'exclude' in intent ? Prisma.sql`AND NOT b.search_claims ~ ${intent.exclude}` : Prisma.empty;
    return Prisma.sql`((${Prisma.join(matches, ' OR ')}) ${allowed})`;
  });
  return Prisma.sql`(${Prisma.join(clauses, ' AND ')})`;
}

export function catalogSearchScore(search: string): Prisma.Sql {
  const query = normalizeSearch(search.slice(0, 80));
  return Prisma.sql`CASE
    WHEN replace(replace(b.search_sku, ' ', ''), '-', '') = ${query.replace(/[ -]/g, '')} THEN 120
    WHEN b.search_title = ${query} THEN 110
    WHEN ${catalogSearchSql(search, false, true, true)} THEN 100
    WHEN ${catalogSearchSql(search, false, false, true)} THEN 80
    WHEN ${catalogSearchSql(search, false, true)} THEN 60
    WHEN ${catalogSearchSql(search)} THEN 40 ELSE 10 END`;
}

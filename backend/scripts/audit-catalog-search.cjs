// Read-only public API audit. Run after starting the local backend:
// node scripts/audit-catalog-search.cjs
const assert = require('node:assert/strict');
const base = new URL(process.env.CATALOG_AUDIT_URL || 'http://localhost:3000/api/');
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Use a local backend');
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
const timings = [];
async function get(path, params = {}) {
  const url = new URL(path, base);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const start = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  assert.equal(response.status, 200, `GET ${url.pathname} failed`);
  timings.push(performance.now() - start);
  return body.data ?? body;
}
const typeAliases = [
  ['sua rua mat', 'face wash'], ['kem chong nang', 'sunscreen'], ['kem duong', 'moisturizer'],
  ['serum', 'essence'], ['toner', 'nuoc hoa hong'], ['dau tay trang', 'cleansing oil'],
  ['ampoule', 'ampoule'], ['mat na', 'sheet mask'], ['tra hoa cuc', 'chamomile tea'], ['granola', 'cereal'],
];
(async () => {
  const products = [];
  for (let page = 1, totalPages = 1; page <= totalPages; page++) {
    const data = await get('public/products', { limit: 48, page });
    products.push(...data.items);
    totalPages = data.pagination.totalPages;
  }
  assert.ok(products.length, 'No public products available to audit');
  const cases = products.flatMap(product => {
    const title = normalize(product.title);
    const brand = normalize(product.store.name);
    const variant = product.variants.find(variant => variant.isActive !== false);
    const alias = typeAliases.find(([prefix]) => title.startsWith(prefix));
    const longWord = [...title.matchAll(/[a-z]{5,18}/g)].at(-1);
    const typo = longWord ? title.slice(0, longWord.index) + longWord[0].slice(0, -1) + (longWord[0].endsWith('x') ? 'z' : 'x') + title.slice(longWord.index + longWord[0].length) : null;
    return [
      ['title', product.title], ['unaccented', title], ['unicode-nfd', product.title.normalize('NFD')],
      ['sku', product.sku], ['sku-compact', product.sku.replace(/-/g, '')],
      ['word-order', title.split(/\s+/).reverse().join(' ')],
      ['brand-compact', `${brand.replace(/ /g, '')} ${title.split(' ').slice(0, 2).join(' ')}`],
      ...(variant ? [['variant', `${product.sku} ${normalize(variant.name)}`]] : []),
      ...(alias ? [['type-alias', `${alias[1]} ${brand}`]] : []),
      ...(typo ? [['one-letter-typo', typo]] : []),
    ].map(([kind, query]) => ({ product, kind, query }));
  });
  const failures = [];
  let index = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (index < cases.length) {
      const { product, kind, query } = cases[index++];
      try {
        const suggestions = await get('public/products/suggestions', { search: query });
        assert.ok(suggestions.some(item => item.id === product.id), 'Target missing from six suggestions');
        const results = await get('public/products', { search: query, limit: 48, sortBy: 'relevance' });
        assert.ok(results.items.some(item => item.id === product.id), 'Target missing from full results');
        assert.ok(results.pagination.total >= results.items.length);
      } catch (error) { failures.push({ sku: product.sku, kind, query, error: error.message }); }
    }
  }));
  const negative = await get('public/products/suggestions', { search: 'zzqvxyznotaproduct20261021' });
  assert.equal(negative.length, 0, 'Unrelated input must not get fabricated matches');
  const needs = ['trị mụn', 'tri mun', 'acne', 'serum trị mụn', 'sữa rửa mặt trị mụn', 'serum cho da dầu',
    'trị mụn và thâm mụn', 'serum trị thâm', 'tẩy tế bào chết', 'phục hồi da', 'dưỡng ẩm', 'serum trị mụn Sora Skin'];
  const needResults = [];
  for (const search of needs) {
    const suggestions = await get('public/products/suggestions', { search });
    const results = await get('public/products', { search, limit: 48, sortBy: 'relevance' });
    assert.ok(suggestions.length > 0 && results.items.length > 0, `No matches for need: ${search}`);
    assert.ok(results.items.every(item => !normalize(item.categoryName || '').includes('thuc pham')), 'Food must not match skincare needs');
    assert.ok(suggestions.every(item => ['direct', 'related'].includes(item.matchKind)), 'Related suggestions must be identified');
    assert.ok(results.items.every(item => ['direct', 'related'].includes(item.matchKind)), 'Full results must preserve the match kind');
    needResults.push({ search, suggestions: suggestions.length, total: results.pagination.total, matchKind: suggestions[0].matchKind });
  }
  for (const search of ['trị mụn GreenBio', 'trị mụn 9000ml', 'mụn cóc']) {
    assert.equal((await get('public/products/suggestions', { search })).length, 0, `Unrelated constraint must be retained: ${search}`);
  }
  const sorted = timings.sort((a, b) => a - b);
  console.log(JSON.stringify({ products: products.length, queryCases: cases.length, passed: cases.length - failures.length,
    requests: timings.length, medianMs: Math.round(sorted[Math.floor(sorted.length * 0.5)]),
    p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]), needs: needResults, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });

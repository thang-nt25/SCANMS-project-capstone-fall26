type Specification = { key: string; value: string };

export function parseProductDescription(raw = '') {
  const block = raw.match(/^📌 THÔNG SỐ KỸ THUẬT(?: SẢN PHẨM)?:\r?\n((?:• [^\r\n]+\r?\n)+)(?:\r?\n|$)/);
  const specifications: Specification[] = [];
  if (!block) return { description: raw, specifications };
  for (const line of block[1].trim().split(/\r?\n/)) {
    const separator = line.indexOf(': ');
    if (separator < 0) return { description: raw, specifications: [] };
    specifications.push({ key: line.slice(2, separator), value: line.slice(separator + 2) });
  }
  return { description: raw.slice(block[0].length), specifications };
}

export function buildProductDescription(description: string, specifications: Specification[], original?: string) {
  const valid = specifications.filter(item => item.key.trim() && item.value.trim())
    .map(item => ({ key: item.key.trim(), value: item.value.trim() }));
  if (original !== undefined) {
    const parsed = parseProductDescription(original);
    if (description.trim() === parsed.description.trim() && JSON.stringify(valid) === JSON.stringify(parsed.specifications)) return original;
  }
  return (valid.length ? `📌 THÔNG SỐ KỸ THUẬT SẢN PHẨM:\n${valid.map(item => `• ${item.key}: ${item.value}`).join('\n')}\n\n` : '') + description.trim();
}

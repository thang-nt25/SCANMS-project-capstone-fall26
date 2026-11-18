/** Only split unambiguous colour/size names; other product options stay intact. */
export function getColourSizeOptions(variants: ReadonlyArray<{ id: string; name: string }>) {
  if (!variants.length) return null;
  const options = variants.map(variant => {
    const match = variant.name.trim().match(/^(.+?),\s*Size\s+([^,]+)$/i);
    return match ? { id: variant.id, colour: match[1].trim(), size: match[2].trim() } : null;
  });
  if (options.some(option => !option)) return null;
  const parsed = options.filter(option => option !== null);
  // Never silently choose between two distinct variants with the same attributes.
  if (new Set(parsed.map(option => JSON.stringify([option.colour, option.size]))).size !== parsed.length) return null;
  return {
    options: parsed,
    colours: [...new Set(parsed.map(option => option.colour))],
    sizes: [...new Set(parsed.map(option => option.size))].sort((a, b) => {
      const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      const ai = order.indexOf(a.toUpperCase()), bi = order.indexOf(b.toUpperCase());
      return ai >= 0 && bi >= 0 ? ai - bi : a.localeCompare(b, 'vi', { numeric: true });
    }),
  };
}

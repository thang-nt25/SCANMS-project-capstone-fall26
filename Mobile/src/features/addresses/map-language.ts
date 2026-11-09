/** OpenMapTiles uses name:vi; some sources expose name_vi instead. */
export function vietnameseMapLabel() {
  // text-field expects formatted text. A null branch inside case is invalid
  // in that context; keep every branch a string and format the final value.
  const label = ["name:vi", "name_vi", "name", "name:latin"].reduceRight<unknown>(
    (fallback, key) => ["case", ["!=", ["to-string", ["get", key]], ""], ["to-string", ["get", key]], fallback], "",
  );
  return ["format", label, {}];
}

// Literal JavaScript is needed: Hermes does not retain Function.toString() source.
export const mapNamePredicateScript = String.raw`function isPlaceNameLabel(field) {
  if (typeof field === 'string') return /\{name(?::[^}]+|_[^}]+)?\}/.test(field);
  if (!Array.isArray(field)) return false;
  return (field[0] === 'get' && typeof field[1] === 'string' && /^name(?::|_|$)/.test(field[1])) || field.some(isPlaceNameLabel);
}`;

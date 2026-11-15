const normalize = (value: string) => value.trim().replace(/[.!;。]+$/, '').toLocaleLowerCase('vi-VN');

export function hasRejectionReason(text: string, reason: string) {
  return text.split('\n').some(line => normalize(line) === normalize(reason));
}

export function toggleRejectionReason(text: string, reason: string) {
  if (hasRejectionReason(text, reason)) {
    return text.split('\n').filter(line => normalize(line) !== normalize(reason)).join('\n').trim();
  }
  return [text.trim(), reason].filter(Boolean).join('\n');
}

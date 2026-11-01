/** Readable display reference only. Full UUID remains the API/copy identity. */
export function payoutDisplayCode(id: string, createdAt: string): string {
  const shortId = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return `RT-${shortId}`;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)?.value || '';
  return `RT-${part('year')}${part('month')}${part('day')}-${shortId}`;
}

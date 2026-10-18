/** At most six simultaneous placements; an ending booking frees its slot immediately. */
export function hasSponsorshipCapacity(
  windows: Array<{ startsAt: Date; endsAt: Date }>,
  next: { startsAt: Date; endsAt: Date },
): boolean {
  const events = [...windows, next].flatMap((window) => [
    [window.startsAt.getTime(), 1],
    [window.endsAt.getTime(), -1],
  ]);
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let concurrent = 0;
  return events.every(([, delta]) => (concurrent += delta) <= 6);
}

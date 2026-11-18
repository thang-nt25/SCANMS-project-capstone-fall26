export function monthlyWithdrawalTax(amount: string, monthlyGross: string) {
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(amount)) return 0;
  const minor = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2)); };
  let position = minor(monthlyGross), remaining = minor(amount), tax = 0n;
  const brackets: [bigint | null, bigint][] = [[1000000000n, 5n], [3000000000n, 10n], [6000000000n, 20n], [10000000000n, 30n], [null, 35n]];
  for (const [ceiling, percent] of brackets) {
    const room = ceiling === null ? remaining : ceiling - position;
    const portion = room <= 0n ? 0n : remaining < room ? remaining : room;
    tax += portion * percent; position += portion; remaining -= portion;
    if (remaining === 0n) break;
  }
  return Number((tax + 50n) / 100n) / 100;
}

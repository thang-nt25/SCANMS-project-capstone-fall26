import type { ChangeEvent, ComponentPropsWithoutRef } from 'react';

type TopUpAmountInputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'inputMode' | 'value' | 'onChange'
> & {
  value: string;
  onAmountChange: (amount: string) => void;
};

function formatAmount(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function TopUpAmountInput({
  value,
  onAmountChange,
  ...props
}: TopUpAmountInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const typed = input.value;
    const cursor = input.selectionStart ?? typed.length;
    let digitsBeforeCursor = typed.slice(0, cursor).replace(/\D/g, '').length;
    const amount = typed.replace(/\D/g, '');
    const formatted = formatAmount(amount);
    let nextCursor = 0;

    while (digitsBeforeCursor > 0) {
      if (formatted[nextCursor] !== '.') digitsBeforeCursor -= 1;
      nextCursor += 1;
    }

    // Apply both changes together so the browser keeps the caret beside the same digit.
    if (input.value !== formatted) input.value = formatted;
    input.setSelectionRange(nextCursor, nextCursor);
    onAmountChange(amount);
  };

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={formatAmount(value)}
      onChange={handleChange}
    />
  );
}

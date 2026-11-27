// Shared geometry keeps account forms aligned across sign-in and both sign-up modes.
export const authPage = 'flex min-h-dvh flex-col gap-4 bg-canvas px-6 pt-4 pb-4 text-ink max-[900px]:px-4 max-[480px]:px-3 motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none!';
export const authContentWidth = 'mx-auto w-full max-w-[1240px]';
export const authHeader = `${authContentWidth} flex min-h-14 items-center justify-between gap-4 [&>a:first-child]:min-w-0 max-[480px]:[&>a:first-child]:max-w-[62%]`;
export const authMain = `${authContentWidth} mb-auto`;
export const authExperience = 'relative isolate grid grid-cols-[minmax(0,1fr)_600px] items-stretch max-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-[900px]:grid-cols-1';
export const authFormPanel = 'relative z-1 box-border flex w-full! min-w-0 max-w-[600px]! flex-col gap-4 justify-self-end rounded-none border-0 bg-white p-7! shadow-none max-[900px]:justify-self-center max-[480px]:p-5! [&_input::placeholder]:font-normal [&_input::placeholder]:text-muted [&_input]:accent-brand-strong [&_input:not([type=checkbox])]:h-[46px]! [&_input:not([type=checkbox])]:min-h-[46px]! [&_input:not([type=checkbox])]:rounded-[10px]! [&_input:not([type=checkbox])]:text-sm! max-[480px]:[&_input:not([type=checkbox])]:text-base!';
export const authHeading = 'm-0 font-display text-[30px]! leading-tight font-bold tracking-[-.6px] text-left';
export const authLabel = 'mb-1.5 flex min-h-5 items-center gap-1 text-[13px] leading-5 font-medium text-ink';
export const authInput = 'h-[46px]! min-h-[46px]! w-full rounded-[10px]! border border-line bg-white px-3 text-sm text-ink outline-hidden transition-colors hover:border-brand-strong/60 focus:border-brand-strong aria-invalid:border-danger max-[480px]:text-base';
export const authGoogle = 'h-[46px]! min-h-[46px]! rounded-[10px]! py-0! text-sm! shadow-none!';
export const authSubmit = 'flex h-[46px]! min-h-[46px]! w-full cursor-pointer items-center justify-center gap-2 rounded-[10px]! border border-brand-strong bg-brand! px-4 py-0! text-sm font-semibold text-brand-dark transition-colors enabled:hover:bg-brand-strong! disabled:cursor-wait disabled:opacity-60';

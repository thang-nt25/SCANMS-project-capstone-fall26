import type { ReactNode } from 'react';

export function ShopWorkspaceToolbar({ search, filters, action, label }: {
  search: ReactNode; filters: ReactNode; action: ReactNode; label: string;
}) {
  return <div className="@container w-full min-w-0" role="group" aria-label={label}>
    <div className="grid min-h-16 grid-cols-1 items-center gap-2 rounded-[10px] border border-[#EAE4D7] bg-white p-2.5 @[640px]:grid-cols-[minmax(0,1fr)_140px] @[1050px]:grid-cols-[minmax(220px,0.3fr)_minmax(0,0.7fr)_160px]">
      <div className="min-w-0 @[640px]:col-span-2 @[1050px]:col-span-1 [&_input]:h-10! [&_input]:rounded-lg!">{search}</div>
      <div className="min-w-0 @[1050px]:border-l @[1050px]:border-[#EAE4D7] @[1050px]:pl-2 [&_button]:h-10! [&_button]:rounded-lg!">{filters}</div>
      <div className="min-w-0 border-t border-[#EAE4D7] pt-2 @[640px]:border-t-0 @[640px]:border-l @[640px]:pl-2 @[640px]:pt-0 [&_button]:h-10! [&_button]:w-full [&_button]:rounded-lg!">{action}</div>
    </div>
  </div>;
}

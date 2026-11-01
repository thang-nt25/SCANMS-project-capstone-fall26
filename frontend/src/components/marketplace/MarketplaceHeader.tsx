import { useEffect, useState } from 'react';
import { PublicHeader } from '../layout/PublicHeader';
import { MarketplaceShortcuts } from './MarketplaceShortcuts';

export function MarketplaceHeader({
  onOpenTracking,
  onOpenLive,
  showShortcuts = true,
}: {
  onOpenTracking: () => void;
  onOpenLive: () => void;
  showShortcuts?: boolean;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!showShortcuts) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = window.scrollY;
      // Separate thresholds prevent flicker when the smaller menu changes page height.
      setCompact(current => current ? top > 48 : top > 160);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', scroll, { passive: true });
    return () => { window.removeEventListener('scroll', scroll); cancelAnimationFrame(frame); };
  }, [showShortcuts]);

  return (
    <div
      className="marketplace-header sticky top-0 z-40 bg-white shadow-[0_2px_8px_rgb(35_29_21/4%)]"
      data-compact={compact}
      data-shortcuts={showShortcuts}
    >
      <PublicHeader
        sticky={false}
        layout="marketplace"
        onOpenTracking={onOpenTracking}
        navigation={showShortcuts ? <MarketplaceShortcuts onOpenLive={onOpenLive} compact={compact} /> : undefined}
      />
    </div>
  );
}

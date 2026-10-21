import { useEffect, useState } from 'react';
import { PublicHeader } from '../layout/PublicHeader';
import { MarketplaceShortcuts } from './MarketplaceShortcuts';
import './MarketplaceHeader.css';

export function MarketplaceHeader({ onOpenTracking, onOpenLive }: {
  onOpenTracking: () => void;
  onOpenLive: () => void;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
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
  }, []);

  return <div className="marketplace-header sticky top-0 z-40 bg-white" data-compact={compact}>
    <PublicHeader sticky={false} onOpenTracking={onOpenTracking} />
    <MarketplaceShortcuts onOpenLive={onOpenLive} />
  </div>;
}

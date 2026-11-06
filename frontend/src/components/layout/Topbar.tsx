import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { type UserProfile } from '../../services/auth.service';
import { WorkspaceHeader } from './WorkspaceHeader';

export interface TopbarProps {
  currentUser: UserProfile | null;
  onLogout?: () => void;
}

export function Topbar({
  currentUser,
  onLogout,
}: TopbarProps) {
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () =>
      document.documentElement.style.setProperty(
        '--workspace-header-height',
        `${header.getBoundingClientRect().height}px`,
      );
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <div ref={headerRef} className="sticky top-0 z-40 shrink-0">
      <WorkspaceHeader currentUser={currentUser} onLogout={onLogout} />
    </div>
  );
}

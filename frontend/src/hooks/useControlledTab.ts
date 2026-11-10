import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UseControlledTabOptions<T extends string> {
  paramKey?: string;               // URL query param key (Default: 'tab')
  defaultTab: T;                   // Fallback when param is missing or invalid
  validTabs: readonly T[];         // Whitelist of valid tabs (type safety & junk param protection)
  replace?: boolean;               // History mode (Default: true)
  onTabChange?: (tab: T) => void;  // Optional callback when tab changes
}

export interface UseControlledTabReturn<T extends string> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  isPending: boolean;              // React 18 transition state
  visitedTabs: Record<T, boolean>; // Keep-alive tab visited tracking
}

/**
 * useControlledTab - Standard Vercel React Best Practices
 * Solves tab freeze / desync, supports instant (0ms) optical UI switch,
 * syncs bidirectional with URL and browser Back/Forward navigation.
 */
export function useControlledTab<T extends string>({
  paramKey = 'tab',
  defaultTab,
  validTabs,
  replace = true,
  onTabChange,
}: UseControlledTabOptions<T>): UseControlledTabReturn<T> {
  const [searchParams, setSearchParams] = useSearchParams();

  // Whitelist-based resolver
  const resolveTab = useCallback(
    (val: string | null): T => {
      if (val && (validTabs as readonly string[]).includes(val)) {
        return val as T;
      }
      return defaultTab;
    },
    [validTabs, defaultTab]
  );

  // 1. Lazy State Init: Only compute from URL on initial mount (rerender-lazy-state-init)
  const [activeTab, setActiveTabState] = useState<T>(() =>
    resolveTab(searchParams.get(paramKey))
  );

  const [isPending, startTransition] = useTransition();

  // Track last known URL param to prevent race-condition loops
  const lastUrlTabRef = useRef<string | null>(searchParams.get(paramKey));

  // Visited tabs cache (Keep-alive support)
  const [visitedTabs, setVisitedTabs] = useState<Record<T, boolean>>(() => {
    const initial = resolveTab(searchParams.get(paramKey));
    return { [initial]: true } as Record<T, boolean>;
  });

  // 2. Synchronous Event Handler: State changes immediately on click (rerender-move-effect-to-event)
  const setActiveTab = useCallback(
    (nextTab: T) => {
      if (!validTabs.includes(nextTab) || nextTab === activeTab) return;

      // Mark this tab as the desired URL state so the sync effect won't bounce it back
      lastUrlTabRef.current = nextTab;

      // Optical instant update (0ms UI latency)
      setActiveTabState(nextTab);
      setVisitedTabs((prev) => (prev[nextTab] ? prev : { ...prev, [nextTab]: true }));

      // Functional URL update preserving existing query params (rerender-functional-setstate)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(paramKey, nextTab);
          return next;
        },
        { replace }
      );

      // React 18 transition for heavy tab content (rerender-transitions)
      startTransition(() => {
        onTabChange?.(nextTab);
      });
    },
    [validTabs, activeTab, paramKey, replace, setSearchParams, onTabChange]
  );

  // 3. Browser History Sync: Listen for Back/Forward navigation or external URL updates
  // (activeTab removed from dependency array to eliminate race-condition tab bounces)
  useEffect(() => {
    const rawFromUrl = searchParams.get(paramKey);
    if (rawFromUrl !== lastUrlTabRef.current) {
      lastUrlTabRef.current = rawFromUrl;
      const currentFromUrl = resolveTab(rawFromUrl);
      setActiveTabState(currentFromUrl);
      setVisitedTabs((prev) => (prev[currentFromUrl] ? prev : { ...prev, [currentFromUrl]: true }));
    }
  }, [searchParams, paramKey, resolveTab]);

  return { activeTab, setActiveTab, isPending, visitedTabs };
}

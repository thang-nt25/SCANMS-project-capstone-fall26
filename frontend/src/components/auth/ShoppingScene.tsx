import { memo, useEffect, useRef, useState } from 'react';
import type { createAffiliateScene } from './affiliate-scene';

const sceneUpdatedEvent = 'scanms:affiliate-scene-updated';
if (import.meta.hot) {
  import.meta.hot.accept('./affiliate-scene', () => {
    window.dispatchEvent(new Event(sceneUpdatedEvent));
  });
}

export const ShoppingScene = memo(function ShoppingScene({ quiet = false }: { quiet?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof createAffiliateScene> | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const paused = quiet || reduced;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(media.matches);
    const refresh = () => {
      setReady(false);
      setSceneVersion(version => version + 1);
    };
    media.addEventListener('change', onChange);
    window.addEventListener(sceneUpdatedEvent, refresh);
    return () => {
      media.removeEventListener('change', onChange);
      window.removeEventListener(sceneUpdatedEvent, refresh);
    };
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void import('./affiliate-scene').then(({ createAffiliateScene }) => {
        if (cancelled) return;
        controller.current = createAffiliateScene(element, event => {
          event.preventDefault();
          controller.current?.dispose();
          controller.current = null;
          setReady(false);
        });
        controller.current.setPaused(pausedRef.current);
        setReady(true);
      }).catch(() => { if (!cancelled) setReady(false); });
    });
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
    };
  }, [sceneVersion]);

  useEffect(() => { controller.current?.setPaused(paused); }, [paused]);

  return (
      <div className="relative min-h-[390px] flex-1 max-[760px]:min-h-[175px]" role="img" aria-label="KOL chia sẻ link tiếp thị. Khách ngồi chọn sản phẩm, đặt hàng rồi cầm túi rời gian hàng.">
        {!ready && <img src="/assets/scanms-affiliate-scene.png" alt="" className="absolute inset-0 size-full object-contain" />}
        <div ref={host} data-scene-state={ready ? 'ready' : 'idle'} className="absolute inset-0 opacity-0 transition-opacity duration-300 data-[scene-state=ready]:opacity-100 [&_canvas]:block [&_canvas]:size-full" aria-hidden="true" />
      </div>
  );
});

import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ShoppingSceneController } from './shopping-scene';

// Three.js objects live outside React: recreate them when their module changes.
const sceneUpdatedEvent = 'scanms:shopping-scene-updated';
if (import.meta.hot) {
  import.meta.hot.accept('./shopping-scene', () => {
    window.dispatchEvent(new Event(sceneUpdatedEvent));
  });
}

/** The renderer is loaded separately so the login form is usable immediately. */
export const ShoppingScene = memo(function ShoppingScene({ quiet = false }: { quiet?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ShoppingSceneController | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const stopped = reduced || quiet;
  const stoppedRef = useRef(stopped);
  stoppedRef.current = stopped;

  useEffect(() => {
    const refresh = () => setSceneVersion(version => version + 1);
    window.addEventListener(sceneUpdatedEvent, refresh);
    return () => window.removeEventListener(sceneUpdatedEvent, refresh);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    // Wait until the illustration is near the viewport, including on mobile.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      import('./shopping-scene').then(({ createShoppingScene }) => {
        if (cancelled) return;
        controller.current = createShoppingScene(element, () => setStatus('fallback'));
        controller.current.setPaused(stoppedRef.current);
        setStatus('ready');
      }).catch(() => { if (!cancelled) setStatus('fallback'); });
    }, { rootMargin: '100px' });
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
    };
  }, [sceneVersion]);

  useEffect(() => { controller.current?.setPaused(stopped); }, [stopped]);

  return (
    <div className="login-shopping-scene group/shopping relative min-h-[400px] flex-1 max-[760px]:min-h-[175px]" data-scene-state={status} data-motion-paused={stopped}>
      <div className="login-upper-glints pointer-events-none absolute -top-36 right-6 h-[130px] w-[27%] max-[760px]:hidden [&_span]:absolute [&_span]:left-(--glint-x) [&_span]:top-(--glint-y) [&_span]:size-1 [&_span]:rounded-full [&_span]:bg-brand [&_span]:opacity-50 [&_span]:animate-[login-glint-drift_7s_ease-in-out_infinite] [&_span]:[animation-delay:var(--glint-delay)] [&_span:nth-child(3n)]:h-[9px] [&_span:nth-child(3n)]:w-[3px] [&_span:nth-child(3n)]:rounded-[1px] [&_span:nth-child(3n)]:bg-[linear-gradient(135deg,#EEDFC6,#B88E4F,#FBF5EB)] group-data-[motion-paused=true]/shopping:[&_span]:[animation-play-state:paused]" aria-hidden="true">
        {[[12, 60], [38, 22], [72, 45], [88, 8], [52, 85], [20, 5]].map(([x, y], i) => (
          <span key={i} style={{ '--glint-x': `${x}%`, '--glint-y': `${y}%`, '--glint-delay': `${-i * 1.1}s` } as CSSProperties} />
        ))}
      </div>
      <div className="login-upper-bubbles pointer-events-none absolute -top-[164px] right-7 h-[250px] w-[40%] max-[1050px]:right-[22px] max-[1050px]:w-[34%] max-[760px]:hidden motion-reduce:hidden [&_span]:absolute [&_span]:bottom-0 [&_span]:left-(--bubble-x) [&_span]:size-(--bubble-size) [&_span]:rounded-full [&_span]:border [&_span]:border-[rgb(197_155_88/48%)] [&_span]:bg-[radial-gradient(circle_at_28%_24%,rgb(255_255_255/95%)_0_7%,transparent_23%),radial-gradient(circle_at_70%_78%,rgb(197_155_88/15%),transparent_65%)] [&_span]:shadow-[inset_1px_1px_2px_rgb(255_255_255/85%),inset_-1px_-1px_2px_rgb(184_142_79/15%)] [&_span]:opacity-0 [&_span]:animate-[login-bubble-rise_var(--bubble-duration)_linear_var(--bubble-delay)_infinite] group-data-[motion-paused=true]/shopping:[&_span]:[animation-play-state:paused]" aria-hidden="true">
        {[
          [5, 8, 11, -2], [11, 13, 12, -8], [17, 6, 9, -5],
          [23, 17, 13, -4], [29, 10, 10, -8], [35, 8, 12, -1],
          [40, 14, 14, -10], [46, 7, 10, -4], [51, 19, 13, -7],
          [57, 10, 11, -2], [62, 8, 9, -7], [67, 15, 14, -5],
          [73, 6, 10, -1], [78, 20, 13, -10], [83, 11, 12, -6],
          [88, 7, 9, -3], [93, 13, 11, -9], [97, 9, 12, -4],
        ].map(([x, size, duration, delay], i) => (
          <span key={i} style={{
            '--bubble-x': `${x}%`, '--bubble-size': `${size}px`,
            '--bubble-duration': `${duration}s`, '--bubble-delay': `${delay}s`,
            '--bubble-sway': `${(i % 2 ? -1 : 1) * (8 + i % 4 * 3)}px`,
            '--bubble-rise': `${220 + i % 4 * 10}px`,
          } as CSSProperties} />
        ))}
      </div>
      <div className="login-scene-fallback absolute inset-0 [background:url('/assets/scanms-shopping-scene.webp?v=single-product')_center/contain_no-repeat] transition-opacity duration-350 group-data-[scene-state=ready]/shopping:invisible group-data-[scene-state=ready]/shopping:opacity-0 max-[760px]:m-2.5" aria-hidden="true" />
      <div ref={host} className="login-scene-canvas absolute inset-0 opacity-0 transition-opacity duration-500 group-data-[scene-state=ready]/shopping:opacity-100 group-data-[scene-state=fallback]/shopping:hidden [&_canvas]:block [&_canvas]:size-full [&_canvas]:touch-pan-y" aria-hidden="true" />
      {status === 'ready' && <div className="login-gift-keyboard absolute right-2.5 bottom-2.5 z-2 [&_button]:absolute [&_button]:size-px [&_button]:overflow-hidden [&_button]:p-0 [&_button]:[clip-path:inset(50%)] [&_button]:whitespace-nowrap [&_button:focus-visible]:relative [&_button:focus-visible]:h-auto [&_button:focus-visible]:w-auto [&_button:focus-visible]:[clip-path:none] [&_button:focus-visible]:px-3 [&_button:focus-visible]:py-2 [&_button:focus-visible]:bg-white [&_button:focus-visible]:border [&_button:focus-visible]:border-brand [&_button:focus-visible]:rounded-lg [&_button:focus-visible]:text-brand-dark" role="group" aria-label="Điều khiển túi mua sắm và hộp quà">
        <button type="button" onClick={() => controller.current?.toggleBag(0)}>Xem hoặc cất sản phẩm trong túi vàng</button>
        <button type="button" onClick={() => controller.current?.toggleBag(1)}>Xem hoặc cất sản phẩm trong túi trắng</button>
        <button type="button" onClick={() => controller.current?.toggleGift()}>Mở hoặc đóng hộp quà</button>
        {['Sản phẩm bên trái', 'Sản phẩm bên phải', 'Sản phẩm ở giữa'].map((name, i) => <button type="button" key={name} onClick={() => controller.current?.toggleProduct(i)}>{name}: đưa lên hoặc cất vào hộp</button>)}
      </div>}
    </div>
  );
});

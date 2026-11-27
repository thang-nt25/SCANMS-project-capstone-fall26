import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AudioLines, ChevronLeft, ChevronRight, Megaphone, ShoppingBag, Store, Truck, type LucideIcon } from 'lucide-react';
import type { Product } from '@/types/marketplace.types';
import { discountedCatalogPath, hasCatalogDiscount } from '@/utils/marketplace.utils';
import { handleStoreImageError } from '@/utils/image-fallback.utils';
import { useActiveSponsoredPlacements } from './SponsoredStores';

interface Slide {
  eyebrow: string;
  title: string;
  description?: string;
  href: string;
  productSku?: string;
  label: string;
  scene: string;
  sponsored?: boolean;
  image?: string;
  backdrop?: string;
  highlights?: { label: string; icon: LucideIcon }[];
}

const brandSlides: Slide[] = [
  {
    eyebrow: 'Khám phá cùng nhà sáng tạo',
    title: 'Chọn sản phẩm hay, cùng KOC bạn thích.',
    description: 'Mua qua link giới thiệu của KOC.',
    href: '/search',
    label: 'Xem tất cả sản phẩm',
    scene: 'discovery',
    backdrop: '/assets/marketplace/hero-discovery-phone.webp',
  },
  {
    eyebrow: 'Aura Activewear',
    title: 'Áo khoác chạy bộ siêu nhẹ',
    description: 'Gọn nhẹ khi vận động',
    href: `/search?q=${encodeURIComponent('Áo khoác chạy bộ')}`,
    productSku: 'FASH-WND03',
    label: 'Xem sản phẩm',
    scene: 'aura',
    backdrop: '/assets/marketplace/hero-aura-windbreaker.webp',
  },
  {
    eyebrow: 'GreenBio',
    title: 'Granola hạt hữu cơ',
    description: 'Gợi ý cho bữa sáng',
    href: '/search?q=Granola',
    productSku: 'HLTH-GRN01',
    label: 'Xem sản phẩm',
    scene: 'greenbio',
    backdrop: '/assets/marketplace/hero-greenbio-granola.webp',
  },
  {
    eyebrow: 'Lumière Smart Living',
    title: 'Tai nghe Bluetooth',
    href: `/search?q=${encodeURIComponent('Tai nghe Bluetooth')}`,
    productSku: 'TECH-EAR02',
    label: 'Xem sản phẩm',
    scene: 'lumiere',
    backdrop: '/assets/marketplace/hero-lumiere-earbuds.webp',
    highlights: [{ label: 'Chống ồn chủ động ANC', icon: AudioLines }],
  },
];

export function MarketplaceHero({ products }: { products: Product[] }) {
  const placements = useActiveSponsoredPlacements();
  const slides: Slide[] = [
    ...brandSlides,
    ...placements.map(({ id, store, headline, product, bannerImageUrl }) => ({
      scene: `sponsored-${id ?? store.id}`,
      eyebrow: store.name,
      title: headline,
      href: product ? `/products/${product.id}` : `/shops/${store.id}`,
      label: product ? 'Xem sản phẩm' : 'Vào gian hàng',
      sponsored: true,
      backdrop: bannerImageUrl,
      image: product?.imageUrl || store.logoUrl || undefined,
    })),
  ];
  const [activeId, setActiveId] = useState(brandSlides[0].scene);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const hasDiscounts = products.some(product => hasCatalogDiscount(product, true));
  const activeIndex = Math.max(0, slides.findIndex(slide => slide.scene === activeId));
  const current = slides[activeIndex];
  const nextId = slides[(activeIndex + 1) % slides.length].scene;
  const featuredProduct = current.productSku ? products.find(product => product.sku === current.productSku) : undefined;
  const backdrop = current.backdrop;
  const isDiscovery = current.scene === 'discovery';
  const stopRotation = keyboardFocused || reducedMotion;
  const move = (offset: number) => setActiveId(slides[(activeIndex + offset + slides.length) % slides.length].scene);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (stopRotation) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActiveId(nextId);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [current.scene, nextId, stopRotation]);

  const arrowClass = 'absolute top-1/2 z-20 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-[#EAE4D7] bg-white/95 text-[#231D15] transition-colors hover:border-[#B88E4F] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#B88E4F] sm:size-10';

  return (
    <section className="border-b border-[#EAE4D7] bg-[#F3EFE6] py-4 text-left sm:py-6">
      <div className="mx-auto grid w-full max-w-[1248px] gap-3 px-3 sm:gap-4 sm:px-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:px-6">
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Chương trình nổi bật SCANMS"
          className="relative min-w-0 overflow-hidden rounded-[20px] border border-[#EAE4D7] bg-[#FAF8F5] shadow-[0_8px_28px_rgba(93,70,35,0.06)]"
          onPointerDownCapture={() => setKeyboardFocused(false)}
          onFocusCapture={event => setKeyboardFocused(event.target.matches(':focus-visible'))}
          onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocused(false);
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              move(event.key === 'ArrowLeft' ? -1 : 1);
            }
          }}
          onTouchStart={event => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
          onTouchEnd={event => {
            const start = touchStart.current;
            touchStart.current = null;
            if (!start) return;
            const touch = event.changedTouches[0];
            const dx = touch.clientX - start.x;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(touch.clientY - start.y)) move(dx < 0 ? 1 : -1);
          }}
        >
          <div aria-live={stopRotation ? 'polite' : 'off'}>
            <div
              key={current.scene}
              role="group"
              aria-roledescription="slide"
              aria-label={`${activeIndex + 1} / ${slides.length}`}
              className="relative isolate flex flex-col bg-[#FAF8F5] motion-safe:animate-[marketplace-banner-enter_350ms_ease-out_both] sm:min-h-[365px] sm:justify-center sm:px-14 sm:pb-12 sm:pt-14"
            >
              <div className={`pointer-events-none relative flex h-[228px] flex-col justify-center px-5 py-4 sm:static sm:h-auto sm:px-0 sm:py-0 ${current.sponsored ? 'sm:max-w-[64%]' : 'sm:w-[49%] sm:max-w-[368px]'}`}>
                {current.sponsored && (
                  <span className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#795A2D]">
                    <Megaphone size={15} aria-hidden="true" />Được tài trợ
                  </span>
                )}
                {isDiscovery && (
                  <span className="mb-3 flex items-center gap-2 text-sm font-black tracking-wide text-[#795A2D] sm:absolute sm:left-14 sm:top-5 sm:mb-0 sm:text-base">
                    <ShoppingBag size={20} aria-hidden="true" />SCANMS
                  </span>
                )}
                <span className={`flex items-center gap-2 uppercase ${isDiscovery ? 'text-[10px] font-bold tracking-[0.08em] text-[#795A2D] sm:text-xs' : 'text-sm font-extrabold tracking-wide text-[#1A1612] sm:text-lg'}`}>
                  {isDiscovery && <span className="h-0.5 w-4 shrink-0 bg-[#C59B58] sm:w-7" aria-hidden="true" />}
                  <span className={current.sponsored ? 'line-clamp-1 break-words' : undefined}>{current.eyebrow}</span>
                </span>
                {!isDiscovery && <span className="mt-2 h-0.5 w-10 bg-[#C59B58] sm:w-14" aria-hidden="true" />}
                <h1 className={`my-2 font-extrabold leading-[1.12] tracking-tight text-[#1A1612] sm:my-3 ${current.sponsored ? 'line-clamp-3 wrap-anywhere text-[clamp(1.4rem,3.1vw,2.75rem)]' : 'text-[clamp(1.375rem,2.4vw,2.125rem)] text-balance'}`}>{current.title}</h1>
                {current.description && <p className="mb-3 max-w-[32ch] text-xs leading-relaxed text-[#655A49] sm:mb-5 sm:text-[13px]">{current.description}</p>}
                {current.highlights && (
                  <ul className="mb-4 flex flex-wrap gap-1.5 sm:gap-2" aria-label="Điểm nổi bật">
                    {current.highlights.map(({ label, icon: Icon }) => (
                      <li key={label} className="flex items-center gap-1.5 rounded-lg border border-[#B88E4F] bg-[#FAF8F5]/80 px-1.5 py-1 text-[11px] font-semibold text-[#231D15] sm:px-2.5 sm:py-1.5 sm:text-sm">
                        <Icon className="size-3.5 shrink-0 sm:size-4" aria-hidden="true" />{label}
                      </li>
                    ))}
                  </ul>
                )}
                <Link to={featuredProduct ? `/products/${featuredProduct.id}` : current.href} className="pointer-events-auto inline-flex min-h-10 w-fit items-center gap-2 rounded-[10px] bg-[#C59B58]! px-3 text-xs font-bold text-[#231D15] transition-colors hover:bg-[#B88E4F]! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795A2D] sm:px-4 sm:text-sm">
                  {current.label}<ArrowRight size={16} className="shrink-0" aria-hidden="true" />
                </Link>
              </div>
              {backdrop ? <>
                <img src={backdrop} alt="" fetchPriority={isDiscovery ? 'high' : 'auto'} onError={current.sponsored ? handleStoreImageError : undefined} className="h-[144px] w-full object-cover object-right min-[420px]:h-[165px] sm:absolute sm:inset-0 sm:-z-20 sm:h-full" />
                <div aria-hidden="true" className={`absolute inset-0 -z-10 hidden sm:block ${current.sponsored ? 'bg-[linear-gradient(90deg,#FAF8F5_0%,#FAF8F5f5_48%,#FAF8F5db_57%,transparent_88%)]' : 'bg-[linear-gradient(90deg,#FAF8F5f5_0%,#FAF8F5de_34%,#FAF8F573_51%,transparent_75%)]'}`} />
              </> : (
                <div aria-hidden="true" className="grid h-[144px] place-items-center bg-[#F3EFE6] p-3 min-[420px]:h-[165px] sm:absolute sm:inset-y-8 sm:right-14 sm:-z-10 sm:h-auto sm:w-[34%] sm:rounded-2xl">
                  {current.image ? <img src={current.image} onError={handleStoreImageError} alt="" className="size-full min-h-0 object-contain" /> : <Store size={40} className="text-[#B88E4F]" />}
                </div>
              )}
              {!isDiscovery && !current.sponsored && (
                <div className="absolute right-2.5 top-[237px] flex items-center gap-1 rounded-lg border border-[#B88E4F] bg-[#FBF5EB] px-1.5 py-1 text-[#231D15] shadow-sm sm:right-4 sm:top-4 sm:gap-1.5 sm:px-2">
                  <Truck className="size-3.5 shrink-0 sm:size-4" aria-hidden="true" />
                  <div className="text-[9px] leading-tight sm:text-[10px]">
                    <strong className="block text-[10px] sm:text-[12px]">FREESHIP</strong>
                    Cho đơn đủ điều kiện
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative flex h-12 items-center justify-center border-t border-[#EAE4D7] bg-[#FAF8F5] sm:static sm:h-auto sm:border-0">
            <button type="button" aria-label="Banner trước" onClick={() => move(-1)} className={`${arrowClass} left-2 sm:left-2.5`}><ChevronLeft size={18} aria-hidden="true" /></button>
            <div className="z-20 flex items-center justify-center rounded-full bg-[#FAF8F5]/90 px-1.5 sm:absolute sm:bottom-3 sm:left-1/2 sm:-translate-x-1/2">
              {slides.map((slide, index) => (
                <button key={slide.scene} type="button" aria-label={`Xem banner ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => setActiveId(slide.scene)} className="grid size-6 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-[#795A2D]">
                  <span className={`size-2.5 rounded-full ${index === activeIndex ? 'bg-[#B88E4F]' : 'bg-[#D8C9B1]'}`} />
                </button>
              ))}
            </div>
            <button type="button" aria-label="Banner tiếp theo" onClick={() => move(1)} className={`${arrowClass} right-2 sm:right-2.5`}><ChevronRight size={18} aria-hidden="true" /></button>
          </div>
        </div>

        <div className="grid min-w-0 auto-rows-fr gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-1 lg:grid-rows-2">
          <Link
            to="/marketplace#featured-stores"
            aria-label="Xem gian hàng"
            className="relative block min-h-[126px] overflow-hidden rounded-2xl border border-[#EEDFC6] bg-[#F5E8D3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F]"
          >
            <img src="/assets/marketplace/hero-side-stores.webp" alt="" className="absolute inset-0 h-full w-full object-contain" />
          </Link>
          <Link to={hasDiscounts ? discountedCatalogPath : '/search'} aria-label="Khám phá sản phẩm" className="relative block min-h-[126px] overflow-hidden rounded-2xl border border-[#EEDFC6] bg-[#F5E8D3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F]">
            <img src="/assets/marketplace/hero-side-products.png" alt="" className="absolute inset-0 h-full w-full object-contain" />
          </Link>
        </div>
      </div>
      <style>{`@keyframes marketplace-banner-enter { from { opacity: .55; } to { opacity: 1; } }`}</style>
    </section>
  );
}

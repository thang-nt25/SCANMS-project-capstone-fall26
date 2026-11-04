import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface BannerStore {
  id: string;
  name: string;
  activeCampaign?: { name: string; endsAt: string } | null;
}

export function MarketplaceHero({ stores, onOpenLive }: { stores: BannerStore[]; onOpenLive: () => void }) {
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const partner = stores.find((store) => store.activeCampaign && Date.parse(store.activeCampaign.endsAt) > Date.now());

  const slides = [
    {
      image: '/assets/marketplace/scanms-marketplace-banner-v3.png',
      eyebrow: 'SCANMS · MẠNG LƯỚI TIẾP THỊ & CỘNG TÁC VIÊN',
      title: partner ? partner.activeCampaign!.name : 'Chiến Dịch Siêu Thưởng Thời Trang Thiết Kế 2026',
      description: partner ? `Khám phá chương trình đang diễn ra tại ${partner.name} và lấy liên kết tiếp thị.` : 'Khám phá chương trình đang diễn ra tại Aura Fashion Studio và lấy liên kết tiếp thị.',
      label: partner ? `Ghé thăm ${partner.name} ->` : 'Khám phá chiến dịch ->',
      href: partner ? `/shops/${partner.id}` : '#featured-stores',
    },
    {
      image: '/assets/marketplace/scanms-affiliate-banner-v2.png',
      eyebrow: 'KHÁM PHÁ CÙNG NHÀ SÁNG TẠO',
      title: 'Chọn sản phẩm hay, cùng KOC bạn thích.',
      description: 'Xem KOC giới thiệu sản phẩm trong các phiên Live và khám phá thêm nhiều gian hàng đối tác.',
      label: 'Khám phá Live cùng KOC ->',
      href: null,
    },
    {
      image: '/assets/marketplace/scanms-live-banner-v2.png',
      eyebrow: 'SCANMS LIVE COMMERCE',
      title: 'Xem trực tiếp. Hỏi ngay. Chọn đúng.',
      description: 'Gặp gỡ KOC, khám phá sản phẩm đang được giới thiệu và ưu đãi còn hiệu lực trong phiên Live.',
      label: 'Khám phá KOC Live ->',
      href: null,
    },
  ];

  const move = (offset: number) => setActive((previous) => (previous + offset + slides.length) % slides.length);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (interacting || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((previous) => (previous + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [interacting, reducedMotion, slides.length]);

  return (
    <section className="w-full">
      <div
        className="relative overflow-hidden my-4 md:my-9 mx-auto w-[calc(100%-32px)] md:w-[calc(100%-80px)] max-w-[1600px] min-h-[380px] md:min-h-[440px] md:h-[440px] rounded-[26px] border border-[#ead2ae] bg-[linear-gradient(110deg,#fff7e9_0%,#f5dfbd_55%,#c99a55_100%)] shadow-[0_8px_24px_rgba(82,53,20,0.08)]"
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.image}
            className={`absolute inset-0 w-full h-full flex items-center transition-all duration-700 ease-in-out ${
              index === active
                ? 'opacity-100 visible pointer-events-auto z-[2]'
                : 'opacity-0 invisible pointer-events-none'
            }`}
            aria-hidden={index !== active}
          >
            <img
              src={slide.image}
              alt=""
              fetchPriority={index === 0 ? 'high' : 'auto'}
              className="absolute inset-0 w-full h-full object-cover object-[70%_center]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#fff7e9_0%,rgba(255,247,233,0.96)_35%,rgba(255,247,233,0.75)_55%,rgba(255,247,233,0.15)_100%)]" />

            <div className="relative z-[2] max-w-[650px] p-6 sm:p-9 lg:p-[60px] text-left">
              <span className="inline-block px-3.5 py-1.5 rounded-full bg-white/85 border border-[#ead2ae] text-[#8b682f] text-[11px] font-extrabold tracking-widest uppercase mb-4">
                {slide.eyebrow}
              </span>
              <h1 className="text-[28px] md:text-[clamp(32px,3.5vw,52px)] leading-[1.15] font-extrabold text-[#352313] m-0 mb-4">
                {slide.title}
              </h1>
              <p className="text-[#80694d] text-[15px] leading-[1.7] m-0 mb-6.5">
                {slide.description}
              </p>

              <div className="flex flex-wrap gap-3.5">
                {slide.href ? (
                  slide.href.startsWith('#') ? (
                    <a
                      href={slide.href}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('featured-stores')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="bg-[linear-gradient(135deg,#c99545,#94621f)] text-white border-0 rounded-full px-7 py-3.5 font-semibold text-[13.5px] cursor-pointer no-underline inline-flex items-center gap-2 transition-all duration-200 shadow-[0_4px_12px_rgba(160,105,35,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(160,105,35,0.25)]"
                    >
                      {slide.label}
                    </a>
                  ) : (
                    <Link
                      to={slide.href}
                      className="bg-[linear-gradient(135deg,#c99545,#94621f)] text-white border-0 rounded-full px-7 py-3.5 font-semibold text-[13.5px] cursor-pointer no-underline inline-flex items-center gap-2 transition-all duration-200 shadow-[0_4px_12px_rgba(160,105,35,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(160,105,35,0.25)]"
                    >
                      {slide.label}
                    </Link>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={onOpenLive}
                    className="bg-[linear-gradient(135deg,#c99545,#94621f)] text-white border-0 rounded-full px-7 py-3.5 font-semibold text-[13.5px] cursor-pointer no-underline inline-flex items-center gap-2 transition-all duration-200 shadow-[0_4px_12px_rgba(160,105,35,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(160,105,35,0.25)]"
                  >
                    {slide.label}
                  </button>
                )}
                <Link
                  to="/search"
                  className="bg-white/85 text-[#302317] border border-[#b8862f] rounded-full px-7 py-3.5 font-semibold text-[13.5px] cursor-pointer no-underline inline-flex items-center transition-all duration-200 hover:bg-white hover:border-[#8b682f]"
                >
                  Tất cả sản phẩm
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Compact floating controls in bottom right */}
        <div className="absolute right-4 md:right-8 bottom-4 md:bottom-6 z-10 flex items-center gap-1 px-2.5 py-1 bg-white/70 backdrop-blur-md border border-[#ead2ae]/60 rounded-full shadow-[0_2px_8px_rgba(82,53,20,0.06)]">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Banner trước"
            className="rounded-full p-2 hover:bg-black/5 text-[#7a6855] transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-1 px-1">
            {slides.map((slide, index) => (
              <button
                type="button"
                key={slide.image}
                onClick={() => setActive(index)}
                aria-label={`Xem banner ${index + 1}`}
                className="flex h-6 w-5 items-center justify-center cursor-pointer"
              >
                <span
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === active ? 'w-5 bg-[#b8862f]' : 'w-2 bg-[#ead2ae]'
                  }`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Banner sau"
            className="rounded-full p-2 hover:bg-black/5 text-[#7a6855] transition-colors cursor-pointer"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}

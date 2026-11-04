import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import './MarketplaceHero.css';

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
    <section className="hero-section">
      <div
        className="hero-banner"
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
            className={`hero-slide ${index === active ? 'active' : ''}`}
            aria-hidden={index !== active}
          >
            <img
              src={slide.image}
              alt=""
              fetchPriority={index === 0 ? 'high' : 'auto'}
              className="hero-bg-image"
            />
            <div className="hero-bg-overlay" />

            <div className="hero-content">
              <span className="hero-eyebrow">{slide.eyebrow}</span>
              <h1>{slide.title}</h1>
              <p>{slide.description}</p>

              <div className="hero-actions">
                {slide.href ? (
                  slide.href.startsWith('#') ? (
                    <a
                      href={slide.href}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('featured-stores')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="btn-primary"
                    >
                      {slide.label}
                    </a>
                  ) : (
                    <Link to={slide.href} className="btn-primary">
                      {slide.label}
                    </Link>
                  )
                ) : (
                  <button type="button" onClick={onOpenLive} className="btn-primary">
                    {slide.label}
                  </button>
                )}
                <Link to="/search" className="btn-secondary">
                  Tất cả sản phẩm
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Compact floating controls in bottom right */}
        <div className="hero-carousel-controls">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Banner trước"
            className="rounded-full p-2 hover:bg-black/5 text-[#7a6855] transition-colors"
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
            className="rounded-full p-2 hover:bg-black/5 text-[#7a6855] transition-colors"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}

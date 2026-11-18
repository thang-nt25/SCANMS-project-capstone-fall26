import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Store, ShieldCheck, Radio } from 'lucide-react';

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
      title: partner ? partner.activeCampaign!.name : 'Một điểm đến. Nhiều lựa chọn chính hãng.',
      description: partner ? `Khám phá chương trình đang diễn ra tại ${partner.name} và lấy liên kết tiếp thị.` : 'Nền tảng quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết, cung cấp công cụ Smart Link, mã QR và tài nguyên số chính hãng.',
      label: partner ? `Ghé thăm ${partner.name}` : 'Khám phá gian hàng',
      href: partner ? `/shops/${partner.id}` : '#featured-stores',
    },
    {
      image: '/assets/marketplace/scanms-affiliate-banner-v2.png',
      eyebrow: 'KHÁM PHÁ CÙNG NHÀ SÁNG TẠO',
      title: 'Chọn sản phẩm hay, cùng KOC bạn thích.',
      description: 'Xem KOC giới thiệu sản phẩm trong các phiên Live và khám phá thêm nhiều gian hàng đối tác.',
      label: 'Khám phá Live cùng KOC',
      href: null,
    },
    {
      image: '/assets/marketplace/scanms-live-banner-v2.png',
      eyebrow: 'SCANMS LIVE COMMERCE',
      title: 'Xem trực tiếp. Hỏi ngay. Chọn đúng.',
      description: 'Gặp gỡ KOC, khám phá sản phẩm đang được giới thiệu và ưu đãi còn hiệu lực trong phiên Live.',
      label: 'Khám phá KOC Live',
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
      if (!document.hidden) setActive((previous) => (previous + 1) % 3);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [interacting, reducedMotion]);

  return (
    <section className="border-b border-[#EAE4D7] bg-[#F3EFE6] py-3 text-left sm:py-7">
      <div className="mx-auto w-full max-w-[1248px] px-3 sm:px-4 lg:px-6">
        <div
          role="region" aria-roledescription="carousel" aria-label="Chương trình nổi bật SCANMS"
          className="relative overflow-hidden rounded-3xl border border-[#EAE4D7] bg-[#FAF8F5] shadow-[0_16px_44px_rgba(93,70,35,0.10)]"
          onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
          onFocusCapture={() => setInteracting(true)}
          onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              move(event.key === 'ArrowLeft' ? -1 : 1);
            }
          }}
        >
          {slides.map((slide, index) => (
            <div key={slide.image} hidden={index !== active} role="group" aria-roledescription="slide" aria-label={`${index + 1} / ${slides.length}`} className={index === active ? 'flex flex-col sm:block' : 'hidden'}>
              <img src={slide.image} alt="" width={2152} height={731} fetchPriority={index === 0 ? 'high' : 'auto'} className="order-2 aspect-[2152/731] w-full object-contain sm:absolute sm:inset-0 sm:h-full sm:object-cover sm:object-[70%_center]" />
              <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#FAF8F5_0%,rgba(250,248,245,.96)_32%,rgba(250,248,245,.78)_55%,rgba(250,248,245,.20)_100%)] sm:block" />
              {slide.href ? (
                <Link to={slide.href} aria-label={slide.label} className="absolute inset-0 focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[#C59B58]" />
              ) : (
                <button type="button" onClick={onOpenLive} aria-label={slide.label} className="absolute inset-0 cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[#C59B58]" />
              )}
              <div className="pointer-events-none relative order-1 flex min-h-[240px] max-w-[660px] flex-col items-start justify-center bg-[#FAF8F5] px-4 py-5 sm:min-h-[440px] sm:bg-transparent sm:px-12 sm:pb-28 sm:pt-14">
                <span className="inline-flex max-w-full items-center text-[10px] font-bold tracking-[0.06em] text-[#7D715E] sm:rounded-full sm:border sm:border-[#EEDFC6] sm:bg-white/90 sm:px-3 sm:py-1.5">{slide.eyebrow}</span>
                {index === 0 ? <h1 className="mb-2 mt-3 text-[23px] font-bold leading-[1.2] tracking-tight sm:mb-4 sm:mt-5 sm:text-[44px] sm:font-black">{slide.title}</h1> : <h2 className="mb-2 mt-3 text-[23px] font-bold leading-[1.2] tracking-tight sm:mb-4 sm:mt-5 sm:text-[44px] sm:font-black">{slide.title}</h2>}
                <p className="max-w-[470px] text-[13px] leading-[1.6] text-[#7D715E] sm:text-sm sm:leading-6">{slide.description}</p>
                <div className="pointer-events-auto mt-4 grid w-full grid-cols-2 gap-2 sm:mt-6 sm:flex sm:w-auto sm:flex-wrap sm:gap-3 [&>a]:justify-center [&>button]:justify-center">
                  {slide.href ? <Link to={slide.href} aria-label={slide.label} className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl bg-[#C59B58] px-2 text-[11px] font-semibold text-[#231D15] hover:bg-[#B88E4F] sm:px-5 sm:text-xs sm:font-bold"><span className="sm:hidden">{partner ? 'Ghé thăm Shop' : 'Gian hàng'}</span><span className="hidden sm:inline">{slide.label}</span><ArrowRight size={14} /></Link> : <button type="button" onClick={onOpenLive} aria-label={slide.label} className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl bg-[#C59B58] px-2 text-[11px] font-semibold text-[#231D15] hover:bg-[#B88E4F] sm:px-5 sm:text-xs sm:font-bold"><span className="sm:hidden">Khám phá Live</span><span className="hidden sm:inline">{slide.label}</span><Radio size={14} /></button>}
                  <Link to="/search" className="inline-flex min-h-11 min-w-0 items-center rounded-xl border border-[#EAE4D7] bg-white/90 px-2 text-[11px] font-semibold hover:border-[#C59B58] sm:px-5 sm:text-xs sm:font-bold">Tất cả sản phẩm</Link>
                </div>
              </div>
            </div>
          ))}
          <div className="relative flex items-center justify-center gap-2 border-t border-[#EAE4D7] bg-white/90 px-4 py-1.5 sm:absolute sm:inset-x-0 sm:bottom-0 sm:px-6 sm:py-3 md:justify-between">
            <div className="hidden gap-4 text-[11px] font-semibold text-[#7D715E] md:flex"><span className="flex items-center gap-1.5"><Store size={15} /> Nhãn hàng trực thuộc</span><span className="flex items-center gap-1.5"><ShieldCheck size={15} /> Đối tác eKYC xác minh</span></div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(-1)} aria-label="Banner trước" className="rounded-full p-3 hover:bg-[#F3EFE6]"><ArrowLeft size={16} /></button>
              {slides.map((slide, index) => <button type="button" key={slide.image} onClick={() => setActive(index)} aria-label={`Xem banner ${index + 1}`} aria-current={index === active ? 'true' : undefined} className="flex h-10 w-8 items-center justify-center"><span className={`h-1.5 rounded-full ${index === active ? 'w-6 bg-[#C59B58]' : 'w-2 bg-[#EAE4D7]'}`} /></button>)}
              <button type="button" onClick={() => move(1)} aria-label="Banner tiếp theo" className="rounded-full p-3 hover:bg-[#F3EFE6]"><ArrowRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


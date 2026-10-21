import { memo, useEffect, useState } from 'react';
import { Sparkles, IdCard } from 'lucide-react';
import { RegisterMarketScene } from './RegisterMarketScene';
import api from '../../services/api';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';

interface ShowcaseProduct { imageUrl?: string; mediaAssets?: { urlOrContent?: string }[] }

export const RegisterShowcase = memo(function RegisterShowcase({ name }: { name: string }) {
  const [productImages, setProductImages] = useState<string[]>([]);
  useEffect(() => {
    const abort = new AbortController();
    void api.get('/public/products', { params: { limit: 48, sortBy: 'newest' }, signal: abort.signal }).then(response => {
      if (abort.signal.aborted) return;
      // The API interceptor unwraps responses; also accept the marketplace envelope.
      const res = response as unknown as { data?: unknown; items?: ShowcaseProduct[] };
      const outer = res?.data ?? res;
      const payload = (outer as { data?: unknown })?.data ?? outer;
      const items: ShowcaseProduct[] = Array.isArray(payload) ? payload : (payload as { items?: ShowcaseProduct[] })?.items ?? [];
      const images = items.map(item => getSafeProductImageUrl(item.imageUrl || item.mediaAssets?.[0]?.urlOrContent))
        .filter(url => url !== '/assets/product-placeholder.svg');
      setProductImages([...new Set(images)]);
    }).catch(() => { /* Keep the shop visible without substituting unrelated products. */ });
    return () => abort.abort();
  }, []);
  return (
    <section className="register-showcase relative isolate flex min-w-0 flex-col overflow-hidden bg-[radial-gradient(ellipse_at_56%_54%,#FFFEFA_0%,#FBF5EB_55%,#F3EFE6_100%)] px-[38px] pt-6 pb-[18px] max-[1100px]:px-[25px] max-[800px]:p-[27px] max-[480px]:px-5 max-[480px]:pt-6 max-[480px]:pb-[18px] register-compact:pt-[18px] register-compact:pb-3.5" aria-label="Khám phá cộng đồng SCANMS">
      <div className="register-story relative z-2 [&>h1]:mt-3 [&>h1]:mb-2.5 [&>h1]:pb-[5px] [&>h1]:text-[clamp(30px,3vw,40px)] [&>h1]:font-semibold [&>h1]:italic [&>h1]:leading-[1.2] [&>h1]:tracking-[-1px] [&_em]:font-semibold [&_em]:text-brand-strong max-[800px]:[&>h1]:mt-[19px] max-[800px]:[&>h1]:mb-[18px] max-[800px]:[&>h1]:text-[34px] max-[480px]:[&>h1]:mt-[13px] max-[480px]:[&>h1]:mb-[9px] max-[480px]:[&>h1]:text-[31px] register-compact:[&>h1]:mt-2.5 register-compact:[&>h1]:mb-1.5 register-compact:[&>h1]:text-[34px]">
        <span className="register-story-tag leading-[1.5] inline-flex items-center gap-[9px] rounded-full border border-brand-border bg-white/90 px-4 py-2 text-xs font-bold text-ink shadow-[0_2px_6px_rgb(125_113_94/6%)] [&_svg]:shrink-0 [&_svg]:text-brand-strong max-[480px]:text-[11px] register-compact:py-1.5"><Sparkles size={14} /> Sàn Thương Mại Đối Tác</span>
        <h1 className="font-display">Kết nối gian hàng,<br /><em>lan tỏa giá trị.</em></h1>
      </div>
      <div className="register-world register-world-market relative mt-1 -mx-[25px] -mb-[3px] min-h-[330px] w-auto flex-1 self-stretch max-[800px]:-mx-5 max-[800px]:min-h-[315px] max-[480px]:-mx-[17px] max-[480px]:min-h-[270px] register-compact:min-h-[300px]" aria-hidden="true">
        <RegisterMarketScene images={productImages} />
        <div className="register-creator-badge pointer-events-none absolute top-[1%] left-[6%] z-3 flex items-center gap-3 [&_strong]:block [&_strong]:text-xs [&_strong]:font-semibold [&_strong]:text-[#584330] [&_small]:mt-[3px] [&_small]:block [&_small]:text-[10px] [&_small]:text-muted max-[480px]:top-0 max-[480px]:left-[5%] max-[480px]:gap-[9px] max-[480px]:[&_strong]:text-[11px] max-[480px]:[&_small]:text-[9px]">
          <span className="register-camera-icon relative block size-[47px] [transform:rotate(-8deg)] drop-shadow-[0_6px_4px_rgb(125_113_94/15%)] animate-register-camera motion-reduce:animate-none max-[480px]:scale-[.82] max-[480px]:origin-left max-[480px]:-mr-[7px]"><i className="camera-reel reel-left absolute top-0.5 size-5 rounded-full border-[5px] border-[#D9BF91] bg-brand-soft shadow-[inset_1px_1px_0_#B88E4F,2px_2px_0_#B88E4F] after:absolute after:inset-0.5 after:rounded-full after:border-2 after:border-dotted after:border-brand-strong after:content-[''] after:animate-[spin_10s_linear_infinite] motion-reduce:after:animate-none left-0" /><i className="camera-reel reel-right absolute top-0.5 size-5 rounded-full border-[5px] border-[#D9BF91] bg-brand-soft shadow-[inset_1px_1px_0_#B88E4F,2px_2px_0_#B88E4F] after:absolute after:inset-0.5 after:rounded-full after:border-2 after:border-dotted after:border-brand-strong after:content-[''] after:animate-[spin_10s_linear_infinite] motion-reduce:after:animate-none left-[22px]" /><i className="camera-body absolute top-[18px] left-px z-2 h-[27px] w-9 rounded-[7px] border border-brand-strong bg-[linear-gradient(135deg,#EEDFC6,#C59B58)] shadow-[inset_1px_2px_0_#FBF5EB,3px_2px_0_#B88E4F]"><i className="camera-lens absolute top-[3px] left-[7px] size-[19px] rounded-full border-[3px] border-[#FFFCF5] bg-[radial-gradient(circle_at_38%_30%,#FBF5EB_0_13%,#B88E4F_17%_48%,#7D715E_52%)] shadow-[1px_2px_2px_rgb(88_67_48/25%)]" /><i className="camera-light absolute top-1 right-[3px] size-[3px] rounded-full bg-white animate-register-pulse motion-reduce:animate-none" /></i><i className="camera-viewfinder absolute -right-px top-[22px] h-[19px] w-[11px] -skew-y-16 rounded-[2px] border border-brand-strong bg-[linear-gradient(90deg,#B88E4F,#EEDFC6)]" /></span>
          <span><strong>Nhà sáng tạo</strong><small>Kết nối & chia sẻ</small></span>
        </div>
      </div>
      <div className="register-member-badge mt-2.5 ml-3 flex max-w-full items-center gap-[13px] self-start p-0 [&>div]:min-w-0 [&_strong]:block [&_strong]:truncate [&_strong]:text-xs [&_strong]:font-semibold [&_strong]:text-[#584330] [&_small]:mt-[3px] [&_small]:block [&_small]:text-[10px] [&_small]:text-muted max-[480px]:ml-0 max-[480px]:[&_strong]:text-[11px] max-[480px]:[&_small]:text-[9px] register-compact:mt-1" aria-hidden="true">
        <span className="register-member-pass relative flex h-[42px] w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-brand-border bg-[linear-gradient(130deg,#FFFFFF_20%,#FBF5EB)] text-brand-strong shadow-[3px_4px_0_#D8C19B,6px_8px_12px_rgb(125_113_94/12%)] [transform:perspective(250px)_rotateY(-15deg)_rotateZ(-8deg)] animate-register-pass motion-reduce:animate-none [&>span]:text-[6px] [&>span]:tracking-[1px] [&>span]:font-bold [&>span]:text-[#90682F] [&>i]:absolute [&>i]:right-[5px] [&>i]:bottom-[5px] [&>i]:size-2 [&>i]:rounded-[3px] [&>i]:border [&>i]:border-brand [&>i]:bg-brand-border"><span>SCANMS</span><IdCard size={24} strokeWidth={1.3} /><i /></span>
        <div><strong>{name.trim() || 'Không gian của bạn'}</strong><small>Khám phá · Mua sắm · Chia sẻ</small></div>
      </div>
    </section>
  );
});

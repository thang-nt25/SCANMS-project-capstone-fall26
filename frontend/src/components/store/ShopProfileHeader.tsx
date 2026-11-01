import { useState, type ReactNode } from 'react';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Heart,
  MapPin,
  MessageSquare,
  Package,
  Star,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { StoreActivityStatus } from './StoreActivityStatus';
import type { PublicShop } from '../../types/storefront.types';

function ShopFact({
  icon: Icon,
  label,
  children,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 text-sm" title={hint}>
      <Icon
        size={18}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-[#B88E4F]"
      />
      <div className="min-w-0">
        <dt className="text-xs text-[#7D715E]">{label}</dt>
        <dd className="mt-1 break-words font-medium leading-5 text-[#1A1612]">
          {children}
        </dd>
      </div>
    </div>
  );
}

function responseTime(minutes: number | null | undefined) {
  if (minutes == null) return 'Chưa có dữ liệu';
  if (minutes < 1) return 'Dưới 1 phút';
  if (minutes < 60) return `Khoảng ${minutes} phút`;
  return `Khoảng ${Math.round(minutes / 60)} giờ`;
}

export function ShopProfileHeader({
  shop,
  following,
  savingFollow,
  onFollow,
  onChat,
}: {
  shop: PublicShop;
  following: boolean;
  savingFollow: boolean;
  onFollow: () => void;
  onChat: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const joined = shop.createdAt ? new Date(shop.createdAt) : null;
  const performance = shop.chatPerformance;
  const responseHint = performance
    ? `Hội thoại khách hàng trong ${performance.periodDays} ngày gần nhất; tính phản hồi trong ${performance.responseWindowHours} giờ. ${performance.conversationCount} hội thoại đủ thời gian đánh giá.`
    : undefined;
  return (
    <section
      aria-label="Thông tin gian hàng"
      className="rounded-3xl border border-[#EAE4D7] bg-white p-4 shadow-xs sm:p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.65fr)] lg:items-center">
        <div className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white text-[#B88E4F]">
              {shop.logoUrl && !logoFailed ? (
                <img
                  src={shop.logoUrl}
                  alt={`Logo ${shop.name}`}
                  className="h-full w-full object-contain p-1"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <Store size={34} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-7 text-[#1A1612] sm:text-2xl">
                {shop.name}
                {shop.isVerified && (
                  <BadgeCheck
                    size={20}
                    className="ml-1.5 inline-block align-middle text-[#B88E4F]"
                    aria-label="Shop đã xác minh"
                  />
                )}
              </h1>
              <StoreActivityStatus storeId={shop.id} className="mt-1.5" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onFollow}
              disabled={savingFollow}
              aria-pressed={following}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#C59B58] bg-white px-2 py-2 text-xs font-semibold text-[#B88E4F] transition hover:bg-[#F3EFE6] disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm"
            >
              <Heart
                size={16}
                aria-hidden="true"
                className={following ? 'fill-[#C59B58]' : ''}
              />
              {savingFollow
                ? 'Đang lưu…'
                : following
                  ? 'Đang theo dõi'
                  : 'Theo dõi'}
            </button>
            <button
              type="button"
              onClick={onChat}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#C59B58] px-2 py-2 text-xs font-semibold text-[#231D15] transition hover:bg-[#B88E4F] sm:gap-2 sm:px-3 sm:text-sm"
            >
              <MessageSquare size={16} aria-hidden="true" />
              Chat ngay
            </button>
          </div>
        </div>
        <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6">
          <ShopFact icon={Package} label="Sản phẩm">
            {Number(shop.productCount).toLocaleString('vi-VN')}
          </ShopFact>
          <ShopFact icon={Users} label="Người theo dõi">
            {Number(shop.followerCount).toLocaleString('vi-VN')}
          </ShopFact>
          <ShopFact icon={Star} label="Đánh giá">
            {Number(shop.reviewCount) > 0 && shop.rating != null ? (
              <>
                <span className="text-[#B88E4F]">
                  {Number(shop.rating).toFixed(1)}/5
                </span>{' '}
                <span className="text-xs font-normal text-[#7D715E]">
                  ({Number(shop.reviewCount).toLocaleString('vi-VN')} đánh giá)
                </span>
              </>
            ) : (
              'Chưa có đánh giá'
            )}
          </ShopFact>
          <ShopFact icon={CalendarDays} label="Tham gia SCANMS">
            {joined && Number.isFinite(joined.getTime())
              ? joined.toLocaleDateString('vi-VN')
              : 'Chưa cập nhật'}
          </ShopFact>
          <ShopFact
            icon={MessageSquare}
            label="Tỷ lệ phản hồi chat"
            hint={responseHint}
          >
            {performance?.responseRate == null ? (
              'Chưa đủ dữ liệu'
            ) : (
              <>
                <span className="text-[#B88E4F]">
                  {performance.responseRate.toLocaleString('vi-VN')}%
                </span>
                <span className="block text-xs font-normal text-[#7D715E]">
                  Trong {performance.responseWindowHours} giờ ·{' '}
                  {performance.periodDays} ngày gần nhất
                </span>
              </>
            )}
          </ShopFact>
          <ShopFact
            icon={MessageSquare}
            label="Thời gian phản hồi"
            hint={responseHint}
          >
            {responseTime(performance?.averageResponseMinutes)}
          </ShopFact>
          <ShopFact
            icon={MapPin}
            label="Khu vực"
            hint={shop.location || undefined}
          >
            {shop.location || 'Chưa cập nhật'}
          </ShopFact>
          <ShopFact icon={Building2} label="Tên doanh nghiệp">
            {shop.companyName || 'Chưa cập nhật'}
          </ShopFact>
        </dl>
      </div>
      {shop.description && (
        <p className="mt-5 border-t border-[#EAE4D7] pt-4 text-sm leading-6 text-[#7D715E]">
          {shop.description}
        </p>
      )}
    </section>
  );
}

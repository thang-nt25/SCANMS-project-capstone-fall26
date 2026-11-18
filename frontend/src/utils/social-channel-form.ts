export const SOCIAL_CHANNEL_FIELDS: Record<string, { nameLabel: string; namePlaceholder: string; urlPlaceholder: string; audienceLabel: string; proofLabel: string; hosts: string[] }> = {
  TIKTOK: { nameLabel: 'Tên tài khoản TikTok', namePlaceholder: '@thaonhi.skincare', urlPlaceholder: 'https://www.tiktok.com/@thaonhi.skincare', audienceLabel: 'Số người theo dõi', proofLabel: 'Ảnh quản trị kênh TikTok', hosts: ['tiktok.com'] },
  YOUTUBE: { nameLabel: 'Tên kênh YouTube', namePlaceholder: '@thaonhivlog', urlPlaceholder: 'https://www.youtube.com/@thaonhivlog', audienceLabel: 'Số người đăng ký', proofLabel: 'Ảnh YouTube Studio', hosts: ['youtube.com'] },
  INSTAGRAM: { nameLabel: 'Tên tài khoản Instagram', namePlaceholder: '@thaonhi.skincare', urlPlaceholder: 'https://www.instagram.com/thaonhi.skincare', audienceLabel: 'Số người theo dõi', proofLabel: 'Ảnh quản trị Instagram', hosts: ['instagram.com'] },
  FACEBOOK: { nameLabel: 'Tên trang hoặc tài khoản Facebook', namePlaceholder: 'Thảo Nhi Skincare', urlPlaceholder: 'https://www.facebook.com/thaonhi.skincare', audienceLabel: 'Số người theo dõi', proofLabel: 'Ảnh quản trị Facebook', hosts: ['facebook.com'] },
  OTHER: { nameLabel: 'Tên kênh hoặc tài khoản', namePlaceholder: 'Nhập tên kênh của bạn', urlPlaceholder: 'https://example.com/kenh-cua-ban', audienceLabel: 'Số người theo dõi', proofLabel: 'Ảnh quản trị kênh', hosts: [] },
};

export function socialChannelFields(platform: string) {
  return SOCIAL_CHANNEL_FIELDS[platform] || SOCIAL_CHANNEL_FIELDS.OTHER;
}

export function socialChannelUrlError(platform: string, value: string): string | null {
  if (!value.trim()) return 'Vui lòng nhập đường dẫn kênh';
  let url: URL;
  try { url = new URL(value.trim()); } catch { return 'Nhập đường dẫn đầy đủ, bắt đầu bằng https://'; }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return 'Đường dẫn kênh phải dùng http:// hoặc https://';
  const { hosts } = socialChannelFields(platform);
  if (hosts.length && !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)))
    return `Đường dẫn phải thuộc ${hosts[0]}`;
  return null;
}

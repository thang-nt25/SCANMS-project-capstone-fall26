import type { LucideIcon } from 'lucide-react';
import {
  Activity, Banknote, Boxes, Building2, ChartNoAxesCombined,
  CircleUserRound, CreditCard, FileSearch, Gauge,
  Heart, HeartPulse, Images, Link2, LockKeyhole, MapPin, MessageCircle,
  NotebookTabs, PackageCheck, PackageSearch, ReceiptText, Settings2, Share2,
  ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, Star,
  Tags, Trophy, UserCog, Users, UsersRound, WalletCards,
} from 'lucide-react';

export type PlatformRole = 'kol' | 'shop' | 'manager' | 'admin' | 'customer';

export type PlatformScreen = {
  id: string;
  label: string;
  description: string;
  role: PlatformRole;
  icon: LucideIcon;
  metrics: Array<{ label: string; value: string; delta: string }>;
  columns: string[];
  rows: string[][];
  action: string;
};

const baseMetrics = (primary: string, value: string) => [
  { label: primary, value, delta: '+12,4% tháng này' },
  { label: 'Đang xử lý', value: '24', delta: '6 cần chú ý' },
  { label: 'Hoàn tất', value: '186', delta: '98,2% đúng hạn' },
];

const make = (
  role: PlatformRole,
  id: string,
  label: string,
  description: string,
  icon: LucideIcon,
  action = 'Tạo mới',
  primary = 'Tổng giá trị',
  value = '128,6 triệu',
): PlatformScreen => ({
  role, id, label, description, icon, action,
  metrics: baseMetrics(primary, value),
  columns: ['Mã tham chiếu', 'Đối tượng', 'Cập nhật', 'Trạng thái'],
  rows: [
    ['#SC-2409', 'Chiến dịch tháng 9', '10 phút trước', 'Đang hoạt động'],
    ['#SC-2388', 'Bộ sản phẩm chăm sóc da', 'Hôm qua', 'Chờ xử lý'],
    ['#SC-2314', 'Đối soát kỳ gần nhất', '05/09/2026', 'Hoàn tất'],
    ['#SC-2280', 'Yêu cầu cập nhật hồ sơ', '01/09/2026', 'Cần bổ sung'],
  ],
});

export const roleLabels: Record<PlatformRole, string> = {
  kol: 'Cộng tác viên', shop: 'Chủ cửa hàng', manager: 'Vận hành',
  admin: 'Quản trị sàn', customer: 'Khách mua',
};

export const platformScreens: PlatformScreen[] = [
  make('kol', 'kol-dashboard', 'Tổng quan KOL', 'Theo dõi hiệu suất, doanh số và việc cần làm hôm nay.', ChartNoAxesCombined, 'Xem báo cáo', 'Hoa hồng dự kiến', '18,4 triệu'),
  make('kol', 'links', 'Link và QR tiếp thị', 'Tạo, quản lý và đo lường link giới thiệu, QR và coupon.', Link2, 'Tạo link mới', 'Lượt nhấp', '48.216'),
  make('kol', 'channels', 'Kênh mạng xã hội', 'Kết nối và xác minh các kênh nội dung của bạn.', Share2, 'Kết nối kênh', 'Kênh đã xác minh', '4'),
  make('kol', 'media', 'Kho nội dung', 'Tìm ảnh, video và caption được Shop phê duyệt.', Images, 'Tải nội dung', 'Tài nguyên', '286'),
  make('kol', 'samples', 'Hàng mẫu dùng thử', 'Gửi yêu cầu và theo dõi hành trình hàng mẫu.', PackageSearch, 'Xin hàng mẫu', 'Yêu cầu đang mở', '8'),
  make('kol', 'leaderboard', 'Bảng vinh danh', 'So sánh thành tích và khám phá các Creator nổi bật.', Trophy, 'Xem thể lệ', 'Xếp hạng hiện tại', '#12'),
  make('kol', 'wallet', 'Ví và rút tiền', 'Theo dõi số dư, lịch sử và yêu cầu rút tiền.', WalletCards, 'Rút tiền', 'Số dư khả dụng', '24,8 triệu'),

  make('shop', 'shop-dashboard', 'Tổng quan Shop', 'Bức tranh doanh thu, CTV và vận hành cửa hàng.', Gauge, 'Xuất báo cáo', 'Doanh thu ghi nhận', '2,48 tỷ'),
  make('shop', 'catalog', 'Sản phẩm và hoa hồng', 'Quản lý danh mục, giá bán và tỷ lệ hoa hồng.', Boxes, 'Thêm sản phẩm', 'Sản phẩm đang bán', '248'),
  make('shop', 'shop-campaigns', 'Chiến dịch và hoa hồng', 'Thiết lập chiến dịch, mức thưởng và thời gian áp dụng.', Tags, 'Tạo chiến dịch', 'Ngân sách chiến dịch', '320 triệu'),
  make('shop', 'shop-collaborators', 'Đội ngũ CTV', 'Duyệt hồ sơ, phân nhóm và theo dõi hiệu suất cộng tác viên.', UsersRound, 'Mời CTV', 'CTV hoạt động', '1.248'),
  make('shop', 'orders', 'Đối soát đơn hàng', 'Kiểm tra attribution, trạng thái và chênh lệch đơn.', ReceiptText, 'Đối soát ngay', 'Đơn hợp lệ', '8.420'),
  make('shop', 'payouts', 'Duyệt chi trả', 'Rà soát và duyệt kỳ hoa hồng trước khi chuyển ví.', Banknote, 'Duyệt kỳ chi trả', 'Chờ duyệt', '184 triệu'),
  make('shop', 'shop-samples', 'Duyệt hàng mẫu', 'Xét duyệt yêu cầu dùng thử và cập nhật vận chuyển.', PackageCheck, 'Xử lý yêu cầu', 'Chờ duyệt', '38'),
  make('shop', 'shop-media', 'Kho tài nguyên Shop', 'Phân phối ảnh, video và hướng dẫn nội dung cho CTV.', Images, 'Đăng tài nguyên', 'Dung lượng đã dùng', '18,2 GB'),
  make('shop', 'shop-customer-requests', 'Yêu cầu khách mua', 'Tiếp nhận yêu cầu tư vấn và hỗ trợ trước bán.', MessageCircle, 'Trả lời yêu cầu', 'Tin chưa đọc', '16'),
  make('shop', 'fraud', 'AI Fraud Sentinel', 'Phát hiện click, đơn hàng và hành vi affiliate bất thường.', ShieldAlert, 'Chạy rà soát', 'Rủi ro cần xử lý', '7'),
  make('shop', 'shop-settings', 'Cài đặt Shop', 'Quản lý hồ sơ, thanh toán và chính sách vận hành.', Settings2, 'Lưu thay đổi', 'Mức hoàn thiện', '92%'),

  make('manager', 'manager-dashboard', 'Tổng quan vận hành', 'Giám sát cửa hàng, sự cố và SLA toàn sàn.', Activity, 'Mở trung tâm xử lý', 'Shop đang hoạt động', '2.814'),
  make('manager', 'manager-stores', 'Hồ sơ cửa hàng', 'Duyệt hồ sơ và theo dõi sức khỏe cửa hàng.', Building2, 'Duyệt Shop mới', 'Hồ sơ chờ duyệt', '42'),
  make('manager', 'manager-store-detail', 'Chi tiết Shop', 'Kiểm tra pháp lý, hoạt động và lịch sử xử lý.', FileSearch, 'Ghi nhận xử lý', 'Điểm sức khỏe', '86/100'),
  make('manager', 'manager-banks', 'Cổng và ngân hàng', 'Theo dõi kết nối thanh toán và trạng thái đối tác.', CreditCard, 'Thêm cấu hình', 'Tỷ lệ thành công', '99,82%'),
  make('manager', 'manager-fraud', 'Kiểm soát gian lận', 'Điều tra cảnh báo và khóa luồng thanh toán rủi ro.', ShieldAlert, 'Tạo hồ sơ điều tra', 'Cảnh báo mở', '19'),
  make('manager', 'manager-audit', 'Nhật ký vận hành', 'Tra cứu toàn bộ thao tác nhạy cảm của đội vận hành.', NotebookTabs, 'Xuất nhật ký', 'Sự kiện hôm nay', '12.480'),
  make('manager', 'manager-profile', 'Tài khoản vận hành', 'Quản lý hồ sơ, ca trực và bảo mật cá nhân.', CircleUserRound, 'Cập nhật hồ sơ', 'Ca trực hiện tại', '08:00–17:00'),

  make('admin', 'admin-dashboard', 'Tổng quan sàn', 'Theo dõi GMV, người dùng và chất lượng hệ thống.', Sparkles, 'Xem báo cáo điều hành', 'GMV tháng', '86,2 tỷ'),
  make('admin', 'admin-service-health', 'Sức khỏe hệ thống', 'Giám sát dịch vụ, hàng đợi và cảnh báo hạ tầng.', HeartPulse, 'Kiểm tra dịch vụ', 'Uptime 30 ngày', '99,98%'),
  make('admin', 'admin-internal', 'Tài khoản nội bộ', 'Cấp tài khoản và quản lý nhân sự vận hành.', UserCog, 'Tạo tài khoản', 'Tài khoản nội bộ', '86'),
  make('admin', 'admin-rbac', 'Ma trận phân quyền', 'Kiểm soát vai trò và quyền truy cập theo nguyên tắc tối thiểu.', ShieldCheck, 'Tạo vai trò', 'Vai trò hệ thống', '12'),
  make('admin', 'admin-users', 'Quản lý User và KOL', 'Tra cứu, xác minh và xử lý tài khoản người dùng.', Users, 'Duyệt KYC', 'Người dùng', '128.420'),
  make('admin', 'admin-audit', 'Nhật ký an ninh', 'Theo dõi đăng nhập và thay đổi quyền nhạy cảm.', LockKeyhole, 'Điều tra sự kiện', 'Sự kiện rủi ro', '11'),
  make('admin', 'admin-config', 'Cấu hình sàn', 'Thiết lập tham số, giới hạn và tích hợp toàn hệ thống.', SlidersHorizontal, 'Lưu cấu hình', 'Cấu hình đang chạy', '64'),

  make('customer', 'customer-profile', 'Tài khoản của tôi', 'Quản lý thông tin cá nhân và tùy chọn liên hệ.', CircleUserRound, 'Chỉnh sửa hồ sơ', 'Hạng thành viên', 'Gold'),
  make('customer', 'customer-orders', 'Đơn hàng của tôi', 'Theo dõi trạng thái, thanh toán và lịch sử mua hàng.', ReceiptText, 'Tiếp tục mua sắm', 'Đơn đang giao', '3'),
  make('customer', 'customer-order-detail', 'Chi tiết đơn hàng', 'Xem sản phẩm, thanh toán và hành trình vận chuyển.', FileSearch, 'Liên hệ hỗ trợ', 'Tổng đơn hàng', '1.248.000đ'),
  make('customer', 'customer-addresses', 'Sổ địa chỉ', 'Lưu và quản lý địa chỉ nhận hàng.', MapPin, 'Thêm địa chỉ', 'Địa chỉ đã lưu', '3'),
  make('customer', 'customer-wishlist', 'Sản phẩm đã lưu', 'Quay lại những sản phẩm bạn quan tâm.', Heart, 'Khám phá thêm', 'Sản phẩm đã lưu', '18'),
  make('customer', 'customer-reviews', 'Đánh giá của tôi', 'Quản lý nhận xét và sản phẩm đang chờ đánh giá.', Star, 'Viết đánh giá', 'Chờ đánh giá', '4'),
  make('customer', 'customer-support', 'Hỗ trợ đơn hàng', 'Trao đổi với Shop và trung tâm hỗ trợ.', MessageCircle, 'Tạo yêu cầu', 'Yêu cầu đang mở', '2'),
  make('customer', 'customer-security', 'Bảo mật tài khoản', 'Quản lý mật khẩu, thiết bị và xác thực hai lớp.', ShieldCheck, 'Bật xác thực 2 lớp', 'Thiết bị tin cậy', '2'),
];

export const roleDefaultScreen: Record<PlatformRole, string> = {
  kol: 'kol-dashboard', shop: 'shop-dashboard', manager: 'manager-dashboard',
  admin: 'admin-dashboard', customer: 'customer-profile',
};

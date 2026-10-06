import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Store,
  Link as LinkIcon,
  Building,
  UserCheck,
  Send,
  ArrowRight,
  Plus,
  Trash2,
  ExternalLink,
  Star,
  Tag,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  kycService,
  type UpgradeStatusResponse,
  type ApplyKolData,
  type ApplyShopData,
  type SocialChannelFormItem,
} from '../../services/kyc.service';
import { authService } from '../../services/auth.service';
import { toast } from '../../utils/toast';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ImageUploadDropzone } from '../../components/ui/ImageUploadDropzone';
import { BankSelectTrigger } from '../../components/bank/BankSelectTrigger';

const SPECIALTY_OPTIONS = [
  'Thời trang & May mặc',
  'Mỹ phẩm & Chăm sóc da',
  'Đồ công nghệ & Điện tử',
  'Nhà cửa & Đời sống',
  'Mẹ & Bé',
  'Ẩm thực & Đồ uống',
  'Sức khỏe & Thể thao',
];

const CONTENT_STYLE_OPTIONS = [
  'Review chuyên sâu & Test thực tế',
  'Unboxing & Hướng dẫn sử dụng',
  'Biến hình & Kịch bản ngắn',
  'Chuyên gia Livestream chốt đơn',
  'Bác sĩ / Chuyên gia kiểm chứng',
  'Vlog phong cách sống thường ngày',
];

export const PartnerUpgradeTab: React.FC = () => {
  const navigate = useNavigate();
  const [activePartnerType, setActivePartnerType] = useState<'kol' | 'shop'>('kol');
  const [statusData, setStatusData] = useState<UpgradeStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Multi-platform Channels State
  const [channels, setChannels] = useState<SocialChannelFormItem[]>([
    {
      platform: 'TIKTOK',
      channelName: '',
      channelUrl: '',
      followerCount: '' as any,
      channelProofUrl: '',
      isPrimary: true,
    },
  ]);

  // Structured Niche & Style Tags State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Thời trang & May mặc',
    'Mỹ phẩm & Chăm sóc da',
  ]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([
    'Review chuyên sâu & Test thực tế',
  ]);

  // KOL Personal & Banking Form State
  const [kolForm, setKolForm] = useState<ApplyKolData>({
    idCardNumber: '',
    taxCode: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    bio: '',
    frontCardUrl: '',
    backCardUrl: '',
  });

  // Shop Form State
  const [shopForm, setShopForm] = useState<ApplyShopData>({
    shopName: '',
    description: '',
    warehouseAddress: '',
    businessType: '' as any,
    taxCode: '',
    businessLicenseUrl: '',
    brandAuthorizationUrl: '',
    contactPhone: '',
    contactEmail: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    idCardNumber: '',
    frontCardUrl: '',
    backCardUrl: '',
  });

  const addChannel = () => {
    if (channels.length >= 6) {
      toast.warning('Tối đa 6 kênh mạng xã hội');
      return;
    }
    setChannels((prev) => [
      ...prev,
      {
        platform: 'YOUTUBE',
        channelName: '',
        channelUrl: '',
        followerCount: '' as any,
        channelProofUrl: '',
        isPrimary: false,
      },
    ]);
  };

  const removeChannel = (index: number) => {
    if (channels.length <= 1) {
      toast.warning('Phải có ít nhất một kênh mạng xã hội');
      return;
    }
    const wasPrimary = channels[index].isPrimary;
    const next = channels.filter((_, i) => i !== index);
    if (wasPrimary && next.length > 0) {
      next[0].isPrimary = true;
    }
    setChannels(next);
  };

  const updateChannel = (index: number, patch: Partial<SocialChannelFormItem>) => {
    setChannels((prev) =>
      prev.map((ch, i) => (i === index ? { ...ch, ...patch } : ch))
    );
  };

  const setPrimaryChannel = (index: number) => {
    setChannels((prev) =>
      prev.map((ch, i) => ({ ...ch, isPrimary: i === index }))
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await kycService.getMyUpgradeStatus();
      setStatusData(data);

      if (data.kolApplication) {
        const proof = (data.kolApplication.socialLinksJson as any) || {};
        if (data.kolApplication.channels && data.kolApplication.channels.length > 0) {
          setChannels(
            data.kolApplication.channels.map((ch: any) => ({
              platform: ch.platformName || ch.platform || 'TIKTOK',
              channelName: ch.channelName || '',
              channelUrl: ch.channelUrl || '',
              followerCount: ch.followerCount || 0,
              channelProofUrl:
                proof.channels?.find((p: any) => (p.platform === (ch.platformName || ch.platform)))
                  ?.channelProofUrl || proof.channelProofUrl || '',
              isPrimary: Boolean(ch.isPrimary),
            }))
          );
        } else if (proof.channels && proof.channels.length > 0) {
          setChannels(proof.channels);
        } else if (proof.platform) {
          setChannels([
            {
              platform: proof.platform,
              channelName: proof.channelName || '',
              channelUrl: proof.channelUrl || '',
              followerCount: proof.followerCount || 0,
              channelProofUrl: proof.channelProofUrl || '',
              isPrimary: true,
            },
          ]);
        }
        if (Array.isArray(proof.specialtyCategories) && proof.specialtyCategories.length > 0) {
          setSelectedCategories(proof.specialtyCategories);
        }
        if (Array.isArray(proof.contentStyles) && proof.contentStyles.length > 0) {
          setSelectedStyles(proof.contentStyles);
        }
      }

      if (data.shopApplication) {
        const documents = data.shopApplication.onboardingData || ({} as Partial<ApplyShopData>);
        setShopForm({
          shopName: data.shopApplication.name,
          description: data.shopApplication.description || documents.description || '',
          warehouseAddress: data.shopApplication.warehouseAddress || '',
          businessType: documents.businessType || 'ENTERPRISE',
          taxCode: documents.taxCode || '',
          businessLicenseUrl: documents.businessLicenseUrl || '',
          brandAuthorizationUrl: documents.brandAuthorizationUrl || '',
          contactPhone: documents.contactPhone || '',
          contactEmail: documents.contactEmail || '',
          bankName: documents.bankName || '',
          bankAccountNumber: documents.bankAccountNumber || '',
          bankAccountName: documents.bankAccountName || '',
          idCardNumber: documents.idCardNumber || '',
          frontCardUrl: documents.frontCardUrl || '',
          backCardUrl: documents.backCardUrl || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load upgrade status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleKolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (channels.length === 0) {
      toast.error('Vui lòng thêm ít nhất một kênh mạng xã hội');
      return;
    }
    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      if (!ch.platform) {
        toast.error(`Vui lòng chọn nền tảng cho kênh số ${i + 1}`);
        return;
      }
      if (!ch.channelUrl.trim()) {
        toast.error(`Vui lòng nhập đường link cho kênh số ${i + 1}`);
        return;
      }
      if (!ch.followerCount || Number(ch.followerCount) <= 0) {
        toast.error(`Vui lòng nhập số follower hợp lệ cho kênh số ${i + 1}`);
        return;
      }
    }
    if (!kolForm.idCardNumber?.trim() || kolForm.idCardNumber.length < 9) {
      toast.error('Vui lòng nhập số CCCD/CMND hợp lệ (9 - 12 số)');
      return;
    }
    if (!kolForm.bankName?.trim()) {
      toast.error('Vui lòng chọn ngân hàng thụ hưởng nhận hoa hồng');
      return;
    }
    if (!kolForm.bankAccountNumber?.trim() || !kolForm.bankAccountName?.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng');
      return;
    }

    setSubmitting(true);
    try {
      const primaryCh = channels.find((c) => c.isPrimary) || channels[0];
      const payload: ApplyKolData = {
        ...kolForm,
        platform: primaryCh.platform,
        channelName: primaryCh.channelName || '',
        channelUrl: primaryCh.channelUrl,
        followerCount: Number(primaryCh.followerCount) || 0,
        channelProofUrl: primaryCh.channelProofUrl || '',
        channels: channels.map((c) => ({
          ...c,
          followerCount: Number(c.followerCount) || 0,
        })),
        specialtyCategories: selectedCategories,
        contentStyles: selectedStyles,
      };

      await kycService.applyKolUpgrade(payload);
      toast.success('Gửi hồ sơ đăng ký KOL thành công! Ban Quản Trị SCANMS sẽ xét duyệt trong 24h.');
      loadStatus();
      authService.getMe();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể gửi hồ sơ, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopForm.businessType) {
      toast.error('Vui lòng chọn hình thức kinh doanh');
      return;
    }
    if (!shopForm.shopName.trim()) {
      toast.error('Vui lòng nhập tên gian hàng');
      return;
    }
    if (!shopForm.warehouseAddress.trim()) {
      toast.error('Địa chỉ kho xuất hàng là bắt buộc theo quy định sàn');
      return;
    }
    if (!shopForm.taxCode.trim()) {
      toast.error('Vui lòng nhập mã số thuế');
      return;
    }
    if (!shopForm.contactPhone.trim()) {
      toast.error('Vui lòng nhập hotline liên hệ');
      return;
    }
    if (!shopForm.contactEmail.trim()) {
      toast.error('Vui lòng nhập email đối soát');
      return;
    }
    if (!shopForm.idCardNumber?.trim() || !/^\d{9,12}$/.test(shopForm.idCardNumber)) {
      toast.error('Vui lòng nhập số CCCD người đại diện hợp lệ (9 - 12 số)');
      return;
    }
    if (!shopForm.frontCardUrl || !shopForm.backCardUrl) {
      toast.error('Vui lòng tải lên ảnh CCCD mặt trước và mặt sau');
      return;
    }
    if (!shopForm.businessLicenseUrl) {
      toast.error('Vui lòng tải lên giấy phép đăng ký kinh doanh');
      return;
    }
    if (!shopForm.bankName?.trim()) {
      toast.error('Vui lòng chọn ngân hàng nhận doanh thu');
      return;
    }
    if (!shopForm.bankAccountNumber?.trim() || !shopForm.bankAccountName?.trim()) {
      toast.error('Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản nhận doanh thu');
      return;
    }

    setSubmitting(true);
    try {
      await kycService.applyShopUpgrade(shopForm);
      toast.success('Gửi hồ sơ mở Gian Hàng thành công! Ban Quản Trị SCANMS sẽ thẩm định.');
      loadStatus();
      authService.getMe();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể gửi hồ sơ gian hàng, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  // Nạp dữ liệu mẫu thử nghiệm đa kênh chuẩn
  const fillSampleKolData = () => {
    setChannels([
      {
        platform: 'TIKTOK',
        channelName: 'Thành Thắng Lifestyle & Reviews',
        channelUrl: 'https://tiktok.com/@thang.review',
        followerCount: 52000,
        channelProofUrl:
          'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=80',
        isPrimary: true,
      },
      {
        platform: 'YOUTUBE',
        channelName: 'Thắng Tech & Lifestyle Studio',
        channelUrl: 'https://youtube.com/@thanglifestyle',
        followerCount: 18500,
        channelProofUrl:
          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
        isPrimary: false,
      },
      {
        platform: 'FACEBOOK',
        channelName: 'Nguyễn Thành Thắng Official Creator',
        channelUrl: 'https://facebook.com/thangcreator.scanms',
        followerCount: 12000,
        channelProofUrl:
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
        isPrimary: false,
      },
    ]);
    setSelectedCategories([
      'Thời trang & May mặc',
      'Mỹ phẩm & Chăm sóc da',
      'Đồ công nghệ & Điện tử',
    ]);
    setSelectedStyles([
      'Review chuyên sâu & Test thực tế',
      'Unboxing & Hướng dẫn sử dụng',
    ]);
    setKolForm({
      idCardNumber: '001201009876',
      taxCode: '8099887766',
      bankName: 'Techcombank',
      bankAccountNumber: '19034567890012',
      bankAccountName: 'NGUYEN THANH THANG',
      bio: 'Nhà sáng tạo nội dung chuyên nghiệp mảng mỹ phẩm hữu cơ, thời trang nam và lifestyle cao cấp.',
      frontCardUrl:
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
      backCardUrl:
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    });
    toast.info('Đã nạp thông tin mẫu KOL chuẩn đa kênh để kiểm thử');
  };

  const fillSampleShopData = () => {
    setShopForm({
      shopName: 'Sora Skin Beauty Flagship',
      description: 'Thương hiệu mỹ phẩm dưỡng da chiết xuất thiên nhiên đạt chuẩn cGMP và ISO 22716.',
      warehouseAddress:
        'Tổng kho A2, Đường số 3, KCN Tân Bình, Phường Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh',
      businessType: 'ENTERPRISE',
      taxCode: '0316789012',
      businessLicenseUrl:
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
      brandAuthorizationUrl:
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
      contactPhone: '0909123456',
      contactEmail: 'partner@soraskin.vn',
      bankName: 'Vietcombank',
      bankAccountNumber: '0071001234567',
      bankAccountName: 'CONG TY TNHH SORA SKIN',
      idCardNumber: '001201012345',
      frontCardUrl:
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
      backCardUrl:
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    });
    toast.info('Đã nạp thông tin mẫu Gian Hàng chuẩn để kiểm thử');
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#EAE4D7] rounded-3xl p-10 text-center flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#C59B58] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-bold text-[#7D715E]">Đang kiểm tra trạng thái hồ sơ đối tác...</span>
      </div>
    );
  }

  const kolApp = statusData?.kolApplication;
  const shopApp = statusData?.shopApplication;
  const shopStatus = shopApp?.onboardingStatus || (shopApp?.isVerified ? 'VERIFIED' : shopApp ? 'PENDING_APPROVAL' : null);
  const canSubmitShopApplication = !shopStatus || ['DRAFT', 'NEEDS_INFO', 'REJECTED'].includes(shopStatus);

  return (
    <div className="flex flex-col gap-3 text-left">
      {/* BỘ CHỌN LOẠI ĐỐI TÁC: KOL TIẾP THỊ HOẶC MỞ GIAN HÀNG */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* KOL Status & Selection Card */}
        <div
          onClick={() => setActivePartnerType('kol')}
          className={`rounded-xl p-3 sm:p-3.5 transition-all duration-200 cursor-pointer ${
            activePartnerType === 'kol'
              ? 'bg-white border-2 border-[#C59B58] shadow-xs'
              : 'bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58]/60 hover:bg-white shadow-2xs hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#B88E4F]" />
              <strong className="text-xs font-black text-[#1A1612] uppercase tracking-wide">Đối tác KOL</strong>
            </div>
            {kolApp ? (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  kolApp.status === 'VERIFIED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : kolApp.status === 'REJECTED'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {kolApp.status === 'VERIFIED'
                  ? '✓ Đã duyệt'
                  : kolApp.status === 'REJECTED'
                  ? '✕ Từ chối'
                  : '⏳ Chờ duyệt (24h)'}
              </span>
            ) : (
              <span className="text-[10px] text-[#7D715E] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#EAE4D7]">
                Chưa đăng ký
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#7D715E] mb-2 leading-relaxed">
            {kolApp?.status === 'VERIFIED'
              ? 'Tài khoản KOL đã kích hoạt. Bạn có thể tạo link affiliate và nhận hoa hồng.'
              : kolApp?.status === 'UNVERIFIED'
              ? 'Hồ sơ đang được xem xét (kết quả trong 24h làm việc).'
              : kolApp?.status === 'REJECTED'
              ? 'Hồ sơ chưa đạt yêu cầu. Vui lòng cập nhật lại thông tin.'
              : 'Tiếp thị liên kết & nhận hoa hồng giới thiệu sản phẩm.'}
          </p>
          {kolApp?.status === 'VERIFIED' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                authService.switchWorkspace('kol', navigate);
              }}
              className="w-full py-1.5 px-3 bg-[#EBD08C] hover:bg-[#DEC07A] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.99]"
            >
              <span>Vào Bảng Điều Khiển KOL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePartnerType('kol');
              }}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] ${
                activePartnerType === 'kol'
                  ? 'bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-[#1A1612] font-black shadow-xs'
                  : 'bg-white text-[#1A1612] border border-[#EAE4D7] hover:border-[#C59B58]/60 hover:bg-[#FAF8F5]'
              }`}
            >
              <span>{kolApp ? 'Xem hồ sơ KOL' : 'Đăng ký KOL'}</span>
            </button>
          )}
        </div>

        {/* Shop Status & Selection Card */}
        <div
          onClick={() => setActivePartnerType('shop')}
          className={`rounded-xl p-3 sm:p-3.5 transition-all duration-200 cursor-pointer ${
            activePartnerType === 'shop'
              ? 'bg-white border-2 border-[#C59B58] shadow-xs'
              : 'bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58]/60 hover:bg-white shadow-2xs hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#B88E4F]" />
              <strong className="text-xs font-black text-[#1A1612] uppercase tracking-wide">Gian Hàng (Shop)</strong>
            </div>
            {shopApp ? (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  shopStatus === 'VERIFIED'
                    ? 'bg-[#FBF5EB] text-[#8F682E] border-[#EEDFC6]'
                    : shopStatus === 'REJECTED'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : shopStatus === 'NEEDS_INFO'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-[#F3EFE6] text-[#7D715E] border-[#EAE4D7]'
                }`}
              >
                {shopStatus === 'VERIFIED'
                  ? 'Đã duyệt'
                  : shopStatus === 'NEEDS_INFO'
                  ? 'Cần bổ sung'
                  : shopStatus === 'REJECTED'
                  ? 'Từ chối'
                  : shopStatus === 'DRAFT'
                  ? 'Bản nháp'
                  : 'Chờ duyệt'}
              </span>
            ) : (
              <span className="text-[10px] text-[#7D715E] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#EAE4D7]">
                Chưa đăng ký
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#7D715E] mb-2 leading-relaxed">
            {shopStatus === 'VERIFIED'
              ? `Gian hàng "${shopApp?.name || 'của bạn'}" đã kích hoạt. Sẵn sàng bán hàng.`
              : shopStatus === 'NEEDS_INFO'
              ? 'Cần bổ sung giấy tờ theo phản hồi của Ban Quản Trị.'
              : shopStatus === 'REJECTED'
              ? 'Hồ sơ chưa đạt yêu cầu. Bạn có thể chỉnh sửa và gửi lại.'
              : shopStatus === 'DRAFT'
              ? 'Bản nháp hồ sơ chưa hoàn tất.'
              : shopApp
              ? `Đã gửi hồ sơ gian hàng "${shopApp.name}". Đang chờ duyệt.`
              : 'Đăng ký bán hàng và kết nối mạng lưới KOL quảng bá.'}
          </p>
          {shopStatus === 'VERIFIED' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                authService.switchWorkspace('shop', navigate);
              }}
              className="w-full py-1.5 px-3 bg-[#EBD08C] hover:bg-[#DEC07A] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.99]"
            >
              <span>Vào Cổng Gian Hàng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePartnerType('shop');
              }}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] ${
                activePartnerType === 'shop'
                  ? 'bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-[#1A1612] font-black shadow-xs'
                  : 'bg-white text-[#1A1612] border border-[#EAE4D7] hover:border-[#C59B58]/60 hover:bg-[#FAF8F5]'
              }`}
            >
              <span>{shopStatus === 'DRAFT' ? 'Hoàn thiện hồ sơ Shop' : shopApp ? 'Xem hồ sơ Shop' : 'Mở Gian Hàng'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: FORM NÂNG CẤP LÊN KOL */}
      {activePartnerType === 'kol' && (
        <form onSubmit={handleKolSubmit} className="bg-white border border-[#EAE4D7] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B88E4F]" />
              <h3 className="text-xs sm:text-sm font-black text-[#1A1612]">
                Thông tin đăng ký KOL
              </h3>
            </div>
            <button
              type="button"
              onClick={fillSampleKolData}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FBF5EB] border border-[#EAE4D7] hover:border-[#C59B58] text-[11px] font-bold text-[#B88E4F] transition cursor-pointer shadow-2xs shrink-0"
            >
              ⚡ Nạp demo
            </button>
          </div>

          {/* 1. CHỨNG MINH KÊNH MẠNG XÃ HỘI (ĐA KÊNH + NÚT THÊM KÊNH) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#B88E4F] uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                1. Kênh truyền thông &amp; Bằng chứng sở hữu ({channels.length}/6)
              </h4>
              <button
                type="button"
                onClick={addChannel}
                disabled={channels.length >= 6}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EAE4D7] hover:border-[#C59B58] text-[11px] font-bold text-[#1A1612] transition cursor-pointer shadow-2xs disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>Thêm kênh khác</span>
              </button>
            </div>

            <div className="space-y-3">
              {channels.map((ch, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    ch.isPrimary
                      ? 'bg-white border-[#C59B58] shadow-xs'
                      : 'bg-[#FAF8F5] border-[#EAE4D7]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#EAE4D7]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1A1612]">
                        Kênh #{idx + 1}:
                      </span>
                      {ch.isPrimary ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBF5EB] text-[#B88E4F] text-[10px] font-black border border-[#EEDFC6]">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Kênh truyền thông chính
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPrimaryChannel(idx)}
                          className="text-[10px] text-[#7D715E] hover:text-[#B88E4F] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Star className="w-2.5 h-2.5" />
                          <span>Đặt làm kênh chính</span>
                        </button>
                      )}
                    </div>

                    {channels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChannel(idx)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                        title="Xóa kênh này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#1A1612] block mb-1">
                        Nền tảng *
                      </label>
                      <CustomSelect
                        value={ch.platform}
                        onChange={(val) => updateChannel(idx, { platform: val as any })}
                        options={[
                          { value: 'TIKTOK', label: '🎵 TikTok Video / Live' },
                          { value: 'YOUTUBE', label: '▶️ YouTube Channel' },
                          { value: 'FACEBOOK', label: '📘 Facebook Fanpage / Profile' },
                          { value: 'INSTAGRAM', label: '📷 Instagram Creator' },
                          { value: 'SHOPEE_VIDEO', label: '🛒 Shopee Video' },
                          { value: 'LEMON8', label: '🍋 Lemon8' },
                          { value: 'OTHER', label: '🌐 Nền tảng khác' },
                        ]}
                        placeholder="-- Chọn nền tảng --"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#1A1612] block mb-1">
                        Tên kênh hiển thị *
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Thành Thắng Review"
                        value={ch.channelName}
                        onChange={(e) => updateChannel(idx, { channelName: e.target.value })}
                        required
                        className="w-full h-10 bg-white border border-[#EAE4D7] rounded-xl px-3 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] transition"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#1A1612] block mb-1">
                        Lượng Follower (Người theo dõi) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="VD: 50000"
                        value={ch.followerCount || ''}
                        onChange={(e) =>
                          updateChannel(idx, {
                            followerCount: e.target.value === '' ? ('' as any) : Number(e.target.value),
                          })
                        }
                        required
                        className="w-full h-10 bg-white border border-[#EAE4D7] rounded-xl px-3 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] transition"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-[#1A1612]">
                        Đường dẫn kênh (URL Profile / Kênh) *
                      </label>
                      {ch.channelUrl?.startsWith('http') && (
                        <a
                          href={ch.channelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-[#B88E4F] hover:underline font-bold"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>Kiểm tra liên kết</span>
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="https://tiktok.com/@your_channel hoặc https://youtube.com/@channel"
                      value={ch.channelUrl}
                      onChange={(e) => updateChannel(idx, { channelUrl: e.target.value })}
                      required
                      className="w-full h-10 bg-white border border-[#EAE4D7] rounded-xl px-3 text-xs text-[#1A1612] font-mono outline-none focus:border-[#C59B58] transition"
                    />
                  </div>

                  <div className="mt-3">
                    <ImageUploadDropzone
                      label={`Ảnh chụp màn hình trang quản trị Studio của kênh #${idx + 1}`}
                      helperText="Ảnh chụp trang quản trị (TikTok Studio / YouTube Studio / Meta Suite) chứng minh bạn là chủ sở hữu kênh."
                      value={ch.channelProofUrl || ''}
                      onChange={(url) => updateChannel(idx, { channelProofUrl: url })}
                      iconType="camera"
                      folder="scanms/kyc/proofs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. ĐỊNH HƯỚNG PHONG CÁCH & NGÀNH HÀNG THẾ MẠNH (STRUCTURED TAGS) */}
          <div className="space-y-3.5 pt-4 border-t border-[#EAE4D7]">
            <h4 className="text-xs font-black text-[#B88E4F] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              2. Định hướng phong cách &amp; Ngành hàng thế mạnh
            </h4>

            <div>
              <label className="text-[11px] font-bold text-[#1A1612] block mb-1.5">
                Ngành hàng thế mạnh (Chọn một hoặc nhiều danh mục phù hợp nhất) *
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SPECIALTY_OPTIONS.map((cat) => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? 'bg-[#C59B58] text-[#1A1612] border border-[#B88E4F] shadow-2xs'
                          : 'bg-[#FAF8F5] text-[#7D715E] border border-[#EAE4D7] hover:border-[#C59B58] hover:bg-white'
                      }`}
                    >
                      {active && <CheckCircle2 className="w-3 h-3 text-[#1A1612]" />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#1A1612] block mb-1.5">
                Phong cách sáng tạo nội dung *
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CONTENT_STYLE_OPTIONS.map((style) => {
                  const active = selectedStyles.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => toggleStyle(style)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? 'bg-[#C59B58] text-[#1A1612] border border-[#B88E4F] shadow-2xs'
                          : 'bg-[#FAF8F5] text-[#7D715E] border border-[#EAE4D7] hover:border-[#C59B58] hover:bg-white'
                      }`}
                    >
                      {active && <CheckCircle2 className="w-3 h-3 text-[#1A1612]" />}
                      <span>{style}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#1A1612] block mb-1">
                Tiểu sử &amp; Thông điệp gửi tới các Chủ Shop (Tùy chọn)
              </label>
              <textarea
                rows={2}
                placeholder="VD: Chuyên gia review mỹ phẩm thuần chay, phong cách trẻ trung, tệp người xem 18-30 tuổi..."
                value={kolForm.bio}
                onChange={(e) => setKolForm({ ...kolForm, bio: e.target.value })}
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl p-3 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] transition"
              />
            </div>
          </div>

          {/* 3. ĐỊNH DANH CCCD & THUẾ TNCN */}
          <div className="space-y-3.5 pt-4 border-t border-[#EAE4D7]">
            <h4 className="text-xs font-black text-[#B88E4F] uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              3. Định danh cá nhân &amp; Kê khai thuế TNCN
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] font-bold text-[#1A1612] block mb-1">
                  Số CCCD / CMND (9 - 12 số) *
                </label>
                <input
                  type="text"
                  placeholder="VD: 001201012345"
                  value={kolForm.idCardNumber}
                  onChange={(e) => setKolForm({ ...kolForm, idCardNumber: e.target.value })}
                  required
                  className="w-full h-10 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 text-xs text-[#1A1612] font-mono outline-none focus:border-[#C59B58] transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#1A1612] block mb-1">
                  Mã số thuế cá nhân (MST)
                </label>
                <input
                  type="text"
                  placeholder="VD: 8012345678 (Tùy chọn)"
                  value={kolForm.taxCode}
                  onChange={(e) => setKolForm({ ...kolForm, taxCode: e.target.value })}
                  className="w-full h-10 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 text-xs text-[#1A1612] font-mono outline-none focus:border-[#C59B58] transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <ImageUploadDropzone
                label="Ảnh mặt trước CCCD"
                helperText="Chụp rõ nét, đủ 4 góc, tối đa 5MB"
                value={kolForm.frontCardUrl}
                onChange={(url) => setKolForm({ ...kolForm, frontCardUrl: url })}
                iconType="idcard"
                folder="scanms/kyc/idcards"
              />
              <ImageUploadDropzone
                label="Ảnh mặt sau CCCD"
                helperText="Chụp rõ nét mã QR và nơi cấp"
                value={kolForm.backCardUrl}
                onChange={(url) => setKolForm({ ...kolForm, backCardUrl: url })}
                iconType="idcard"
                folder="scanms/kyc/idcards"
              />
            </div>
          </div>

          {/* 4. TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG */}
          <div className="space-y-3.5 pt-4 border-t border-[#EAE4D7]">
            <h4 className="text-xs font-black text-[#B88E4F] uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              4. Tài khoản ngân hàng nhận hoa hồng đối soát
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                  Tên ngân hàng *
                </label>
                <BankSelectTrigger
                  value={kolForm.bankName}
                  onChange={(val) => setKolForm({ ...kolForm, bankName: val })}
                  placeholder="-- Chọn ngân hàng thụ hưởng --"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                  Số tài khoản ngân hàng *
                </label>
                <input
                  type="text"
                  placeholder="VD: 0123456789"
                  value={kolForm.bankAccountNumber}
                  onChange={(e) => setKolForm({ ...kolForm, bankAccountNumber: e.target.value })}
                  required
                  className="w-full h-11 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 text-xs text-[#1A1612] font-mono outline-none focus:border-[#C59B58] focus:bg-white focus:ring-1 focus:ring-[#C59B58]/20 transition shadow-2xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                  Tên chủ tài khoản (In hoa) *
                </label>
                <input
                  type="text"
                  placeholder="VD: NGUYEN VAN A"
                  value={kolForm.bankAccountName}
                  onChange={(e) => setKolForm({ ...kolForm, bankAccountName: e.target.value.toUpperCase() })}
                  required
                  className="w-full h-11 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 text-xs text-[#1A1612] font-mono font-bold outline-none focus:border-[#C59B58] focus:bg-white focus:ring-1 focus:ring-[#C59B58]/20 transition shadow-2xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-[#C59B58] to-[#B88E4F] hover:from-[#B88E4F] hover:to-[#A77D3E] text-[#1A1612] font-black text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Đang gửi...' : 'Gửi đăng ký KOL'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: FORM MỞ GIAN HÀNG (SHOP MANAGER) */}
      {activePartnerType === 'shop' && (
        canSubmitShopApplication ? (
        <form onSubmit={handleShopSubmit} className="bg-white border border-[#EAE4D7] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          {(shopStatus === 'NEEDS_INFO' || shopStatus === 'REJECTED') && shopApp?.onboardingReviewNote && (
            <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#7D715E]">
              <strong className="mb-1 block text-[#8F682E]">
                {shopStatus === 'NEEDS_INFO' ? 'Ban Quản Trị yêu cầu bạn bổ sung:' : 'Lý do hồ sơ bị từ chối:'}
              </strong>
              {shopApp.onboardingReviewNote}
            </div>
          )}
          <div className="bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#B88E4F]" />
              <h3 className="text-xs sm:text-sm font-black text-[#1A1612]">
                Thông tin mở Gian Hàng
              </h3>
            </div>
            <button
              type="button"
              onClick={fillSampleShopData}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FBF5EB] border border-[#EAE4D7] hover:border-[#C59B58] text-[11px] font-bold text-[#B88E4F] transition cursor-pointer shadow-2xs shrink-0"
            >
              ⚡ Nạp demo
            </button>
          </div>

          {/* THÔNG TIN DOANH NGHIỆP / GIAN HÀNG */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#B88E4F] uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" />
              1. Thông tin gian hàng &amp; Chủ thể kinh doanh
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Tên Gian Hàng / Thương hiệu *</label>
                <input
                  type="text"
                  placeholder="VD: Sora Skin Beauty Official"
                  value={shopForm.shopName}
                  onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] font-bold outline-none focus:border-[#C59B58] transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Hình thức kinh doanh *</label>
                <CustomSelect
                  value={shopForm.businessType}
                  onChange={(val) => setShopForm({ ...shopForm, businessType: val as any })}
                  options={[
                    { value: 'ENTERPRISE', label: 'Doanh nghiệp / Công ty' },
                    { value: 'HOUSEHOLD', label: 'Hộ kinh doanh cá thể' },
                    { value: 'INDIVIDUAL', label: 'Cá nhân kinh doanh' },
                  ]}
                  placeholder="-- Chọn hình thức --"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                Địa chỉ Kho xuất hàng thực tế (Bắt buộc theo Nghị định 85/2021/NĐ-CP) *
              </label>
              <input
                type="text"
                placeholder="Số nhà, Tên đường, Cụm kho, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..."
                value={shopForm.warehouseAddress}
                onChange={(e) => setShopForm({ ...shopForm, warehouseAddress: e.target.value })}
                required
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] transition"
              />
              <p className="text-[10.5px] text-[#7D715E] mt-1">
                Địa chỉ kho để đối soát với các đơn vị vận chuyển (GHTK, GHN, Viettel Post) và khai báo cơ quan thuế.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Mã số thuế Doanh nghiệp / HKD *</label>
                <input
                  type="text"
                  placeholder="VD: 0315891234"
                  value={shopForm.taxCode}
                  onChange={(e) => setShopForm({ ...shopForm, taxCode: e.target.value })}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] font-mono outline-none focus:border-[#C59B58] transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Số hotline CSKH / Tiếp nhận đơn *</label>
                <input
                  type="tel"
                  placeholder="VD: 0988776655"
                  value={shopForm.contactPhone}
                  onChange={(e) => setShopForm({ ...shopForm, contactPhone: e.target.value })}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] font-mono outline-none focus:border-[#C59B58] transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Email đối soát thanh toán *</label>
                <input
                  type="email"
                  placeholder="VD: accounting@soraskin.vn"
                  value={shopForm.contactEmail}
                  onChange={(e) => setShopForm({ ...shopForm, contactEmail: e.target.value })}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] transition"
                />
              </div>
            </div>
          </div>

          {/* CHỨNG TỪ PHÁP LÝ NGUỒN HÀNG & ĐỊNH DANH */}
          <div className="space-y-4 pt-4 border-t border-[#EAE4D7]">
            <h4 className="text-xs font-black text-[#B88E4F] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              2. Chứng từ pháp lý &amp; Định danh chủ thể kinh doanh
            </h4>

            <div>
              <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                Số CCCD người đại diện (9 - 12 số) *
              </label>
              <input
                type="text"
                placeholder="VD: 001201012345"
                maxLength={12}
                value={shopForm.idCardNumber || ''}
                onChange={(e) => setShopForm({ ...shopForm, idCardNumber: e.target.value.replace(/\D/g, '') })}
                required
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] font-mono outline-none focus:border-[#C59B58] transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadDropzone
                label="Ảnh CCCD người đại diện — mặt trước *"
                helperText="Ảnh rõ nét, đủ bốn góc, tối đa 5MB"
                value={shopForm.frontCardUrl || ''}
                onChange={(url) => setShopForm({ ...shopForm, frontCardUrl: url })}
                iconType="idcard"
                folder="scanms/kyc/shop_idcards"
                required
              />
              <ImageUploadDropzone
                label="Ảnh CCCD người đại diện — mặt sau *"
                helperText="Ảnh rõ nét, đủ bốn góc, tối đa 5MB"
                value={shopForm.backCardUrl || ''}
                onChange={(url) => setShopForm({ ...shopForm, backCardUrl: url })}
                iconType="idcard"
                folder="scanms/kyc/shop_idcards"
                required
              />
              <ImageUploadDropzone
                label="Giấy phép đăng ký kinh doanh *"
                helperText="Ảnh chụp hoặc bản scan rõ nét"
                value={shopForm.businessLicenseUrl || ''}
                onChange={(url) => setShopForm({ ...shopForm, businessLicenseUrl: url })}
                iconType="file"
                folder="scanms/kyc/licenses"
                required
              />
              <ImageUploadDropzone
                label="Giấy ủy quyền thương hiệu / Hợp đồng NPP (Tùy chọn)"
                helperText="Chứng từ đại lý phân phối hoặc nguồn gốc hàng hóa (nếu có)"
                value={shopForm.brandAuthorizationUrl || ''}
                onChange={(url) => setShopForm({ ...shopForm, brandAuthorizationUrl: url })}
                iconType="file"
                folder="scanms/kyc/authorizations"
              />
            </div>
          </div>

          {/* TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG DOANH THU */}
          <div className="space-y-4 pt-4 border-t border-[#EAE4D7]">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#B88E4F] uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                3. Tài khoản ngân hàng nhận doanh thu bán hàng
              </h4>
              <span className="text-[10px] text-[#B88E4F] bg-[#FBF5EB] px-2 py-0.5 rounded-full border border-[#EEDFC6] font-bold">
                Đối soát &amp; Chuyển tiền định kỳ
              </span>
            </div>

            <p className="text-[11px] text-[#7D715E] leading-relaxed">
              Doanh thu từ các đơn hàng thành công (sau khi trừ phí sàn và hoa hồng trả cho KOL) sẽ được SCANMS tự động đối soát và chuyển về tài khoản này theo chu kỳ thanh toán.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Tên ngân hàng thụ hưởng *</label>
                <BankSelectTrigger
                  value={shopForm.bankName}
                  onChange={(val) => setShopForm({ ...shopForm, bankName: val })}
                  placeholder="-- Chọn ngân hàng --"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Số tài khoản ngân hàng *</label>
                <input
                  type="text"
                  placeholder="VD: 0123456789"
                  value={shopForm.bankAccountNumber}
                  onChange={(e) => setShopForm({ ...shopForm, bankAccountNumber: e.target.value })}
                  required
                  className="w-full h-11 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 text-xs text-[#1A1612] font-mono outline-none focus:border-[#C59B58] focus:bg-white focus:ring-1 focus:ring-[#C59B58]/20 transition shadow-2xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                  Tên chủ tài khoản (In hoa) *
                </label>
                <input
                  type="text"
                  placeholder={
                    shopForm.businessType === 'ENTERPRISE'
                      ? 'VD: CONG TY TNHH SORA SKIN'
                      : 'VD: NGUYEN VAN A'
                  }
                  value={shopForm.bankAccountName}
                  onChange={(e) => setShopForm({ ...shopForm, bankAccountName: e.target.value.toUpperCase() })}
                  required
                  className="w-full h-11 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 text-xs text-[#1A1612] font-mono font-bold outline-none focus:border-[#C59B58] focus:bg-white focus:ring-1 focus:ring-[#C59B58]/20 transition shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Giới thiệu ngắn về Gian Hàng</label>
              <textarea
                rows={2}
                placeholder="Mô tả ngành hàng chủ đạo, cam kết chất lượng và định hướng phát triển trên SCANMS..."
                value={shopForm.description}
                onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl p-3 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] transition"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-gradient-to-r from-[#C59B58] to-[#B88E4F] hover:from-[#B88E4F] hover:to-[#A77D3E] text-[#1A1612] font-black text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Đang gửi...' : 'Gửi đăng ký mở Shop'}</span>
            </button>
          </div>
        </form>
        ) : (
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-black text-[#1A1612]">
              <Store className="h-4 w-4 text-[#B88E4F]" />
              {shopStatus === 'VERIFIED' ? 'Gian hàng đã được xác minh' : 'Hồ sơ đang chờ Ban Quản Trị duyệt'}
            </div>
            <p className="text-xs text-[#7D715E]">
              {shopStatus === 'VERIFIED'
                ? 'Gian hàng đã được kích hoạt. Bạn có thể vào cổng quản lý để đăng sản phẩm.'
                : 'Bạn sẽ nhận thông báo khi hồ sơ được duyệt hoặc cần bổ sung. Trong thời gian chờ, chưa thể đăng sản phẩm hay nhập kho.'}
            </p>
            {shopApp?.onboardingReviewNote && shopStatus !== 'VERIFIED' && (
              <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#7D715E]">
                <strong className="mb-1 block text-[#8F682E]">Ghi chú từ Ban Quản Trị</strong>
                {shopApp.onboardingReviewNote}
              </div>
            )}
            <button
              type="button"
              onClick={() => loadStatus()}
              className="rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-3 py-2 text-xs font-bold text-[#7D715E] hover:border-[#C59B58]"
            >
              Làm mới trạng thái
            </button>
          </div>
        )
      )}
    </div>
  );
};

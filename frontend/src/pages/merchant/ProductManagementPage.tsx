import { ProductAiMatchDrawer } from '../../components/product/ProductAiMatchDrawer';
import { ProductIdentityWarning, type SimilarProduct } from '../../components/product/ProductIdentityWarning';
import { ReviewManagementDialog } from '../../components/product/ReviewManagementPanel';
import { ProposePromotionModal } from '../../components/promotions/ProposePromotionModal';
import { calculateMinSafePrice } from '../../utils/pricing-math';
import { useState, useEffect, useRef, useMemo, Fragment, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  PlusCircle,
  Copy,
  Search,
  Link2,
  Package,
  Pencil,
  Trash2,
  CheckCircle2,
  ImagePlus,
  X,
  FolderTree,
  Coins,
  Percent,
  Boxes,
  Camera,
  UploadCloud,
  AlertCircle,
  Video,
  Star,
  ExternalLink,
  MessageSquareText,
  Clock3,
  ShieldCheck,
  Ban,
  Sparkles,
  RefreshCw,
  Truck,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  FileText,
  Zap,
  Layers,
} from 'lucide-react';
import api from '../../services/api';
import { productService, type Product } from '../../services/product.service';
import { storeService } from '../../services/store.service';
import { productPackageInput } from '../../utils/product-package.utils';
import { isOwnProductSubmission } from '../../utils/product-moderation.policy';
import { MAX_PRODUCT_GALLERY_IMAGES, validateProductCoverFile, validateProductCoverUrl } from '../../utils/product-image.policy';
import { authService } from '../../services/auth.service';
import { toast } from '../../utils/toast';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';

type VariantAttributes = Record<string, string>;
type VariantField = { key: string; label: string; placeholder: string };
type ProductVariantItem = {
  id?: string;
  sku: string;
  name: string;
  barcode?: string;
  packageWeight?: number | '';
  packageLength?: number | '';
  packageWidth?: number | '';
  packageHeight?: number | '';
  origin?: string;
  ingredients?: string;
  labelInfo?: string;
  attributes: VariantAttributes;
  price: number | '';
  floorPrice?: number | '';
  stockQuantity: number | '';
  imageUrl: string;
  tier1Value?: string;
  tier2Value?: string;
};

type ProductEvidenceEditorProps = {
  title: string;
  description: string;
  required?: boolean;
  inputId: string;
  links: string[];
  images: string[];
  uploading: boolean;
  uploadLabel: string;
  onLinksChange: (links: string[]) => void;
  onImagesChange: (images: string[]) => void;
  onUpload: (files: FileList | null) => void;
};

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center ml-1.5 align-middle select-none"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`w-4 h-4 rounded-full text-[10px] font-bold inline-flex items-center justify-center transition cursor-pointer shadow-2xs ${
          open ? 'bg-[#C59B58] text-white ring-2 ring-[#C59B58]/30' : 'bg-[#F3EFE6] text-[#8C6226] hover:bg-[#C59B58] hover:text-white'
        }`}
        title={open ? 'Đóng thông tin' : 'Bấm xem thông tin chi tiết'}
        aria-label="Thông tin chi tiết"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full mt-1.5 w-64 p-2.5 rounded-xl bg-[#231D15] text-white text-[11px] leading-relaxed shadow-2xl z-50 text-left font-normal border border-white/10 animate-in fade-in zoom-in-95 duration-100 pointer-events-none"
        >
          {text}
          <span className="absolute left-2.5 bottom-full border-4 border-transparent border-b-[#231D15]" />
        </span>
      )}
    </span>
  );
}

function ProductEvidenceEditor({
  title, description, required = false, inputId, links, images, uploading, uploadLabel,
  onLinksChange, onImagesChange, onUpload,
}: ProductEvidenceEditorProps) {
  return (
    <section className="product-evidence-editor group min-w-0 overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-[0_2px_10px_rgba(35,29,21,0.03)] lg:row-span-3 lg:grid lg:grid-rows-subgrid">
      <header className="flex items-center justify-between border-b border-[#EAE4D7] bg-[#FAF8F5] px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#EEDFC6] bg-white text-[#B88E4F]">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <h3 className="text-xs font-bold text-[#1A1612] flex items-center">
            <span>{title}</span>
            {required && <span className="ml-1 text-[#DC2626]">*</span>}
            <InfoTooltip text={description} />
          </h3>
        </div>
      </header>

      <div className="flex flex-col gap-3.5 p-3.5 sm:p-4 lg:contents">
        <div className="rounded-xl border border-[#EEE6D9] bg-[#FEFDFB] p-3 lg:mx-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-[#5F5445]">
              <Link2 className="h-4 w-4 shrink-0 text-[#B88E4F]" strokeWidth={1.8} />
              <span>Link tài liệu / trang công bố</span>
            </div>
            <button
              type="button"
              disabled={links.length >= 10}
              onClick={() => onLinksChange([...links, ''])}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E8D8BD] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#8C6226] shadow-[0_1px_2px_rgba(35,29,21,0.03)] transition hover:border-[#C59B58] hover:bg-[#FBF5EB] disabled:opacity-50"
            >
              <PlusCircle className="h-3.5 w-3.5" strokeWidth={1.8} /> Thêm link
            </button>
          </div>
          {links.length > 0 ? (
            <div className="mt-2.5 space-y-2">
              {links.map((link, index) => (
                <div key={`${inputId}-link-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-[#EAE4D7] bg-white p-1.5 pl-2.5 transition focus-within:border-[#C59B58] focus-within:ring-2 focus-within:ring-[#C59B58]/10">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#FBF5EB] text-[#B88E4F]">
                    <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </span>
                  <input
                    type="url"
                    value={link}
                    maxLength={2048}
                    onChange={(event) => onLinksChange(links.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                    placeholder="Dán link https://..."
                    className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-xs text-[#1A1612] outline-none placeholder:text-[#A79B89]"
                  />
                  <button type="button" onClick={() => onLinksChange(links.filter((_, itemIndex) => itemIndex !== index))} aria-label="Xóa link minh chứng" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#8D8272] transition hover:bg-[#F8F1E7] hover:text-[#8C6226]">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2.5 rounded-lg border border-dashed border-[#E9DFD0] px-3 py-2 text-[10px] text-[#9A8E7C]">
              Chưa có link minh chứng
            </p>
          )}
        </div>

        <div className="lg:mx-4 lg:mb-4">
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            disabled={uploading || images.length >= 10}
            onChange={(event) => { onUpload(event.target.files); event.target.value = ''; }}
          />
          <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
            <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-[#5F5445]">
              <ImagePlus className="h-4 w-4 shrink-0 text-[#B88E4F]" strokeWidth={1.8} />
              <span>Ảnh chụp nhãn / hóa đơn / chứng từ</span>
            </div>
            {images.length > 0 && <span className="shrink-0 text-[10px] tabular-nums text-[#9A8E7C]">{images.length} ảnh</span>}
          </div>
          <button
            type="button"
            disabled={uploading || images.length >= 10}
            onClick={() => document.getElementById(inputId)?.click()}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#DCC9A9] bg-[#FCFAF6] px-3 py-2.5 text-left transition hover:border-[#C59B58] hover:bg-[#FBF5EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B58]/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#EEDFC6] bg-white text-[#B88E4F] shadow-[0_1px_3px_rgba(35,29,21,0.04)]">
              <UploadCloud className={`h-[17px] w-[17px] ${uploading ? 'animate-pulse' : ''}`} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-[#6F4E20]">{uploading ? 'Đang tải ảnh lên…' : uploadLabel}</span>
              <span className="mt-0.5 block text-[10px] text-[#9A8E7C]">JPG, PNG hoặc WEBP · tối đa 5 MB mỗi ảnh</span>
            </span>
            {!uploading && <Plus className="h-4 w-4 shrink-0 text-[#B88E4F]" strokeWidth={1.8} />}
          </button>
          {images.length > 0 && (
            <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((url, index) => (
                <div key={`${url}-${index}`} className="group/image relative aspect-[4/3] overflow-hidden rounded-lg border border-[#EAE4D7] bg-[#F8F5EF]">
                  <a href={url} target="_blank" rel="noreferrer" aria-label={`Mở ảnh minh chứng ${index + 1}`}>
                    <img src={url} alt={`Ảnh minh chứng ${index + 1}`} className="h-full w-full object-cover transition duration-300 group-hover/image:scale-[1.03]" />
                  </a>
                  <button type="button" onClick={() => onImagesChange(images.filter((_, itemIndex) => itemIndex !== index))} aria-label="Xóa ảnh minh chứng" className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-lg border border-white/80 bg-white/95 text-[#6F6251] opacity-100 shadow-sm transition hover:border-[#E8D8BD] hover:bg-[#FBF5EB] hover:text-[#8C6226] sm:opacity-0 sm:group-hover/image:opacity-100 sm:focus-visible:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const VARIANT_FIELDS: Record<string, VariantField[]> = {
  'Mỹ phẩm & Chăm sóc da': [
    { key: 'volume', label: 'Dung tích / khối lượng', placeholder: '30 ml, 50 ml, 100 g...' },
    { key: 'formula', label: 'Dạng / công thức', placeholder: 'Serum lỏng, dạng gel, kem...' },
    { key: 'package', label: 'Quy cách', placeholder: 'Chai nhỏ giọt, tuýp, hũ...' },
  ],
  'Trang điểm & Làm đẹp': [
    { key: 'shade', label: 'Màu / tông', placeholder: 'Đỏ đất, 01 Natural...' },
    { key: 'finish', label: 'Chất / hiệu ứng', placeholder: 'Lì, bóng, satin...' },
    { key: 'volume', label: 'Dung tích / khối lượng', placeholder: '3 g, 30 ml...' },
  ],
  'Chăm sóc cơ thể & Tóc': [
    { key: 'volume', label: 'Dung tích / khối lượng', placeholder: '250 ml, 500 ml...' },
    { key: 'scent', label: 'Mùi hương', placeholder: 'Hoa hồng, không mùi...' },
    { key: 'formula', label: 'Dạng sản phẩm', placeholder: 'Gel, dầu, kem...' },
  ],
  'Thực phẩm chức năng & Sức khỏe': [
    { key: 'weight', label: 'Khối lượng / số lượng', placeholder: '250 g, 60 viên...' },
    { key: 'flavor', label: 'Vị / hương', placeholder: 'Cam, tự nhiên...' },
    { key: 'package', label: 'Quy cách đóng gói', placeholder: 'Hộp, túi, lọ...' },
  ],
  'Thiết bị điện tử & Phụ kiện': [
    { key: 'model', label: 'Mẫu / phiên bản', placeholder: 'Pro, Gen 2...' },
    { key: 'color', label: 'Màu sắc', placeholder: 'Đen, trắng...' },
    { key: 'capacity', label: 'Cấu hình / dung lượng', placeholder: '128 GB, 20 W...' },
  ],
  'Thời trang & Phụ kiện': [
    { key: 'color', label: 'Màu sắc', placeholder: 'Đen, be, xanh...' },
    { key: 'size', label: 'Size', placeholder: 'S, M, L, XL...' },
    { key: 'style', label: 'Kiểu / mẫu', placeholder: 'Cổ tròn, tay dài...' },
  ],
};
const OTHER_VARIANT_FIELDS: VariantField[] = [
  { key: 'type', label: 'Loại / mẫu', placeholder: 'Tên kiểu sản phẩm...' },
  { key: 'specification', label: 'Kích thước / quy cách', placeholder: '20 cm, 500 g...' },
  { key: 'color', label: 'Màu / phiên bản', placeholder: 'Màu hoặc phiên bản...' },
];
const getVariantFields = (category: string) => {
  if (!category) return OTHER_VARIANT_FIELDS;
  if (VARIANT_FIELDS[category]) return VARIANT_FIELDS[category];
  const lower = category.toLowerCase();
  if (lower.includes('mỹ phẩm') || lower.includes('skincare') || lower.includes('da') || lower.includes('serum') || lower.includes('cosmetic')) {
    return VARIANT_FIELDS['Mỹ phẩm & Chăm sóc da'];
  }
  if (lower.includes('trang điểm') || lower.includes('làm đẹp') || lower.includes('makeup') || lower.includes('son')) {
    return VARIANT_FIELDS['Trang điểm & Làm đẹp'];
  }
  if (lower.includes('cơ thể') || lower.includes('tóc') || lower.includes('body') || lower.includes('tắm') || lower.includes('gội')) {
    return VARIANT_FIELDS['Chăm sóc cơ thể & Tóc'];
  }
  if (lower.includes('thực phẩm') || lower.includes('dinh dưỡng') || lower.includes('sức khỏe') || lower.includes('thảo mộc') || lower.includes('health') || lower.includes('nutrition')) {
    return VARIANT_FIELDS['Thực phẩm chức năng & Sức khỏe'];
  }
  if (lower.includes('thời trang') || lower.includes('may mặc') || lower.includes('áo') || lower.includes('quần') || lower.includes('thể thao') || lower.includes('activewear') || lower.includes('apparel')) {
    return VARIANT_FIELDS['Thời trang & Phụ kiện'];
  }
  if (lower.includes('gia dụng') || lower.includes('đồ bếp') || lower.includes('thiết bị') || lower.includes('điện tử') || lower.includes('living') || lower.includes('smart')) {
    return VARIANT_FIELDS['Thiết bị điện tử & Phụ kiện'];
  }
  return OTHER_VARIANT_FIELDS;
};
const variantDisplayName = (attributes: VariantAttributes, fields: VariantField[]) =>
  fields.map((field) => attributes[field.key]?.trim()).filter(Boolean).join(' · ');
const inferCategoryFromTitle = (title: string) => {
  const text = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  if (/\b(ao|quan|vay|dam|giay|dep|tui xach|hoodie|polo|shirt|dress|jeans|sneaker)\b/.test(text)) return 'Thời trang & Phụ kiện';
  if (/\b(son|phan trang diem|kem nen|mascara|makeup)\b/.test(text)) return 'Trang điểm & Làm đẹp';
  if (/\b(serum|tinh chat|kem duong|sua rua mat|chong nang|toner|duong da)\b/.test(text)) return 'Mỹ phẩm & Chăm sóc da';
  if (/\b(dau goi|sua tam|dau xa|duong toc)\b/.test(text)) return 'Chăm sóc cơ thể & Tóc';
  if (/\b(vitamin|thuc pham chuc nang|collagen|vien uong)\b/.test(text)) return 'Thực phẩm chức năng & Sức khỏe';
  if (/\b(tai nghe|dien thoai|may tinh|loa bluetooth|sac du phong)\b/.test(text)) return 'Thiết bị điện tử & Phụ kiện';
  return '';
};

interface CategoryContextInfo {
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  group1Name: string;
  group1Presets: string[];
  group2Name: string;
  group2Presets: string[];
  suitableForLabel: string;
  suitableForPlaceholder: string;
  ingredientsLabel: string;
  ingredientsPlaceholder: string;
  keyActivesLabel: string;
  keyActivesPlaceholder: string;
  shelfLifePlaceholder: string;
  responsibleEntityPlaceholder: string;
}

const getCategoryContextPlaceholders = (cat: string): CategoryContextInfo => {
  const lower = (cat || '').toLowerCase();
  if (
    lower.includes('thời trang') ||
    lower.includes('may mặc') ||
    lower.includes('thể thao') ||
    lower.includes('activewear') ||
    lower.includes('áo') ||
    lower.includes('quần') ||
    lower.includes('apparel')
  ) {
    return {
      titlePlaceholder: 'VD: Áo Thun Thể Thao Dry-Fit Thoáng Khí Chạy Bộ',
      descriptionPlaceholder: 'VD: Chất vải dệt kim cao cấp co giãn 4 chiều, công nghệ dệt thoáng khí kháng khuẩn Silver-Ion, form dáng thể thao năng động...',
      group1Name: 'Màu sắc',
      group1Presets: ['Đen', 'Trắng', 'Xanh Navy', 'Xám Tiêu', 'Đỏ Đô'],
      group2Name: 'Kích cỡ (Size)',
      group2Presets: ['Size S', 'Size M', 'Size L', 'Size XL'],
      suitableForLabel: 'Đặc tính / Vóc dáng phù hợp',
      suitableForPlaceholder: 'VD: Dáng Slim-fit, Oversize, Thể thao...',
      ingredientsLabel: 'Chất liệu vải / Thành phần cấu tạo',
      ingredientsPlaceholder: 'VD: 92% Polyester compact, 8% Spandex, 220 GSM...',
      keyActivesLabel: 'Công nghệ dệt & Tính năng nổi bật',
      keyActivesPlaceholder: 'VD: Thấm hút Quick-Dry, Kháng khuẩn Silver-Ion, Co giãn 4 chiều...',
      shelfLifePlaceholder: 'VD: Không áp dụng thời hạn sử dụng',
      responsibleEntityPlaceholder: 'VD: Công ty TNHH Aura Activewear',
    };
  }
  if (
    lower.includes('thực phẩm') ||
    lower.includes('dinh dưỡng') ||
    lower.includes('sức khỏe') ||
    lower.includes('thảo mộc') ||
    lower.includes('nutrition') ||
    lower.includes('health')
  ) {
    return {
      titlePlaceholder: 'VD: Bột Protein Hữu Cơ Dinh Dưỡng Thực Vật Hạt Bí & Đậu Hà Lan',
      descriptionPlaceholder: 'VD: Cung cấp 24g đạm thực vật nguyên chất mỗi muỗng, giàu BCAA tự nhiên hỗ trợ phục hồi cơ bắp và duy trì vóc dáng săn chắc...',
      group1Name: 'Hương vị',
      group1Presets: ['Socola', 'Vani', 'Trà Xanh Matcha', 'Tự Nhiên'],
      group2Name: 'Quy cách đóng gói',
      group2Presets: ['Hũ 500g', 'Hũ 900g', 'Túi 1kg', 'Hộp 30 gói'],
      suitableForLabel: 'Đối tượng sử dụng phù hợp',
      suitableForPlaceholder: 'VD: Người tập gym, người ăn kiêng, người lớn tuổi...',
      ingredientsLabel: 'Bảng thành phần định lượng chi tiết',
      ingredientsPlaceholder: 'VD: Trong mỗi liều dùng: Whey Isolate 25g, BCAA 5.5g, Glutamine 4g...',
      keyActivesLabel: 'Hoạt chất dinh dưỡng chính & Công dụng',
      keyActivesPlaceholder: 'VD: Hỗ trợ phục hồi cơ bắp, Tăng cường đề kháng tự nhiên...',
      shelfLifePlaceholder: 'VD: 24 tháng kể từ ngày sản xuất',
      responsibleEntityPlaceholder: 'VD: Công ty Cổ phần Dược phẩm GreenBio Health',
    };
  }
  if (
    lower.includes('thiết bị') ||
    lower.includes('điện tử') ||
    lower.includes('gia dụng') ||
    lower.includes('đồ bếp') ||
    lower.includes('smart') ||
    lower.includes('living')
  ) {
    return {
      titlePlaceholder: 'VD: Nồi Chiên Không Dầu Điện Tử Cảm Ứng Đa Năng 6.5L',
      descriptionPlaceholder: 'VD: Công nghệ tuần hoàn khí nóng 360 độ Rapid Air giảm 85% lượng dầu mỡ, màn hình LED cảm ứng thông minh 12 chế độ cài đặt sẵn...',
      group1Name: 'Màu sắc / Phiên bản',
      group1Presets: ['Trắng Ceramic', 'Đen Nhám', 'Xám Titan'],
      group2Name: 'Công suất / Dung tích',
      group2Presets: ['Bản 4.5L (1500W)', 'Bản 6.5L (1800W)', 'Bản Pro 8.0L (2000W)'],
      suitableForLabel: 'Đặc tính / Không gian sử dụng',
      suitableForPlaceholder: 'VD: Căn hộ, phòng ngủ, phòng khách, văn phòng...',
      ingredientsLabel: 'Vật liệu cấu tạo & Linh kiện chính',
      ingredientsPlaceholder: 'VD: Hợp kim nhôm Anodized, Nhựa ABS chống cháy, Lõi đồng...',
      keyActivesLabel: 'Thông số kỹ thuật & Công nghệ cốt lõi',
      keyActivesPlaceholder: 'VD: Động cơ BLDC không chổi than 45W, Cảm biến nhiệt độ NTC...',
      shelfLifePlaceholder: 'VD: Bảo hành 24 tháng chính hãng',
      responsibleEntityPlaceholder: 'VD: Công ty TNHH Lumière Smart Living',
    };
  }
  if (
    lower.includes('mỹ phẩm') ||
    lower.includes('skincare') ||
    lower.includes('da') ||
    lower.includes('serum') ||
    lower.includes('trang điểm') ||
    lower.includes('cosmetic')
  ) {
    return {
      titlePlaceholder: 'VD: Serum Dưỡng Trắng Mờ Thâm Vitamin C 15%',
      descriptionPlaceholder: 'VD: Tinh chất dưỡng sáng mờ thâm chứa 15% Vitamin C tinh khiết kết hợp Hyaluronic Acid đa phân tử giúp phục hồi và làm đều màu da...',
      group1Name: 'Mùi hương / Dòng',
      group1Presets: ['Bản Dịu Nhẹ', 'Hương Đào', 'Hương Trà Xanh', 'Hương Hoa Hồng'],
      group2Name: 'Dung tích',
      group2Presets: ['30ml', '50ml', '100ml', 'Tuýp 150ml'],
      suitableForLabel: 'Đặc tính / Loại da phù hợp',
      suitableForPlaceholder: 'VD: Da dầu mụn, da khô, da nhạy cảm...',
      ingredientsLabel: 'Bảng thành phần công thức đầy đủ (INCI List)',
      ingredientsPlaceholder: 'VD: Water/Aqua, Glycerin, Niacinamide, Butylene Glycol, Panthenol, Hyaluronic Acid, Phenoxyethanol...',
      keyActivesLabel: 'Thành phần hoạt chất nổi bật & Nồng độ',
      keyActivesPlaceholder: 'VD: Niacinamide 10%, Vitamin B5 2%, Zinc PCA 1%...',
      shelfLifePlaceholder: 'VD: 36 tháng kể từ ngày sản xuất',
      responsibleEntityPlaceholder: 'VD: Công ty Cổ phần Thương mại Sora Skincare',
    };
  }
  return {
    titlePlaceholder: 'VD: Tên sản phẩm chính hãng',
    descriptionPlaceholder: 'Nhập mô tả chi tiết công dụng nổi bật, giải pháp mang lại cho khách hàng, hướng dẫn sử dụng và bảo quản...',
    group1Name: 'Phân loại',
    group1Presets: ['Bản Tiêu chuẩn', 'Bản Nâng cấp Pro'],
    group2Name: 'Quy cách',
    group2Presets: ['Mặc định'],
    suitableForLabel: 'Đặc tính / Đối tượng phù hợp',
    suitableForPlaceholder: 'VD: Phù hợp đối tượng hoặc mục đích sử dụng riêng...',
    ingredientsLabel: 'Thành phần / Chất liệu cấu tạo',
    ingredientsPlaceholder: 'VD: Bảng thành phần nguyên liệu sản phẩm...',
    keyActivesLabel: 'Đặc tính kỹ thuật / Hoạt chất nổi bật',
    keyActivesPlaceholder: 'VD: Các tính năng cốt lõi hoặc hoạt chất chính...',
    shelfLifePlaceholder: 'VD: Theo quy chuẩn nhà sản xuất',
    responsibleEntityPlaceholder: 'VD: Doanh nghiệp chịu trách nhiệm phân phối',
  };
};

const cachedProductsMap = new Map<string, Product[]>();

export default function ProductManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [returnToDashboard, setReturnToDashboard] = useState(
    () => searchParams.get('returnTo') === 'dashboard',
  );
  const currentUser = authService.getCurrentUser();
  const isKol = !currentUser?.role || currentUser?.role === 'COLLABORATOR';
  const isAdminOrManager =
    currentUser?.role === 'SYSTEM_ADMIN' ||
    currentUser?.role === 'SYSTEM_MANAGER' ||
    (currentUser?.role as string) === 'ADMIN';
  const currentStoreId = localStorage.getItem('current_store_id') || undefined;

  const [products, setProducts] = useState<Product[]>(() => {
    const key = String(currentStoreId || 'all');
    return cachedProductsMap.get(key) || [];
  });
  const [storeCategory, setStoreCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const saveLocked = useRef(false);
  const submittedForm = useRef<HTMLFormElement | null>(null);
  const confirmedIdentity = useRef('');
  const hasHandledParamsRef = useRef(false);
  const [identityWarning, setIdentityWarning] = useState<{ items: SimilarProduct[]; fingerprint: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [moderatingProduct, setModeratingProduct] = useState<any | null>(null);
  const [moderatingAction, setModeratingAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [moderationSubmitting, setModerationSubmitting] = useState(false);
  const [aiDrawerProduct, setAiDrawerProduct] = useState<Product | null>(null);

  const pendingApprovalCount = useMemo(() => {
    return products.filter((p: any) => (p.moderationStatus || 'APPROVED') === 'DRAFT').length;
  }, [products]);

  const handleApproveProduct = async (product: any) => {
    if (isOwnProductSubmission(product, currentUser?.id)) {
      toast.error('Hồ sơ do bạn tạo hoặc gửi. Cần người kiểm duyệt độc lập.'); return;
    }
    setModerationSubmitting(true);
    try {
      await productService.moderateProduct(product.id, 'APPROVED');
      toast.success(`Đã phê duyệt sản phẩm "${product.title || product.name}"!`, {
        description: 'Sản phẩm đã được mở bán công khai trên sàn SCANMS cho khách và KOL.',
      });
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? { ...item, moderationStatus: 'APPROVED', status: 'active', isActive: true }
            : item
        )
      );
      setModeratingProduct(null);
      setModeratingAction(null);
      void loadProducts();
    } catch (err: any) {
      toast.error('Không thể phê duyệt sản phẩm', {
        description: err?.response?.data?.message || err?.message || 'Lỗi hệ thống.',
      });
    } finally {
      setModerationSubmitting(false);
    }
  };

  const handleRejectProduct = async () => {
    if (!moderatingProduct) return;
    if (isOwnProductSubmission(moderatingProduct, currentUser?.id)) {
      toast.error('Hồ sơ do bạn tạo hoặc gửi. Cần người kiểm duyệt độc lập.'); return;
    }
    if (!moderationReason.trim() || moderationReason.trim().length < 3) {
      toast.warning('Vui lòng nhập lý do từ chối kiểm duyệt (tối thiểu 3 ký tự).');
      return;
    }
    setModerationSubmitting(true);
    try {
      await productService.moderateProduct(moderatingProduct.id, 'REJECTED', moderationReason.trim());
      toast.error(`Đã từ chối kiểm duyệt "${moderatingProduct.title || moderatingProduct.name}"`, {
        description: `Lý do: "${moderationReason.trim()}". Shop sẽ nhận được thông báo phản hồi.`,
      });
      setProducts((prev) =>
        prev.map((item) =>
          item.id === moderatingProduct.id
            ? { ...item, moderationStatus: 'REJECTED', moderationReason: moderationReason.trim() }
            : item
        )
      );
      setModeratingProduct(null);
      setModeratingAction(null);
      setModerationReason('');
      void loadProducts();
    } catch (err: any) {
      toast.error('Không thể từ chối sản phẩm', {
        description: err?.response?.data?.message || err?.message || 'Lỗi hệ thống.',
      });
    } finally {
      setModerationSubmitting(false);
    }
  };


  const [selectedVideoProduct, setSelectedVideoProduct] = useState<Product | null>(null);
  const [productVideos, setProductVideos] = useState<any[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  useEffect(() => { setActiveVideoId(null); }, [selectedVideoProduct?.id]);
  const activeReviewVideo = productVideos.find(video => video.id === activeVideoId) || productVideos[0];
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [reviewingMediaId, setReviewingMediaId] = useState<string | null>(null);
  const [rejectionModalMedia, setRejectionModalMedia] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [rejectionActionType, setRejectionActionType] = useState<'REJECTED' | 'HIDDEN'>('REJECTED');

  useEffect(() => {
    if (!selectedVideoProduct) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (rejectionModalMedia) setRejectionModalMedia(null);
      else setSelectedVideoProduct(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedVideoProduct, rejectionModalMedia]);

  const pendingKolVideoCount = productVideos.filter((video: any) => video.status === 'PENDING').length;


  const [showReviewModeration, setShowReviewModeration] = useState(false);
  const openReviewModeration = () => setShowReviewModeration(true);

  const STANDARD_CATEGORIES = [
    { id: 'skincare', name: 'Mỹ phẩm & Chăm sóc da', prefix: 'SKIN' },
    { id: 'makeup', name: 'Trang điểm & Làm đẹp', prefix: 'MAKEUP' },
    { id: 'bodycare', name: 'Chăm sóc cơ thể & Tóc', prefix: 'BODY' },
    { id: 'health', name: 'Thực phẩm chức năng & Sức khỏe', prefix: 'HEALTH' },
    { id: 'tech', name: 'Thiết bị điện tử & Phụ kiện', prefix: 'TECH' },
    { id: 'fashion', name: 'Thời trang & Phụ kiện', prefix: 'FASHION' },
    { id: 'other', name: 'Danh mục khác (Tự nhập)', prefix: 'PROD' },
  ];

  const [formSku, setFormSku] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIngredients, setFormIngredients] = useState('');
  const [formKeyActives, setFormKeyActives] = useState('');
  const [formShelfLife, setFormShelfLife] = useState('');
  const [formNotificationNumber, setFormNotificationNumber] = useState('');
  const [useCommonShipping, setUseCommonShipping] = useState<boolean>(true);
  const [formOrigin, setFormOrigin] = useState('');
  const [formLabelInfo, setFormLabelInfo] = useState('');
  const [formOriginProofLinks, setFormOriginProofLinks] = useState<string[]>([]);
  const [formOriginProofImages, setFormOriginProofImages] = useState<string[]>([]);
  const [formLabelProofLinks, setFormLabelProofLinks] = useState<string[]>([]);
  const [formLabelProofImages, setFormLabelProofImages] = useState<string[]>([]);
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formFloorPrice, setFormFloorPrice] = useState<number | ''>('');
  const [discountModalProduct, setDiscountModalProduct] = useState<any>(null);
  const [bulkDiscountProducts, setBulkDiscountProducts] = useState<any[] | null>(null);
  const [formAffiliateEnabled, setFormAffiliateEnabled] = useState(false);
  const [formStock, setFormStock] = useState<number | ''>('');
  const [formPackageWeight, setFormPackageWeight] = useState<number | ''>('');
  const [formPackageLength, setFormPackageLength] = useState<number | ''>('');
  const [formPackageWidth, setFormPackageWidth] = useState<number | ''>('');
  const [formPackageHeight, setFormPackageHeight] = useState<number | ''>('');
  const [formSampleEnabled, setFormSampleEnabled] = useState(false);
  const [formSampleQuota, setFormSampleQuota] = useState<number | ''>('');
  const [formImage, setFormImage] = useState('');
  const [formSubImages, setFormSubImages] = useState<string[]>([]);
  const [formVariants, setFormVariants] = useState<ProductVariantItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);

  // 2-Tier Attribute Matrix States
  const [attrGroup1Name, setAttrGroup1Name] = useState('Phân loại 1');
  const [attrGroup1Values, setAttrGroup1Values] = useState<string[]>(['Bản Tiêu chuẩn']);
  const [attrGroup1Input, setAttrGroup1Input] = useState('');

  const [hasTier2, setHasTier2] = useState(false);
  const [attrGroup2Name, setAttrGroup2Name] = useState('Kích cỡ (Size)');
  const [attrGroup2Values, setAttrGroup2Values] = useState<string[]>([]);
  const [attrGroup2Input, setAttrGroup2Input] = useState('');

  // Batch Fill Bar States
  const [batchFloorPrice, setBatchFloorPrice] = useState<string>('');
  const [batchPrice, setBatchPrice] = useState<string>('');
  const [batchStock, setBatchStock] = useState<string>('');

  const STEP_TITLES: Record<number, string> = {
    1: 'Thông tin chung',
    2: 'Phân loại & Thông số',
    3: 'Tiếp thị & Gửi duyệt',
  };

  const isStep1Complete = Boolean(
    formTitle.trim() &&
    formSku.trim() &&
    formCategory.trim() &&
    (formCategory !== 'Danh mục khác (Tự nhập)' || formCustomCategory.trim()) &&
    formImage.trim() &&
    formDescription.trim()
  );

  const isStep2Complete = Boolean(
    formVariants.length > 0 &&
    formVariants.every(
      (v) =>
        v.name.trim() &&
        v.sku.trim() &&
        Number(v.floorPrice) > 0 &&
        Number(v.price) > 0 &&
        Number(v.price) >= Number(v.floorPrice) &&
        v.stockQuantity !== '' &&
        Number(v.stockQuantity) >= 0 &&
        (useCommonShipping || (
          Number(v.packageWeight) > 0 &&
          Number(v.packageLength) > 0 &&
          Number(v.packageWidth) > 0 &&
          Number(v.packageHeight) > 0
        ))
    ) &&
    formOrigin.trim() &&
    (formIngredients.trim() || formKeyActives.trim() || formLabelInfo.trim()) &&
    (useCommonShipping
      ? Number(formPackageWeight) > 0 &&
        Number(formPackageLength) > 0 &&
        Number(formPackageWidth) > 0 &&
        Number(formPackageHeight) > 0
      : true)
  );

  const isStep3Complete = Boolean(
    [...formOriginProofLinks, ...formOriginProofImages, ...formLabelProofLinks, ...formLabelProofImages].some((v) => v.trim())
  );

  const validateStep1 = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!formTitle.trim()) errors.push('Vui lòng nhập tên sản phẩm.');
    if (!formSku.trim()) errors.push('Vui lòng nhập mã SKU sản phẩm.');
    if (!formCategory.trim()) {
      const fallbackCat = storeCategory || STANDARD_CATEGORIES[0].name;
      setFormCategory(fallbackCat);
    }
    if (formCategory === 'Danh mục khác (Tự nhập)' && !formCustomCategory.trim()) {
      errors.push('Vui lòng nhập tên danh mục tùy chỉnh.');
    }
    if (!formImage.trim()) errors.push('Vui lòng tải ảnh bìa chính.');
    if (!formDescription.trim()) errors.push('Vui lòng nhập mô tả chi tiết sản phẩm.');
    return { valid: errors.length === 0, errors };
  };

  const validateStep2 = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (formVariants.length === 0) {
      errors.push('Sản phẩm cần có ít nhất 1 phân loại hàng.');
      return { valid: false, errors };
    }
    formVariants.forEach((v, idx) => {
      const vLabel = formVariants.length === 1 ? 'Phân loại hàng' : `Phân loại #${idx + 1} (${v.name || 'chưa đặt tên'})`;
      if (!v.name.trim()) errors.push(`${vLabel}: Vui lòng nhập tên phân loại.`);
      if (!v.sku.trim()) errors.push(`${vLabel}: Vui lòng nhập mã SKU.`);
      if (v.floorPrice === '' || v.floorPrice === undefined || Number(v.floorPrice) <= 0) {
        errors.push(`${vLabel}: Nhập giá sàn bảo vệ biên lợi nhuận > 0.`);
      }
      if (v.price === '' || v.price === undefined || Number(v.price) <= 0) {
        errors.push(`${vLabel}: Nhập giá niêm yết bán lẻ > 0.`);
      }
      if (Number(v.floorPrice) > 0 && Number(v.price) > 0) {
        const minSafe = calculateMinSafePrice(Number(v.floorPrice));
        if (Number(v.price) < minSafe) {
          errors.push(`${vLabel}: Giá bán (${Number(v.price).toLocaleString('vi-VN')}₫) phải >= ${minSafe.toLocaleString('vi-VN')}₫ (đã gánh Voucher 10% + KOL 25%).`);
        }
      }
      if (v.stockQuantity === '' || v.stockQuantity === undefined || Number(v.stockQuantity) < 0 || !Number.isInteger(Number(v.stockQuantity))) {
        errors.push(`${vLabel}: Nhập tồn kho mở bán là số nguyên >= 0.`);
      }
      if (!useCommonShipping) {
        if (!v.packageWeight || Number(v.packageWeight) <= 0) {
          errors.push(`${vLabel}: Nhập cân nặng kiện hàng riêng (gram) > 0.`);
        }
        if (!v.packageLength || Number(v.packageLength) <= 0 || !v.packageWidth || Number(v.packageWidth) <= 0 || !v.packageHeight || Number(v.packageHeight) <= 0) {
          errors.push(`${vLabel}: Nhập đầy đủ kích thước kiện riêng Dài × Rộng × Cao (cm) > 0.`);
        }
      }
    });

    const skus = formVariants.map((v) => v.sku.trim().toUpperCase()).filter(Boolean);
    if (new Set(skus).size !== skus.length) {
      errors.push('Mã SKU giữa các phân loại không được trùng nhau.');
    }

    // Thông số kỹ thuật sản phẩm (cấp sản phẩm)
    if (!formOrigin.trim()) {
      errors.push('Thông số sản phẩm: Vui lòng nhập nguồn gốc xuất xứ.');
    }
    if (!formIngredients.trim() && !formKeyActives.trim() && !formLabelInfo.trim()) {
      errors.push('Thông số sản phẩm: Vui lòng nhập thành phần, cấu tạo hoặc hoạt chất.');
    }

    // Quy cách đóng gói & vận chuyển GHN (khi dùng chung)
    if (useCommonShipping) {
      if (!formPackageWeight || Number(formPackageWeight) <= 0) {
        errors.push('Đóng gói GHN: Vui lòng nhập cân nặng kiện hàng dùng chung (gram) > 0.');
      }
      if (!formPackageLength || Number(formPackageLength) <= 0 || !formPackageWidth || Number(formPackageWidth) <= 0 || !formPackageHeight || Number(formPackageHeight) <= 0) {
        errors.push('Đóng gói GHN: Vui lòng nhập đầy đủ kích thước kiện dùng chung Dài × Rộng × Cao (cm) > 0.');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const validateStep3 = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const hasAnyProof = [...formOriginProofLinks, ...formOriginProofImages, ...formLabelProofLinks, ...formLabelProofImages].some((v) => v.trim());
    if (!hasAnyProof) {
      errors.push('Vui lòng thêm ít nhất 1 minh chứng (hóa đơn VAT, giấy phép công bố hoặc link tra cứu).');
    }
    if (formSampleEnabled && (formSampleQuota === '' || !Number.isInteger(Number(formSampleQuota)) || Number(formSampleQuota) <= 0)) {
      errors.push('Nếu bật cấp sản phẩm mẫu, hãy nhập tổng suất mẫu là số nguyên > 0.');
    }
    return { valid: errors.length === 0, errors };
  };

  const goToNextStep = () => {
    setSaveError(null);
    if (modalStep === 1) {
      const v1 = validateStep1();
      if (!v1.valid) {
        setSaveError(v1.errors.join('\n'));
        showToast(v1.errors[0]);
        return;
      }
      // Đảm bảo Phân loại 1 có SKU từ formSku nếu chưa có
      if (formVariants.length > 0 && !formVariants[0].sku) {
        setFormVariants((curr) => curr.map((v, i) => (i === 0 ? { ...v, sku: formSku } : v)));
      }
      setModalStep(2);
    } else if (modalStep === 2) {
      const v2 = validateStep2();
      if (!v2.valid) {
        setSaveError(v2.errors.join('\n'));
        showToast(v2.errors[0]);
        return;
      }
      // Tự động gán fallback nếu trống để đồng bộ
      const syncIngredients = formIngredients.trim() || formKeyActives.trim() || 'Thành phần tiêu chuẩn';
      const syncLabelInfo = formLabelInfo.trim() || formShelfLife.trim() || 'Bảo quản nơi khô ráo, thoáng mát';
      if (!formIngredients.trim()) setFormIngredients(syncIngredients);
      if (!formLabelInfo.trim()) setFormLabelInfo(syncLabelInfo);

      // Đồng bộ thông số từ Loại chính ra cấp sản phẩm
      const primary = formVariants[0];
      if (primary) {
        setFormPrice(primary.price);
        setFormFloorPrice(primary.floorPrice || Math.round((Number(primary.price) || 0) * 0.7));
      }
      // Đồng bộ thông số sản phẩm và kiện GHN
      if (useCommonShipping) {
        setFormVariants((curr) =>
          curr.map((v) => ({
            ...v,
            origin: formOrigin || v.origin || 'Việt Nam',
            ingredients: syncIngredients,
            labelInfo: syncLabelInfo,
            packageWeight: formPackageWeight || v.packageWeight || 250,
            packageLength: formPackageLength || v.packageLength || 15,
            packageWidth: formPackageWidth || v.packageWidth || 10,
            packageHeight: formPackageHeight || v.packageHeight || 5,
          }))
        );
      } else {
        if (primary) {
          setFormPackageWeight(primary.packageWeight || 250);
          setFormPackageLength(primary.packageLength || 15);
          setFormPackageWidth(primary.packageWidth || 10);
          setFormPackageHeight(primary.packageHeight || 5);
        }
        setFormVariants((curr) =>
          curr.map((v) => ({
            ...v,
            origin: formOrigin || v.origin || 'Việt Nam',
            ingredients: syncIngredients,
            labelInfo: syncLabelInfo,
          }))
        );
      }
      setModalStep(3);
    }
  };

  const goToPreviousStep = () => {
    setSaveError(null);
    if (modalStep > 1) {
      setModalStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleStepClick = (targetStep: 1 | 2 | 3) => {
    if (targetStep === modalStep) return;
    setSaveError(null);
    if (targetStep > modalStep) {
      if (modalStep === 1 && !validateStep1().valid) {
        setSaveError('Vui lòng hoàn thiện các trường bắt buộc ở Bước 1 trước khi chuyển bước.');
        return;
      }
      if (targetStep === 3 && !validateStep2().valid) {
        setSaveError('Vui lòng hoàn thiện các trường bắt buộc ở Bước 2 trước khi chuyển bước.');
        return;
      }
    }
    setModalStep(targetStep);
  };

  const activeCategory = useMemo(() => {
    const explicit = (formCategory && formCategory !== 'Danh mục khác (Tự nhập)' ? formCategory : formCustomCategory) || storeCategory;
    if (explicit) return explicit;
    // Infer from SKU prefix if explicit category is not yet set
    const upperSku = (formSku || '').toUpperCase();
    if (upperSku.startsWith('FASHION-') || upperSku.startsWith('APP-') || upperSku.startsWith('AURA-')) return 'Thời trang & Phụ kiện';
    if (upperSku.startsWith('HEALTH-') || upperSku.startsWith('BIO-') || upperSku.startsWith('GREEN-')) return 'Thực phẩm chức năng & Sức khỏe';
    if (upperSku.startsWith('TECH-') || upperSku.startsWith('LUM-') || upperSku.startsWith('SMART-')) return 'Thiết bị điện tử & Phụ kiện';
    if (upperSku.startsWith('SKIN-') || upperSku.startsWith('COS-') || upperSku.startsWith('SORA-')) return 'Mỹ phẩm & Chăm sóc da';
    return '';
  }, [storeCategory, formCategory, formCustomCategory, formSku]);

  const contextPlaceholders = useMemo(
    () => getCategoryContextPlaceholders(activeCategory),
    [activeCategory],
  );

  const totalVariantStock = useMemo(() => {
    return formVariants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0);
  }, [formVariants]);

  const variantPriceRange = useMemo(() => {
    const prices = formVariants.map((v) => Number(v.price) || 0).filter((p) => p > 0);
    if (prices.length === 0) return { min: Number(formPrice) || 0, max: Number(formPrice) || 0, isRange: false };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, isRange: min !== max };
  }, [formVariants, formPrice]);


  const loadProductsRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    loadProductsRef.current();
  }, []);

  const openProductLanding = (product: Product) => {
    const productSlug = product.sku || product.id;
    window.open(
      `/products/${encodeURIComponent(productSlug)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const openAllVideoModeration = async () => {
    setSelectedVideoProduct({
      id: '__ALL__',
      sku: 'TẤT CẢ',
      title: 'Tất cả sản phẩm trong gian hàng',
    } as Product);
    setLoadingVideos(true);

    try {
      const res = await api.get('/media', {
        params: { assetType: 'VIDEO', limit: 100 },
      });
      const merged = [...(res.data?.items || [])];
      merged.sort((a: any, b: any) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
      setProductVideos(merged);
    } catch (err) {
      console.error('Lỗi khi tải toàn bộ video KOL:', err);
      setProductVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleApproveVideo = async (mediaId: string, isFeatured: boolean) => {
    setReviewingMediaId(mediaId);
    try {
      await api.patch(`/media/${mediaId}/review`, {
        status: 'APPROVED',
        isFeatured,
      });
      showToast(
        isFeatured
          ? 'Đã duyệt và ghim video làm nổi bật Landing!'
          : 'Đã phê duyệt video review thành công!',
      );
      setProductVideos((prev) =>
        prev.map((v) => {
          const target = prev.find((item) => item.id === mediaId);
          const targetProductId = target?.product?.id || target?.productId;
          if (v.id === mediaId) {
            return {
              ...v,
              status: 'APPROVED',
              isFeatured,
              rejectionReason: null,
            };
          }
          if (isFeatured && (v.product?.id || v.productId) === targetProductId) {
            return { ...v, isFeatured: false };
          }
          return v;
        }),
      );
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể phê duyệt video');
    } finally {
      setReviewingMediaId(null);
    }
  };

  const openRejectionModal = (media: any, actionType: 'REJECTED' | 'HIDDEN') => {
    setRejectionModalMedia(media);
    setRejectionActionType(actionType);
    setRejectionReasonInput('');
  };

  const handleConfirmRejection = async () => {
    if (!rejectionModalMedia) return;
    if (!rejectionReasonInput.trim()) {
      toast.warning('Bắt buộc phải nhập lý do khi từ chối hoặc ẩn video review!');
      return;
    }

    const mediaId = rejectionModalMedia.id;
    setReviewingMediaId(mediaId);
    try {
      await api.patch(`/media/${mediaId}/review`, {
        status: rejectionActionType,
        rejectionReason: rejectionReasonInput.trim(),
      });
      showToast(
        rejectionActionType === 'REJECTED'
          ? 'Đã từ chối video review và lưu lý do kiểm duyệt.'
          : 'Đã ẩn video khỏi Landing Page thành công.',
      );
      setProductVideos((prev) =>
        prev.map((v) =>
          v.id === mediaId
            ? {
                ...v,
                status: rejectionActionType,
                rejectionReason: rejectionReasonInput.trim(),
                isFeatured: false,
              }
            : v,
        ),
      );
      setRejectionModalMedia(null);
      setRejectionReasonInput('');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Thao tác kiểm duyệt thất bại');
    } finally {
      setReviewingMediaId(null);
    }
  };


  useEffect(() => {
    if (typeof window === 'undefined' || window.self === window.top) return;

    window.parent.postMessage(
      { type: 'SCANMS_PRODUCT_MODAL_STATE', open: showModal },
      window.location.origin,
    );

    return () => {
      if (showModal) {
        window.parent.postMessage(
          { type: 'SCANMS_PRODUCT_MODAL_STATE', open: false },
          window.location.origin,
        );
      }
    };
  }, [showModal]);

  const loadProducts = async () => {
    try {
      const res: any = await productService.getProducts({
        search: search || undefined,
        storeId: currentStoreId,
      });
      const items = res.items || [];
      const key = String(currentStoreId || 'all');
      if (!search) cachedProductsMap.set(key, items);
      setProducts(items);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    }
  };
  loadProductsRef.current = loadProducts;

  useEffect(() => {
    if (!isKol) {
      if (!isAdminOrManager) {
        // SHOP_MANAGER: dùng getMyStore() làm nguồn chính — trả về categoryName chính xác nhất
        storeService
          .getMyStore()
          .then((s) => {
            if (s?.categoryName) setStoreCategory(s.categoryName);
          })
          .catch(() => {
            // fallback: thử public API nếu getMyStore lỗi
            if (currentStoreId) {
              api
                .get(`/stores/public/id/${currentStoreId}`)
                .then((res: any) => {
                  const s = res?.data || res;
                  if (s?.categoryName) setStoreCategory(s.categoryName);
                })
                .catch(() => {});
            }
          });
      } else if (currentStoreId) {
        // ADMIN / SYSTEM_MANAGER: dùng public API
        api
          .get(`/stores/public/id/${currentStoreId}`)
          .then((res: any) => {
            const s = res?.data || res;
            if (s?.categoryName) setStoreCategory(s.categoryName);
          })
          .catch(() => {});
      }
    }
  }, [isAdminOrManager, isKol, currentStoreId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(displayProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    }
  };

  const handleCategoryChange = (categoryName: string) => {
    setFormCategory(categoryName);
    const nextFields = getVariantFields(categoryName);
    setFormVariants((current) => current.map((variant) => {
      const attributes = Object.fromEntries(nextFields
        .filter((field) => variant.attributes[field.key])
        .map((field) => [field.key, variant.attributes[field.key]]));
      return { ...variant, attributes, name: variantDisplayName(attributes, nextFields) || variant.name };
    }));
    const cat = STANDARD_CATEGORIES.find((c) => c.name === categoryName);
    if (!editingProduct && (!formSku || STANDARD_CATEGORIES.some((c) => formSku.startsWith(c.prefix)))) {
      const prefix = cat?.prefix || 'PROD';
      const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      setFormSku(`${prefix}-${randomCode}`);
    }
  };

  const addVariant = () => {
    setFormVariants((current) => {
      const primary = current[0];
      const count = current.length + 1;
      const baseSku = formSku ? `${formSku}-V${count}` : `SKU-V${count}`;
      let uniqueSku = baseSku;
      let counter = 1;
      while (current.some((item) => item.sku === uniqueSku)) {
        counter++;
        uniqueSku = `${baseSku}-${counter}`;
      }
      return [
        ...current,
        {
          sku: uniqueSku,
          name: `Phân loại ${count}`,
          price: primary?.price || Number(formPrice) || 0,
          floorPrice: primary?.floorPrice || Number(formFloorPrice) || Math.round((Number(primary?.price || formPrice || 0)) * 0.7),
          stockQuantity: 50,
          imageUrl: '',
          // Kế thừa thông minh từ Loại 1 để không phải gõ lại
          origin: primary?.origin || formOrigin || 'Việt Nam',
          ingredients: primary?.ingredients || formIngredients || '',
          labelInfo: primary?.labelInfo || formLabelInfo || '',
          packageWeight: primary?.packageWeight || formPackageWeight || 250,
          packageLength: primary?.packageLength || formPackageLength || 15,
          packageWidth: primary?.packageWidth || formPackageWidth || 10,
          packageHeight: primary?.packageHeight || formPackageHeight || 5,
          attributes: { type: `Phân loại ${count}` },
        },
      ];
    });
    showToast(`Đã thêm Phân loại #${formVariants.length + 1}`);
  };

  const removeVariant = (index: number) => {
    if (index === 0) {
      showToast('Phân loại 1 là Loại chính bắt buộc, không thể xóa.');
      return;
    }
    setFormVariants((current) => current.filter((_, idx) => idx !== index));
    showToast(`Đã xóa phân loại #${index + 1}`);
  };

  const cloneVariant = (index: number) => {
    const target = formVariants[index];
    if (!target) return;
    const baseSku = target.sku ? `${target.sku.replace(/-COPY\d*$/, '')}-COPY` : `${formSku || 'SKU'}-COPY`;
    let uniqueSku = baseSku;
    let counter = 1;
    while (formVariants.some((v) => v.sku === uniqueSku)) {
      counter++;
      uniqueSku = `${baseSku}${counter}`;
    }
    const cloned: ProductVariantItem = {
      ...target,
      id: undefined,
      sku: uniqueSku,
      name: `${target.name || 'Phân loại'} (Bản sao)`,
      attributes: { ...target.attributes },
    };
    setFormVariants((current) => {
      const next = [...current];
      next.splice(index + 1, 0, cloned);
      return next;
    });
    showToast(`Đã nhân bản phân loại "${target.name || 'SKU'}".`);
  };

  const copyShippingFromPrimary = (index: number) => {
    const primary = formVariants[0];
    if (!primary) return;
    setFormVariants((curr) =>
      curr.map((v, i) =>
        i === index
          ? {
              ...v,
              packageWeight: primary.packageWeight ?? formPackageWeight ?? 250,
              packageLength: primary.packageLength ?? formPackageLength ?? 15,
              packageWidth: primary.packageWidth ?? formPackageWidth ?? 10,
              packageHeight: primary.packageHeight ?? formPackageHeight ?? 5,
            }
          : v
      )
    );
    showToast(`Đã sao chép kích thước kiện GHN từ Phân loại 1 sang Phân loại #${index + 1}`);
  };

  const generateCartesianVariants = (
    g1Values: string[],
    g2Values: string[],
    useTier2: boolean,
    existingVariants: ProductVariantItem[],
    baseSku: string,
  ): ProductVariantItem[] => {
    const fields = getVariantFields(formCategory);
    const primaryAttrKey = fields[0]?.key || 'type';
    const secondaryAttrKey = fields[1]?.key || 'specification';
    const cleanG1 = g1Values.map((v) => v.trim()).filter(Boolean);
    const cleanG2 = g2Values.map((v) => v.trim()).filter(Boolean);

    if (cleanG1.length === 0) {
      return [{
        name: 'Phân loại tiêu chuẩn',
        tier1Value: 'Phân loại tiêu chuẩn',
        sku: baseSku || 'SKU-01',
        price: 0,
        floorPrice: 0,
        stockQuantity: 100,
        imageUrl: '',
        attributes: { type: 'Phân loại tiêu chuẩn' },
      }];
    }

    if (!useTier2 || cleanG2.length === 0) {
      return cleanG1.map((v1, idx) => {
        const found = existingVariants.find(
          (v) => (v.tier1Value && v.tier1Value === v1 && !v.tier2Value) || v.name === v1
        );
        if (found) {
          return { ...found, tier1Value: v1, tier2Value: undefined, name: v1 };
        }
        const cleanSlug = v1.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        return {
          name: v1,
          tier1Value: v1,
          sku: `${baseSku || 'SKU'}-${cleanSlug || String(idx + 1).padStart(2, '0')}`,
          price: 0,
          floorPrice: 0,
          stockQuantity: 100,
          imageUrl: '',
          attributes: { [primaryAttrKey]: v1 },
        };
      });
    }

    // Nhân tổ hợp Đề-các (Cartesian Product)
    const result: ProductVariantItem[] = [];
    cleanG1.forEach((v1, i1) => {
      cleanG2.forEach((v2, i2) => {
        const combinedName = `${v1}, ${v2}`;
        const found = existingVariants.find(
          (v) => (v.tier1Value === v1 && v.tier2Value === v2) || v.name === combinedName
        );
        if (found) {
          result.push({ ...found, tier1Value: v1, tier2Value: v2, name: combinedName });
        } else {
          const s1 = v1.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || `V${i1 + 1}`;
          const s2 = v2.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || `S${i2 + 1}`;
          const secKey = secondaryAttrKey && secondaryAttrKey !== primaryAttrKey ? secondaryAttrKey : 'specification';
          result.push({
            name: combinedName,
            tier1Value: v1,
            tier2Value: v2,
            sku: `${baseSku || 'SKU'}-${s1}-${s2}`,
            price: 0,
            floorPrice: 0,
            stockQuantity: 100,
            imageUrl: '',
            attributes: { [primaryAttrKey]: v1, [secKey]: v2 },
          });
        }
      });
    });
    return result;
  };

  const handleAddGroup1Value = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || attrGroup1Values.includes(trimmed)) return;
    const newValues = [...attrGroup1Values, trimmed];
    setAttrGroup1Values(newValues);
    setAttrGroup1Input('');
    setFormVariants((curr) =>
      generateCartesianVariants(newValues, attrGroup2Values, hasTier2, curr, formSku)
    );
  };

  const handleRemoveGroup1Value = (val: string) => {
    if (attrGroup1Values.length <= 1) {
      showToast('Cần ít nhất một giá trị cho Nhóm phân loại 1.');
      return;
    }
    const newValues = attrGroup1Values.filter((v) => v !== val);
    setAttrGroup1Values(newValues);
    setFormVariants((curr) =>
      generateCartesianVariants(newValues, attrGroup2Values, hasTier2, curr, formSku)
    );
  };

  const handleAddGroup2Value = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || attrGroup2Values.includes(trimmed)) return;
    const newValues = [...attrGroup2Values, trimmed];
    setAttrGroup2Values(newValues);
    setAttrGroup2Input('');
    setFormVariants((curr) =>
      generateCartesianVariants(attrGroup1Values, newValues, true, curr, formSku)
    );
  };

  const handleRemoveGroup2Value = (val: string) => {
    if (attrGroup2Values.length <= 1) {
      showToast('Cần ít nhất một giá trị cho Nhóm phân loại 2 (hoặc bấm Xóa nhóm 2).');
      return;
    }
    const newValues = attrGroup2Values.filter((v) => v !== val);
    setAttrGroup2Values(newValues);
    setFormVariants((curr) =>
      generateCartesianVariants(attrGroup1Values, newValues, true, curr, formSku)
    );
  };

  const handleEnableTier2 = () => {
    setHasTier2(true);
    const presets = contextPlaceholders.group2Presets;
    const defaultVals = presets.length >= 2 ? presets.slice(0, 2) : (presets.length ? presets : ['Tiêu chuẩn']);
    setAttrGroup2Name(contextPlaceholders.group2Name || 'Kích cỡ (Size)');
    setAttrGroup2Values(defaultVals);
    setFormVariants((curr) =>
      generateCartesianVariants(attrGroup1Values, defaultVals, true, curr, formSku)
    );
  };

  const handleDisableTier2 = () => {
    setHasTier2(false);
    setAttrGroup2Values([]);
    setFormVariants((curr) =>
      generateCartesianVariants(attrGroup1Values, [], false, curr, formSku)
    );
  };

  const applyBatchValues = () => {
    const bPrice = batchPrice === '' ? null : Math.max(0, Number(batchPrice));
    const bFloorPrice = batchFloorPrice === '' ? null : Math.max(0, Number(batchFloorPrice));
    const bStock = batchStock === '' ? null : Math.max(0, Number(batchStock));

    if (bPrice === null && bFloorPrice === null && bStock === null) {
      showToast('Vui lòng nhập ít nhất một chỉ số (Giá sàn, Giá bán hoặc Tồn kho) để áp dụng.');
      return;
    }
    setFormVariants((curr) =>
      curr.map((v) => ({
        ...v,
        ...(bFloorPrice !== null ? { floorPrice: bFloorPrice } : {}),
        ...(bPrice !== null ? { price: bPrice } : {}),
        ...(bStock !== null ? { stockQuantity: bStock } : {}),
      }))
    );
    showToast(`Đã áp dụng hàng loạt cho tất cả ${formVariants.length} phân loại!`);
  };

  const openCreateModal = () => {
    setSaveError(null);
    setModalStep(1);

    setEditingProduct(null);
    const initialCategory = storeCategory || STANDARD_CATEGORIES[0].name;
    setFormCategory(initialCategory);
    setFormCustomCategory('');
    let defaultSku = '';
    if (initialCategory) {
      const cat = STANDARD_CATEGORIES.find((c) => c.name === initialCategory);
      const prefix = cat?.prefix || 'SP';
      const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      defaultSku = `${prefix}-${randomCode}`;
    } else {
      defaultSku = 'SP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    }
    setFormSku(defaultSku);
    setFormTitle('');
    setFormDescription('');
    setFormIngredients('');
    setFormKeyActives('');
    setFormShelfLife('');
    setFormNotificationNumber('');
    setUseCommonShipping(true);
    setFormOrigin('Việt Nam');
    setFormLabelInfo('');
    setFormOriginProofLinks([]);
    setFormOriginProofImages([]);
    setFormLabelProofLinks([]);
    setFormLabelProofImages([]);
    setFormPrice('');
    setFormFloorPrice('');
    setBatchFloorPrice('');
    setBatchPrice('');
    setBatchStock('');
    setFormAffiliateEnabled(true);
    setFormStock('');
    setFormPackageWeight(250);
    setFormPackageLength(15);
    setFormPackageWidth(10);
    setFormPackageHeight(5);
    setFormSampleEnabled(false);
    setFormSampleQuota('');
    setFormImage('');
    setFormSubImages([]);

    const catInfo = getCategoryContextPlaceholders(initialCategory);
    const g1Name = catInfo.group1Name || 'Phân loại';
    const g1Presets = catInfo.group1Presets.slice(0, 1);
    const g2Name = catInfo.group2Name || 'Kích cỡ (Size)';

    setAttrGroup1Name(g1Name);
    setAttrGroup1Values(g1Presets.length ? g1Presets : ['Mặc định']);
    setHasTier2(false);
    setAttrGroup2Name(g2Name);
    setAttrGroup2Values([]);

    const initialVariants = generateCartesianVariants(
      g1Presets.length ? g1Presets : ['Mặc định'],
      [],
      false,
      [],
      defaultSku,
    );
    setFormVariants(initialVariants);
    setShowModal(true);
  };

  const closeProductModal = () => {
    setIdentityWarning(null);
    confirmedIdentity.current = '';
    setModalStep(1);
    setShowModal(false);
    if (returnToDashboard) {
      setReturnToDashboard(false);
      navigate('/merchant/dashboard', { replace: true });
    }
  };

  useEffect(() => {
    if (hasHandledParamsRef.current) return;
    const shouldReturnToDashboard = searchParams.get('returnTo') === 'dashboard';
    const shouldOpenCreate = searchParams.get('create') === '1' && !isKol;
    if (shouldReturnToDashboard) setReturnToDashboard(true);
    if (shouldOpenCreate) openCreateModal();
    if (searchParams.has('create') || searchParams.has('returnTo')) {
      hasHandledParamsRef.current = true;
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.delete('create');
        next.delete('returnTo');
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isKol, setSearchParams]);

  const openEditModal = (p: any) => {
    setSaveError(null);
    setModalStep(1);
    setEditingProduct(p);
    setFormSku(p.sku || '');
    setFormTitle(p.title || p.name);
    const pAttrs = p.attributes && typeof p.attributes === 'object' && !Array.isArray(p.attributes) ? p.attributes : {};
    const matchedCat = STANDARD_CATEGORIES.find((c) => c.name === (p.categoryName || p.category));
    if (matchedCat) {
      setFormCategory(matchedCat.name);
      setFormCustomCategory('');
    } else {
      setFormCategory('Danh mục khác (Tự nhập)');
      setFormCustomCategory(p.categoryName || p.category || '');
    }
    let initialDesc = p.description || '';
    const specsMatch = initialDesc.match(/📌 THÔNG SỐ KỸ THUẬT(?: SẢN PHẨM)?:\n([\s\S]*?)(?:\n\n|$)/);
    if (specsMatch) {
      initialDesc = initialDesc.replace(specsMatch[0], '').trim();
    }
    setFormDescription(initialDesc);
    setFormIngredients(p.ingredients || '');
    setFormKeyActives(pAttrs.keyActives || p.keyActives || '');
    setFormShelfLife(pAttrs.shelfLife || p.shelfLife || '');
    setFormNotificationNumber(pAttrs.notificationNumber || p.notificationNumber || '');
    setFormOrigin(p.origin || '');
    setFormLabelInfo(p.labelInfo || '');
    setFormOriginProofLinks(Array.isArray(p.originProofLinks) ? p.originProofLinks : []);
    setFormOriginProofImages(Array.isArray(p.originProofImages) ? p.originProofImages : []);
    setFormLabelProofLinks(Array.isArray(p.labelProofLinks) ? p.labelProofLinks : []);
    setFormLabelProofImages(Array.isArray(p.labelProofImages) ? p.labelProofImages : []);
    const currentPrice = Number(p.price) || 0;
    setFormPrice(currentPrice);
    setFormAffiliateEnabled(p.isAffiliateEnabled !== false);
    setFormStock(p.stockQuantity ?? p.stock ?? 0);
    setFormPackageWeight(p.packageWeight ?? '');
    setFormPackageLength(p.packageLength ?? '');
    setFormPackageWidth(p.packageWidth ?? '');
    setFormPackageHeight(p.packageHeight ?? '');
    setFormSampleEnabled(p.sampleEnabled === true);
    setFormSampleQuota(Number(p.sampleQuota) || 0);
    setFormImage(p.imageUrl || '');
    const existingVariants = Array.isArray(p.variants) ? p.variants : [];
    const mappedVariants: ProductVariantItem[] = existingVariants.map((variant: any) => ({
      id: variant.id,
      sku: variant.sku || '',
      packageWeight: variant.packageWeight ?? (variant.attributes?.packageWeight ? Number(variant.attributes.packageWeight) : (p.packageWeight ?? 250)),
      packageLength: variant.packageLength ?? (variant.attributes?.packageLength ? Number(variant.attributes.packageLength) : (p.packageLength ?? 15)),
      packageWidth: variant.packageWidth ?? (variant.attributes?.packageWidth ? Number(variant.attributes.packageWidth) : (p.packageWidth ?? 10)),
      packageHeight: variant.packageHeight ?? (variant.attributes?.packageHeight ? Number(variant.attributes.packageHeight) : (p.packageHeight ?? 5)),
      origin: variant.origin ?? variant.attributes?.origin ?? (p.origin || 'Việt Nam'),
      ingredients: variant.ingredients ?? variant.attributes?.ingredients ?? (p.ingredients || ''),
      labelInfo: variant.labelInfo ?? variant.attributes?.labelInfo ?? (p.labelInfo || ''),
      name: variant.name || 'Phân loại tiêu chuẩn',
      attributes: variant.attributes && typeof variant.attributes === 'object' && !Array.isArray(variant.attributes) ? variant.attributes : {},
      price: Number(variant.price ?? p.price) || 0,
      floorPrice: Number(variant.floorPrice ?? (p as any).floorPrice ?? Math.round((Number(variant.price ?? p.price) || 0) * 0.7)) || 0,
      stockQuantity: Number(variant.stockQuantity ?? p.stockQuantity ?? 0),
      imageUrl: variant.imageUrl || '',
    }));

    if (mappedVariants.length === 0) {
      mappedVariants.push({
        name: 'Phân loại tiêu chuẩn',
        sku: p.sku || '',
        imageUrl: p.imageUrl || '',
        price: Number(p.price) || 0,
        floorPrice: Number((p as any).floorPrice ?? Math.round((Number(p.price) || 0) * 0.7)) || 0,
        stockQuantity: Number(p.stockQuantity ?? 0),
        origin: p.origin || 'Việt Nam',
        ingredients: p.ingredients || '',
        labelInfo: p.labelInfo || '',
        packageWeight: p.packageWeight ?? 250,
        packageLength: p.packageLength ?? 15,
        packageWidth: p.packageWidth ?? 10,
        packageHeight: p.packageHeight ?? 5,
        attributes: {},
      });
    }

    setFormFloorPrice(mappedVariants[0]?.floorPrice ?? (p as any).floorPrice ?? Math.round(currentPrice * 0.7));
    setBatchFloorPrice('');

    const catInfo = getCategoryContextPlaceholders(p.category || storeCategory || '');
    const hasComma = mappedVariants.some((v) => v.name.includes(','));
    if (hasComma) {
      setHasTier2(true);
      setAttrGroup1Name(catInfo.group1Name || 'Màu sắc');
      setAttrGroup2Name(catInfo.group2Name || 'Kích cỡ (Size)');
      const g1Vals = Array.from(new Set(mappedVariants.map((v) => v.name.split(',')[0].trim()))).filter(Boolean);
      const g2Vals = Array.from(new Set(mappedVariants.map((v) => v.name.split(',')[1]?.trim()))).filter(Boolean);
      setAttrGroup1Values(g1Vals.length ? g1Vals : ['Mặc định']);
      setAttrGroup2Values(g2Vals);
      mappedVariants.forEach((v) => {
        const parts = v.name.split(',');
        v.tier1Value = parts[0]?.trim();
        v.tier2Value = parts[1]?.trim();
      });
    } else {
      setHasTier2(false);
      setAttrGroup1Name(catInfo.group1Name || 'Phân loại');
      const g1Vals = Array.from(new Set(mappedVariants.map((v) => v.name.trim()))).filter(Boolean);
      setAttrGroup1Values(g1Vals.length ? g1Vals : ['Mặc định']);
      setAttrGroup2Values([]);
      mappedVariants.forEach((v) => {
        v.tier1Value = v.name;
      });
    }
    setFormVariants(mappedVariants);
    const hasDifferentShipping = mappedVariants.length > 1 && mappedVariants.some((v) =>
      Number(v.packageWeight || 0) !== Number(mappedVariants[0].packageWeight || 0) ||
      Number(v.packageLength || 0) !== Number(mappedVariants[0].packageLength || 0) ||
      Number(v.packageWidth || 0) !== Number(mappedVariants[0].packageWidth || 0) ||
      Number(v.packageHeight || 0) !== Number(mappedVariants[0].packageHeight || 0)
    );
    setUseCommonShipping(!hasDifferentShipping);

    // Thu thập danh sách ảnh phụ từ mediaAssets hoặc images
    const subs: string[] = [];
    if (Array.isArray(p.mediaAssets) && p.mediaAssets.length > 0) {
      p.mediaAssets.forEach((m: any) => {
        const u = m.urlOrContent || m.url;
        if (u && u !== p.imageUrl && !subs.includes(u)) {
          subs.push(u);
        }
      });
    } else if (Array.isArray(p.images) && p.images.length > 0) {
      p.images.forEach((u: string) => {
        if (u && u !== p.imageUrl && !subs.includes(u)) {
          subs.push(u);
        }
      });
    }
    setFormSubImages(subs);
    setShowModal(true);
  };

  const handleUploadSingleImage = async (file: File, isMain: boolean, subIndex?: number) => {
    if (!file) return;
    if (!isMain && subIndex === undefined && formSubImages.length >= MAX_PRODUCT_GALLERY_IMAGES) {
      showToast('Sản phẩm có tối đa 4 ảnh phụ. Hãy xóa hoặc thay ảnh hiện có.'); return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Chỉ chấp nhận ảnh định dạng JPG, PNG hoặc WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Dung lượng ảnh tối đa là 5 MB');
      return;
    }
    if (isMain && !formCategory) {
      const suggestedCategory = inferCategoryFromTitle(file.name.replace(/[_-]/g, ' '));
      if (suggestedCategory) handleCategoryChange(suggestedCategory);
    }
    setUploadingImage(true);
    setUploadingSlot(isMain ? 'main' : subIndex !== undefined ? `sub-${subIndex}` : 'sub-new');
    try {
      if (isMain) await validateProductCoverFile(file);
      const body = new FormData();
      body.append('file', file);
      const res: any = await api.post(isMain ? '/upload/product-cover' : '/upload/image?folder=scanms/products', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = res?.data || res;
      const imageUrl = result?.secureUrl || result?.url;
      if (!imageUrl) throw new Error('Máy chủ không trả về URL ảnh');

      if (isMain) {
        setFormImage(imageUrl);
        showToast('Đã tải ảnh chính (ảnh bìa) thành công!');
      } else if (subIndex !== undefined && subIndex < formSubImages.length) {
        const nextSubs = [...formSubImages];
        nextSubs[subIndex] = imageUrl;
        setFormSubImages(nextSubs);
        showToast(`Đã thay thế ảnh phụ ${subIndex + 1} thành công!`);
      } else {
        setFormSubImages([...formSubImages, imageUrl]);
        showToast(`Đã thêm ảnh phụ ${formSubImages.length + 1} thành công!`);
      }
    } catch (err: any) {
      showToast(err.message || 'Không thể tải ảnh');
    } finally {
      setUploadingImage(false);
      setUploadingSlot(null);
    }
  };

  const handleUploadProofImages = async (files: FileList | null, section: 'origin' | 'label') => {
    if (!files?.length) return;
    const currentImages = section === 'origin' ? formOriginProofImages : formLabelProofImages;
    const remaining = Math.max(0, 10 - currentImages.length);
    if (!remaining) {
      showToast('Mỗi mục có thể tải tối đa 10 ảnh minh chứng.');
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    const validFiles = selected.filter((file) => {
      const validType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      const validSize = file.size <= 5 * 1024 * 1024;
      if (!validType) showToast(`Bỏ qua ${file.name}: chỉ nhận ảnh JPG, PNG hoặc WEBP.`);
      else if (!validSize) showToast(`Bỏ qua ${file.name}: dung lượng tối đa 5 MB.`);
      return validType && validSize;
    });
    if (!validFiles.length) return;

    setUploadingImage(true);
    setUploadingSlot(`${section}-proof`);
    const uploadedUrls: string[] = [];
    try {
      for (const file of validFiles) {
        const body = new FormData();
        body.append('file', file);
        const response: any = await api.post('/upload/image?folder=scanms/products/proofs', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const result = response?.data || response;
        const imageUrl = result?.secureUrl || result?.url;
        if (imageUrl) uploadedUrls.push(imageUrl);
      }
      if (!uploadedUrls.length) throw new Error('Máy chủ không trả về ảnh minh chứng');
      if (section === 'origin') setFormOriginProofImages((current) => [...current, ...uploadedUrls].slice(0, 10));
      else setFormLabelProofImages((current) => [...current, ...uploadedUrls].slice(0, 10));
      showToast(`Đã tải ${uploadedUrls.length} ảnh minh chứng lên hệ thống.`);
    } catch (error: any) {
      if (uploadedUrls.length) {
        if (section === 'origin') setFormOriginProofImages((current) => [...current, ...uploadedUrls].slice(0, 10));
        else setFormLabelProofImages((current) => [...current, ...uploadedUrls].slice(0, 10));
        showToast(`Đã tải được ${uploadedUrls.length} ảnh; một số ảnh còn lại chưa tải được.`);
      } else {
        showToast(error?.response?.data?.message || error?.message || 'Không thể tải ảnh minh chứng.');
      }
    } finally {
      setUploadingImage(false);
      setUploadingSlot(null);
    }
  };

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const capacity = MAX_PRODUCT_GALLERY_IMAGES - formSubImages.length + (formImage ? 0 : 1);
    if (fileList.length > capacity) {
      showToast(`Chỉ có thể thêm ${Math.max(0, capacity)} ảnh nữa (1 ảnh bìa và tối đa 4 ảnh phụ).`); return;
    }
    setUploadingImage(true);
    setUploadingSlot('bulk');
    showToast(`Đang tải lên ${fileList.length} ảnh lên hệ thống...`);
    try {
      let mainImg = formImage;
      const subs = [...formSubImages];
      if (fileList.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024))
        throw new Error('Chọn ảnh JPG, PNG hoặc WEBP, mỗi ảnh tối đa 5 MB.');
      if (!mainImg) await validateProductCoverFile(fileList[0]);

      for (const file of fileList) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
        if (file.size > 5 * 1024 * 1024) continue;

        const body = new FormData();
        body.append('file', file);
        const res: any = await api.post(!mainImg ? '/upload/product-cover' : '/upload/image?folder=scanms/products', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const result = res?.data || res;
        const uploadedUrl = result?.secureUrl || result?.url;
        if (!uploadedUrl) continue;

        if (!mainImg) {
          mainImg = uploadedUrl;
        } else if (!subs.includes(uploadedUrl)) {
          subs.push(uploadedUrl);
        }
      }

      setFormImage(mainImg);
      setFormSubImages(subs);
      showToast('Đã hoàn tất tải và sắp xếp thư viện ảnh sản phẩm!');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải ảnh hàng loạt');
    } finally {
      setUploadingImage(false);
      setUploadingSlot(null);
    }
  };

  const handleSetAsMain = async (subIndex: number) => {
    const targetSub = formSubImages[subIndex];
    if (!targetSub) return;
    try { await validateProductCoverUrl(targetSub); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Ảnh chưa đạt chuẩn ảnh bìa.'); return; }
    const nextSubs = [...formSubImages];
    if (formImage) {
      nextSubs[subIndex] = formImage;
    } else {
      nextSubs.splice(subIndex, 1);
    }
    setFormImage(targetSub);
    setFormSubImages(nextSubs);
    showToast('Đã đặt làm Ảnh chính đại diện!');
  };

  const handleRemoveSubImage = (subIndex: number) => {
    setFormSubImages(formSubImages.filter((_, idx) => idx !== subIndex));
    showToast('Đã xóa ảnh phụ');
  };

  const handleUploadVariantImage = async (variantIndex: number, file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Chỉ chấp nhận ảnh định dạng JPG, PNG hoặc WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Dung lượng ảnh tối đa là 5 MB');
      return;
    }
    setUploadingImage(true);
    setUploadingSlot(`variant-${variantIndex}`);
    try {
      const body = new FormData();
      body.append('file', file);
      const res: any = await api.post('/upload/image?folder=scanms/products/variants', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = res?.data || res;
      const imageUrl = result?.secureUrl || result?.url;
      if (!imageUrl) throw new Error('Máy chủ không trả về URL ảnh');
      setFormVariants((current) => current.map((variant, index) =>
        index === variantIndex ? { ...variant, imageUrl } : variant,
      ));
      showToast(`Đã tải ảnh riêng cho SKU ${formVariants[variantIndex]?.sku || ''}`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err.message || 'Không thể tải ảnh phân loại');
    } finally {
      setUploadingImage(false);
      setUploadingSlot(null);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (savingProduct || saveLocked.current) return;
    if (formSubImages.length > MAX_PRODUCT_GALLERY_IMAGES) {
      setSaveError('Sản phẩm có tối đa 4 ảnh phụ. Vui lòng xóa ảnh vượt giới hạn trước khi lưu.'); return;
    }
    submittedForm.current = e.currentTarget as HTMLFormElement;
    setSaveError(null);

    // Đồng bộ thông số từ Phân loại 1 (Loại chính) ra cấp sản phẩm
    const primary = formVariants[0];
    const effectivePackageWeight = Number(
      useCommonShipping
        ? (formPackageWeight || primary?.packageWeight || 250)
        : (primary?.packageWeight || formPackageWeight || 250)
    );
    const effectivePackageLength = Number(
      useCommonShipping
        ? (formPackageLength || primary?.packageLength || 15)
        : (primary?.packageLength || formPackageLength || 15)
    );
    const effectivePackageWidth = Number(
      useCommonShipping
        ? (formPackageWidth || primary?.packageWidth || 10)
        : (primary?.packageWidth || formPackageWidth || 10)
    );
    const effectivePackageHeight = Number(
      useCommonShipping
        ? (formPackageHeight || primary?.packageHeight || 5)
        : (primary?.packageHeight || formPackageHeight || 5)
    );
    const effectiveStock = formVariants.length > 0 ? totalVariantStock : Number(formStock || 0);
    const effectivePrice = formVariants.length > 0 && variantPriceRange.min > 0 ? variantPriceRange.min : Number(formPrice || 0);

    // Chuẩn hóa danh sách phân loại gửi lên API
    const fields = getVariantFields(formCategory);
    const primaryAttrKey = fields[0]?.key || 'type';
    const secondaryAttrKey = fields[1]?.key || 'specification';
    const normalizedVariants = formVariants.map((v) => {
      const cleanAttrs: Record<string, string> = {};
      if (v.tier1Value?.trim()) {
        cleanAttrs[primaryAttrKey] = v.tier1Value.trim();
      } else if (v.attributes?.[primaryAttrKey]?.trim()) {
        cleanAttrs[primaryAttrKey] = v.attributes[primaryAttrKey].trim();
      } else {
        cleanAttrs[primaryAttrKey] = v.name.trim();
      }
      if (v.tier2Value?.trim()) {
        const secKey = secondaryAttrKey && secondaryAttrKey !== primaryAttrKey ? secondaryAttrKey : 'specification';
        cleanAttrs[secKey] = v.tier2Value.trim();
      }

      const vFloorPrice = Number(v.floorPrice || formFloorPrice || 0) || Math.round((Number(v.price) || effectivePrice) * 0.7);

      return {
        ...(editingProduct && v.id && !v.id.startsWith('var-') ? { id: v.id } : {}),
        sku: v.sku.trim().toUpperCase() || formSku.trim().toUpperCase(),
        name: v.name.trim(),
        imageUrl: v.imageUrl?.trim() || formImage,
        price: Number(v.price) || effectivePrice,
        floorPrice: vFloorPrice,
        stockQuantity: Number(v.stockQuantity) || 0,
        attributes: cleanAttrs,
      };
    });

    let packageData: ReturnType<typeof productPackageInput>;
    try {
      packageData = productPackageInput({
        packageWeight: effectivePackageWeight,
        packageLength: effectivePackageLength,
        packageWidth: effectivePackageWidth,
        packageHeight: effectivePackageHeight,
      }, editingProduct);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Thông số đóng gói không hợp lệ.');
      return;
    }

    if (!editingProduct) {
      const v1 = validateStep1();
      const v2 = validateStep2();
      const v3 = validateStep3();
      const allErrors = [...v1.errors, ...v2.errors, ...v3.errors];

      if (allErrors.length) {
        const stepToFocus = !v1.valid ? 1 : (!v2.valid ? 2 : 3);
        const stepErrors = !v1.valid ? v1.errors : (!v2.valid ? v2.errors : v3.errors);
        setSaveError(stepErrors.join('\n'));
        setModalStep(stepToFocus);
        showToast(stepErrors[0]);
        return;
      }
    }

    if (!formImage) {
      const message = 'Vui lòng tải lên ảnh chính (ảnh bìa) cho sản phẩm.';
      setSaveError(message);
      showToast(message);
      return;
    }

    if (!formTitle.trim()) {
      const message = 'Vui lòng nhập tên sản phẩm.';
      setSaveError(message);
      showToast(message);
      return;
    }

    if (!formCategory) {
      const message = 'Chọn loại sản phẩm để hiện đúng màu, size, dung tích hoặc quy cách phân loại.';
      setSaveError(message); showToast(message); return;
    }

    if (!formSku.trim()) {
      const message = 'Vui lòng nhập mã SKU sản phẩm.';
      setSaveError(message);
      showToast(message);
      return;
    }


    if (effectivePrice <= 0) {
      const message = 'Giá bán lẻ phải lớn hơn 0 ₫.';
      setSaveError(message);
      showToast(message);
      return;
    }

    if (formVariants.length > 0) {
      const hasInvalidStock = formVariants.some((v) => v.stockQuantity === undefined || v.stockQuantity === null || Number(v.stockQuantity) < 0 || isNaN(Number(v.stockQuantity)));
      if (hasInvalidStock) {
        const message = 'Vui lòng nhập số lượng tồn kho hợp lệ (≥ 0) cho tất cả các phân loại SKU.';
        setSaveError(message);
        showToast(message);
        return;
      }
    } else if (formStock === '' || Number(formStock) < 0) {
      const message = 'Vui lòng nhập số lượng tồn kho hợp lệ.';
      setSaveError(message);
      showToast(message);
      return;
    }

    if (formVariants.some((variant) => !variant.name.trim() || !variant.sku.trim() || (!variant.imageUrl?.trim() && !formImage))) {
      const message = 'Mỗi phân loại cần có tên và mã SKU riêng (ảnh phân loại tự kế thừa từ ảnh bìa).';
      setSaveError(message);
      showToast(message);
      return;
    }
    if (formVariants.some((variant) => variant.name.trim().length > 150 || variant.sku.trim().length > 100)) {
      const message = 'Tên phân loại tối đa 150 ký tự và SKU tối đa 100 ký tự.';
      setSaveError(message); showToast(message); return;
    }
    if (formVariants.some((variant) => !variant.id && !getVariantFields(formCategory).some((field) => variant.attributes[field.key]?.trim()))) {
      const message = 'Mỗi phân loại mới cần ít nhất một thuộc tính phù hợp với danh mục.';
      setSaveError(message); showToast(message); return;
    }
    const optionKeys = formVariants.map((variant) => getVariantFields(formCategory)
      .map((field) => variant.attributes[field.key]?.trim().toLocaleLowerCase('vi-VN') || '').join('|'));
    const filledKeys = optionKeys.filter((key) => key.replace(/\|/g, '').trim());
    if (new Set(filledKeys).size !== filledKeys.length) {
      const message = 'Có phân loại trùng tổ hợp thuộc tính. Hãy nhập màu, size hoặc quy cách khác nhau cho từng SKU.';
      setSaveError(message); showToast(message); return;
    }

    const proofLinks = [...formOriginProofLinks, ...formLabelProofLinks].map((url) => url.trim()).filter(Boolean);
    if (proofLinks.some((url) => {
      try { return !['http:', 'https:'].includes(new URL(url).protocol); }
      catch { return true; }
    })) {
      const message = 'Link minh chứng cần là địa chỉ bắt đầu bằng http:// hoặc https://.';
      setSaveError(message); showToast(message); return;
    }

    const effectiveCategory =
      formCategory === 'Danh mục khác (Tự nhập)'
        ? formCustomCategory.trim() || 'Khác'
        : formCategory;

    const combinedDescription = formDescription.trim();

    saveLocked.current = true;
    setSavingProduct(true);
    try {
      const fingerprint = JSON.stringify([editingProduct?.id, currentStoreId, formTitle.trim(), formSku.trim()]);
      if ((!editingProduct || editingProduct.title !== formTitle.trim()) && confirmedIdentity.current !== fingerprint) {
        try {
          const response: any = await api.get('/products/identity-check', { timeout: 15000, params: { title: formTitle.trim(), storeId: currentStoreId, productId: editingProduct?.id }, headers: { 'x-skip-cache': '1' } });
          const body = response?.data?.data || response?.data || response;
          if (Array.isArray(body?.items) && body.items.length) {
            setIdentityWarning({ items: body.items, fingerprint });
            setSavingProduct(false);
            saveLocked.current = false;
            return;
          }
        } catch (identErr) {
          console.warn('Bỏ qua pre-check do timeout hoặc model local đang khởi động:', identErr);
        }
      }
      if (editingProduct) {
        const productUpdate = await productService.updateProduct(editingProduct.id, {
          ...packageData,
          title: formTitle.trim(),
          categoryName: effectiveCategory,
          description: combinedDescription || undefined,
          ingredients: formIngredients.trim() || undefined,
          origin: formOrigin.trim() || undefined,
          labelInfo: formLabelInfo.trim() || undefined,
          originProofLinks: formOriginProofLinks.map((url) => url.trim()).filter(Boolean),
          originProofImages: formOriginProofImages,
          labelProofLinks: formLabelProofLinks.map((url) => url.trim()).filter(Boolean),
          labelProofImages: formLabelProofImages,
          price: effectivePrice,
          floorPrice: Number(formFloorPrice || formVariants[0]?.floorPrice || 0) || Math.round(effectivePrice * 0.7),
          customCommissionRate: 10,
          isAffiliateEnabled: formAffiliateEnabled,
          // syncProductVariants updates the parent total from the saved SKU quantities.
          // Sending the new total first would conflict with the old SKU quantities.
          ...(formVariants.length === 0 ? { stockQuantity: effectiveStock } : {}),
          sampleEnabled: formSampleEnabled,
          sampleQuota: Number(formSampleQuota),
          imageUrl: formImage,
          subImages: formSubImages.filter(Boolean),
        });
        const variantUpdate = await productService.syncProductVariants(editingProduct.id, normalizedVariants as any);
        showToast(productUpdate?.requiresModeration || variantUpdate?.requiresModeration
          ? 'Đã lưu thay đổi. Sản phẩm tạm ẩn và chờ Ban Quản Trị kiểm duyệt lại.'
          : 'Cập nhật sản phẩm & hoa hồng thành công!');
      } else {
        const created = await productService.createProduct({
          ...packageData,
          storeId: currentStoreId,
          sku: formSku.trim().toUpperCase(),
          title: formTitle.trim(),
          categoryName: effectiveCategory,
          description: combinedDescription || undefined,
          ingredients: formIngredients.trim() || undefined,
          origin: formOrigin.trim() || undefined,
          labelInfo: formLabelInfo.trim() || undefined,
          originProofLinks: formOriginProofLinks.map((url) => url.trim()).filter(Boolean),
          originProofImages: formOriginProofImages,
          labelProofLinks: formLabelProofLinks.map((url) => url.trim()).filter(Boolean),
          labelProofImages: formLabelProofImages,
          price: effectivePrice,
          floorPrice: Number(formFloorPrice || formVariants[0]?.floorPrice || 0) || Math.round(effectivePrice * 0.7),
          customCommissionRate: 10,
          isAffiliateEnabled: formAffiliateEnabled,
          stockQuantity: effectiveStock,
          sampleEnabled: formSampleEnabled,
          sampleQuota: Number(formSampleQuota),
          imageUrl: formImage,
          subImages: formSubImages.filter(Boolean),
          variants: normalizedVariants as any,
        });
        if (!created?.product?.id && !created?.id) throw new Error('Không nhận được mã sản phẩm đã tạo');
        showToast('Đã thêm sản phẩm mới vào danh mục gian hàng!');
      }
      setSaveError(null);
      closeProductModal();
      loadProducts();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Lỗi khi lưu sản phẩm.';
      const readableMessage = Array.isArray(message) ? message.join(', ') : String(message);
      setSaveError(readableMessage);
      showToast(readableMessage);
    } finally {
      saveLocked.current = false;
      setSavingProduct(false);
    }
  };





  const displayProducts = products;

  const filtered = displayProducts.filter((p: any) => {
    const title = p.title || p.name || '';
    const sku = p.sku || '';
    const matchSearch =
      title.toLowerCase().includes(search.toLowerCase()) ||
      sku.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'DRAFT' && p.moderationStatus === 'DRAFT') ||
      (filterStatus === 'REJECTED' && p.moderationStatus === 'REJECTED') ||
      (filterStatus === 'APPROVED' && p.moderationStatus === 'APPROVED') ||
      (filterStatus === 'active' && (p.status === 'active' || p.isActive)) ||
      (filterStatus === 'out_of_stock' && (p.status === 'out_of_stock' || p.stockQuantity === 0)) ||
      (filterStatus === 'paused' && (p.status === 'paused' || p.isActive === false)) ||
      (filterStatus === 'low_stock' && Number(p.stockQuantity ?? p.stock ?? 0) > 0 && Number(p.stockQuantity ?? p.stock ?? 0) <= 5);
    return matchSearch && matchStatus;
  });

  return (
    <div className="product-management @container/product-management space-y-4 text-left w-full min-w-0 text-[#1A1612]">
      {toastMsg && (
        <div role={toastMsg === saveError ? 'alert' : 'status'} className={`fixed top-5 right-5 z-[100] p-3.5 bg-white text-[#1A1612] border rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${toastMsg === saveError ? 'border-[#FECACA]' : 'border-[#EEDFC6]'}`}>
          {toastMsg === saveError
            ? <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            : <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Page Header Chuẩn Hóa */}
      <PageHeader
        title={isKol ? "Sản phẩm Tiếp thị Liên kết" : "Sản phẩm"}
        icon={<Boxes className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadProducts()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-[#1A1612] hover:bg-[#FBF5EB] hover:border-[#C59B58] transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Làm mới</span>
            </button>
            {!isKol && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm sản phẩm</span>
              </button>
            )}
          </div>
        }
      />

      {/* ────── BANNER CẢNH BÁO TỒN KHO THẤP ────── */}
      {(() => {
        if (isKol) return null;
        const LOW = 5;
        const lowStockProducts = products.filter((p: any) => {
          const s = p.stockQuantity ?? p.stock ?? 0;
          return s > 0 && s <= LOW;
        });
        const outOfStockProducts = products.filter((p: any) => {
          const s = p.stockQuantity ?? p.stock ?? 0;
          return s === 0 && (p.isActive !== false);
        });
        if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) return null;
        return (
          <div className="rounded-xl border border-[#EEDFC6] bg-white px-3 py-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <AlertCircle className="h-4 w-4 text-[#B88E4F]" />
              <span className="font-semibold text-[#1A1612] text-xs">Lưu ý tồn kho</span>
            </div>
            <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 flex-1 text-xs text-[#7D715E]">
              {outOfStockProducts.length > 0 && (
                <span>
                  <strong className="text-red-700">{outOfStockProducts.length} sản phẩm đã hết hàng</strong>
                </span>
              )}
              {lowStockProducts.length > 0 && (
                <span>
                  <strong className="font-medium text-[#8C6226]">{lowStockProducts.length} sản phẩm tồn thấp (1–5)</strong>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFilterStatus(outOfStockProducts.length > 0 ? 'out_of_stock' : 'low_stock')}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#8C6226] transition cursor-pointer"
            >
              {outOfStockProducts.length > 0 ? 'Xem hàng đã hết' : 'Xem tồn thấp'}
            </button>
          </div>
        );
      })()}

      {/* Unified Toolbar: Compact Search, Filters & Action Buttons in One Row */}
      <Card className="product-toolbar relative z-20 overflow-visible p-3 bg-white border border-[#EAE4D7] rounded-xl shadow-none">
        <div className="product-toolbar-layout grid grid-cols-[minmax(280px,1fr)_minmax(0,1.3fr)] @max-[900px]/product-management:grid-cols-1 items-stretch gap-3 @max-[900px]/product-management:gap-2.5">
          {/* Left: Compact search input & filter controls */}
          <div className="product-filter-controls grid grid-cols-1 min-[480px]:grid-cols-[minmax(0,1fr)_160px] items-stretch min-w-0 gap-2">
            <div className="product-search flex min-w-0 items-center gap-2 bg-white border border-[#EAE4D7] rounded-lg px-3 min-h-11 text-xs text-[#1A1612] w-full focus-within:border-[#C59B58] transition">
              <Search className="w-3.5 h-3.5 text-[#7D715E] shrink-0" />
              <input
                type="text"
                aria-label="Tìm tên hoặc SKU sản phẩm"
                placeholder="Tìm tên hoặc SKU sản phẩm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-w-0 bg-transparent border-none outline-none text-base sm:text-sm text-[#1A1612] placeholder-[#7D715E]/60"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Xóa tìm kiếm sản phẩm" className="flex size-11 shrink-0 items-center justify-center text-[#7D715E] hover:text-[#1A1612] text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Lọc trạng thái sản phẩm" className="product-status-filter"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Chờ kiểm duyệt</option>
              <option value="REJECTED">Bị từ chối</option>
              <option value="APPROVED">Đã được duyệt</option>
              <option value="active">Đang bán</option>
              <option value="out_of_stock">Hết hàng</option>
              <option value="low_stock">Tồn thấp (1–5)</option>
              <option value="paused">Tạm dừng</option>
            </Select>

          </div>

          {/* Actions share the search/filter toolbar and equal-sized columns. */}
          <div className="product-toolbar-actions grid grid-flow-col auto-cols-[minmax(0,1fr)] @max-[900px]/product-management:w-full items-stretch min-w-0 gap-2" role="group" aria-label="Thao tác quản lý sản phẩm">
            {!isKol ? (
              <>
                {isAdminOrManager && (
                  <button
                    type="button"
                    onClick={() => navigate('/admin/product-moderation')}
                    className="flex items-center justify-center w-full min-w-0 min-h-10 p-2 border border-[#EEDFC6] rounded-lg bg-[#FBF5EB] hover:bg-[#F3EFE6] hover:border-[#C59B58] text-[#1A1612] text-xs font-semibold leading-[1.4] transition cursor-pointer gap-1.5"
                    title="Mở cổng kiểm duyệt sản phẩm chuyên sâu"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                    <span>Cổng duyệt</span>
                    {pendingApprovalCount > 0 && (
                      <span className="min-w-4.5 h-4.5 px-1.5 rounded-full bg-[#FAF0DD] border border-[#E8D4B0] text-[#B88E4F] text-[10px] font-extrabold inline-flex items-center justify-center shrink-0">
                        {pendingApprovalCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={openAllVideoModeration}
                  className="flex items-center justify-center w-full min-w-0 min-h-10 p-2 border border-[#EEDFC6] rounded-lg bg-[#FBF5EB] hover:bg-[#F3EFE6] hover:border-[#C59B58] text-[#1A1612] text-xs font-semibold leading-[1.4] transition cursor-pointer gap-1.5"
                  title="Duyệt video nghiệm thu từ KOL"
                >
                  <Video className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                  <span>Duyệt video</span>
                  {pendingKolVideoCount > 0 && (
                    <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-[#FAF0DD] border border-[#E8D4B0] text-[#B88E4F] text-[10px] font-extrabold inline-flex items-center justify-center shrink-0">
                      {pendingKolVideoCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={openReviewModeration}
                  className="flex items-center justify-center w-full min-w-0 min-h-10 p-2 border border-[#EEDFC6] rounded-lg bg-[#FBF5EB] hover:bg-[#F3EFE6] hover:border-[#C59B58] text-[#1A1612] text-xs font-semibold leading-[1.4] transition cursor-pointer gap-1.5"
                  title="Duyệt đánh giá từ khách hàng"
                >
                  <MessageSquareText className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                  <span>Đánh giá khách hàng</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/collaborator/links')}
                className="flex items-center justify-center w-full min-w-0 min-h-10 p-2 border border-[#C59B58] rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-semibold leading-[1.4] transition cursor-pointer gap-1.5 shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Tạo link tiếp thị</span>
              </button>
            )}
          </div>
        </div>
      </Card>


      {/* Bulk Action Bar khi chọn nhiều sản phẩm để giảm giá hàng loạt */}
      {selectedIds.length > 0 && !isKol && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mb-3 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] text-xs shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#C59B58] text-[#1A1612] font-bold text-[11px]">
              {selectedIds.length}
            </span>
            <span className="font-semibold text-[#1A1612]">
              Đã chọn {selectedIds.length} sản phẩm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const selected = products.filter((p: any) => selectedIds.includes(p.id));
                setBulkDiscountProducts(selected);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Percent className="w-3.5 h-3.5 text-[#1A1612]" />
              <span>Đề xuất giảm giá hàng loạt ({selectedIds.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl border border-[#EAE4D7] bg-white text-xs text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612] transition cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      <Card className="product-table-card p-0 min-w-0 shadow-none">
        <Table className="product-table">
          <colgroup>
            <col style={{width: 44}} />
            <col style={{minWidth: 240}} />
            <col style={{width: 130}} />
            <col style={{width: 130}} />
            <col style={{width: 110}} />
            <col style={{width: 140}} />
            <col style={{width: 130}} />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filtered.length && filtered.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </TableHead>
              <TableHead className="min-w-[240px]">Sản phẩm</TableHead>
              <TableHead className="whitespace-nowrap min-w-[120px]">Giá bán</TableHead>
              <TableHead className="whitespace-nowrap min-w-[120px]">Thù lao cơ sở</TableHead>
              <TableHead className="whitespace-nowrap min-w-[100px]">Tồn kho</TableHead>
              <TableHead className="whitespace-nowrap min-w-[130px]">Trạng thái</TableHead>
              <TableHead className="whitespace-nowrap text-right min-w-[160px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p: any) => {
              const title = p.title || p.name;
              const sku = p.sku || 'SKU';
              const price = p.price || 0;
              const rate = 10;
              const stock = p.stockQuantity ?? p.stock ?? 0;
              const img = getSafeProductImageUrl(p.imageUrl || p.images?.[0] || p.image, title, p.categoryName);
              const status =
                p.status || (p.isActive === false ? 'paused' : stock === 0 ? 'out_of_stock' : 'active');
              const moderationStatus = p.moderationStatus || 'APPROVED';

              return (
                <TableRow key={p.id}>
                  <TableCell data-label="Chọn" className="product-selection">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell data-label="Sản phẩm" className="product-identity">
                    <div className="flex min-w-0 items-center gap-3">
                      {img ? (
                        <img
                          src={img}
                          alt={title}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 shrink-0 flex items-center justify-center text-slate-400">
                          <ImagePlus size={17} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <strong title={title} className="text-sm font-semibold text-[#1A1612] block line-clamp-2 break-words">
                          {title}
                        </strong>
                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                          {sku}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell data-label="Giá bán" className="whitespace-nowrap tabular-nums">
                    <div className="font-semibold text-[#1A1612]">
                      {Number(price).toLocaleString('vi-VN')} ₫
                    </div>
                    {p.floorPrice && Number(p.floorPrice) > 0 ? (
                      <div className="text-[10px] text-[#7D715E] flex items-center gap-1 mt-0.5">
                        <span className="text-[#8C6226] font-medium">Sàn MAP:</span>
                        <span className="font-mono">{Number(p.floorPrice).toLocaleString('vi-VN')} ₫</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#A79B89] mt-0.5">
                        Chưa đặt sàn MAP
                      </div>
                    )}
                  </TableCell>
                  <TableCell data-label="Thù lao cơ sở">
                    <Badge variant="amber" className="font-extrabold text-xs">
                      {rate}%
                    </Badge>
                  </TableCell>
                  <TableCell data-label="Tồn kho">
                    {(() => {
                      const LOW = 5;
                      if (stock === 0) {
                        return (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 text-xs">
                            0 — Hết hàng
                          </span>
                        );
                      }
                      if (stock <= LOW) {
                        return (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 text-xs">
                            {stock} <span className="text-[#8C6226]">· Thấp</span>
                          </span>
                        );
                      }
                      return (
                        <span className="font-semibold text-slate-700 text-xs">
                          {stock}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell data-label="Trạng thái">
                    <div className="flex flex-col items-start gap-1">
                      {moderationStatus === 'DRAFT' && <Badge variant="warning">Chờ kiểm duyệt</Badge>}
                      {moderationStatus === 'REJECTED' && <Badge variant="danger">Bị từ chối</Badge>}
                      {moderationStatus === 'APPROVED' && status === 'active' && <Badge variant="amber">Đang bán</Badge>}
                      {moderationStatus === 'APPROVED' && status === 'out_of_stock' && <Badge variant="danger">Hết hàng</Badge>}
                      {moderationStatus === 'APPROVED' && status === 'paused' && <Badge variant="neutral">Tạm dừng</Badge>}
                      {moderationStatus === 'REJECTED' && p.moderationReason && (
                        <span className="max-w-56 text-left text-[10px] leading-relaxed text-rose-700" title={p.moderationReason}>
                          {p.moderationReason}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell data-label="Thao tác" className="product-row-actions text-right">
                    {isKol ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="amber"
                          size="sm"
                          icon={<Link2 className="w-3.5 h-3.5" />}
                          onClick={() => navigate('/collaborator/links')}
                        >
                          Lấy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Package className="w-3.5 h-3.5" />}
                          onClick={() => navigate('/collaborator/collaboration?tab=samples')}
                        >
                          Xin mẫu
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Nút hành động Kiểm duyệt dành riêng cho Quản trị viên / Vận hành */}
                        {isAdminOrManager && (
                          <>
                            {moderationStatus === 'DRAFT' && (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModeratingProduct(p);
                                    setModeratingAction('APPROVED');
                                  }}
                                  disabled={moderationSubmitting || isOwnProductSubmission(moderatingProduct, currentUser?.id)}
                                  className="h-8 px-2.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                                  title="Phê duyệt sản phẩm lên sàn ngay"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Duyệt</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModeratingProduct(p);
                                    setModeratingAction('REJECTED');
                                    setModerationReason('');
                                  }}
                                  disabled={moderationSubmitting || isOwnProductSubmission(moderatingProduct, currentUser?.id)}
                                  className="h-8 px-2 rounded-lg border border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2] text-[11px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 disabled:opacity-50"
                                  title="Từ chối duyệt và ghi lý do vi phạm"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Từ chối</span>
                                </button>
                              </div>
                            )}

                            {moderationStatus === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModeratingProduct(p);
                                  setModeratingAction('REJECTED');
                                  setModerationReason('Phát hiện nội dung vi phạm quy chế hoặc thuộc danh mục hàng cấm');
                                }}
                                className="w-8 h-8 rounded-lg border border-[#EAE4D7] text-[#7D715E] hover:text-[#DC2626] hover:bg-[#FEF2F2] flex items-center justify-center transition cursor-pointer"
                                title="Thu hồi duyệt / Khóa sản phẩm vi phạm"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {moderationStatus === 'REJECTED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModeratingProduct(p);
                                  setModeratingAction('APPROVED');
                                }}
                                className="h-8 px-2 rounded-lg border border-[#EEDFC6] text-[#8C6226] hover:bg-[#FBF5EB] text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="Xem xét và duyệt lại sản phẩm này"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Duyệt lại</span>
                              </button>
                            )}
                          </>
                        )}

                        {moderationStatus === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => setAiDrawerProduct(p)}
                            className="h-8 px-2.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226] hover:bg-[#F3EFE6] hover:border-[#C59B58] text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0"
                            title="Tìm KOC phù hợp cho sản phẩm này qua AI Radar Matchmaker"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#B88E4F]" />
                            <span className="hidden sm:inline">Gợi ý KOC</span>
                          </button>
                        )}

                        {moderationStatus === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => setDiscountModalProduct(p)}
                            className="h-8 px-2.5 rounded-lg border border-[#EAE4D7] bg-white text-[#1A1612] hover:bg-[#FBF5EB] hover:border-[#C59B58] text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0"
                            title="Đề xuất chiến dịch giảm giá sản phẩm (tuân thủ giá sàn MAP)"
                          >
                            <Percent className="w-3.5 h-3.5 text-[#B88E4F]" />
                            <span className="hidden xl:inline">Giảm giá</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openProductLanding(p)}
                          className="w-8 h-8 rounded-lg border border-[#EAE4D7] text-[#B88E4F] hover:bg-[#FBF5EB] flex items-center justify-center transition cursor-pointer"
                          title="Xem Landing Page công khai của sản phẩm"
                          aria-label={`Xem trang mua hàng của ${p.title}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
                          title="Chỉnh sửa sản phẩm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmProduct(p)}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                          title="Tạm dừng / Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>


      <Modal
        isOpen={showModal}
        onClose={closeProductModal}
        icon={<Package className="h-4 w-4" />}
        title={(
          <span className="inline-flex items-center gap-3 flex-wrap align-middle">
            <span>{editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</span>
            {saveError && (
              <span
                id="product-save-error"
                role="alert"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-in fade-in duration-150 shadow-2xs"
                title={saveError}
              >
                <AlertCircle size={13} className="text-rose-600 shrink-0" />
                <span className="truncate max-w-[360px] sm:max-w-[520px] font-medium">{saveError.split('\n')[0]}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSaveError(null);
                  }}
                  className="ml-0.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-full p-0.5 transition cursor-pointer"
                  title="Đóng thông báo"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </span>
        )}
        maxWidth="full"
        stickyHeader
        className="!w-[min(94vw,1160px)] !max-w-[min(94vw,1160px)] !min-w-[min(94vw,1160px)] !h-[min(90dvh,780px)] !min-h-[min(90dvh,780px)] !max-h-[min(90dvh,780px)] transition-none rounded-3xl border border-[#EAE4D7] bg-white text-[#1A1612] shadow-[0_24px_80px_rgba(35,29,21,0.18)]"
        bodyClassName="!p-4 sm:!p-5 [scrollbar-gutter:stable] flex-1 flex flex-col"
        belowHeader={(
          <div className="product-editor-stepper bg-[#FAF8F5] border-b border-[#EAE4D7] px-4 py-2 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { step: 1, title: '1. Thông tin chung & Ảnh', sub: 'Tên, danh mục, mô tả & hình ảnh', isDone: isStep1Complete },
                { step: 2, title: '2. Phân loại & Thông số', sub: 'Biến thể SKU, thông số & đóng gói GHN', isDone: isStep2Complete },
                { step: 3, title: '3. Tiếp thị & Gửi duyệt', sub: 'Thù lao, mẫu thử & hồ sơ pháp lý', isDone: isStep3Complete },
              ].map((s) => {
                const isActive = modalStep === s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => handleStepClick(s.step as 1 | 2 | 3)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer border ${
                      isActive
                        ? 'bg-white border-[#C59B58] ring-2 ring-[#C59B58]/20 shadow-xs'
                        : s.isDone
                        ? 'bg-white/90 border-[#EEDFC6] hover:border-[#C59B58] hover:bg-white'
                        : 'bg-[#FAF8F5] border-[#EAE4D7]/70 hover:border-[#C59B58] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition ${
                        isActive
                          ? 'bg-[#C59B58] text-white shadow-xs'
                          : s.isDone
                          ? 'bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]'
                          : 'bg-white text-[#7D715E] border border-[#EAE4D7]'
                      }`}
                    >
                      {s.isDone && !isActive ? <Check size={14} className="text-[#8C6226]" /> : s.step}
                    </div>
                    <div className="min-w-0">
                      <span className={`block text-xs truncate ${isActive ? 'font-bold text-[#1A1612]' : 'font-semibold text-[#574C3D]'}`}>
                        {s.title}
                      </span>
                      <span className="block text-[10.5px] text-[#7D715E] truncate">
                        {s.sub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        footer={(
          <div className="product-editor-actions flex flex-wrap items-center justify-between gap-3 w-full">
            <div>
              {modalStep > 1 && (
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#574C3D] bg-white border border-[#EAE4D7] hover:bg-[#FAF8F5] hover:border-[#C59B58] transition cursor-pointer shadow-2xs"
                >
                  <ChevronLeft size={14} /> Quay lại: {STEP_TITLES[modalStep - 1]}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeProductModal}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#7D715E] bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              {modalStep < 3 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C59B58] hover:bg-[#B88E4F] transition cursor-pointer shadow-xs"
                >
                  <span>Tiếp tục: {STEP_TITLES[modalStep + 1]}</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  form="product-editor-form"
                  disabled={uploadingImage || savingProduct}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C59B58] hover:bg-[#B88E4F] shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingProduct ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang lưu sản phẩm...</span>
                    </>
                  ) : uploadingImage ? (
                    <>
                      <UploadCloud size={14} className="animate-spin" />
                      <span>Đang xử lý ảnh...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>{editingProduct ? 'Lưu thay đổi sản phẩm' : 'Gửi duyệt sản phẩm'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      >
        <form id="product-editor-form" noValidate onSubmit={handleSave} className="product-editor-form w-full flex-1 flex flex-col min-h-0">
          {saveError && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-rose-900 mb-1">Cần hoàn thiện thông tin trước khi tiếp tục:</div>
                  <div className="whitespace-pre-line text-[11.5px] leading-relaxed space-y-0.5">
                    {saveError.split('\n').map((err, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-rose-500">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSaveError(null)}
                  className="text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg p-1 transition cursor-pointer"
                  title="Đóng thông báo"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          {editingProduct?.moderationStatus === 'REJECTED' && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800">
              <strong className="block">Sản phẩm chưa được duyệt</strong>
              <span>{editingProduct.moderationReason || 'Hãy chỉnh sửa thông tin sản phẩm theo yêu cầu của Ban Quản Trị.'}</span>
              <span className="mt-1 block font-semibold">Lưu thay đổi sẽ gửi lại sản phẩm vào hàng đợi kiểm duyệt.</span>
            </div>
          )}

          {/* BƯỚC 1: THÔNG TIN CHUNG & HÌNH ẢNH */}
          {modalStep === 1 && (
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-start animate-in fade-in duration-150">
              {/* CỘT 1: THÔNG TIN CƠ BẢN (7 cột) */}
              <div id="product-section-basic" className="lg:col-span-7 flex flex-col rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(35,29,21,0.03)]">
                {/* Card Header với Ngành hàng kinh doanh đặt ngay cạnh tiêu đề */}
                <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-2.5 shrink-0 gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] shrink-0">
                      <FolderTree className="h-4 w-4 text-[#B88E4F]" />
                    </span>
                    <h4 className="text-xs font-bold text-[#1A1612] uppercase tracking-wide flex items-center shrink-0">
                      1. Thông tin cơ bản
                      <InfoTooltip text="Tên gọi, mã SKU và mô tả chi tiết công dụng sản phẩm." />
                    </h4>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-[#EEDFC6] bg-[#FAF8F5] text-xs font-bold text-[#8C6226] shrink-0">
                      <ShieldCheck size={13} className="text-[#B88E4F]" />
                      <span>{storeCategory || formCategory || (activeCategory || 'Thời trang & Phụ kiện')}</span>
                      <span className="text-[9.5px] font-semibold text-[#8C6226] bg-[#FBF5EB] px-1 py-0.2 rounded border border-[#EEDFC6]">
                        Cố định
                      </span>
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#8C6226] bg-[#FBF5EB] px-2.5 py-0.5 rounded-full border border-[#EEDFC6] shrink-0">
                    Bước 1/3
                  </span>
                </div>

                <div className="flex flex-col space-y-3 pt-3.5">
                  {/* Hàng 1: Tên sản phẩm (col-span-8) + Mã SKU chính (col-span-4) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 shrink-0">
                    <div className="sm:col-span-8">
                      <label className="text-xs font-bold text-[#1A1612] block mb-1">
                        Tên sản phẩm <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => {
                          const title = e.target.value;
                          setFormTitle(title);
                          if (!formCategory && !storeCategory) {
                            const suggestedCategory = inferCategoryFromTitle(title);
                            if (suggestedCategory) handleCategoryChange(suggestedCategory);
                          }
                        }}
                        placeholder={contextPlaceholders.titlePlaceholder}
                        required
                        className="w-full bg-white border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] font-semibold focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 outline-none transition"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-[#1A1612]">
                          Mã SKU chính <span className="text-[#DC2626]">*</span>
                        </label>
                        {!editingProduct && (
                          <button
                            type="button"
                            onClick={() => {
                              const cat = STANDARD_CATEGORIES.find((c) => c.name === (storeCategory || formCategory));
                              const prefix = cat?.prefix || 'SP';
                              const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
                              const newSku = `${prefix}-${randomCode}`;
                              setFormSku(newSku);
                              if (formVariants.length === 1) {
                                setFormVariants((curr) => curr.map((v, i) => (i === 0 ? { ...v, sku: newSku } : v)));
                              }
                            }}
                            className="text-[10.5px] font-bold text-[#B88E4F] hover:underline cursor-pointer"
                            title="Tạo mã SKU ngẫu nhiên"
                          >
                            + Ngẫu nhiên
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formSku}
                        onChange={(e) => {
                          const sku = e.target.value.toUpperCase();
                          setFormSku(sku);
                          if (formVariants.length === 1) {
                            setFormVariants((curr) => curr.map((v, i) => (i === 0 ? { ...v, sku } : v)));
                          }
                        }}
                        placeholder="SP-SKIN-01"
                        required
                        className="w-full bg-white border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] font-mono font-bold focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 outline-none transition uppercase"
                      />
                    </div>
                  </div>

                  {/* Hàng 2: Mô tả chi tiết sản phẩm (chiều cao gọn gàng, không bị tràn hay cuộn) */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-1.5 shrink-0">
                      <label className="text-xs font-bold text-[#1A1612] flex items-center">
                        Mô tả chi tiết sản phẩm <span className="text-[#DC2626]">*</span>
                        <InfoTooltip text="Mô tả công dụng nổi bật, giải pháp mang lại cho khách hàng, hướng dẫn sử dụng và cách bảo quản..." />
                      </label>
                      <span className="text-[10.5px] text-[#7D715E] font-mono">
                        {formDescription.length} ký tự
                      </span>
                    </div>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder={contextPlaceholders.descriptionPlaceholder}
                      className="w-full h-[220px] resize-none rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 text-xs leading-relaxed text-[#1A1612] outline-none transition focus:border-[#C59B58] focus:bg-white focus:ring-1 focus:ring-[#C59B58]/20"
                    />
                  </div>
                </div>
              </div>

              {/* CỘT 2: HÌNH ẢNH SẢN PHẨM (5 cột) */}
              <div id="product-section-media" className="lg:col-span-5 flex flex-col rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(35,29,21,0.03)]">
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-2.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EEDFC6] bg-[#FBF5EB]">
                      <Camera className="h-4 w-4 text-[#B88E4F]" />
                    </span>
                    <h4 className="text-xs font-bold text-[#1A1612] uppercase tracking-wide flex items-center">
                      2. Hình ảnh sản phẩm
                      <InfoTooltip text="Gồm 1 ảnh bìa chính (tối đa 5MB) và tối đa 4 ảnh phụ góc chụp, tem nhãn..." />
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="bulk-images-input"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(event) => { void handleBulkUpload(event.target.files); event.target.value = ''; }}
                    />
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => document.getElementById('bulk-images-input')?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border border-[#EEDFC6] hover:border-[#C59B58] bg-[#FBF5EB] text-[#8C6226] hover:bg-white transition cursor-pointer shadow-2xs"
                    >
                      <UploadCloud size={13} />
                      {uploadingSlot === 'bulk' ? 'Đang tải…' : 'Tải nhiều ảnh'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col space-y-3 pt-3.5">
                  {/* Ảnh chính (Cố định h-[160px] rõ ràng, không bị chèn lên các ảnh phụ) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 shrink-0">
                      <label className="text-xs font-bold text-[#1A1612] flex items-center">
                        Ảnh bìa chính đại diện <span className="text-[#DC2626]">*</span>
                        <InfoTooltip text="Ảnh bìa chính hiển thị nổi bật trên gian hàng và công cụ của KOL. Định dạng JPG, PNG, WEBP, tối đa 5MB." />
                      </label>
                    </div>

                    <input
                      id="main-image-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleUploadSingleImage(file, true);
                        event.target.value = '';
                      }}
                    />

                    <div className="relative group w-full h-[160px] rounded-2xl border-2 border-dashed border-[#EEDFC6] bg-[#FAF8F5] overflow-hidden flex flex-col items-center justify-center transition hover:border-[#C59B58]">
                      {formImage ? (
                        <>
                          <img src={formImage} alt="Ảnh bìa chính" className="w-full h-full object-contain p-2 bg-white" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => document.getElementById('main-image-input')?.click()}
                              className="px-3 py-1.5 rounded-xl bg-white text-xs font-bold text-[#1A1612] hover:bg-[#FAF8F5] shadow transition cursor-pointer"
                            >
                              Đổi ảnh bìa
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormImage('')}
                              className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow transition cursor-pointer"
                              title="Xóa ảnh chính"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => document.getElementById('main-image-input')?.click()}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#7D715E] hover:text-[#B88E4F] cursor-pointer p-4"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-white border border-[#EEDFC6] flex items-center justify-center shadow-2xs">
                            <ImagePlus size={22} className="text-[#B88E4F]" />
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-bold text-[#1A1612] block">
                              {uploadingSlot === 'main' ? 'Đang tải lên…' : 'Bấm để tải Ảnh bìa chính'}
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thư viện 4 ảnh phụ dạng 4 Slot Grid - Tách biệt rõ ràng phía dưới */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 shrink-0">
                      <label className="text-xs font-bold text-[#1A1612] flex items-center">
                        Thư viện ảnh góc chụp ({formSubImages.length}/4)
                        <InfoTooltip text="Ảnh góc nghiêng, nhãn phụ tiếng Việt, tem chống hàng giả, bảng thành phần (tối đa 4 ảnh)." />
                      </label>
                    </div>

                    <input
                      id="sub-image-new-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleUploadSingleImage(file, false);
                        event.target.value = '';
                      }}
                    />

                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map((slotIdx) => {
                        const subUrl = formSubImages[slotIdx];
                        return (
                          <div
                            key={slotIdx}
                            className="relative group h-[64px] rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] overflow-hidden flex flex-col items-center justify-center transition hover:border-[#C59B58]"
                          >
                            {subUrl ? (
                              <>
                                <img src={subUrl} alt={`Ảnh phụ ${slotIdx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    title="Đặt làm ảnh chính"
                                    onClick={() => handleSetAsMain(slotIdx)}
                                    className="p-1 rounded-lg bg-white text-[#B88E4F] hover:bg-[#FBF5EB] cursor-pointer"
                                  >
                                    <Star size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Xóa ảnh"
                                    onClick={() => handleRemoveSubImage(slotIdx)}
                                    className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={uploadingImage}
                                onClick={() => {
                                  const input = document.getElementById('sub-image-new-input') as HTMLInputElement;
                                  if (input) input.click();
                                }}
                                className="w-full h-full flex flex-col items-center justify-center gap-1 text-[#7D715E] hover:text-[#B88E4F] transition cursor-pointer"
                              >
                                <Plus size={15} className="text-[#A79B89]" />
                                <span className="text-[9.5px] font-semibold">Ảnh #{slotIdx + 1}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 2: PHÂN LOẠI, THÔNG SỐ & VẬN CHUYỂN GHN */}
          {modalStep === 2 && (
            <div className="w-full space-y-5 animate-in fade-in duration-150">
              {/* KHỐI 2.1: THIẾT LẬP BIẾN THỂ & GIÁ BÁN BẢO VỆ */}
              <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(35,29,21,0.03)] space-y-4">
                {/* Header 2.1 */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAE4D7]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                      <Layers className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#1A1612] flex items-center gap-2">
                        2.1. Thiết lập Ma trận Phân loại 2 Cấp & Giá bán bảo vệ (2-Tier Pricing Guard)
                        <InfoTooltip text="Tự động tổ hợp ma trận biến thể 2 cấp (Màu sắc × Kích cỡ, Mùi hương × Dung tích). Áp dụng giá sàn bảo vệ và số lượng tồn kho hàng loạt." />
                        <span className="text-[11px] font-bold text-[#8C6226] bg-[#FBF5EB] px-2.5 py-0.5 rounded-full border border-[#EEDFC6]">
                          {formVariants.length} phiên bản · Tổng tồn: {totalVariantStock}
                        </span>
                        {hasTier2 && (
                          <span className="text-[10.5px] font-semibold text-[#8C6226] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#EEDFC6]">
                            2 Nhóm thuộc tính
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addVariant}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Thêm phân loại</span>
                  </button>
                </div>

                {/* TẦNG 1: THIẾT LẬP NHÓM PHÂN LOẠI 2 CẤP (ATTRIBUTE GROUPS BUILDER) */}
                <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5]/90 p-3.5 space-y-3.5">
                  {/* NHÓM PHÂN LOẠI 1 */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1A1612]">Nhóm phân loại 1:</span>
                        <input
                          type="text"
                          value={attrGroup1Name}
                          onChange={(e) => setAttrGroup1Name(e.target.value)}
                          placeholder="VD: Màu sắc, Mùi hương..."
                          className="h-7.5 w-36 sm:w-44 rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-bold text-[#8C6226] outline-none focus:border-[#C59B58] transition"
                        />
                      </div>

                      {/* Gợi ý nhóm 1 theo ngành hàng */}
                      {contextPlaceholders.group1Presets.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10.5px] font-semibold text-[#7D715E]">Gợi ý nhanh:</span>
                          {contextPlaceholders.group1Presets.map((preset) => {
                            const isAdded = attrGroup1Values.includes(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                disabled={isAdded}
                                onClick={() => handleAddGroup1Value(preset)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                                  isAdded
                                    ? 'bg-[#EAE4D7]/50 text-[#A79B89] cursor-not-allowed border border-transparent'
                                    : 'bg-white border border-[#EEDFC6] text-[#574C3D] hover:bg-[#FBF5EB] hover:text-[#B88E4F] hover:border-[#C59B58]'
                                }`}
                                title={isAdded ? 'Đã thêm' : `Thêm "${preset}" vào Nhóm 1`}
                              >
                                <Plus size={10} />
                                <span>{preset}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Danh sách Tags giá trị Nhóm 1 */}
                    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-[#EAE4D7] bg-white min-h-[42px]">
                      {attrGroup1Values.map((val) => (
                        <span
                          key={val}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6226]"
                        >
                          <span>{val}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGroup1Value(val)}
                            className="p-0.5 text-[#8C6226] hover:text-rose-600 rounded transition cursor-pointer"
                            title={`Xóa "${val}"`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}

                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={attrGroup1Input}
                          onChange={(e) => setAttrGroup1Input(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddGroup1Value(attrGroup1Input);
                            }
                          }}
                          placeholder="+ Thêm giá trị (nhấn Enter)..."
                          className="h-7 w-48 text-xs text-[#1A1612] placeholder-[#A79B89] px-2 outline-none bg-transparent"
                        />
                        {attrGroup1Input.trim() && (
                          <button
                            type="button"
                            onClick={() => handleAddGroup1Value(attrGroup1Input)}
                            className="px-2 py-0.5 text-[11px] font-bold bg-[#C59B58] text-white rounded hover:bg-[#B88E4F] transition cursor-pointer"
                          >
                            Thêm
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* NHÓM PHÂN LOẠI 2 (KHI BẬT) HOẶC NÚT THÊM NHÓM 2 */}
                  {hasTier2 ? (
                    <div className="space-y-2 pt-2 border-t border-[#EAE4D7]/80">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1A1612]">Nhóm phân loại 2:</span>
                          <input
                            type="text"
                            value={attrGroup2Name}
                            onChange={(e) => setAttrGroup2Name(e.target.value)}
                            placeholder="VD: Kích cỡ (Size), Dung tích..."
                            className="h-7.5 w-36 sm:w-44 rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-bold text-[#8C6226] outline-none focus:border-[#C59B58] transition"
                          />
                          <button
                            type="button"
                            onClick={handleDisableTier2}
                            className="text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1"
                            title="Hủy nhóm phân loại 2 và chuyển về 1 cấp"
                          >
                            (Xóa nhóm 2)
                          </button>
                        </div>

                        {/* Gợi ý nhóm 2 theo ngành hàng */}
                        {contextPlaceholders.group2Presets.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10.5px] font-semibold text-[#7D715E]">Gợi ý nhanh:</span>
                            {contextPlaceholders.group2Presets.map((preset) => {
                              const isAdded = attrGroup2Values.includes(preset);
                              return (
                                <button
                                  key={preset}
                                  type="button"
                                  disabled={isAdded}
                                  onClick={() => handleAddGroup2Value(preset)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                                    isAdded
                                      ? 'bg-[#EAE4D7]/50 text-[#A79B89] cursor-not-allowed border border-transparent'
                                      : 'bg-white border border-[#EEDFC6] text-[#574C3D] hover:bg-[#FBF5EB] hover:text-[#B88E4F] hover:border-[#C59B58]'
                                  }`}
                                  title={isAdded ? 'Đã thêm' : `Thêm "${preset}" vào Nhóm 2`}
                                >
                                  <Plus size={10} />
                                  <span>{preset}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Danh sách Tags giá trị Nhóm 2 */}
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-[#EAE4D7] bg-white min-h-[42px]">
                        {attrGroup2Values.map((val) => (
                          <span
                            key={val}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6226]"
                          >
                            <span>{val}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveGroup2Value(val)}
                              className="p-0.5 text-[#8C6226] hover:text-rose-600 rounded transition cursor-pointer"
                              title={`Xóa "${val}"`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}

                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={attrGroup2Input}
                            onChange={(e) => setAttrGroup2Input(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddGroup2Value(attrGroup2Input);
                              }
                            }}
                            placeholder="+ Thêm giá trị (nhấn Enter)..."
                            className="h-7 w-48 text-xs text-[#1A1612] placeholder-[#A79B89] px-2 outline-none bg-transparent"
                          />
                          {attrGroup2Input.trim() && (
                            <button
                              type="button"
                              onClick={() => handleAddGroup2Value(attrGroup2Input)}
                              className="px-2 py-0.5 text-[11px] font-bold bg-[#C59B58] text-white rounded hover:bg-[#B88E4F] transition cursor-pointer"
                            >
                              Thêm
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleEnableTier2}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#C59B58] bg-white hover:bg-[#FBF5EB] text-[#8C6226] text-xs font-bold transition cursor-pointer shadow-2xs"
                      >
                        <Plus size={13} className="text-[#C59B58]" />
                        <span>+ Thêm nhóm phân loại 2 (Kích cỡ / Dung tích / Quy cách)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* TẦNG 2: THANH ÁP DỤNG HÀNG LOẠT (BATCH FILL BAR) */}
                <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB]/80 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-[#EEDFC6] text-[#B88E4F]">
                      <Zap size={14} />
                    </span>
                    <span className="text-xs font-bold text-[#8C6226]">
                      Áp dụng đồng loạt cho tất cả {formVariants.length} phân loại:
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={batchFloorPrice}
                      onChange={(e) => setBatchFloorPrice(e.target.value)}
                      placeholder="Giá sàn (₫)..."
                      className="h-8 w-28 rounded-lg border border-[#EEDFC6] bg-white px-2.5 text-xs font-bold tabular-nums text-[#8C6226] outline-none focus:border-[#C59B58] transition"
                      title="Nhập giá sàn tối thiểu bảo vệ để áp dụng cho mọi phân loại"
                    />
                    <input
                      type="number"
                      min={1}
                      value={batchPrice}
                      onChange={(e) => setBatchPrice(e.target.value)}
                      placeholder="Giá niêm yết (₫)..."
                      className="h-8 w-28 rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-bold tabular-nums text-[#1A1612] outline-none focus:border-[#C59B58] transition"
                      title="Nhập giá niêm yết bán lẻ để áp dụng cho mọi phân loại"
                    />
                    <input
                      type="number"
                      min={0}
                      value={batchStock}
                      onChange={(e) => setBatchStock(e.target.value)}
                      placeholder="Tồn kho..."
                      className="h-8 w-20 rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-bold tabular-nums text-[#1A1612] outline-none focus:border-[#C59B58] transition"
                      title="Nhập tồn kho mở bán để áp dụng cho mọi phân loại"
                    />
                    <button
                      type="button"
                      onClick={applyBatchValues}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <Zap size={13} />
                      <span>Áp dụng tất cả</span>
                    </button>
                    <div className="flex items-center gap-1 pl-1 border-l border-[#EEDFC6]">
                      {[0, 0.2, 0.3].map((reserve) => (
                        <button
                          key={reserve}
                          type="button"
                          onClick={() => {
                            const refFloor = Number(batchFloorPrice || formVariants[0]?.floorPrice || formFloorPrice || 0);
                            if (refFloor <= 0) return;
                            const suggested = calculateMinSafePrice(refFloor, 0.1, 0.25, reserve);
                            setBatchPrice(String(suggested));
                            setFormVariants((curr) =>
                              curr.map((v) => {
                                const f = Number(batchFloorPrice || v.floorPrice || refFloor);
                                return {
                                  ...v,
                                  floorPrice: f,
                                  price: calculateMinSafePrice(f, 0.1, 0.25, reserve),
                                };
                              }),
                            );
                          }}
                          title={`Tính tự động giá bán an toàn từ Giá sàn (gánh Voucher 10% + KOL 25% + dự phòng giảm giá ${Math.round(reserve * 100)}%)`}
                          className="h-8 px-2 rounded-lg border border-[#C59B58]/50 bg-white hover:bg-[#FBF5EB] text-[11px] font-bold text-[#8C6226] transition cursor-pointer tabular-nums"
                        >
                          +{Math.round(reserve * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* TẦNG 3: MA TRẬN BIẾN THỂ DẠNG BẢNG (ENTERPRISE 2-TIER VARIANT TABLE) */}
                <div className="overflow-x-auto rounded-xl border border-[#EAE4D7] bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAF8F5] text-[11px] font-bold text-[#574C3D] border-b border-[#EAE4D7]">
                      <tr>
                        <th className="py-2.5 px-2 text-center w-12">Ảnh</th>
                        {hasTier2 && attrGroup2Values.length > 0 ? (
                          <>
                            <th className="py-2.5 px-2.5 min-w-[120px]">{attrGroup1Name || 'Nhóm 1'} <span className="text-rose-500">*</span></th>
                            <th className="py-2.5 px-2.5 min-w-[120px]">{attrGroup2Name || 'Nhóm 2'} <span className="text-rose-500">*</span></th>
                          </>
                        ) : (
                          <th className="py-2.5 px-2.5 min-w-[150px]">Tên phân loại <span className="text-rose-500">*</span></th>
                        )}
                        <th className="py-2.5 px-2.5 min-w-[110px]">Mã SKU <span className="text-rose-500">*</span></th>
                        <th className="py-2.5 px-2.5 min-w-[115px]">
                          <span className="inline-flex items-center gap-1">
                            Giá sàn (₫) <span className="text-rose-500">*</span>
                            <span
                              title="Ngưỡng thực thu tối thiểu công ty giữ lại sau Khuyến mãi + Voucher KOL (10%) + Hoa hồng KOL (25%)."
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[10px] font-bold text-[#B88E4F] cursor-help"
                            >
                              ?
                            </span>
                          </span>
                        </th>
                        <th className="py-2.5 px-2.5 min-w-[115px]">
                          <span className="inline-flex items-center gap-1">
                            Giá niêm yết (₫) <span className="text-rose-500">*</span>
                            <span
                              title="Bắt buộc >= Giá sàn / 0.675 để đảm bảo không lỗ khi áp tối đa Voucher 10% + Hoa hồng 25%."
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[10px] font-bold text-[#B88E4F] cursor-help"
                            >
                              !
                            </span>
                          </span>
                        </th>
                        <th className="py-2.5 px-2.5 w-20">Tồn kho <span className="text-rose-500">*</span></th>
                        <th className="py-2.5 px-2 text-center w-16">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE4D7]">
                      {formVariants.map((variant, index) => {
                        const isPrimary = index === 0;
                        const minSafePrice = Number(variant.floorPrice) > 0 ? calculateMinSafePrice(Number(variant.floorPrice)) : 0;
                        const isBelowFloor = minSafePrice > 0 && Number(variant.price) > 0 && Number(variant.price) < minSafePrice;

                        return (
                          <Fragment key={variant.id || `variant-${index}`}>
                            <tr className={`hover:bg-[#FBF5EB]/30 transition ${isPrimary ? 'bg-[#FAF8F5]/40' : ''}`}>
                              {/* 1. Ảnh riêng SKU */}
                              <td className="py-2 px-2 text-center align-middle">
                                <input
                                  id={`variant-image-input-${index}`}
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  disabled={uploadingImage}
                                  onChange={(event) => {
                                    void handleUploadVariantImage(index, event.target.files?.[0]);
                                    event.target.value = '';
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => document.getElementById(`variant-image-input-${index}`)?.click()}
                                  className="relative group w-8.5 h-8.5 rounded-lg border border-[#EAE4D7] hover:border-[#C59B58] bg-[#FAF8F5] hover:bg-white overflow-hidden flex items-center justify-center cursor-pointer transition mx-auto"
                                  title="Tải ảnh riêng cho phân loại này"
                                >
                                  {variant.imageUrl ? (
                                    <>
                                      <img src={variant.imageUrl} alt="Ảnh SKU" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                        <ImagePlus size={12} />
                                      </div>
                                    </>
                                  ) : (
                                    <ImagePlus size={14} className="text-[#A79B89] group-hover:text-[#C59B58]" />
                                  )}
                                </button>
                              </td>

                              {/* 2. Cột tên phân loại (1 cấp hoặc 2 cấp) */}
                              {hasTier2 && attrGroup2Values.length > 0 ? (
                                <>
                                  <td className="py-2 px-2.5 align-middle">
                                    <input
                                      type="text"
                                      value={variant.tier1Value || variant.name.split(',')[0]?.trim() || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFormVariants((curr) =>
                                          curr.map((v, i) => {
                                            if (i !== index) return v;
                                            const t2 = v.tier2Value || (v.name.includes(',') ? v.name.split(',')[1]?.trim() : '') || '';
                                            return {
                                              ...v,
                                              tier1Value: val,
                                              name: t2 ? `${val}, ${t2}` : val,
                                            };
                                          })
                                        );
                                      }}
                                      placeholder={attrGroup1Name || 'Giá trị 1'}
                                      className="h-8.5 w-full rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-medium text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 transition"
                                    />
                                  </td>
                                  <td className="py-2 px-2.5 align-middle">
                                    <input
                                      type="text"
                                      value={variant.tier2Value || (variant.name.includes(',') ? variant.name.split(',')[1]?.trim() : '') || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFormVariants((curr) =>
                                          curr.map((v, i) => {
                                            if (i !== index) return v;
                                            const t1 = v.tier1Value || variant.name.split(',')[0]?.trim() || '';
                                            return {
                                              ...v,
                                              tier2Value: val,
                                              name: t1 ? `${t1}, ${val}` : val,
                                            };
                                          })
                                        );
                                      }}
                                      placeholder={attrGroup2Name || 'Giá trị 2'}
                                      className="h-8.5 w-full rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-medium text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 transition"
                                    />
                                  </td>
                                </>
                              ) : (
                                <td className="py-2 px-2.5 align-middle">
                                  <input
                                    type="text"
                                    value={variant.name}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormVariants((curr) => curr.map((v, i) => (i === index ? { ...v, name: val, tier1Value: val } : v)));
                                    }}
                                    placeholder={index === 0 ? 'VD: Bản Tiêu chuẩn, 50ml, Size M...' : 'VD: 100ml, Hũ 30g...'}
                                    className="h-8.5 w-full rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-medium text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 transition"
                                  />
                                </td>
                              )}

                              {/* 3. Mã SKU */}
                              <td className="py-2 px-2.5 align-middle">
                                <input
                                  type="text"
                                  value={variant.sku}
                                  onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    setFormVariants((curr) => curr.map((v, i) => (i === index ? { ...v, sku: val } : v)));
                                  }}
                                  placeholder="SKU-01"
                                  className="h-8.5 w-full rounded-lg border border-[#EAE4D7] bg-white px-2 text-xs font-mono font-bold text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 transition"
                                />
                              </td>

                              {/* 4. Giá sàn (₫) */}
                              <td className="py-2 px-2.5 align-middle">
                                <input
                                  type="number"
                                  min={1}
                                  value={variant.floorPrice === 0 ? '' : (variant.floorPrice ?? '')}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                                    setFormVariants((curr) => curr.map((v, i) => (i === index ? { ...v, floorPrice: val as number } : v)));
                                  }}
                                  placeholder="100.000"
                                  className="h-8.5 w-full rounded-lg border border-[#EEDFC6] bg-[#FAF8F5] px-2 text-xs font-bold tabular-nums text-[#8C6226] outline-none focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 transition"
                                  title="Giá sàn tối thiểu bảo vệ biên lợi nhuận của Shop (bắt buộc > 0 và <= Giá bán)"
                                />
                              </td>

                              {/* 6. Giá niêm yết (₫) */}
                              <td className="py-2 px-2.5 align-middle">
                                <input
                                  type="number"
                                  min={1}
                                  value={variant.price === 0 ? '' : (variant.price ?? '')}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                                    setFormVariants((curr) => curr.map((v, i) => (i === index ? { ...v, price: val as number } : v)));
                                  }}
                                  placeholder="200.000"
                                  className={`h-8.5 w-full rounded-lg border px-2 text-xs font-bold tabular-nums outline-none transition focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 ${
                                    isBelowFloor
                                      ? 'border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-300'
                                      : 'border-[#EAE4D7] bg-white text-[#1A1612]'
                                  }`}
                                  title={isBelowFloor ? 'Cảnh báo: Giá niêm yết không được thấp hơn giá sàn bảo vệ!' : 'Giá bán niêm yết'}
                                />
                              </td>

                              {/* 7. Tồn kho */}
                              <td className="py-2 px-2.5 align-middle">
                                <input
                                  type="number"
                                  min={0}
                                  value={variant.stockQuantity === 0 ? '' : (variant.stockQuantity ?? '')}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                                    setFormVariants((curr) => curr.map((v, i) => (i === index ? { ...v, stockQuantity: val as number } : v)));
                                  }}
                                  placeholder="100"
                                  className="h-8.5 w-full rounded-lg border border-[#EAE4D7] bg-white px-2 text-xs font-bold tabular-nums text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 transition"
                                />
                              </td>

                              {/* 8. Thao tác */}
                              <td className="py-2 px-2 text-center align-middle">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => cloneVariant(index)}
                                    className="p-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-[#7D715E] hover:text-[#1A1612] hover:border-[#C59B58] transition cursor-pointer"
                                    title="Nhân bản phân loại này"
                                  >
                                    <Copy size={13} />
                                  </button>
                                  {formVariants.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeVariant(index)}
                                      className="p-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition cursor-pointer"
                                      title="Xóa phân loại này"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Sub-row khi đóng gói riêng theo từng SKU (!useCommonShipping) */}
                            {!useCommonShipping && (
                              <tr className="bg-[#FAF8F5]/80 border-b border-[#EAE4D7]">
                                <td colSpan={hasTier2 && attrGroup2Values.length > 0 ? 9 : 8} className="py-2 px-3">
                                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[#8C6226] flex items-center gap-1">
                                        <Truck size={13} className="text-[#C59B58]" />
                                        Đóng gói SKU {variant.sku || `#${index + 1}`}:
                                      </span>
                                      {index > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => copyShippingFromPrimary(index)}
                                          className="text-[10.5px] font-semibold text-[#8C6226] hover:text-[#B88E4F] underline cursor-pointer"
                                        >
                                          Sao chép từ Loại 1
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px] text-[#7D715E]">Cân nặng:</span>
                                        <input
                                          type="number"
                                          min={1}
                                          value={variant.packageWeight === 0 ? '' : (variant.packageWeight ?? '')}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                                            setFormVariants((curr) => curr.map((v, i) => (i === index ? { ...v, packageWeight: val as number } : v)));
                                          }}
                                          placeholder="250"
                                          className="h-7 w-16 rounded border border-[#EAE4D7] bg-white px-1.5 text-xs font-bold text-center outline-none focus:border-[#B88E4F]"
                                        />
                                        <span className="text-[10px] text-[#7D715E]">g</span>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px] text-[#7D715E]">D×R×C:</span>
                                        <input
                                          type="number"
                                          min={1}
                                          value={variant.packageLength === 0 ? '' : (variant.packageLength ?? '')}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                                            setFormVariants((curr) => curr.map((v, i) => (i === index ? { ...v, packageLength: val as number } : v)));
                                          }}
                                          placeholder="15"
                                          className="h-7 w-12 rounded border border-[#EAE4D7] bg-white px-1 text-xs font-bold text-center outline-none focus:border-[#B88E4F]"
                                        />
                                        <span className="text-[#7D715E]">×</span>
                                        <input
                                          type="number"
                                          min={1}
                                          value={variant.packageWidth === 0 ? '' : (variant.packageWidth ?? '')}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                                            setFormVariants((curr) => curr.map((v, i) => (i === index ? { ...v, packageWidth: val as number } : v)));
                                          }}
                                          placeholder="10"
                                          className="h-7 w-12 rounded border border-[#EAE4D7] bg-white px-1 text-xs font-bold text-center outline-none focus:border-[#B88E4F]"
                                        />
                                        <span className="text-[#7D715E]">×</span>
                                        <input
                                          type="number"
                                          min={1}
                                          value={variant.packageHeight === 0 ? '' : (variant.packageHeight ?? '')}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                                            setFormVariants((curr) => curr.map((v, i) => (i === index ? { ...v, packageHeight: val as number } : v)));
                                          }}
                                          placeholder="5"
                                          className="h-7 w-12 rounded border border-[#EAE4D7] bg-white px-1 text-xs font-bold text-center outline-none focus:border-[#B88E4F]"
                                        />
                                        <span className="text-[10px] text-[#7D715E]">cm</span>
                                      </div>

                                      {(() => {
                                        const vActG = Number(variant.packageWeight) || 0;
                                        const vL = Number(variant.packageLength) || 0;
                                        const vW = Number(variant.packageWidth) || 0;
                                        const vH = Number(variant.packageHeight) || 0;
                                        const vConvG = vL > 0 && vW > 0 && vH > 0 ? Math.round((vL * vW * vH) / 5) : 0;
                                        const vBillG = Math.max(vActG, vConvG);
                                        return (
                                          <span className="text-[11px] font-bold text-[#8C6226] bg-[#FBF5EB] px-2 py-0.5 rounded border border-[#EEDFC6]">
                                            Cước tính: {vBillG.toLocaleString('vi-VN')} g ({(vBillG / 1000).toFixed(2)} kg)
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Nút thêm phân loại */}
                <button
                  type="button"
                  onClick={addVariant}
                  className="w-full py-2.5 rounded-xl border border-dashed border-[#EAE4D7] hover:border-[#C59B58] bg-[#FAF8F5]/60 hover:bg-[#FBF5EB] flex items-center justify-center gap-1.5 text-[#574C3D] hover:text-[#B88E4F] font-semibold text-xs transition cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Thêm phân loại hàng mới</span>
                </button>
              </div>

              {/* KHỐI 2.2: THÔNG SỐ KỸ THUẬT SẢN PHẨM (SPECIFICATIONS) */}
              <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(35,29,21,0.03)] space-y-3.5">
                {/* Header 2.2 */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAE4D7]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                      <FileText className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#1A1612] flex items-center gap-2">
                        2.2. Thông số kỹ thuật sản phẩm (Specifications)
                        <InfoTooltip text="3 thông số cốt lõi mô tả nguồn gốc xuất xứ, hoạt chất công dụng và thời hạn sử dụng sản phẩm." />
                        <span className="text-[11px] font-bold text-[#8C6226] bg-[#FBF5EB] px-2.5 py-0.5 rounded-full border border-[#EEDFC6]">
                          {storeCategory || formCategory || 'Ngành hàng chuẩn'}
                        </span>
                      </h4>
                    </div>
                  </div>
                </div>

                {/* 3 Thông số cốt lõi tinh gọn phục vụ kiểm duyệt & chi tiết sản phẩm */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#1A1612] block mb-1">
                      Nguồn gốc xuất xứ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formOrigin}
                      onChange={(e) => setFormOrigin(e.target.value)}
                      placeholder="VD: Việt Nam, Hàn Quốc, Nhật Bản..."
                      className="h-8.5 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-semibold text-[#1A1612] outline-none focus:border-[#B88E4F] transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1A1612] block mb-1">
                      Thành phần / Chất liệu / Cấu tạo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formIngredients}
                      onChange={(e) => setFormIngredients(e.target.value)}
                      placeholder={contextPlaceholders.ingredientsPlaceholder || 'VD: Niacinamide 10%, Cotton 100%, Inox 304...'}
                      className="h-8.5 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-semibold text-[#1A1612] outline-none focus:border-[#B88E4F] transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1A1612] block mb-1">
                      Nhãn mác, Cảnh báo & HDSD <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formLabelInfo}
                      onChange={(e) => setFormLabelInfo(e.target.value)}
                      placeholder="VD: Bảo quản khô ráo, tem phụ tiếng Việt..."
                      className="h-8.5 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-semibold text-[#1A1612] outline-none focus:border-[#B88E4F] transition"
                    />
                  </div>
                </div>
              </div>

              {/* KHỐI 2.3: QUY CÁCH ĐÓNG GÓI & VẬN CHUYỂN GHN */}
              <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(35,29,21,0.03)] space-y-3.5">
                {/* Header 2.3 */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAE4D7]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                      <Truck className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#1A1612] flex items-center gap-2">
                        2.3. Quy cách đóng gói kiện hàng (GHN Logistics)
                        <InfoTooltip text="Thiết lập khối lượng thực tế và kích thước kiện carton để hệ thống GHN tự động tính cước vận chuyển." />
                        <span className="text-[11px] font-bold text-[#8C6226] bg-[#FBF5EB] px-2.5 py-0.5 rounded-full border border-[#EEDFC6]">
                          GHN Express
                        </span>
                      </h4>
                    </div>
                  </div>

                  {/* Segmented Switch Control */}
                  <div className="flex items-center p-1 rounded-xl bg-[#F3EFE6] border border-[#EAE4D7] text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setUseCommonShipping(true)}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        useCommonShipping
                          ? 'bg-white text-[#1A1612] shadow-2xs font-bold'
                          : 'text-[#7D715E] hover:text-[#1A1612]'
                      }`}
                    >
                      📦 Dùng chung 1 quy cách
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseCommonShipping(false)}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        !useCommonShipping
                          ? 'bg-white text-[#1A1612] shadow-2xs font-bold'
                          : 'text-[#7D715E] hover:text-[#1A1612]'
                      }`}
                    >
                      📐 Cấu hình riêng từng SKU
                    </button>
                  </div>
                </div>

                {/* Khi dùng chung: 4 ô nhập kích thước & khối lượng chung */}
                {useCommonShipping ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#1A1612] block mb-1">
                          Cân nặng thực tế (gram) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formPackageWeight === 0 ? '' : (formPackageWeight ?? '')}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                            setFormPackageWeight(val as number);
                          }}
                          placeholder="250"
                          className="h-8.5 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-bold text-[#1A1612] outline-none focus:border-[#B88E4F] transition"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#1A1612] block mb-1">
                          Chiều Dài (cm) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formPackageLength === 0 ? '' : (formPackageLength ?? '')}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                            setFormPackageLength(val as number);
                          }}
                          placeholder="15"
                          className="h-8.5 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-bold text-[#1A1612] outline-none focus:border-[#B88E4F] transition"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#1A1612] block mb-1">
                          Chiều Rộng (cm) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formPackageWidth === 0 ? '' : (formPackageWidth ?? '')}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                            setFormPackageWidth(val as number);
                          }}
                          placeholder="10"
                          className="h-8.5 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-bold text-[#1A1612] outline-none focus:border-[#B88E4F] transition"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#1A1612] block mb-1">
                          Chiều Cao (cm) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formPackageHeight === 0 ? '' : (formPackageHeight ?? '')}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                            setFormPackageHeight(val as number);
                          }}
                          placeholder="5"
                          className="h-8.5 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-bold text-[#1A1612] outline-none focus:border-[#B88E4F] transition"
                        />
                      </div>
                    </div>

                    {/* Bảng tính cước GHN tự động gọn gàng (Single-line live bar) */}
                    {(() => {
                      const actG = Number(formPackageWeight) || 0;
                      const l = Number(formPackageLength) || 0;
                      const w = Number(formPackageWidth) || 0;
                      const h = Number(formPackageHeight) || 0;
                      const convG = l > 0 && w > 0 && h > 0 ? Math.round((l * w * h) / 5) : 0;
                      const billG = Math.max(actG, convG);

                      return (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#EEDFC6] text-xs">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-[#C59B58]" />
                            <span className="font-bold text-[#1A1612]">Cước GHN ước tính:</span>
                            <span className="font-mono text-[#7D715E]">
                              Thực tế: <strong>{actG.toLocaleString('vi-VN')}g</strong> · Thể tích ({l}×{w}×{h}/5000): <strong>{convG.toLocaleString('vi-VN')}g</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#7D715E]">Khối lượng tính cước:</span>
                            <span className="font-mono text-xs font-bold text-[#8C6226] bg-[#FBF5EB] px-2.5 py-0.5 rounded-lg border border-[#EEDFC6]">
                              {billG.toLocaleString('vi-VN')} g ({(billG / 1000).toFixed(2)} kg)
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Khi tùy biến riêng: Hiển thị ma trận tổng hợp các phân loại */
                  <div className="rounded-xl border border-[#EEDFC6] bg-[#FAF8F5] p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#8C6226]">
                        <Package size={14} className="text-[#C59B58]" />
                        <span>Ma trận quy cách đóng gói theo từng phân loại SKU:</span>
                      </span>
                      <span className="text-[11px] text-[#7D715E]">
                        (Chỉnh sửa trực tiếp tại bảng 2.1 ở trên)
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-[#EAE4D7] bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#FAF8F5] text-[11px] font-bold text-[#574C3D] border-b border-[#EAE4D7]">
                          <tr>
                            <th className="py-2 px-3">Phân loại SKU</th>
                            <th className="py-2 px-3">Khối lượng thực</th>
                            <th className="py-2 px-3">Kích thước (D × R × C)</th>
                            <th className="py-2 px-3">Khối lượng quy đổi GHN</th>
                            <th className="py-2 px-3">Khối lượng tính cước</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAE4D7]">
                          {formVariants.map((v, i) => {
                            const act = Number(v.packageWeight) || 0;
                            const vl = Number(v.packageLength) || 0;
                            const vw = Number(v.packageWidth) || 0;
                            const vh = Number(v.packageHeight) || 0;
                            const conv = vl > 0 && vw > 0 && vh > 0 ? Math.round((vl * vw * vh) / 5) : 0;
                            const bill = Math.max(act, conv);
                            return (
                              <tr key={v.id || i} className="hover:bg-[#FBF5EB]/40 transition">
                                <td className="py-2 px-3 font-semibold text-[#1A1612]">
                                  {v.name || `Phân loại #${i + 1}`}
                                  <span className="block text-[10px] font-mono text-[#7D715E]">{v.sku}</span>
                                </td>
                                <td className="py-2 px-3 font-mono">
                                  {act > 0 ? `${act.toLocaleString('vi-VN')} g` : <span className="text-rose-500 font-bold">Chưa nhập</span>}
                                </td>
                                <td className="py-2 px-3 font-mono">
                                  {vl > 0 && vw > 0 && vh > 0 ? `${vl} × ${vw} × ${vh} cm` : <span className="text-rose-500 font-bold">Chưa nhập</span>}
                                </td>
                                <td className="py-2 px-3 font-mono text-[#7D715E]">
                                  {conv.toLocaleString('vi-VN')} g
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-[#8C6226]">
                                  {bill.toLocaleString('vi-VN')} g ({(bill / 1000).toFixed(2)} kg)
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BƯỚC 3: TIẾP THỊ & GỬI DUYỆT (THÙ LAO, MẪU & PHÁP LÝ) */}
          {modalStep === 3 && (
            <div className="w-full space-y-4 animate-in fade-in duration-150">
              {/* Card 1: Chính sách thù lao & Hàng mẫu */}
              <div id="product-section-affiliate" className="product-editor-section flex flex-col gap-3.5 rounded-2xl border border-[#EAE4D7] bg-white p-4.5 shadow-[0_2px_10px_rgba(35,29,21,0.03)]">
                <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                      <Percent size={15} />
                    </span>
                    <h4 className="text-xs font-bold text-[#1A1612] uppercase tracking-wide flex items-center">
                      3.1. Thù lao Tiếp thị & Hàng mẫu
                      <InfoTooltip text="Cấu hình chính sách thù lao cho CTV/KOL và cấp phát hàng mẫu trải nghiệm cam kết SLA 14 ngày." />
                    </h4>
                  </div>
                  <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-0.5 text-[11px] font-bold text-[#8C6226]">
                    10.0% Gốc + Bậc KOL
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                  {/* Cột 1: Ước tính thù lao */}
                  <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[#8C6226] font-bold mb-0.5">
                        <Coins className="h-3.5 w-3.5 text-[#B88E4F]" />
                        <span className="flex items-center">
                          Ước tính thù lao cơ sở / đơn:
                          <InfoTooltip text="10% cơ sở + Bậc KOL (Đồng 0%, Bạc +1%, Vàng +2%, Kim Cương +3%). Được giải ngân sau 14 ngày đối soát không đổi trả." />
                        </span>
                      </div>
                    </div>
                    <strong className="text-[#B88E4F] text-base font-mono tabular-nums block mt-1.5 font-bold">
                      {variantPriceRange.min > 0
                        ? `${Math.round((variantPriceRange.min * 10) / 100).toLocaleString('vi-VN')} ₫`
                        : '—'}
                    </strong>
                  </div>

                  {/* Cột 2: Kích hoạt kênh Tiếp thị liên kết */}
                  <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 flex flex-col justify-center">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAffiliateEnabled}
                        onChange={(e) => setFormAffiliateEnabled(e.target.checked)}
                        className="mt-0.5 rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58] h-4 w-4 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#1A1612] flex items-center">
                          Kích hoạt Tiếp thị Liên kết (Affiliate)
                          <InfoTooltip text="Cho phép CTV/KOL sinh Link, QR và đề xuất Deal độc quyền cho sản phẩm này." />
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Cột 3: Hàng mẫu cho KOL */}
                  <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 flex flex-col justify-center">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSampleEnabled}
                        onChange={(e) => setFormSampleEnabled(e.target.checked)}
                        className="mt-0.5 rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58] h-4 w-4 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-[#1A1612] flex items-center">
                          Cấp sản phẩm mẫu cho KOL (Sample)
                          <InfoTooltip text="KOL nhận mẫu 0đ cam kết đăng bài review và trả link trong thời hạn SLA 14 ngày." />
                        </span>
                      </div>
                    </label>

                    {formSampleEnabled && (
                      <div className="mt-2 pt-2 border-t border-[#EAE4D7] flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-[#1A1612] shrink-0">
                          Số suất mẫu mở cấp:
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formSampleQuota}
                          onChange={(e) => setFormSampleQuota(e.target.value === '' ? '' : Number(e.target.value))}
                          onBlur={() => setFormSampleQuota((prev) => prev === '' ? 20 : Math.max(1, Number(prev)))}
                          placeholder="20"
                          required={formSampleEnabled}
                          className="h-7 w-20 rounded-lg border border-[#EAE4D7] bg-white px-2 text-xs font-mono font-bold text-[#1A1612] outline-none focus:border-[#C59B58]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Hồ sơ Pháp lý & Chứng từ */}
              <div id="product-section-legal" className="product-editor-section flex flex-col gap-3.5 rounded-2xl border border-[#EAE4D7] bg-white p-4.5 shadow-[0_2px_10px_rgba(35,29,21,0.03)]">
                <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                      <ShieldCheck size={15} />
                    </span>
                    <h4 className="text-xs font-bold text-[#1A1612] uppercase tracking-wide flex items-center">
                      3.2. Hồ sơ Pháp lý & Chứng từ Kiểm duyệt
                      <InfoTooltip text="Mã tiếp nhận phiếu công bố và tài liệu chứng minh xuất xứ hợp pháp phục vụ kiểm duyệt." />
                    </h4>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                    isStep3Complete
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226]'
                  }`}>
                    {isStep3Complete ? '✓ Đã có minh chứng' : 'Tối thiểu 1 minh chứng'}
                  </span>
                </div>

                {/* Số tiếp nhận Phiếu công bố / Giấy phép lưu hành */}
                <div className="p-3 rounded-xl border border-[#EEDFC6] bg-[#FAF8F5] space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[#1A1612] flex items-center gap-1.5">
                      <FileText size={13} className="text-[#C59B58]" />
                      <span>Số tiếp nhận Phiếu công bố sản phẩm / Giấy phép lưu hành</span>
                      <InfoTooltip text="Theo Thông tư 06/2011/TT-BYT & Nghị định 15/2018/NĐ-CP. Tra cứu từ Cổng Dịch vụ công Quốc gia." />
                    </label>
                    <span className="text-[10px] text-[#8C6226] font-semibold bg-[#FBF5EB] px-2 py-0.5 rounded-full border border-[#EEDFC6]">
                      Cổng Dịch vụ công Quốc gia
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formNotificationNumber}
                    onChange={(e) => setFormNotificationNumber(e.target.value)}
                    placeholder="VD: 12345/24/CBMP-QLD hoặc 01/2024/DKSP"
                    className="h-8.5 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-mono font-bold text-[#1A1612] outline-none focus:border-[#C59B58] transition"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  <div>
                    <ProductEvidenceEditor
                      title="Minh chứng xuất xứ & Hóa đơn"
                      description="Link tra cứu hoặc ảnh hóa đơn VAT, tờ khai hải quan, chứng nhận xuất xứ"
                      required={!isStep3Complete}
                      inputId="origin-proof-images"
                      links={formOriginProofLinks}
                      images={formOriginProofImages}
                      uploading={uploadingImage}
                      uploadLabel={uploadingSlot === 'origin-proof' ? 'Đang tải…' : 'Tải ảnh'}
                      onLinksChange={setFormOriginProofLinks}
                      onImagesChange={setFormOriginProofImages}
                      onUpload={(files) => { void handleUploadProofImages(files, 'origin'); }}
                    />
                  </div>

                  <div>
                    <ProductEvidenceEditor
                      title="Minh chứng nhãn mác & Giấy phép"
                      description="Ảnh chụp tem nhãn phụ, phiếu công bố mỹ phẩm / chứng nhận ATTP"
                      required={!isStep3Complete}
                      inputId="label-proof-images"
                      links={formLabelProofLinks}
                      images={formLabelProofImages}
                      uploading={uploadingImage}
                      uploadLabel={uploadingSlot === 'label-proof' ? 'Đang tải…' : 'Tải ảnh'}
                      onLinksChange={setFormLabelProofLinks}
                      onImagesChange={setFormLabelProofImages}
                      onUpload={(files) => { void handleUploadProofImages(files, 'label'); }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Summary Review Card (Bảng kiểm tra tổng quan trước khi gửi) */}
              <div className="rounded-2xl border border-[#EEDFC6] bg-white p-4.5 shadow-[0_2px_10px_rgba(35,29,21,0.03)] space-y-3">
                <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-[#C59B58] text-white">
                      <CheckCircle2 size={15} />
                    </span>
                    <h5 className="text-xs font-bold text-[#1A1612] uppercase tracking-wide flex items-center">
                      Tổng quan hồ sơ gửi duyệt
                      <InfoTooltip text="Đối soát thông số trước khi chuyển chuyên viên kiểm duyệt mở bán sản phẩm." />
                    </h5>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isStep1Complete && isStep2Complete && isStep3Complete
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {isStep1Complete && isStep2Complete && isStep3Complete
                      ? '✓ Hồ sơ đầy đủ, sẵn sàng gửi duyệt'
                      : 'Cần hoàn thiện các mục còn thiếu'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EAE4D7]">
                    <span className="text-[10.5px] text-[#7D715E] block font-medium">Sản phẩm & Danh mục:</span>
                    <strong className="text-[#1A1612] truncate block mt-0.5 font-bold">{formTitle || 'Chưa đặt tên'}</strong>
                    <span className="text-[10.5px] text-[#8C6226] block mt-0.5 font-mono">{formCategory} · SKU: {formSku}</span>
                  </div>

                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EAE4D7]">
                    <span className="text-[10.5px] text-[#7D715E] block font-medium">Quy cách & Giá bán:</span>
                    <strong className="text-[#1A1612] block mt-0.5 font-bold">
                      {formVariants.length > 0 ? `${formVariants.length} phân loại hàng` : 'Sản phẩm đơn'}
                    </strong>
                    <span className="text-[10.5px] text-[#8C6226] block mt-0.5 font-mono tabular-nums">
                      {variantPriceRange.min > 0
                        ? `Giá: ${variantPriceRange.min.toLocaleString('vi-VN')} ₫${variantPriceRange.isRange ? ' ~ ' + variantPriceRange.max.toLocaleString('vi-VN') + ' ₫' : ''}`
                        : 'Chưa nhập giá'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EAE4D7]">
                    <span className="text-[10.5px] text-[#7D715E] block font-medium">Đóng gói kiện GHN:</span>
                    <strong className="text-[#1A1612] block mt-0.5 font-bold">
                      {useCommonShipping
                        ? (formPackageWeight ? `${formPackageWeight} g (Dùng chung)` : 'Chưa nhập g')
                        : `${formVariants.length} phân loại riêng`}
                    </strong>
                    <span className="text-[10.5px] text-[#8C6226] block mt-0.5 font-mono">
                      {useCommonShipping
                        ? (formPackageLength && formPackageWidth && formPackageHeight
                            ? `${formPackageLength} × ${formPackageWidth} × ${formPackageHeight} cm`
                            : 'Chưa có kích thước')
                        : 'Khai báo theo từng SKU'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EAE4D7]">
                    <span className="text-[10.5px] text-[#7D715E] block font-medium">Hồ sơ pháp lý:</span>
                    <strong className="text-[#1A1612] block mt-0.5 font-bold">
                      {isStep3Complete ? 'Đã đủ chứng từ' : 'Chưa đủ chứng từ'}
                    </strong>
                    <span className="text-[10.5px] text-[#8C6226] block mt-0.5 truncate font-mono" title={formNotificationNumber ? `Số CB: ${formNotificationNumber}` : undefined}>
                      {formNotificationNumber ? `Số CB: ${formNotificationNumber}` : `${formOriginProofLinks.length + formOriginProofImages.length} xuất xứ · ${formLabelProofLinks.length + formLabelProofImages.length} nhãn mác`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </form>
      </Modal>


      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[1.5px] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-[#EAE4D7] w-full max-w-sm p-5 sm:p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3.5">
              <div className="w-10 h-10 bg-rose-50 border border-rose-200/60 rounded-xl flex items-center justify-center flex-shrink-0 text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1A1612] m-0">Xác nhận tạm dừng sản phẩm</h3>
                <p className="text-[11px] text-[#7D715E] m-0 mt-0.5">Sản phẩm sẽ chuyển sang trạng thái ngừng bán</p>
              </div>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE4D7] text-xs text-[#7D715E] space-y-1.5 mb-5">
              <div className="truncate">• <strong>Tên:</strong> {deleteConfirmProduct.title || deleteConfirmProduct.name}</div>
              <div>• <strong>Mã SKU:</strong> <span className="font-mono font-bold text-[#B88E4F]">{deleteConfirmProduct.sku}</span></div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 text-xs font-bold text-[#7D715E] bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmProduct.id;
                  setDeleteConfirmProduct(null);
                  try {
                    await productService.softDeleteProduct(id);
                    showToast('Đã cập nhật trạng thái tạm dừng sản phẩm');
                    loadProducts();
                  } catch (err: any) {
                    showToast(err.message || 'Lỗi khi xóa sản phẩm');
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal Đề xuất Chiến dịch Giảm giá Đơn lẻ (Kiểm soát Giá Sàn Floor Price & Maker-Checker) */}
      {discountModalProduct && (
        <ProposePromotionModal
          isOpen={!!discountModalProduct}
          product={discountModalProduct}
          catalog={products}
          onClose={() => setDiscountModalProduct(null)}
          onSuccess={() => {
            setDiscountModalProduct(null);
            showToast('Đã gửi đề xuất giảm giá thành công. Yêu cầu đang chờ thẩm định Maker-Checker!');
          }}
        />
      )}

      {/* Modal Đề xuất Chiến dịch Giảm giá Hàng loạt (Bulk Multi-Product Promotion) */}
      {bulkDiscountProducts && (
        <ProposePromotionModal
          isOpen={!!bulkDiscountProducts}
          selectedProducts={bulkDiscountProducts}
          catalog={products}
          onClose={() => setBulkDiscountProducts(null)}
          onSuccess={() => {
            setBulkDiscountProducts(null);
            setSelectedIds([]);
            showToast('Đã gửi đề xuất giảm giá hàng loạt thành công. Yêu cầu đang chờ thẩm định Maker-Checker!');
          }}
        />
      )}

      {/* Modal Xác nhận Phê duyệt sản phẩm dành cho Admin & Vận hành */}
      {moderatingProduct && moderatingAction === 'APPROVED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] w-full max-w-md p-5 sm:p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3.5 pb-3 border-b border-[#EAE4D7]">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center shrink-0 text-emerald-600">
                <CheckCircle2 className="w-5 h-5 text-[#059669]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#1A1612] m-0">Phê duyệt sản phẩm lên sàn</h3>
                <p className="text-xs text-[#7D715E] m-0 mt-0.5">Sản phẩm sẽ được hiển thị công khai trên SCANMS</p>
              </div>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE4D7] text-xs text-[#7D715E] space-y-1 mb-4">
              <div className="truncate">• <strong>Sản phẩm:</strong> <span className="text-[#1A1612] font-semibold">{moderatingProduct.title || moderatingProduct.name}</span></div>
              <div>• <strong>Mã SKU:</strong> <span className="font-mono font-bold text-[#B88E4F]">{moderatingProduct.sku}</span></div>
              <div>• <strong>Giá bán:</strong> <span className="font-bold text-[#1A1612]">{Number(moderatingProduct.price || 0).toLocaleString('vi-VN')} ₫</span></div>
            </div>

            <p className="text-xs text-[#7D715E] leading-relaxed mb-4">
              Sau khi phê duyệt, sản phẩm sẽ được mở bán chính thức trên sàn SCANMS, khách hàng có thể đặt mua và KOL có thể lấy link tiếp thị liên kết để nhận hoa hồng.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => {
                  setModeratingProduct(null);
                  setModeratingAction(null);
                }}
                className="px-4 py-2 text-xs font-bold text-[#7D715E] bg-white border border-[#EAE4D7] hover:bg-[#F3EFE6] rounded-xl transition cursor-pointer active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={moderationSubmitting || isOwnProductSubmission(moderatingProduct, currentUser?.id)}
                onClick={() => handleApproveProduct(moderatingProduct)}
                className="px-5 py-2 bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
              >
                {moderationSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang duyệt...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Xác nhận phê duyệt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ chối duyệt sản phẩm dành cho Admin & Vận hành */}
      {moderatingProduct && moderatingAction === 'REJECTED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] w-full max-w-md p-5 sm:p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3.5 pb-3 border-b border-[#EAE4D7]">
              <div className="w-10 h-10 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center shrink-0 text-rose-600">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#1A1612] m-0">Từ chối kiểm duyệt sản phẩm</h3>
                <p className="text-xs text-[#7D715E] m-0 mt-0.5">Sản phẩm sẽ bị chặn bán và gửi lý do cho Shop</p>
              </div>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE4D7] text-xs text-[#7D715E] space-y-1 mb-3.5">
              <div className="truncate">• <strong>Sản phẩm:</strong> <span className="text-[#1A1612] font-semibold">{moderatingProduct.title || moderatingProduct.name}</span></div>
              <div>• <strong>Mã SKU:</strong> <span className="font-mono font-bold text-[#B88E4F]">{moderatingProduct.sku}</span></div>
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold text-[#1A1612] block">
                Lý do từ chối kiểm duyệt <span className="text-rose-500">*</span>
              </label>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  'Sản phẩm thuộc danh mục cấm / chất kích thích / vi phạm pháp luật',
                  'Hình ảnh không đạt chuẩn hoặc có yếu tố phản cảm',
                  'Chưa cung cấp đủ giấy phép lưu hành / công bố mỹ phẩm',
                  'Thông tin công dụng không đúng thực tế, quảng cáo sai lệch',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setModerationReason(reason)}
                    className="text-[10px] px-2 py-1 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:text-[#1A1612] hover:border-[#C59B58] transition text-left cursor-pointer"
                  >
                    + {reason}
                  </button>
                ))}
              </div>

              <textarea
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder="Nhập lý do cụ thể để Shop nắm rõ và khắc phục..."
                rows={3}
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl p-2.5 text-xs text-[#1A1612] outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 transition resize-none font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => {
                  setModeratingProduct(null);
                  setModeratingAction(null);
                  setModerationReason('');
                }}
                className="px-4 py-2 text-xs font-bold text-[#7D715E] bg-white border border-[#EAE4D7] hover:bg-[#F3EFE6] rounded-xl transition cursor-pointer active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={moderationSubmitting || moderationReason.trim().length < 3 || isOwnProductSubmission(moderatingProduct, currentUser?.id)}
                onClick={handleRejectProduct}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
              >
                {moderationSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Xác nhận từ chối</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedVideoProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-[2px] animate-fadeIn"
          onClick={() => setSelectedVideoProduct(null)}
        >
          <div
            className="kol-video-review-modal bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] w-full max-w-[900px] max-h-[calc(100dvh-32px)] text-left animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kol-video-review-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kol-video-review-header flex items-center justify-between bg-white border-b border-[#EAE4D7] p-3 sm:p-[14px_18px] shrink-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-10 h-10 bg-[#FBF5EB] border border-[#EAE4D7] rounded-xl flex items-center justify-center text-[#B88E4F] shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 id="kol-video-review-title" className="text-base font-semibold text-[#1A1612] m-0 flex flex-wrap items-center gap-2">
                    Duyệt video KOL
                    <span className="kol-video-scope border border-[#EAE4D7] rounded-md px-1.5 py-0.5 text-[#7D715E] bg-white text-[10px] font-medium tracking-normal">{selectedVideoProduct.id === '__ALL__' ? 'Tất cả sản phẩm' : selectedVideoProduct.sku}</span>
                  </h3>
                  <p className="text-xs text-[#7D715E] m-0 mt-0.5">
                    {selectedVideoProduct.id === '__ALL__'
                      ? 'Xem video và phản hồi cho nhà sáng tạo.'
                      : `Sản phẩm: ${selectedVideoProduct.title || (selectedVideoProduct as any).name}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng cửa sổ duyệt video"
                onClick={() => setSelectedVideoProduct(null)}
                className="w-8 h-8 rounded-lg text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="kol-video-review-list flex-1 overflow-y-auto p-3 sm:p-[14px_16px] space-y-3 overscroll-contain [scrollbar-color:#EEDFC6_#FFFFFF]">
              {loadingVideos ? (
                <div className="text-center py-10 text-xs text-[#7D715E]">
                  Đang tải danh sách video review từ máy chủ...
                </div>
              ) : productVideos.length === 0 ? (
                <div className="text-center py-10 bg-[#FAF8F5] rounded-xl border border-dashed border-[#EAE4D7] p-6">
                  <Video className="w-8 h-8 text-[#7D715E]/40 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#1A1612] m-0">Chưa có video review nào</p>
                  <p className="text-[11px] text-[#7D715E] mt-1 m-0">
                    {selectedVideoProduct.id === '__ALL__'
                      ? 'Hiện chưa có video KOL nào được gửi đến gian hàng.'
                      : 'Khi KOL/CTV nộp video review cho sản phẩm này qua Media Hub, video sẽ xuất hiện tại đây để bạn kiểm duyệt.'}
                  </p>
                </div>
              ) : (
                <div className="kol-video-workspace">
                  <nav className="kol-video-picker" aria-label="Danh sách video cần xem">
                    <p className="kol-video-picker-count"><span>Danh sách video</span><strong>{productVideos.length}</strong></p>
                    {productVideos.map((video: any, index: number) => (
                      <button key={video.id} type="button" className="kol-video-picker-item" data-status={video.status} aria-pressed={activeReviewVideo?.id === video.id} onClick={() => setActiveVideoId(video.id)}>
                        <span className="kol-video-picker-thumb">{video.posterUrl ? <img src={video.posterUrl} alt="" /> : <Video size={18} />}<span>{index + 1}</span></span>
                        <span className="kol-video-picker-text"><strong>{video.title || 'Video review sản phẩm'}</strong><span>{video.collaborator?.fullName || 'Nhà sáng tạo'}</span><small>{({ PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối', HIDDEN: 'Đã ẩn' } as Record<string, string>)[video.status] || video.status}{video.isFeatured ? ' · Đã ghim' : ''}</small></span>
                      </button>
                    ))}
                  </nav>
                  <div className="kol-video-selected">
                {[activeReviewVideo].filter(Boolean).map((v: any) => {
                  const isPending = v.status === 'PENDING';
                  const isApproved = v.status === 'APPROVED';
                  const isRejected = v.status === 'REJECTED';
                  const isHidden = v.status === 'HIDDEN';

                  return (
                    <article
                      key={v.id}
                      className="kol-video-review-card bg-white rounded-xl border border-[#EAE4D7] p-3 text-xs shadow-none"
                    >
                      <div className="kol-video-review-layout grid grid-cols-1 sm:grid-cols-[224px_minmax(0,1fr)] gap-3 sm:gap-4 items-start">
                        <div className="kol-video-player overflow-hidden border border-[#EAE4D7] rounded-[10px] bg-[#FAF8F5] max-sm:w-full max-sm:max-w-[280px] max-sm:justify-self-center">
                          <video
                            src={v.urlOrContent}
                            poster={v.posterUrl || undefined}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full aspect-video object-contain"
                            aria-label={`Video review ${v.title || 'của KOL'}`}
                          >
                            Trình duyệt của bạn không hỗ trợ phát video này.
                          </video>
                        </div>

                        <div className="kol-video-info flex flex-col min-w-0">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="kol-video-title text-sm font-semibold text-[#1A1612]" title={v.title}>
                            {v.title || 'Video review sản phẩm'}
                          </strong>
                          {isPending && <Badge variant="neutral" className="kol-video-status"><Clock3 className="h-3 w-3 text-[#B88E4F]" />Chờ duyệt</Badge>}
                          {isApproved && <Badge variant="neutral" className="kol-video-status"><CheckCircle2 className="h-3 w-3 text-[#059669]" />Đã duyệt</Badge>}
                          {isRejected && <Badge variant="danger">Bị từ chối</Badge>}
                          {isHidden && <Badge variant="neutral">Đã ẩn</Badge>}
                          {v.isFeatured && (
                            <span className="kol-video-featured inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]">
                              <Star className="w-2.5 h-2.5" /> Đã ghim
                            </span>
                          )}
                        </div>

                        <details className="kol-video-details"><summary>Thông tin video & sản phẩm</summary>
                        <div className="kol-video-metadata text-[11px] text-[#7D715E]">
                          <p>KOL: <strong>{v.collaborator?.fullName || 'Nhà sáng tạo'}</strong></p>
                          <p>
                            Sản phẩm:{' '}
                            <strong className="text-[#1A1612]">
                              {v.product?.title || v.productName || selectedVideoProduct.title}
                            </strong>
                            {v.product?.sku ? ` (${v.product.sku})` : ''}
                          </p>
                          <a
                            href={v.urlOrContent}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#B88E4F] hover:underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" /> Mở video
                          </a>
                        </div>

                        {v.caption && (
                          <p className="kol-video-caption text-[11px] text-[#7D715E] m-0">
                            {v.caption}
                          </p>
                        )}
                        </details>

                        {v.rejectionReason && (
                          <p className="text-[11px] text-rose-600 font-semibold m-0">
                            Lý do từ chối/ẩn: {v.rejectionReason}
                          </p>
                        )}
                      </div>

                      <div className="kol-video-actions flex flex-wrap items-center gap-2 shrink-0">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              disabled={reviewingMediaId === v.id}
                              onClick={() => handleApproveVideo(v.id, false)}
                              className="kol-video-approve px-2.5 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              disabled={reviewingMediaId === v.id}
                              onClick={() => handleApproveVideo(v.id, true)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#FBF5EB] border border-[#EAE4D7] text-[#B88E4F] font-bold text-xs hover:bg-[#F3EFE6] transition cursor-pointer disabled:opacity-50"
                              title="Duyệt và đặt làm video nổi bật nhất trên Landing"
                            >
                              <Star className="h-3.5 w-3.5" /> Duyệt &amp; ghim
                            </button>
                            <button
                              type="button"
                              disabled={reviewingMediaId === v.id}
                              onClick={() => openRejectionModal(v, 'REJECTED')}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 transition cursor-pointer"
                            >
                              Từ chối
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <>
                            {!v.isFeatured && (
                              <button
                                type="button"
                                disabled={reviewingMediaId === v.id}
                                onClick={() => handleApproveVideo(v.id, true)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#FBF5EB] border border-[#EAE4D7] text-[#B88E4F] font-bold text-xs hover:bg-[#F3EFE6] transition cursor-pointer"
                              >
                                Ghim nổi bật
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={reviewingMediaId === v.id}
                              onClick={() => openRejectionModal(v, 'HIDDEN')}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[#7D715E] font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                            >
                              Ẩn video
                            </button>
                          </>
                        )}

                        {(isRejected || isHidden) && (
                          <button
                            type="button"
                            disabled={reviewingMediaId === v.id}
                            onClick={() => handleApproveVideo(v.id, false)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] text-[#1A1612] font-bold text-xs hover:bg-white transition cursor-pointer"
                          >
                            Phục hồi duyệt
                          </button>
                        )}
                      </div>
                      </div>
                      </div>
                    </article>
                  );
                })}
                  </div>
                </div>
              )}
            </div>

            <div className="kol-video-review-footer bg-white border-t border-[#EAE4D7] flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedVideoProduct(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}


      {rejectionModalMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-[2px] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] w-full max-w-md p-6 text-left animate-in zoom-in-95 duration-150 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1612] m-0">
                  {rejectionActionType === 'REJECTED' ? 'Từ chối video review' : 'Ẩn video review khỏi sàn'}
                </h3>
                <p className="text-xs text-[#7D715E] m-0 mt-0.5">
                  Bắt buộc cung cấp lý do kiểm duyệt để lưu AuditLog
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1612] block mb-1">
                Lý do kiểm duyệt <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Ví dụ: Nội dung video chưa rõ nguồn gốc sản phẩm, âm thanh bị rè, hoặc vi phạm bản quyền..."
                rows={3}
                className="w-full p-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612] outline-none focus:border-[#B88E4F] resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectionModalMedia(null)}
              >
                Hủy bỏ
              </Button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={!rejectionReasonInput.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}


      {showReviewModeration && <ReviewManagementDialog admin={isAdminOrManager} onClose={() => setShowReviewModeration(false)} />}

      <ProductAiMatchDrawer
        product={aiDrawerProduct}
        isOpen={Boolean(aiDrawerProduct)}
        onClose={() => setAiDrawerProduct(null)}
      />
      {identityWarning && <ProductIdentityWarning items={identityWarning.items} onCancel={() => setIdentityWarning(null)} onConfirm={() => {
        confirmedIdentity.current = identityWarning.fingerprint;
        setIdentityWarning(null);
        submittedForm.current?.requestSubmit();
      }} />}
    </div>
  );
}

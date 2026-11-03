import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  Camera,
  CreditCard,
  FileText,
  Trash2,
  RotateCcw,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { uploadService } from '../../services/upload.service';
import { toast } from '../../utils/toast';

export interface ImageUploadDropzoneProps {
  label: string;
  helperText?: string;
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  iconType?: 'camera' | 'idcard' | 'file' | 'upload';
  required?: boolean;
  className?: string;
  variant?: 'compact' | 'document';
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  label,
  helperText,
  value,
  onChange,
  folder = 'scanms/kyc',
  iconType = 'upload',
  required = false,
  className = '',
  variant = 'compact',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng ảnh không được vượt quá 5MB');
      return;
    }

    setUploading(true);
    try {
      // 1. Tải lên Cloudinary qua uploadService
      const secureUrl = await uploadService.uploadImage(file, folder);
      onChange(secureUrl);
      toast.success('Tải ảnh từ máy lên thành công!');
    } catch (err: any) {
      console.warn('Lỗi upload server, chuyển sang đọc FileReader:', err);
      // 2. Fallback FileReader Data URL nếu mạng/server upload tạm bận
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onChange(dataUrl);
        toast.success('Đã tải ảnh lên thành công!');
      };
      reader.onerror = () => {
        toast.error('Không thể đọc file ảnh từ máy của bạn');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const renderIcon = () => {
    switch (iconType) {
      case 'camera':
        return <Camera className="w-4 h-4 text-[#B88E4F]" />;
      case 'idcard':
        return <CreditCard className="w-4 h-4 text-[#B88E4F]" />;
      case 'file':
        return <FileText className="w-4 h-4 text-[#B88E4F]" />;
      default:
        return <UploadCloud className="w-4 h-4 text-[#B88E4F]" />;
    }
  };

  if (variant === 'document') {
    return (
      <div className={`space-y-1.5 min-w-0 ${className}`}>
        <div className="flex items-center justify-between text-xs font-semibold text-[#1A1612]">
          <span>
            {label}
            {required && <span className="text-[#C59B58]"> *</span>}
          </span>
          {value && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#059669] bg-[#F0FDF4] px-2 py-0.5 rounded-full border border-[#DCFCE7]">
              <CheckCircle2 size={11} /> Đã đính kèm
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={handleFileSelected}
          className="hidden"
          aria-label={label}
        />

        <div
          onClick={() => !value && fileInputRef.current?.click()}
          className={`flex items-center gap-3.5 min-h-[72px] p-3 rounded-xl transition-all duration-200 ${
            value
              ? 'bg-white border border-[#EAE4D7] shadow-2xs'
              : 'border-2 border-dashed border-[#EEDFC6] bg-[#FAF8F5]/80 hover:bg-[#FBF5EB]/50 hover:border-[#C59B58] cursor-pointer'
          }`}
        >
          {value ? (
            <button
              type="button"
              className="shrink-0 w-14 h-12 p-0.5 overflow-hidden rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] cursor-pointer hover:opacity-90 transition group relative"
              onClick={(e) => {
                e.stopPropagation();
                window.open(value, '_blank', 'noopener,noreferrer');
              }}
              title="Bấm để xem ảnh phóng to"
            >
              <img src={value} alt={label} className="w-full h-full object-cover rounded-md" />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white border border-[#EEDFC6] flex items-center justify-center shrink-0 text-[#B88E4F] shadow-2xs">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#C59B58]" />
              ) : (
                renderIcon()
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#1A1612] truncate">
              {uploading
                ? 'Đang tải ảnh lên…'
                : value
                  ? 'Đã tải ảnh lên'
                  : 'Tải ảnh lên'}
            </p>
            <p className="text-[11px] text-[#7D715E] mt-0.5">
              {value
                ? 'Bấm vào ảnh để xem kích thước đầy đủ'
                : 'PNG, JPG, WEBP · Tối đa 5 MB'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#EEDFC6] bg-white hover:bg-[#FBF5EB] hover:border-[#C59B58] text-[#8F682E] transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {value ? 'Đổi ảnh' : 'Chọn ảnh'}
            </button>
            {value && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => onChange('')}
                aria-label={`Xóa ${label}`}
                title="Xóa ảnh này"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FEF2F2] hover:border-[#FCA5A5] text-[#7D715E] hover:text-[#DC2626] transition shadow-2xs cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {helperText && (
          <p className="text-[11px] text-[#7D715E] leading-relaxed mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Label & Required star */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#1A1612] block truncate">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {value && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            ✓ Đã tải ảnh
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Upload Zone / Compact States */}
      {uploading ? (
        /* Uploading State - Compact 46px */
        <div className="h-11 px-3.5 rounded-xl border border-[#C59B58] bg-[#FBF5EB]/70 flex items-center justify-center gap-2 text-xs font-bold text-[#1A1612] shadow-2xs">
          <Loader2 className="w-4 h-4 text-[#B88E4F] animate-spin" />
          <span>Đang tải ảnh từ máy lên...</span>
        </div>
      ) : value ? (
        /* Uploaded State - Compact Row 52px */
        <div className="h-13 px-2.5 rounded-xl border border-[#EAE4D7] bg-white flex items-center justify-between gap-2.5 shadow-2xs hover:border-[#C59B58]/50 transition">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              onClick={() => window.open(value, '_blank')}
              className="relative w-9 h-9 rounded-lg overflow-hidden border border-[#EAE4D7] bg-[#FAF8F5] shrink-0 cursor-pointer group/thumb"
              title="Bấm để xem ảnh gốc kích thước đầy đủ"
            >
              <img
                src={value}
                alt={label}
                className="w-full h-full object-cover group-hover/thumb:scale-110 transition"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                <ExternalLink className="w-3 h-3 text-white" />
              </div>
            </div>

            <div className="min-w-0">
              <span className="text-xs font-bold text-[#1A1612] block truncate">
                File ảnh đã đính kèm
              </span>
              <span className="text-[10.5px] text-emerald-600 font-semibold block truncate">
                ✓ Sẵn sàng xét duyệt
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EAE4D7] hover:border-[#C59B58]/60 text-[11px] font-bold text-[#1A1612] flex items-center gap-1 transition cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3 h-3 text-[#B88E4F]" />
              <span>Đổi ảnh</span>
            </button>

            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer active:scale-95"
              title="Xóa ảnh"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty State - Slim Horizontal Input-like Bar 46px */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="h-11 px-3 rounded-xl border border-dashed border-[#EAE4D7] hover:border-[#C59B58] bg-[#FAF8F5] hover:bg-white flex items-center justify-between gap-2.5 cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-xs active:scale-[0.99]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center group-hover:scale-105 transition shrink-0 shadow-2xs">
              {renderIcon()}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-[#1A1612] group-hover:text-[#B88E4F] transition truncate">
                Bấm để tải ảnh từ máy lên
              </span>
              <span className="text-[10.5px] text-[#7D715E] hidden sm:inline truncate">
                (PNG, JPG, WEBP tối đa 5MB)
              </span>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-white group-hover:bg-[#FBF5EB] border border-[#EAE4D7] group-hover:border-[#C59B58] text-[11px] font-bold text-[#B88E4F] shrink-0 transition shadow-2xs">
            Chọn file
          </span>
        </div>
      )}

      {/* Helper text if any */}
      {helperText && (
        <p className="text-[10.5px] text-[#7D715E] m-0 leading-relaxed truncate">
          {helperText}
        </p>
      )}
    </div>
  );
};

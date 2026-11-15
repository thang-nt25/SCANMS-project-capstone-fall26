import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Ticket, X } from 'lucide-react';
import {
  couponService,
  type CouponItem,
} from '../../services/coupon.service';
import { toast as sonnerToast } from '../../utils/toast';
import api from '../../services/api';
import { KolCouponWorkspace } from './KolCouponWorkspace';
import { CouponProposalDialog } from './CouponProposalDialog';

interface EligibleStore {
  id?: string;
  storeId?: string;
  name?: string;
  storeName?: string;
  logoUrl?: string | null;
  owner?: { avatarUrl?: string | null } | null;
}

export const KolCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [summary, setSummary] = useState<{
    totalSales: number;
    totalCommission: number;
    totalOrders: number;
    activeCoupons: number;
  }>({ totalSales: 0, totalCommission: 0, totalOrders: 0, activeCoupons: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvedStores, setApprovedStores] = useState<EligibleStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [proposeCode, setProposeCode] = useState('');
  const [proposeNote, setProposeNote] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);


  const [deleteTarget, setDeleteTarget] = useState<CouponItem | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);


  const [toast, setToast] = useState<{
    id: number;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const showToast = (
    type: 'success' | 'error' | 'info',
    title: string,
    message: string,
  ) => {
    const id = Date.now();
    setToast({ id, type, title, message });

    if (window.self !== window.top) {
      window.parent.postMessage(
        { type: 'SCANMS_TOAST', message: `${title}: ${message}` },
        window.location.origin,
      );
    }

    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  };

  const hasOpenModal = isModalOpen || deleteTarget !== null;

  useEffect(() => {
    if (window.self === window.top) return;

    window.parent.postMessage(
      { type: 'SCANMS_MODAL_STATE', open: hasOpenModal },
      window.location.origin,
    );

    return () => {
      if (hasOpenModal) {
        window.parent.postMessage(
          { type: 'SCANMS_MODAL_STATE', open: false },
          window.location.origin,
        );
      }
    };
  }, [hasOpenModal]);

  useEffect(() => {
    if (deleteTarget) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [deleteTarget]);


  const fetchCouponsRef = useRef<(retryCount?: number) => Promise<void>>(() => Promise.resolve());
  const fetchApprovedStoresRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    fetchCouponsRef.current();
    fetchApprovedStoresRef.current();

    const handleSync = (e: MessageEvent) => {
      if (e.data?.type === 'SCANMS_AUTH_SYNC') {
        fetchCouponsRef.current();
        fetchApprovedStoresRef.current();
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user' || e.key === 'scanms-current-role') {
        fetchCouponsRef.current();
        fetchApprovedStoresRef.current();
      }
    };
    const handleFocus = () => {
      fetchCouponsRef.current();
    };

    window.addEventListener('message', handleSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    const handleOpenPropose = () => {
      setIsModalOpen(true);
      setModalError(null);
      setModalSuccess(null);
    };
    window.addEventListener('scanms_open_propose_coupon', handleOpenPropose);

    return () => {
      window.removeEventListener('message', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('scanms_open_propose_coupon', handleOpenPropose);
    };
  }, []);

  const fetchCoupons = async (retryCount = 0) => {
    try {
      setLoading(true);
      const res = await couponService.getKolCoupons({ page: 1, limit: 100 });
      const list = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
      const allCoupons = [...list];
      const total = Number(res?.meta?.total ?? res?.data?.meta?.total ?? list.length);
      for (let nextPage = 2; allCoupons.length < total; nextPage++) {
        const next = await couponService.getKolCoupons({ page: nextPage, limit: 100 });
        const batch = Array.isArray(next?.data) ? next.data : next?.data?.data;
        if (!Array.isArray(batch) || !batch.length) break;
        allCoupons.push(...batch);
      }
      setCoupons(allCoupons);
      setLoadError('');
      const sum = res?.summary || res?.data?.summary;
      if (sum) {
        setSummary(sum);
      }
      if (list.length === 0 && retryCount < 2) {
        setTimeout(() => fetchCoupons(retryCount + 1), 400);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách coupon của KOL:', err);
      setLoadError('Không tải được danh sách mã giảm giá. Vui lòng thử lại.');
      if (retryCount < 2) {
        setTimeout(() => fetchCoupons(retryCount + 1), 400);
      }
    } finally {
      setLoading(false);
    }
  };
  fetchCouponsRef.current = fetchCoupons;

  const fetchApprovedStores = async () => {
    try {

      const res = await api.get('/collaborator/coupons/eligible-stores');
      const storeList = res.data?.data || res.data || [];
      setApprovedStores(storeList);
      if (storeList.length > 0) {
        setSelectedStoreId(storeList[0].id || storeList[0].storeId);
      } else {
        setSelectedStoreId('');
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách gian hàng đủ điều kiện tạo coupon:', err);
      setApprovedStores([]);
      setSelectedStoreId('');
    }
  };
  fetchApprovedStoresRef.current = fetchApprovedStores;

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      sonnerToast.success('Đã sao chép mã giảm giá!');
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      sonnerToast.error('Không thể sao chép mã giảm giá. Vui lòng thử lại.');
    }
  };

  const handleTogglePause = async (coupon: CouponItem) => {
    try {
      await couponService.togglePauseCoupon(coupon.id);
      sonnerToast.success(coupon.status === 'ACTIVE' ? 'Đã tạm dừng mã giảm giá' : 'Đã kích hoạt lại mã giảm giá');
      await fetchCoupons();
    } catch (err: any) {
      sonnerToast.error(err.response?.data?.message || 'Không thể thay đổi trạng thái coupon');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await couponService.deleteCoupon(deleteTarget.id, deleteReason);
      setDeleteTarget(null);
      setDeleteReason('');
      sonnerToast.success('Đã xóa mã giảm giá');
      await fetchCoupons();
    } catch (err: any) {
      sonnerToast.error(err.response?.data?.message || 'Không thể xóa mã giảm giá');
    } finally {
      setDeleteLoading(false);
    }
  };


  const trimmedCode = proposeCode.trim().toUpperCase();
  const isLengthValid = trimmedCode.length >= 4 && trimmedCode.length <= 20;
  const isAlphanumeric = /^[A-Z0-9]+$/.test(trimmedCode);
  const hasLetter = /[A-Z]/.test(trimmedCode);
  const isBanned = [
    'ADMIN',
    'SCANMS',
    'OFFICIAL',
    'SYSTEM',
    'SUPPORT',
    'ROOT',
    'MODERATOR',
    'STAFF',
    'HELPDESK',
    'VOUCHER',
    'PROMO',
    'DISCOUNT',
  ].some((word) => trimmedCode === word || trimmedCode.includes(word));

  const isCodeValid =
    isLengthValid && isAlphanumeric && hasLetter && !isBanned;
  const codeValidationError = !isLengthValid ? 'Mã cần từ 4 đến 20 ký tự.'
    : !isAlphanumeric ? 'Chỉ dùng chữ cái không dấu và số.'
    : !hasLetter ? 'Mã cần có ít nhất một chữ cái.'
    : isBanned ? 'Tên mã chứa từ khóa không được phép.' : '';

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) {
      setModalError('Vui lòng chọn Gian hàng đối tác');
      return;
    }
    if (!isCodeValid) {
      setModalError('Mã không hợp lệ. Vui lòng kiểm tra lại các yêu cầu bên dưới');
      return;
    }

    try {
      setModalLoading(true);
      setModalError(null);

      await couponService.proposeCoupon({
        storeId: selectedStoreId,
        code: trimmedCode,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        scopeType: 'STORE_WIDE',
        note: proposeNote.trim() || undefined,
      });

      setModalSuccess(
        `Đề xuất tên mã "${trimmedCode}" thành công! Đang chuyển tiếp...`,
      );
      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess(null);
        setProposeCode('');
        setProposeNote('');
        fetchCoupons();
        showToast(
          'success',
          'Đã gửi đề xuất tên mã thành công!',
          `Tên mã định danh "${trimmedCode}" đã được gửi tới Quản lý gian hàng để duyệt kích hoạt (áp dụng toàn shop).`,
        );
      }, 500);
    } catch (err: any) {
      setModalError(
        err.response?.data?.message ||
          'Không thể gửi đề xuất mã giảm giá. Vui lòng kiểm tra lại.',
      );
    } finally {
      setModalLoading(false);
    }
  };


  return (
    <div className="kol-coupon-page text-[#1A1612]">
      <KolCouponWorkspace coupons={coupons} summary={summary} loading={loading} error={loadError} copiedCode={copiedCode}
        onCopy={handleCopy} onPropose={() => setIsModalOpen(true)} onRetry={() => void fetchCoupons()}
        onToggle={handleTogglePause} onDelete={setDeleteTarget} />

      <CouponProposalDialog open={isModalOpen} onClose={() => setIsModalOpen(false)} stores={approvedStores}
        storeId={selectedStoreId} setStoreId={setSelectedStoreId} code={proposeCode} setCode={setProposeCode}
        note={proposeNote} setNote={setProposeNote} valid={isCodeValid} validationError={codeValidationError}
        error={modalError} success={modalSuccess} busy={modalLoading} onSubmit={handleProposeSubmit} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#EAE4D7] shadow-2xl overflow-hidden p-6 my-auto animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-[#1A1612] mb-1">
              Xác nhận xóa mã giảm giá
            </h3>
            <p className="text-xs text-[#7D715E] mb-4">
              Mã coupon <strong>{deleteTarget.displayCode}</strong> sẽ được xóa
              mềm. Dữ liệu đơn hàng cũ vẫn được bảo lưu, nhưng mã này sẽ không
              thể dùng cho đơn mới.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#1A1612] mb-1.5">
                Lý do xóa (tùy chọn)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Nhập lý do xóa mã giảm giá này..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:outline-none focus:border-[#C59B58]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#7D715E] hover:bg-stone-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}


      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-[99999] flex items-start gap-3.5 max-w-sm sm:max-w-md p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-[#EAE4D7] shadow-2xl shadow-amber-900/15 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EAE4D7] flex items-center justify-center shrink-0 mt-0.5 text-[#B88E4F]">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Ticket className="w-5 h-5 text-[#B88E4F]" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h4 className="text-xs font-bold text-[#1A1612] uppercase tracking-wider">
                {toast.title}
              </h4>
            </div>
            <p className="text-xs text-[#7D715E] leading-relaxed break-words">
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => setToast(null)}
            className="text-[#7D715E] hover:text-[#1A1612] p-1 rounded-lg hover:bg-[#F3EFE6] transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
            title="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

export default KolCouponsPage;

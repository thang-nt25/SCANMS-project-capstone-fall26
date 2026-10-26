import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard,
  Download,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Store,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { storeService } from '../../services/store.service';
import { toast } from '../../utils/toast';

interface CommissionStatementItem {
  id: string;
  orderCode: string;
  orderDate: string;
  collaboratorName: string;
  collaboratorAvatar?: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  settlementStatus: 'HOLDING_14D' | 'SETTLED' | 'CLAWBACKED';
  productName: string;
}

const formatMoney = (val: number) =>
  `${Number(val || 0).toLocaleString('vi-VN')} ₫`;

const SETTLEMENT_BADGES: Record<string, { label: string; className: string }> = {
  HOLDING_14D: { label: 'Tạm giữ 14 ngày', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  SETTLED: { label: 'Đã quyết toán', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLAWBACKED: { label: 'Đã thu hồi', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

// Seeded statements for business realism
const DEMO_STATEMENTS: CommissionStatementItem[] = [
  {
    id: 'stmt-01',
    orderCode: 'SCN-99824',
    orderDate: '2026-10-24T14:30:00Z',
    collaboratorName: 'Nguyễn Mai Anh',
    collaboratorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    orderAmount: 1450000,
    commissionRate: 13,
    commissionAmount: 188500,
    settlementStatus: 'SETTLED',
    productName: 'Serum Vitamin C 15% Sora Skin 30 ml',
  },
  {
    id: 'stmt-02',
    orderCode: 'SCN-99821',
    orderDate: '2026-10-25T09:15:00Z',
    collaboratorName: 'Phan Hải Yến',
    collaboratorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    orderAmount: 580000,
    commissionRate: 10,
    commissionAmount: 58000,
    settlementStatus: 'HOLDING_14D',
    productName: 'Sữa rửa mặt dịu nhẹ pH 5.5 Sora Skin 100 ml',
  },
  {
    id: 'stmt-03',
    orderCode: 'SCN-99781',
    orderDate: '2026-10-23T16:20:00Z',
    collaboratorName: 'Trần Văn Nhật',
    collaboratorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    orderAmount: 2200000,
    commissionRate: 12,
    commissionAmount: 264000,
    settlementStatus: 'SETTLED',
    productName: 'Combo Phục Hồi Dưỡng Ẩm Chuyên Sâu Sora Skin',
  },
  {
    id: 'stmt-04',
    orderCode: 'SCN-99750',
    orderDate: '2026-10-22T11:00:00Z',
    collaboratorName: 'Lê Minh Khang',
    collaboratorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    orderAmount: 490000,
    commissionRate: 10,
    commissionAmount: 49000,
    settlementStatus: 'CLAWBACKED',
    productName: 'Kem Chống Nắng Phổ Rộng SPF 50+ Sora Skin',
  },
];

export default function PayoutApprovalPage() {
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState('Gian hàng');
  const [statements, setStatements] = useState<CommissionStatementItem[]>(DEMO_STATEMENTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    storeService.getMyStore().then((st) => {
      if (st?.name) {
        setStoreName(st.name);
      }
    }).catch(() => {});
  }, []);

  const filteredStatements = useMemo(() => {
    return statements.filter((item) => {
      const matchStatus = statusFilter === 'ALL' || item.settlementStatus === statusFilter;
      const matchSearch =
        !search.trim() ||
        item.orderCode.toLowerCase().includes(search.toLowerCase()) ||
        item.collaboratorName.toLowerCase().includes(search.toLowerCase()) ||
        item.productName.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [statements, statusFilter, search]);

  const kpis = useMemo(() => {
    const totalDeducted = statements
      .filter((s) => s.settlementStatus === 'SETTLED')
      .reduce((sum, s) => sum + s.commissionAmount, 0);

    const totalHolding = statements
      .filter((s) => s.settlementStatus === 'HOLDING_14D')
      .reduce((sum, s) => sum + s.commissionAmount, 0);

    const totalClawbacked = statements
      .filter((s) => s.settlementStatus === 'CLAWBACKED')
      .reduce((sum, s) => sum + s.commissionAmount, 0);

    const avgRate =
      statements.length > 0
        ? Math.round(
            statements.reduce((sum, s) => sum + s.commissionRate, 0) / statements.length,
          )
        : 10;

    return { totalDeducted, totalHolding, totalClawbacked, avgRate };
  }, [statements]);

  const handleExportExcel = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Mã đơn,Ngày,Nhà sáng tạo,Sản phẩm,Giá trị đơn,Tỷ lệ hoa hồng,Số tiền trích,Trạng thái']
        .concat(
          filteredStatements.map(
            (s) =>
              `${s.orderCode},${new Date(s.orderDate).toLocaleDateString('vi-VN')},"${s.collaboratorName}","${s.productName}",${s.orderAmount},${s.commissionRate}%,${s.commissionAmount},${s.settlementStatus}`,
          ),
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sao_ke_hoa_hong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã xuất file sao kê chi phí hoa hồng');
  };

  return (
    <div className="w-full min-w-0 space-y-4 pb-12" id="merchant-payouts-page">
      {/* 1. Header */}
      <div className="bg-white border border-[#EAE4D7] rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F]">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1A1612]">Đối soát chi phí hoa hồng</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#7D715E]">{storeName}</span>
              <span className="text-[#EAE4D7]">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B88E4F]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Khấu trừ tự động qua Escrow Sàn
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất sao kê Excel</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
            Đã quyết toán cho KOL
          </div>
          <div className="text-xl font-black text-[#1A1612]">
            {formatMoney(kpis.totalDeducted)}
          </div>
          <div className="text-[10px] text-[#7D715E] mt-1">
            Sàn đã trích chuyển về ví KOL
          </div>
        </div>

        <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
            Đang tạm giữ 14 ngày
          </div>
          <div className="text-xl font-black text-amber-700">
            {formatMoney(kpis.totalHolding)}
          </div>
          <div className="text-[10px] text-[#7D715E] mt-1">
            Đang trong chu kỳ bảo vệ người mua
          </div>
        </div>

        <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
            Đã thu hồi (Clawback)
          </div>
          <div className="text-xl font-black text-rose-700">
            {formatMoney(kpis.totalClawbacked)}
          </div>
          <div className="text-[10px] text-[#7D715E] mt-1">
            Đơn hủy hoặc khách trả hàng
          </div>
        </div>

        <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
            Tỷ lệ hoa hồng trung bình
          </div>
          <div className="text-xl font-black text-[#B88E4F]">
            {kpis.avgRate}%
          </div>
          <div className="text-[10px] text-[#7D715E] mt-1">
            Bao gồm Open Offer + Deal VIP
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white border border-[#EAE4D7] rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'HOLDING_14D', label: 'Tạm giữ 14 ngày' },
            { id: 'SETTLED', label: 'Đã quyết toán' },
            { id: 'CLAWBACKED', label: 'Đã thu hồi' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                statusFilter === st.id
                  ? 'bg-[#231D15] text-white border-[#231D15]'
                  : 'bg-white text-[#7D715E] border-[#EAE4D7] hover:bg-[#FAF8F5]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, KOL, sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8.5 pl-8 pr-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs outline-none focus:border-[#B88E4F]"
          />
        </div>
      </div>

      {/* 4. Table */}
      <div className="bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-[#7D715E] border-b border-[#EAE4D7] font-bold">
              <tr>
                <th className="p-3.5">Mã Đơn / Ngày</th>
                <th className="p-3.5">Nhà Sáng Tạo Tiếp Thị</th>
                <th className="p-3.5">Sản Phẩm</th>
                <th className="p-3.5 text-right">Doanh Thu Đơn</th>
                <th className="p-3.5 text-center">Tỷ Lệ</th>
                <th className="p-3.5 text-right font-black text-[#1A1612]">Hoa Hồng Sàn Trích</th>
                <th className="p-3.5 text-center">Trạng Thái Dòng Tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D7]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[#7D715E]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B88E4F] mb-2" />
                    <span>Đang tải bảng đối soát...</span>
                  </td>
                </tr>
              ) : filteredStatements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[#7D715E]">
                    Không có giao dịch hoa hồng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredStatements.map((item) => {
                  const badge = SETTLEMENT_BADGES[item.settlementStatus] || { label: item.settlementStatus, className: '' };
                  return (
                    <tr key={item.id} className="hover:bg-[#FAF8F5]/60 transition">
                      <td className="p-3.5">
                        <div className="font-mono text-xs font-bold text-[#1A1612]">
                          #{item.orderCode}
                        </div>
                        <div className="text-[10px] text-[#7D715E]">
                          {new Date(item.orderDate).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#EAE4D7] text-[#B88E4F] font-bold flex items-center justify-center text-[11px] shrink-0 overflow-hidden">
                            {item.collaboratorAvatar ? (
                              <img src={item.collaboratorAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              item.collaboratorName[0]
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-[#1A1612]">{item.collaboratorName}</div>
                            <div className="text-[10px] text-[#7D715E]">CTV Tiếp thị</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="max-w-xs truncate font-medium text-[#1A1612]" title={item.productName}>
                          {item.productName}
                        </div>
                      </td>

                      <td className="p-3.5 text-right font-mono text-xs text-[#7D715E]">
                        {formatMoney(item.orderAmount)}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="font-mono font-bold text-[#B88E4F] bg-[#FBF5EB] px-2 py-0.5 rounded-md border border-[#EEDFC6]">
                          {item.commissionRate}%
                        </span>
                      </td>

                      <td className="p-3.5 text-right font-mono text-xs font-black text-[#1A1612]">
                        {formatMoney(item.commissionAmount)}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

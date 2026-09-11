import { Link } from 'react-router-dom';
import {
  Plus,
  TrendingUp,
  Coins,
  Users,
  RotateCcw,
  ShoppingBag,
  MousePointerClick,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';

export default function ShopDashboardPage() {
  return (
    <div className="flex flex-col gap-6 text-left">
      {/* 1. HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight m-0">
            Tổng quan Sora Skin
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 m-0">
            Theo dõi doanh thu liên kết, chi phí hoa hồng và sức khỏe mạng lưới KOL.
          </p>
        </div>

        <Button variant="amber" size="md" icon={<Plus className="w-4 h-4" />}>
          Tạo chiến dịch
        </Button>
      </header>

      {/* 2. 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">Doanh thu liên kết</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-extrabold text-slate-900 tracking-tight block">
              684,2 tr ₫
            </strong>
            <span className="text-xs font-semibold text-emerald-600 mt-0.5 block">
              +12,8% trong 30 ngày
            </span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">Hoa hồng phải trả</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-extrabold text-amber-700 tracking-tight block">
              52,7 tr ₫
            </strong>
            <span className="text-xs text-slate-500 mt-0.5 block">7,7% doanh thu</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">KOL đang hoạt động</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-extrabold text-slate-900 tracking-tight block">
              128
            </strong>
            <span className="text-xs font-semibold text-emerald-600 mt-0.5 block">
              +16 KOL mới tháng này
            </span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">Tỷ lệ hoàn hàng</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-extrabold text-slate-900 tracking-tight block">
              3,18%
            </strong>
            <span className="text-xs font-semibold text-emerald-600 mt-0.5 block">
              -0,42 điểm (Kiểm soát tốt)
            </span>
          </div>
        </Card>
      </div>

      {/* 3. SPLIT CHART & LIVE ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CHART (8 cols) */}
        <Card className="lg:col-span-8 p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Doanh thu và hoa hồng</h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">Biểu đồ đối soát 30 ngày gần nhất</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-500" /> Doanh thu (GMV)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-300" /> Hoa hồng (Payout)
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between h-44 pt-4 pb-2 border-b border-slate-100 gap-2">
            {[
              { day: 'T2', rev: 40, comm: 20 },
              { day: 'T3', rev: 60, comm: 30 },
              { day: 'T4', rev: 70, comm: 35 },
              { day: 'T5', rev: 55, comm: 28 },
              { day: 'T6', rev: 75, comm: 38 },
              { day: 'T7', rev: 85, comm: 45 },
              { day: 'T8', rev: 100, comm: 50 },
            ].map((col) => (
              <div key={col.day} className="flex flex-col items-center gap-2 flex-1">
                <div className="flex items-end gap-1 h-36">
                  <div
                    style={{ height: `${col.rev}%` }}
                    className="w-3.5 sm:w-4 bg-amber-500 rounded-t-sm transition-all hover:bg-amber-600"
                  />
                  <div
                    style={{ height: `${col.comm}%` }}
                    className="w-3.5 sm:w-4 bg-slate-300 rounded-t-sm transition-all hover:bg-slate-400"
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">{col.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* LIVE ACTIVITY (4 cols) */}
        <Card className="lg:col-span-4 p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 m-0">Hoạt động trực tiếp</h3>
            <Badge variant="warning">Đang cập nhật</Badge>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <strong className="text-xs font-bold text-slate-900 block truncate">
                  Đơn hàng #IN23931
                </strong>
                <span className="text-[11px] text-slate-500 block truncate">
                  Attribution qua coupon NHATXINH10
                </span>
              </div>
              <strong className="text-xs font-extrabold text-emerald-600 shrink-0">
                +459.000 ₫
              </strong>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <MousePointerClick className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <strong className="text-xs font-bold text-slate-900 block truncate">
                  218 click tiếp thị mới
                </strong>
                <span className="text-[11px] text-slate-500 block truncate">
                  Từ TikTok Video, 10 phút vừa qua
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-700 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <strong className="text-xs font-bold text-slate-900 block truncate">
                  KOL mới kết nối
                </strong>
                <span className="text-[11px] text-slate-500 block truncate">
                  Lê Mai Anh (50k followers)
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. TOP PRODUCTS TABLE */}
      <Card className="p-0 overflow-hidden">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">Sản phẩm tiếp thị dẫn đầu</h3>
            <p className="text-xs text-slate-500 mt-0.5 m-0">Doanh thu và tỷ lệ chuyển đổi cao nhất</p>
          </div>
          <Link
            to="/merchant/products"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
          >
            <span>Quản lý danh mục</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Doanh thu (GMV)</TableHead>
              <TableHead>Đơn hàng</TableHead>
              <TableHead>Tỷ lệ chuyển đổi</TableHead>
              <TableHead>Mức hoa hồng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    S1
                  </div>
                  <div>
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 block">
                      Serum Vitamin C 15% Tươi
                    </strong>
                    <span className="text-[11px] text-slate-500">SKU: SR-VTC-15</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-bold text-slate-900">184.600.000 ₫</TableCell>
              <TableCell className="font-semibold text-slate-700">402</TableCell>
              <TableCell>
                <Badge variant="amber">3,21% CR</Badge>
              </TableCell>
              <TableCell className="font-extrabold text-amber-700">8%</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                    S2
                  </div>
                  <div>
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 block">
                      Kem chống nắng SPF50+ PA++++
                    </strong>
                    <span className="text-[11px] text-slate-500">SKU: SUN-SPF50-PA</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-bold text-slate-900">146.800.000 ₫</TableCell>
              <TableCell className="font-semibold text-slate-700">377</TableCell>
              <TableCell>
                <Badge variant="amber">2,89% CR</Badge>
              </TableCell>
              <TableCell className="font-extrabold text-amber-700">10%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

import { escrowAmounts, escrowMoney, escrowNumber, escrowTotal } from '../../utils/escrow-amounts';
import { handleProductImageError } from '@/utils/image-fallback.utils';
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { Modal } from "../ui/Modal";
import { History, Copy, Info, Check } from "lucide-react";
import { returnStatusLabel } from '../../utils/return-status.utils';
import { DealKpiProgress } from '../affiliate/DealKpiProgress';
import { EscrowMovements } from './EscrowMovements';
import type { ReturnStatus } from '../../services/return.service';

function unwrap<T>(response: unknown): T {
  const body = response as { data?: { data?: T } | T };
  const data = body?.data ?? body;
  return ((data as { data?: T })?.data ?? data) as T;
}
const money = (value: string | number) =>
  `${Number(value).toLocaleString("vi-VN")} ₫`;
const panel = "rounded-2xl border border-[#EAE4D7] bg-white p-5 text-[#1A1612]";
const button =
  "rounded-lg border border-[#EAE4D7] px-3 py-2 text-sm hover:bg-[#FBF5EB] disabled:opacity-50";

interface StorePnl {
  unrecognizedCommissions?: string;
  netRevenue: string;
  commissions: string;
  monthlyBonuses: string;
  sampleShipping: string;
  knownMarketingExpense: string;
  cogs?: string | null;
  sampleProductCost?: string | null;
  contributionProfit?: string | null;
}
export function StoreFinanceReport({ storeId }: { storeId: string }) {
  const [data, setData] = useState<StorePnl | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get(`/stores/${storeId}/pnl-report`, {
        headers: { "x-skip-cache": "true" },
      })
      .then((response) => {
        if (active) setData(unwrap<StorePnl>(response));
      })
      .catch(() => {
        if (active) setError("Không tải được báo cáo chi phí tiếp thị.");
      });
    return () => {
      active = false;
    };
  }, [storeId]);
  return (
    <section className={panel}>
      <h2 className="font-semibold text-lg">
        Doanh thu và chi phí tiếp thị lũy kế
      </h2>
      {error && (
        <p role="alert" className="text-[#DC2626]">
          {error}
        </p>
      )}
      {data ? (
        <>
          <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
            {Object.entries({
              "Doanh thu hàng hóa sau hoàn trả": data.netRevenue,
              "Thu nhập KOC phát sinh": data.commissions,
              "Hoa hồng đơn chưa hoàn tất (ngoài tỷ lệ)": data.unrecognizedCommissions,
              "Thưởng tháng đã cộng ví": data.monthlyBonuses,
              "Vận chuyển mẫu thử": data.sampleShipping,
              "Chi phí tiếp thị đã ghi nhận": data.knownMarketingExpense,
              "Giá vốn": data.cogs,
              "Giá vốn mẫu thử": data.sampleProductCost,
              "Lợi nhuận đóng góp": data.contributionProfit,
            }).map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-[#7D715E]">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {value == null ? "Chưa đủ dữ liệu" : money(value)}
                </dd>
              </div>
            ))}
          </dl>
          {data.contributionProfit == null && (
            <p className="text-xs text-[#7D715E]">
              Kế toán cần bổ sung chi phí thực tế của các đơn hàng và mẫu thử
              còn thiếu để hoàn tất báo cáo lợi nhuận.
            </p>
          )}
        </>
      ) : (
        !error && <p role="status">Đang tải báo cáo…</p>
      )}
    </section>
  );
}

interface Executive {
  yearMonth?: string | null;
  sandboxNetPaid?: string;
  sandboxTaxWithheld?: string;
  unrecognizedCommissions?: string;
  asOf: string;
  gmv: string;
  netRevenue: string;
  ordersCount: number;
  affiliateExpense: string;
  affiliateExpenseRatio: string | null;
  escrowPending: string;
  availableEarnings: string;
  grossPaid: string;
  netPaid: string;
  taxWithheld: string;
  holdDays: number;
}
const executiveSummaryCache = new Map<string, Executive>();

interface MetricDefinition {
  title: string;
  badge: string;
  meaning: string;
  formula?: string;
  impact: string;
}

const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  gmv: {
    title: "GMV đơn đã hoàn tất",
    badge: "Doanh số gộp",
    meaning: "Tổng giá trị hàng hóa ghi nhận trên toàn bộ các đơn hàng đã giao thành công trong kỳ (trước khi trừ chiết khấu mã Voucher KOL và các đơn đổi trả).",
    formula: "GMV = Tổng (Số lượng × Đơn giá bán lẻ niêm yết)",
    impact: "Đo lường tổng quy mô dòng tiền giao dịch phát sinh qua mạng lưới tiếp thị liên kết.",
  },
  netRevenue: {
    title: "Doanh thu sau hoàn trả",
    badge: "Doanh thu ròng",
    meaning: "Doanh thu thực thu ròng của doanh nghiệp sau khi đã trừ chiết khấu mã Voucher KOL và các đơn khách hàng trả hàng hoàn tiền trong hạn 14 ngày (không bao gồm phí vận chuyển GHN).",
    formula: "Doanh thu ròng = GMV - Chiết khấu Voucher Deal KOL - Giá trị đơn hoàn trả",
    impact: "Cơ sở cốt lõi để tính toán thù lao chuẩn xác và bảo vệ Giá sàn (floorPrice) của nhãn hàng.",
  },
  affiliateExpense: {
    title: "Chi phí thu nhập tiếp thị",
    badge: "Nghĩa vụ thù lao",
    meaning: "Tổng số tiền thù lao (10% Gốc + Thưởng Bậc + Thưởng KPI Deal) đã phát sinh và ghi nhận cho đội ngũ đối tác tiếp thị trên các đơn hàng thành công trong kỳ.",
    formula: "Chi phí thù lao = Thù lao đơn thành công + Thưởng KPI Deal + Thưởng mốc tháng - Thu hồi Clawback",
    impact: "Chi phí bán hàng trực tiếp của doanh nghiệp chi trả cho đội ngũ CTV / KOC.",
  },
  unrecognizedCommissions: {
    title: "Hoa hồng chưa ghi nhận",
    badge: "Đơn đang xử lý",
    meaning: "Khoản hoa hồng ước tính phát sinh từ các đơn hàng mới đặt hoặc đang giao vận GHN, chưa giao thành công nên chưa ghi nhận chính thức vào sổ nợ.",
    formula: "Hoa hồng tạm tính trên đơn hàng trạng thái PENDING / PROCESSING / SHIPPING",
    impact: "Chỉ số dự phóng nghĩa vụ thù lao tiềm năng sẽ phát sinh trong tương lai gần.",
  },
  escrowPending: {
    title: "Bảo chứng hiện tại (Escrow 14 ngày)",
    badge: "Tạm giữ đối soát",
    meaning: "Khoản tiền thù lao đang bị tạm giữ trong vòng 14 ngày kể từ lúc khách nhận hàng thành công, dùng để đối soát đổi trả và bảo vệ doanh nghiệp.",
    formula: "Tổng thù lao đơn hàng đã giao thành công nhưng chưa qua hết mốc 14 ngày khiếu nại đổi trả",
    impact: "Sau đúng 14 ngày nếu đơn hàng sạch không đổi trả hoàn tiền, hệ thống tự động giải ngân sang Ví khả dụng.",
  },
  availableEarnings: {
    title: "Khả dụng hiện tại",
    badge: "Ví đối tác được rút",
    meaning: "Tổng số dư thù lao sạch hiện tại trong ví của toàn bộ KOL đã qua mốc 14 ngày an toàn, các đối tác có quyền tạo lệnh rút bất kỳ lúc nào.",
    formula: "Tiền bảo chứng đã qua 14 ngày + Thưởng KPI đã đạt - Tiền đã rút",
    impact: "Nghĩa vụ công nợ thanh toán ngắn hạn tức thời của doanh nghiệp đối với đối tác.",
  },
  netPaid: {
    title: "Chi trả ngoài Sandbox trong tháng",
    badge: "Thực chi chuyển khoản",
    meaning: "Tổng số tiền thực tế (sau khi khấu trừ thuế theo từng lệnh) đã được Kế toán duyệt chi và chuyển khoản thành công qua ngân hàng Napas 24/7 cho các đối tác trong tháng.",
    formula: "Thực chuyển = Tổng tiền gốc − Tổng thuế đã khấu trừ",
    impact: "Dòng tiền mặt thực tế đã xuất khỏi tài khoản ngân quỹ của công ty.",
  },
  taxWithheld: {
    title: "Thuế ngoài Sandbox trong tháng",
    badge: "Thuế TNCN",
    meaning: "Tổng thuế đã khấu trừ trên các lệnh rút tiền hoàn tất trong kỳ.",
    formula: "Thuế TNCN = Tổng thuế lưu trên từng lệnh đã hoàn tất",
    impact: "Nghĩa vụ thuế vãng lai của doanh nghiệp nộp cho cơ quan thuế thay cho đối tác.",
  },
  sandboxNetPaid: {
    title: "Chi trả Sandbox trong tháng",
    badge: "Mô phỏng thử nghiệm",
    meaning: "Số tiền giải ngân mô phỏng trong môi trường thử nghiệm kiểm thử (Sandbox Demo), không phát sinh dòng tiền thật ngoài đời thực.",
    impact: "Phục vụ công tác kiểm thử tính năng và demo đồ án tốt nghiệp.",
  },
  sandboxTaxWithheld: {
    title: "Thuế mô phỏng Sandbox",
    badge: "Mô phỏng thử nghiệm",
    meaning: "Số tiền thuế mô phỏng trong môi trường thử nghiệm kiểm thử (Sandbox Demo).",
    impact: "Dữ liệu mô phỏng đối soát kế toán.",
  },
  affiliateExpenseRatio: {
    title: "Chi phí tiếp thị / doanh thu",
    badge: "Tỷ lệ kiểm soát",
    meaning: "Tỷ số chi phí tiếp thị trên doanh thu thuần của doanh nghiệp trong kỳ. Đây là chỉ số then chốt đo lường hiệu quả chiến dịch.",
    formula: "Tỷ lệ = (Chi phí thù lao tiếp thị ÷ Doanh thu sau hoàn trả) × 100%",
    impact: "Hệ thống quy định trần tối đa toàn hệ thống là <= 25% (ngưỡng thông thường Shop duyệt <= 16%).",
  },
};

export function ExecutiveFinanceReport() {
  const [month, setMonth] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 7));
  const [data, setData] = useState<Executive | null>(() => executiveSummaryCache.get(month) || null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [showSandbox, setShowSandbox] = useState(false);

  const load = useCallback(async () => {
    if (!data && !executiveSummaryCache.has(month)) setLoading(true);
    setError("");
    try {
      const res = unwrap<Executive>(
        await api.get("/analytics/executive-summary", {
          params: { yearMonth: month },
        }),
      );
      executiveSummaryCache.set(month, res);
      setData(res);
    } catch {
      setData(null);
      setError(
        "Không tải được báo cáo tài chính. Chỉ Quản trị tối cao được truy cập.",
      );
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const renderMetricCard = (
    key: string,
    label: string,
    value: string | number | null | undefined,
    options?: {
      isPercent?: boolean;
      highlight?: "gold" | "amber" | "neutral" | "dark";
      subtext?: string;
    }
  ) => {
    const def = METRIC_DEFINITIONS[key];
    const isGold = options?.highlight === "gold";
    const isAmber = options?.highlight === "amber";

    return (
      <div
        key={key}
        className={`min-w-0 rounded-xl border p-3.5 transition shadow-2xs ${
          isGold
            ? "border-[#EEDFC6] bg-[#FDFBF7]"
            : isAmber
            ? "border-[#FDE68A] bg-[#FFFDF5]"
            : "border-[#EAE4D7] bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#7D715E] uppercase tracking-wider truncate">
            {label}
          </span>
          {def && (
            <button
              type="button"
              onClick={() => setSelectedMetric(def)}
              className="size-5 rounded-full border border-[#EAE4D7] bg-white text-[#7D715E] hover:text-[#B88E4F] hover:border-[#C59B58] text-[11px] font-bold transition flex items-center justify-center cursor-pointer shrink-0"
              title="Xem giải thích chi tiết ý nghĩa dòng tiền"
            >
              !
            </button>
          )}
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span
            className={`text-xl font-bold tabular-nums leading-tight ${
              isGold
                ? "text-[#B88E4F]"
                : isAmber
                ? "text-[#D97706]"
                : "text-[#1A1612]"
            }`}
          >
            {value == null
              ? "Chưa có dữ liệu"
              : options?.isPercent
              ? `${value}%`
              : money(value)}
          </span>

          {options?.subtext && (
            <span className="text-[10px] text-[#7D715E] font-medium shrink-0">
              {options.subtext}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className={panel} aria-busy={loading}>
      {/* Month/Year selector & header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] pb-3.5">
        <div>
          <h2 className="text-base font-bold text-[#1A1612]">
            Báo cáo Tài chính & Dòng tiền Doanh nghiệp
          </h2>
          <p className="text-xs text-[#7D715E] mt-0.5">
            Bấm vào nút <strong className="text-[#B88E4F] font-bold">(!)</strong> ở mỗi thẻ để xem định nghĩa chi tiết dòng tiền
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Tháng báo cáo tài chính"
            value={month.slice(5)}
            disabled={loading}
            onChange={(e) => setMonth(`${month.slice(0, 4)}-${e.target.value}`)}
            className="rounded-lg border border-[#EAE4D7] bg-white px-3 py-1.5 text-xs font-semibold text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index} value={String(index + 1).padStart(2, "0")}>
                Tháng {index + 1}
              </option>
            ))}
          </select>
          <select
            aria-label="Năm báo cáo tài chính"
            value={month.slice(0, 4)}
            disabled={loading}
            onChange={(e) => setMonth(`${e.target.value}-${month.slice(5)}`)}
            className="rounded-lg border border-[#EAE4D7] bg-white px-3 py-1.5 text-xs font-semibold text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
          >
            {Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-xs font-medium text-[#DC2626]">
          {error}
        </p>
      )}

      {loading && !data && (
        <p role="status" className="mt-4 text-xs text-[#7D715E]">
          Đang tải dữ liệu báo cáo...
        </p>
      )}

      {data && (
        <div className="mt-4 space-y-4">
          {/* Section 1: Doanh thu & Quy mô */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D715E]">
                1. Quy mô bán hàng & Doanh thu ròng
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {renderMetricCard("netRevenue", "Doanh thu sau hoàn trả", data.netRevenue, {
                highlight: "gold",
                subtext: "Thực thu ròng",
              })}
              {renderMetricCard("gmv", "GMV đơn đã hoàn tất", data.gmv, {
                subtext: "Quy mô gộp",
              })}
              {renderMetricCard(
                "affiliateExpenseRatio",
                "Chi phí tiếp thị / doanh thu",
                data.affiliateExpenseRatio,
                {
                  isPercent: true,
                  highlight: "gold",
                  subtext:
                    Number(data.affiliateExpenseRatio || 0) <= 16
                      ? "Mức an toàn (<= 16%)"
                      : "Leo thang Admin (trần 25%)",
                }
              )}
            </div>
          </div>

          {/* Section 2: Nghĩa vụ thù lao & Escrow 14 ngày */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D715E]">
                2. Nghĩa vụ thù lao & Quỹ bảo chứng đối soát
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {renderMetricCard(
                "affiliateExpense",
                "Chi phí thu nhập tiếp thị",
                data.affiliateExpense,
                { subtext: "Đã phát sinh" }
              )}
              {renderMetricCard(
                "escrowPending",
                "Bảo chứng hiện tại (Escrow 14 ngày)",
                data.escrowPending,
                {
                  highlight: "amber",
                  subtext: `Giữ ${data.holdDays} ngày`,
                }
              )}
              {renderMetricCard(
                "unrecognizedCommissions",
                "Hoa hồng chưa ghi nhận",
                data.unrecognizedCommissions,
                { subtext: "Đơn đang giao" }
              )}
            </div>
          </div>

          {/* Section 3: Thanh khoản & Giải ngân ngân hàng */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D715E]">
                3. Thanh khoản ví đối tác & Thực chi ngân quỹ
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {renderMetricCard(
                "availableEarnings",
                "Khả dụng hiện tại",
                data.availableEarnings,
                { subtext: "Ví KOL được rút" }
              )}
              {renderMetricCard(
                "netPaid",
                "Chi trả ngoài Sandbox trong tháng",
                data.netPaid,
                { subtext: "Thực nhận sau thuế" }
              )}
              {renderMetricCard(
                "taxWithheld",
                "Thuế ngoài Sandbox trong tháng",
                data.taxWithheld,
                { subtext: "Thuế đã khấu trừ" }
              )}
            </div>
          </div>

          {/* Section 4: Môi trường Sandbox Demo (Thử nghiệm) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowSandbox((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] transition cursor-pointer"
            >
              <span>{showSandbox ? "▼ Ẩn số liệu Sandbox thử nghiệm" : "▶ Hiển thị số liệu mô phỏng Sandbox (2 chỉ số)"}</span>
            </button>

            {showSandbox && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7]">
                {renderMetricCard(
                  "sandboxNetPaid",
                  "Chi trả Sandbox trong tháng",
                  data.sandboxNetPaid,
                  { subtext: "Mô phỏng demo" }
                )}
                {renderMetricCard(
                  "sandboxTaxWithheld",
                  "Thuế mô phỏng Sandbox",
                  data.sandboxTaxWithheld,
                  { subtext: "Mô phỏng demo" }
                )}
              </div>
            )}
          </div>

          {/* Accordion Cách tính báo cáo */}
          <div className="border-t border-[#EAE4D7] pt-3">
            <details className="group rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-2.5 select-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2 font-semibold text-[#1A1612]">
                  <span className="text-[#B88E4F] transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                  Quy chuẩn tính toán báo cáo tài chính
                </span>
                <span className="text-[11px] text-[#7D715E]">
                  {data.ordersCount} đơn · Kỳ {data.yearMonth ? `${data.yearMonth.slice(5)}/${data.yearMonth.slice(0, 4)}` : "toàn thời gian"}
                </span>
              </summary>
              <dl className="m-0 grid gap-3 border-t border-[#EAE4D7] bg-white p-3.5 sm:grid-cols-2">
                {[
                  {
                    title: "Doanh thu trong kỳ",
                    text: "Ghi nhận theo ngày hoàn tất đơn (giờ Việt Nam). Đã khấu trừ Voucher độc quyền của KOL và các đơn đổi trả hoàn tiền 14 ngày. Không bao gồm phí ship GHN.",
                  },
                  {
                    title: "Tỷ lệ chi phí tiếp thị",
                    text: "(Thù lao đơn hoàn tất + Thưởng đạt KPI Deal + Thưởng mốc) ÷ Doanh thu sau hoàn trả × 100%. Luôn khống chế dưới trần tối đa 25%.",
                  },
                  {
                    title: "Giải ngân & Thuế TNCN",
                    text: "Thuế lũy tiến 5–35% theo tổng tiền yêu cầu rút trong tháng, theo chính sách SCANMS.",
                  },
                  {
                    title: "Bảo chứng Escrow 14 ngày",
                    text: `Cơ chế Escrow bảo vệ doanh nghiệp trong đúng ${data.holdDays} ngày kể từ lúc giao hàng thành công. Sau 14 ngày không đổi trả mới kết chuyển sang số dư khả dụng.`,
                  },
                ].map((item) => (
                  <div key={item.title} className="min-w-0">
                    <dt className="font-bold text-[#1A1612] text-[11px]">{item.title}</dt>
                    <dd className="m-0 mt-0.5 text-[11px] leading-relaxed text-[#7D715E]">{item.text}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <p className="mb-0 mt-2 text-right text-[10px] text-[#7D715E]">
              Cập nhật {new Date(data.asOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · Giờ Việt Nam
            </p>
          </div>
        </div>
      )}

      {/* Metric Detail Info Modal */}
      {selectedMetric && (
        <Modal
          isOpen
          title={`Chi tiết: ${selectedMetric.title}`}
          onClose={() => setSelectedMetric(null)}
        >
          <div className="space-y-3.5 text-xs text-[#1A1612]">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7]">
              <div>
                <span className="text-[10px] text-[#7D715E] uppercase tracking-wider block font-semibold">
                  Chỉ số tài chính
                </span>
                <strong className="text-sm font-bold text-[#1A1612]">{selectedMetric.title}</strong>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                {selectedMetric.badge}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#EAE4D7] space-y-1">
              <span className="text-[10px] font-bold text-[#7D715E] uppercase tracking-wider block">
                Bản chất dòng tiền:
              </span>
              <p className="text-xs text-[#1A1612] leading-relaxed">{selectedMetric.meaning}</p>
            </div>

            {selectedMetric.formula && (
              <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] space-y-1">
                <span className="text-[10px] font-bold text-[#8F682E] uppercase tracking-wider block">
                  Công thức xác định:
                </span>
                <p className="font-mono text-xs text-[#1A1612] bg-white p-2 rounded-lg border border-[#EEDFC6]">
                  {selectedMetric.formula}
                </p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-white border border-[#EAE4D7] space-y-1">
              <span className="text-[10px] font-bold text-[#7D715E] uppercase tracking-wider block">
                Ý nghĩa quản trị & Dòng tiền:
              </span>
              <p className="text-xs text-[#7D715E] leading-relaxed">{selectedMetric.impact}</p>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setSelectedMetric(null)}
                className="px-4 py-1.5 rounded-lg bg-[#C59B58] text-white font-bold text-xs hover:bg-[#B88E4F] transition cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

interface Escrow {
  total: number;
  page: number;
  limit: number;
  holdDays: number;
  pendingAmount: string;
  items: Array<{
    id: string;
    commissionAmount: string;
    pendingStandardAmount?: string;
    pendingDealAmount?: string;
    status?: string;
    dealProposalId?: string | null;
    baseCommissionRate?: string | null;
    dealBonusRate?: string | null;
    dealBonusStatus?: string | null;
    baseCommissionAmount?: string | null;
    dealBonusAmount?: string | null;
    availableAt: string;
    order: {
      id: string;
      externalOrderSn: string;
      status: string;
      finalAmount?: string;
      deliveredAt?: string | null;
      createdAt?: string | null;
      completedAt?: string | null;
      clickedAt?: string | null;
      shopConfirmedAt?: string | null;
      handedToShippingAt?: string | null;
      referralLink?: { createdAt: string; shortCode: string } | null;
      attributedCollaborator?: { fullName: string } | null;
      orderItems?: { quantity: number; unitPrice: string; appliedCommissionRate: string | null; product: { title: string; imageUrl?: string | null }; variant?: { name: string } | null }[];
      store: { name: string };
      returnRequest: { status: string } | null;
      holdReasons: string[];
      reviewReturnId?: string | null;
      referralReviewRequired?: boolean;
      testFixture?: boolean;
      referralRiskSignals?: string[];
    };
  }>;
}
export function EscrowFinanceReport({ onChanged }: { onChanged?: () => void } = {}) {
  const [historyItem, setHistoryItem] = useState<Escrow["items"][number] | null>(null);
  const [historyTab, setHistoryTab] = useState<'money' | 'order'>('money');
  const [historyCodeCopied, setHistoryCodeCopied] = useState(false);
  useEffect(() => { setHistoryTab('money'); setHistoryCodeCopied(false); }, [historyItem?.id]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const timestamp = (value?: string | null) => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hourCycle: 'h23' }) : 'Chưa ghi nhận';
  const [data, setData] = useState<Escrow | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const refreshedOldSnapshot = useRef(false);
  useEffect(() => {
    const reload = () => {
      if (document.visibilityState === 'visible') setRefresh(value => value + 1);
    };
    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', reload);
    return () => {
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', reload);
    };
  }, []);
  useEffect(() => {
    if (data?.items.some(item => escrowNumber(item.pendingStandardAmount) === null) && !refreshedOldSnapshot.current) {
      refreshedOldSnapshot.current = true;
      setRefresh(value => value + 1);
    }
  }, [data]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .get("/admin/payouts/escrow", {
        params: { page },
        headers: { "x-skip-cache": "true" },
      })
      .then((response) => {
        if (active) setData(unwrap<Escrow>(response));
      })
      .catch(() => {
        if (active) {
          setData(null);
          setError("Không tải được dữ liệu Escrow.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, refresh]);
  return (
    <section className={`${panel} finance-escrow`} aria-label="Các khoản hoa hồng đang bảo chứng" aria-busy={loading}>
      {error && (
        <p role="alert" className="text-[#DC2626]">
          {error}
        </p>
      )}
      {loading && <p role="status">Đang tải…</p>}
      {data && (
        <>
          {data.items.some(item => escrowAmounts(item).standard === null) && <p role="alert" className="rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#805b27]">Chưa có dữ liệu tiền chờ đối soát. <button type="button" className="underline" onClick={() => setRefresh(value => value + 1)}>Tải lại dữ liệu</button></p>}
          <div className="min-w-0 w-full [overflow-wrap:anywhere]" hidden={!data.items.length}>
            <table className="block w-full min-w-0! table-fixed text-left text-sm xl:table [&_td]:min-w-0 [&_td]:align-top">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[23%]" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="hidden bg-[#FAF8F5] xl:table-header-group">
                <tr>
                  {[
                    "Đơn hàng",
                    "Sản phẩm / Gian hàng",
                    "Đơn giá",
                    "Chờ đối soát",
                    "Deal đang giữ",
                    "Mốc đủ 14 ngày",
                    "Đổi trả",
                  ].map((label, index) => (
                    <th className={`px-3 py-4 font-medium text-[#7D715E] ${[2,3,4].includes(index) ? 'text-right' : index === 6 ? 'text-center' : ''}`} key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="block xl:table-row-group">
                {data.items.map((item) => (
                  <tr key={item.id} className="grid grid-cols-2 border-b border-[#EAE4D7] xl:table-row [&>td]:block xl:[&>td]:table-cell">
                    <td className="p-3">
                      <strong className="block font-semibold leading-6">{item.order.externalOrderSn || item.order.id.slice(0, 8)}</strong>
                      {item.order.testFixture && <small className="text-[#8F682E]">Đơn kiểm thử Escrow</small>}
                      {item.order.attributedCollaborator && <small className="mt-1 block text-[#7D715E]">KOL: {item.order.attributedCollaborator.fullName}</small>}
                      <button type="button" onClick={() => setHistoryItem(item)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#8F682E] transition hover:border-[#C59B58] hover:bg-[#FBF5EB]" aria-label={`Xem lịch sử đơn ${item.order.externalOrderSn || item.order.id}`}>
                        <History size={14} /> Lịch sử
                      </button>
                    </td>
                    <td className="p-3">{item.order.orderItems?.map((line,index) => <div key={index} className="escrow-product">
                      {line.product.imageUrl && <img src={line.product.imageUrl} onError={handleProductImageError} alt="" />}
                      <div className="min-w-0"><strong className="block leading-6">{line.product.title}</strong><small>{line.variant?.name || 'Không có biến thể'} · SL: {line.quantity}</small></div>
                    </div>)}<small className="escrow-store-name">{item.order.store.name}</small></td>
                    <td className="p-3 text-right tabular-nums"><span className="mb-1 block text-xs text-[#7D715E] xl:hidden">Đơn giá</span>{item.order.orderItems?.map((line,index) => <div key={index} className="escrow-unit-price leading-6">{money(line.unitPrice)}</div>)}</td>
                    <td className="p-3 text-right tabular-nums">
                      <span className="mb-1 block text-xs text-[#7D715E] xl:hidden">Chờ đối soát</span>
                      <strong className="block leading-6">{escrowMoney(escrowAmounts(item).standard)}</strong>
                      {item.status && item.status !== 'PENDING' && <small className="text-[#7D715E]">Đã giải tỏa</small>}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      <span className="mb-1 block text-xs text-[#7D715E] xl:hidden">Chênh lệch Deal đang giữ</span>
                      {item.dealProposalId && (escrowAmounts(item).deal ?? 0) > 0 ? <DealKpiProgress id={item.dealProposalId} product={item.order.orderItems?.[0]?.product} storeName={item.order.store.name} triggerLabel={`${escrowMoney(escrowAmounts(item).deal)} ↗`} readOnly heldAmount={escrowAmounts(item).deal ?? undefined} standardRate={escrowNumber(item.baseCommissionRate) ?? undefined} bonusRate={escrowNumber(item.dealBonusRate) ?? undefined} /> : <strong>{escrowMoney(escrowAmounts(item).deal)}</strong>}
                      {(escrowAmounts(item).deal ?? 0) > 0 && <small className="mt-1 block text-[#7D715E]">{item.dealBonusStatus === 'QUALIFIED' ? 'Đủ KPI · chờ đối soát' : 'Chờ KPI & đối soát'}</small>}
                    </td>
                    <td className="p-3"><span className="mb-1 block text-xs text-[#7D715E] xl:hidden">Mốc đủ 14 ngày</span>
                      <strong className="block font-semibold leading-6 tabular-nums" title="Mốc thời gian; chỉ giải tỏa khi không còn điều kiện chặn">{timestamp(item.availableAt)}</strong>
                      <span className="mt-1 block text-xs text-[#7D715E]">Giao: {item.order.deliveredAt ? timestamp(item.order.deliveredAt) : 'Chưa có ngày giao'}</span>
                      <small className="mt-2 block font-medium text-[#8F682E]">{(() => {
                        const remaining = Date.parse(item.availableAt) - now;
                        if (!Number.isFinite(remaining)) return 'Chưa xác định thời hạn';
                        if (remaining <= 0) return 'Đến hạn · chờ đối soát';
                        const minutes = Math.ceil(remaining / 60_000);
                        const days = Math.floor(minutes / 1440);
                        const hours = Math.floor(minutes % 1440 / 60);
                        return days > 0 ? `Còn ${days} ngày ${hours} giờ` : hours > 0 ? `Còn ${hours} giờ ${minutes % 60} phút` : `Còn ${minutes} phút`;
                      })()}</small>
                      {item.order.holdReasons?.filter(reason => !['Cần kiểm tra ghi nhận tiếp thị', 'Chờ thẩm định tiếp thị'].includes(reason)).map(reason => <small key={reason} className="mt-1 block text-[#8F682E]">{item.order.reviewReturnId && ['Chờ giao hàng đổi', 'Chờ khách xác nhận hàng đổi', 'Đang xử lý đổi trả', 'Đổi trả chưa hoàn tất', 'Tranh chấp chưa giải quyết'].includes(reason) ? <a className="underline underline-offset-2" href={`/admin/returns/${encodeURIComponent(item.order.reviewReturnId)}`} target="_blank" rel="noopener noreferrer">{reason === 'Đổi trả chưa hoàn tất' ? 'Đang xử lý đổi trả' : reason} · Xem hồ sơ ↗</a> : reason}</small>)}
                      {item.order.referralReviewRequired && <ReferralReview compact orderId={item.order.id} signals={item.order.referralRiskSignals ?? []} onReviewed={() => { setRefresh(value => value + 1); onChanged?.(); }} />}
                    </td>
                    <td className="p-3 text-center">
                      <span className="mb-1 block text-xs text-[#7D715E] xl:hidden">Đổi trả</span>
                      {item.order.returnRequest ? returnStatusLabel(item.order.returnRequest.status as ReturnStatus) : <span className="inline-flex max-w-full rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-2 py-1 text-xs text-[#7D715E]">Không đổi trả</span>}
                    </td>
                  </tr>

                ))}
              </tbody>
              <tfoot className="block bg-[#FAF8F5] xl:table-footer-group"><tr className="grid grid-cols-2 xl:table-row"><td colSpan={3} className="p-3 font-medium">Tổng trang · {data.items.length} khoản</td><td className="p-3 text-right font-semibold tabular-nums">{escrowMoney(escrowTotal(data.items, 'standard'))}</td><td className="p-3 text-right font-semibold tabular-nums text-[#8F682E]">{escrowMoney(escrowTotal(data.items, 'deal'))}</td><td colSpan={2} className="p-3 text-xs text-[#7D715E]">Chênh lệch Deal chỉ mở khóa khi đủ KPI và hoàn tất đối soát.</td></tr></tfoot>
            </table>
          </div>
          {!data.items.length && (
            <div className="finance-escrow-empty" role="status">
              <strong>Không có khoản thu nhập đang tạm giữ.</strong>
              <p>{data.total === 0 ? 'Không có khoản chờ đối soát hoặc chênh lệch Deal đang giữ.' : 'Trang này không còn bản ghi. Chọn Trước để xem trang trước.'}</p>
            </div>
          )}
          <div className="finance-pagination flex items-center justify-end gap-3 mt-4" hidden={!data.total}>
            <button
              className={button}
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </button>
            <span>Trang {page}</span>
            <button
              className={button}
              disabled={page * data.limit >= data.total || loading}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </button>
          </div>
        </>
      )}
      <Modal isOpen={!!historyItem} onClose={() => setHistoryItem(null)} title="Chi tiết đối soát"
        subtitle={historyItem && <span className="inline-flex items-center gap-2">{historyItem.order.externalOrderSn || historyItem.order.id}<button type="button" aria-label="Sao chép mã đơn" title="Sao chép mã đơn" className="inline-flex size-7 items-center justify-center rounded-md hover:bg-[#FBF5EB]" onClick={() => void navigator.clipboard.writeText(historyItem.order.externalOrderSn || historyItem.order.id).then(() => setHistoryCodeCopied(true)).catch(() => setHistoryCodeCopied(false))}>{historyCodeCopied ? <Check size={14} /> : <Copy size={14} />}</button></span>}
        maxWidth="3xl" className="escrow-detail-dialog !max-w-[760px] h-[min(720px,calc(100dvh-24px))] sm:h-[min(720px,calc(100dvh-32px))]" stickyHeader bodyClassName="!overflow-hidden !p-0 flex flex-col"
        footer={<div className="flex justify-end"><button type="button" onClick={() => setHistoryItem(null)} className="min-h-10 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-6 text-sm font-medium text-[#795A2D]">Đóng</button></div>}
        belowHeader={historyItem && <div className="shrink-0 px-4 pt-4 sm:px-7 sm:pt-5">
          <div className="grid grid-cols-3 divide-x divide-[#EAE4D7] rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] py-4 text-center">
            <div className="min-w-0 px-2"><span className="text-xs text-[#7D715E]">Chờ đối soát</span><strong className="mt-2 block text-base font-semibold tabular-nums sm:text-xl">{escrowMoney(escrowAmounts(historyItem).standard)}</strong><span className="mt-1 block text-[11px] text-[#7D715E] sm:text-xs">Thù lao tiêu chuẩn</span></div>
            <div className="min-w-0 px-2"><span className="text-xs text-[#7D715E]">Deal đang giữ</span><strong className="mt-2 block text-base font-semibold tabular-nums text-[#B88E4F] sm:text-xl">{escrowMoney(escrowAmounts(historyItem).deal)}</strong><span className="mt-1 block text-[11px] text-[#7D715E] sm:text-xs">Chờ KPI & đối soát</span></div>
            <div className="min-w-0 px-2"><span className="text-xs text-[#7D715E]">Mốc đủ 14 ngày</span><strong className="mt-2 block text-base font-semibold tabular-nums sm:text-xl">{Number.isFinite(Date.parse(historyItem.availableAt)) ? new Date(historyItem.availableAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa ghi nhận'}</strong><span className="mt-1 block text-[11px] text-[#7D715E] sm:text-xs">{Number.isFinite(Date.parse(historyItem.availableAt)) ? `${new Date(historyItem.availableAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })} · Giờ Việt Nam` : 'Giờ Việt Nam'}</span></div>
          </div>
          <div className="my-3 flex items-center gap-2 text-xs text-[#7D715E]"><span className="min-w-0 flex-1">{historyItem.order.holdReasons?.length ? historyItem.order.holdReasons.join(' · ') : Date.parse(historyItem.availableAt) > Date.now() ? 'Đang chờ đủ 14 ngày' : 'Đã đến mốc đối soát'}</span><span tabIndex={0} aria-label="Điều kiện giải tỏa" title="Thù lao tiêu chuẩn chuyển vào ví khả dụng khi đủ 14 ngày và không còn hồ sơ đổi trả, tranh chấp hoặc thẩm định chưa giải quyết. Chênh lệch Deal cần đạt thêm KPI."><Info size={15} /></span></div>
          <div role="tablist" aria-label="Chi tiết đối soát" className="grid grid-cols-2 divide-x divide-[#EAE4D7] rounded-xl border border-[#EAE4D7] p-1">
            {([{ id: 'money', label: 'Biến động tiền' }, { id: 'order', label: 'Tiến trình đơn' }] as const).map(tab => <button key={tab.id} id={`escrow-tab-${tab.id}`} aria-controls={`escrow-panel-${tab.id}`} role="tab" type="button" aria-selected={historyTab === tab.id} onClick={() => setHistoryTab(tab.id)} className={`h-[42px] rounded-lg text-sm font-medium ${historyTab === tab.id ? 'bg-[#FBF5EB] text-[#795A2D]' : 'text-[#7D715E]'}`}>{tab.label}</button>)}
          </div>
        </div>}>
        {historyItem && <div role="tabpanel" id={`escrow-panel-${historyTab}`} aria-labelledby={`escrow-tab-${historyTab}`} className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 sm:px-7">
          {historyTab === 'money' ? <EscrowMovements key={historyItem.id} commissionId={historyItem.id} /> : <>
          <dl className="m-0 min-h-0 overflow-y-auto divide-y divide-[#EAE4D7]">
            {([
              ['Tạo link', historyItem.order.referralLink?.createdAt],
              ['Khách mở link', historyItem.order.clickedAt],
              ['Đặt hàng', historyItem.order.createdAt],
              ['Shop xác nhận', historyItem.order.shopConfirmedAt],
              ['Tạo vận đơn', historyItem.order.handedToShippingAt],
              ['Giao thành công', historyItem.order.deliveredAt],
              ['Khách xác nhận hoàn tất', historyItem.order.completedAt],
            ] as const).filter(([, value]) => value && Number.isFinite(Date.parse(value))).map(([label, value]) => <div key={label} className="flex flex-wrap items-center justify-between gap-2 py-3"><dt className="text-sm text-[#7D715E]">{label}</dt><dd className="m-0 text-sm font-medium tabular-nums text-[#1A1612]">{timestamp(value)}</dd></div>)}
          </dl>
          <p className="m-0 text-xs text-[#7D715E]">Chỉ hiện mốc đã ghi nhận · Giờ Việt Nam. Ngày tạo link không phải ngày chia sẻ.</p>
          </>}
        </div>}
      </Modal>
    </section>
  );
}

function ReferralReview({ orderId, signals, onReviewed, compact = false }: { orderId: string; signals: string[]; onReviewed: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [evidence, setEvidence] = useState<{
    orderCode: string; reviewRequired: boolean; customerName: string | null; collaboratorName: string | null;
    shippingAddress: string | null; matchedAddresses: string[]; currentSignals: string[]; recordedSignals: string[];
    customerBank: { name: string; account: string } | null; collaboratorBank: { name: string; account: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError(''); setEvidence(null);
    api.get(`/commissions/orders/${orderId}/referral-review`, { headers: { 'x-skip-cache': 'true' } })
      .then(response => { if (active) setEvidence(unwrap<NonNullable<typeof evidence>>(response)); })
      .catch(() => { if (active) setError('Không tải được dữ liệu đối chiếu. Vui lòng thử lại.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, orderId, reload]);
  const submit = async (outcome: string) => {
    setBusy(true); setError("");
    try { await api.post(`/commissions/orders/${orderId}/referral-review`, { outcome, reason }); setOpen(false); setReason(''); onReviewed(); }
    catch { setError("Không thể lưu kết luận thẩm định. Vui lòng tải lại và kiểm tra."); }
    finally { setBusy(false); }
  };
  const label = (signal: string) => signal === 'SHARED_DELIVERY_ADDRESS' ? 'Trùng địa chỉ nhận hàng' : signal === 'SHARED_VERIFIED_BANK_ACCOUNT' ? 'Trùng tài khoản ngân hàng đã xác minh' : 'Cần đối soát';
  return <>
    <button type="button" onClick={() => setOpen(true)} className={compact ? 'mt-1 block text-left text-xs leading-relaxed text-[#8F682E] underline underline-offset-2' : 'mt-2 inline-flex max-w-full items-center justify-center gap-1 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-2 text-xs font-semibold text-[#8F682E]'} title={signals.map(label).join('; ')}>{compact ? 'Cần kiểm tra ghi nhận tiếp thị · Kiểm tra ›' : 'Kiểm tra ›'}</button>
    <Modal isOpen={open} onClose={() => { if (!busy) setOpen(false); }} title="Đối chiếu đơn tiếp thị" subtitle={evidence?.orderCode} maxWidth="lg">
      <div className="space-y-4 text-left text-sm">
        {loading && <p role="status" className="text-[#7D715E]">Đang tải dữ liệu đối chiếu…</p>}
        {error && <div role="alert" className="text-[#DC2626]">{error}{!evidence && <button type="button" onClick={() => setReload(value => value + 1)} className={`${button} ml-2`}>Thử lại</button>}</div>}
        {evidence && <>
          <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3"><strong>{(evidence.recordedSignals.length ? evidence.recordedSignals : signals).map(label).join(' · ')}</strong><p className="mt-1 text-xs text-[#7D715E]">Dấu hiệu cần kiểm tra, chưa phải kết luận tự mua.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="min-w-0 rounded-xl border border-[#EAE4D7] p-4"><h3 className="mb-2 font-semibold">Người nhận đơn hàng</h3><p>{evidence.customerName || 'Chưa có tên'}</p><p className="mt-2 text-xs leading-relaxed text-[#7D715E]">{evidence.shippingAddress || 'Chưa có địa chỉ'}</p></section>
            <section className="min-w-0 rounded-xl border border-[#EAE4D7] p-4"><h3 className="mb-2 font-semibold">Hồ sơ KOL hiện tại</h3><p>{evidence.collaboratorName || 'Chưa có thông tin'}</p>{evidence.matchedAddresses.length ? evidence.matchedAddresses.map(address => <p key={address} className="mt-2 text-xs leading-relaxed text-[#7D715E]">{address}</p>) : <p className="mt-2 text-xs text-[#7D715E]">Không có địa chỉ khớp trong hồ sơ hiện tại.</p>}</section>
          </div>
          {evidence.recordedSignals.includes('SHARED_VERIFIED_BANK_ACCOUNT') && <section className="rounded-xl border border-[#EAE4D7] p-4"><h3 className="mb-2 font-semibold">Ngân hàng đã xác minh</h3><p>Người mua: {evidence.customerBank ? `${evidence.customerBank.name} · ${evidence.customerBank.account}` : 'Chưa có dữ liệu'}</p><p className="mt-1">KOL: {evidence.collaboratorBank ? `${evidence.collaboratorBank.name} · ${evidence.collaboratorBank.account}` : 'Chưa có dữ liệu'}</p></section>}
          <p className="text-xs leading-relaxed text-[#7D715E]">Đối chiếu bằng hồ sơ hiện tại, không phải bản chụp tại lúc đặt hàng. {evidence.currentSignals.length ? 'Hiện vẫn có dấu hiệu trùng.' : 'Hiện không còn dữ liệu trùng; cần xác minh thêm trước khi kết luận.'}</p>
          {evidence.reviewRequired ? <>
            <label className="block font-semibold" htmlFor={`review-reason-${orderId}`}>Căn cứ kết luận</label>
            <textarea id={`review-reason-${orderId}`} aria-label="Lý do kết luận thẩm định tự mua" className="min-h-24 w-full resize-y rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm outline-none focus:border-[#C59B58]" value={reason} onChange={event => setReason(event.target.value)} minLength={10} maxLength={1000} placeholder="Ghi thông tin đã xác minh (ít nhất 10 ký tự)" disabled={busy} />
            <p className="text-xs leading-relaxed text-[#7D715E]">Đơn hợp lệ: tiếp tục đối soát 14 ngày. Đơn tự mua: thu hồi thù lao tạm giữ.</p>
            <div className="grid grid-cols-2 gap-2"><button type="button" className={`${button} bg-[#FBF5EB] font-semibold`} disabled={busy || reason.trim().length < 10} onClick={() => submit('CLEARED')}>Xác nhận hợp lệ</button><button type="button" className={`${button} bg-white font-semibold`} disabled={busy || reason.trim().length < 10} onClick={() => submit('SELF_REFERRAL')}>Xác nhận tự mua</button></div>
          </> : <p role="status" className="text-[#7D715E]">Đơn không còn chờ thẩm định. Đóng để xem danh sách mới.</p>}
        </>}
      </div>
    </Modal>
  </>;
}

interface Statement {
  transferProvider?: string | null;
  id: string;
  amount: string;
  taxAmount: string;
  netAmount: string;
  bankRefCode: string | null;
  processedAt: string | null;
}
export function PartnerTaxStatements({ payoutId, taxAmount = '0', sandbox = false }: { payoutId?: string; taxAmount?: string; sandbox?: boolean } = {}) {
  const [items, setItems] = useState<Statement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function downloadCertificate(id: string) {
    try {
      const response = await api.get(
        `/wallets/tax-invoices/${id}/certificate`,
        { responseType: "blob" },
      );
      const content = response instanceof Blob ? response : response.data;
      const url = URL.createObjectURL(
        new Blob([content], { type: "application/pdf" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `SCANMS-tax-${id}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(
        "Chứng từ thuế chưa được cung cấp hoặc không tải được. Vui lòng liên hệ kế toán.",
      );
    }
  }
  useEffect(() => {
    if (payoutId) return;
    let active = true;
    api
      .get("/wallets/tax-invoices")
      .then((response) => {
        if (active) setItems(unwrap<{ items: Statement[] }>(response).items);
      })
      .catch(() => {
        if (active) setError("Không tải được bảng kê chi trả.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [payoutId]);
  async function printReceipt(id: string) {
    const popup = window.open("", "_blank", "width=850,height=700");
    if (!popup) {
      setError("Cho phép cửa sổ mới để in hoặc lưu bảng kê PDF.");
      return;
    }
    try {
      const data = unwrap<
        Statement & {
          collaborator: {
            fullName: string;
            collaboratorProfile: { taxCode: string | null } | null;
          };
          bankAccountNumber: string;
        }
      >(await api.get(`/wallets/tax-invoices/${id}`));
      const doc = popup.document;
      const sandbox = data.transferProvider === 'BIDV_SANDBOX';
      doc.title = sandbox ? 'SCANMS - Bảng kê Sandbox' : 'SCANMS - Bảng kê chi trả';
      const style = doc.createElement("style");
      style.textContent =
        "body{font:16px Arial;color:#1A1612;margin:48px}h1{color:#B88E4F}td{padding:12px;border-bottom:1px solid #EAE4D7}table{width:100%;border-collapse:collapse}button{padding:12px;background:#C59B58;border:0;color:white}@media print{button{display:none}}";
      doc.head.append(style);
      const title = doc.createElement("h1");
      title.textContent = sandbox ? 'SCANMS · Bảng kê chi trả thử nghiệm Sandbox' : 'SCANMS · Bảng kê chi trả thu nhập';
      doc.body.append(title);
      const table = doc.createElement("table");
      for (const [label, value] of [
        ["Mã chi trả", data.id],
        ["Đối tác", data.collaborator.fullName],
        [
          "Mã số thuế",
          data.collaborator.collaboratorProfile?.taxCode ?? "Chưa cung cấp",
        ],
        ["Tài khoản nhận", data.bankAccountNumber],
        [
          "Ngày chi trả",
          data.processedAt
            ? new Date(data.processedAt).toLocaleString("vi-VN")
            : "—",
        ],
        ["Thu nhập trước thuế", money(data.amount)],
        ["Thuế khấu trừ", money(data.taxAmount)],
        ["Thực nhận", money(data.netAmount)],
        [sandbox ? 'Mã Sandbox SCANMS' : 'Mã ngân hàng', data.bankRefCode ?? '—'],
      ]) {
        const row = doc.createElement("tr");
        for (const text of [label, value]) {
          const cell = doc.createElement("td");
          cell.textContent = text;
          row.append(cell);
        }
        table.append(row);
      }
      doc.body.append(table);
      const note = doc.createElement("p");
      note.textContent = sandbox
        ? 'BIDV Sandbox: hoàn tất yêu cầu rút tiền thử nghiệm trong SCANMS. Không chuyển tiền ngoài đời. Đây không phải chứng từ ngân hàng hoặc chứng từ thuế.'
        : 'Bảng kê đối soát nội bộ SCANMS. Chứng từ khấu trừ thuế được tải riêng khi kế toán cung cấp bản đã phát hành.';
      doc.body.append(note);
      const print = doc.createElement("button");
      print.textContent = "In / Lưu PDF";
      print.onclick = () => popup.print();
      doc.body.append(print);
    } catch {
      popup.close();
      setError("Không tải được chi tiết bảng kê.");
    }
  }
  if (payoutId) return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs font-semibold text-[#795A2D] hover:border-[#C59B58] cursor-pointer" onClick={() => void printReceipt(payoutId)}>Xem bảng kê</button>
        {!sandbox && Number(taxAmount) > 0 && <button type="button" className={button} onClick={() => void downloadCertificate(payoutId)}>Chứng từ thuế</button>}
      </div>
      {error && <p role="alert" className="max-w-64 whitespace-normal text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
  return (
    <section className={panel} aria-busy={loading}>
      <h2 className="font-semibold">Bảng kê chi trả và thuế khấu trừ</h2>
      {error && (
        <p role="alert" className="text-[#DC2626]">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải…</p>
      ) : (
        <>
          {items.length > 0 && <p className="text-sm text-[#7D715E] my-2">
            Các khoản đã giải ngân được đối soát theo số thuế đã lưu tại thời
            điểm yêu cầu.
          </p>}
          {items.length > 0 && <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  {[
                    "Ngày chi trả",
                    "Trước thuế",
                    "Thuế",
                    "Thực nhận",
                    "Bảng kê",
                  ].map((label) => (
                    <th key={label} className="p-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className="border-t border-[#EAE4D7]" key={item.id}>
                    <td className="p-2">
                      {item.processedAt
                        ? new Date(item.processedAt).toLocaleDateString("vi-VN")
                        : "—"}
                      {item.transferProvider === 'BIDV_SANDBOX' && <span className="block text-xs text-[#7D715E]">BIDV Sandbox</span>}
                    </td>
                    <td className="p-2">{money(item.amount)}</td>
                    <td className="p-2">{money(item.taxAmount)}</td>
                    <td className="p-2">{money(item.netAmount)}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={button}
                          onClick={() => void printReceipt(item.id)}
                        >
                          In / Lưu PDF
                        </button>
                        {Number(item.taxAmount) > 0 && item.transferProvider !== 'BIDV_SANDBOX' && (
                          <button
                            className={button}
                            onClick={() => void downloadCertificate(item.id)}
                          >
                            Tải chứng từ thuế
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          }
          {!items.length && (
            <p className="py-4 text-[#7D715E]">
              Chưa có khoản chi trả hoàn tất.
            </p>
          )}
        </>
      )}
    </section>
  );
}

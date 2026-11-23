import { useEffect, useRef, useState } from "react";
import { useSearchParams } from 'react-router-dom';
import { Plus, CheckCircle2, MessageSquareText } from "lucide-react";
import {
  monthlyRewards,
  currentRewardMonth,
  type RewardOverview,
  type RewardMember,
} from "../../services/monthly-rewards.service";
import { Modal } from "../ui/Modal";
import { VietnamMonthPicker } from "../ui/VietnamMonthPicker";
import { toast } from "../../utils/toast";
import { KolMonthlyRewards } from './KolMonthlyRewards';
import { ShopRewardPolicyHistory } from './ShopRewardPolicyHistory';
import { RewardReviewHistoryButton } from './RewardReviewHistoryButton';

const money = (value: string | number) =>
  `${Number(value).toLocaleString("vi-VN")} đ`;
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2 text-sm font-medium text-[#715126] disabled:opacity-40";
const input =
  "h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm outline-none focus:border-[#C59B58]";
const statuses: Record<string, string> = {
  PENDING: "Chờ kiểm duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  PAID: "Đã cộng ví",
  NOT_SETTLED: "Chưa chốt",
};
type Action = {
  kind: "policy" | "grant";
  id: string;
  decision: "APPROVED" | "REJECTED";
  title: string;
};
export function MonthlyRewardsPanel({
  storeId,
  mode = "shop",
  initialMonth,
  onChanged,
}: {
  storeId?: string;
  mode?: "shop" | "operator" | "kol";
  initialMonth?: string;
  onChanged?: () => void;
}) {
  const [searchParams] = useSearchParams();
  const requestedMonth = searchParams.get('yearMonth');
  const [month, setMonth] = useState(initialMonth || (requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : currentRewardMonth()));
  useEffect(() => { if (requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) setMonth(requestedMonth); }, [requestedMonth]);
  const [data, setData] = useState<RewardOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [createMonth, setCreateMonth] = useState(currentRewardMonth(1));
  const [name, setName] = useState("Thưởng doanh số tháng");
  const [target, setTarget] = useState("50000000");
  const [reward, setReward] = useState("2000000");
  const rewardTooHigh = Number(reward) > Number(target);
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [submissionNotice, setSubmissionNotice] = useState('');
  useEffect(() => {
    if (!submissionNotice) return;
    const timer = window.setTimeout(() => setSubmissionNotice(''), 6000);
    return () => window.clearTimeout(timer);
  }, [submissionNotice]);
  const submitting = useRef(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const scrollToDetail = useRef(false);
  useEffect(() => {
    if (!loading && data && scrollToDetail.current) {
      scrollToDetail.current = false;
      detailRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }, [loading, data]);
  const lastView = useRef<{ key: string; data: RewardOverview } | null>(null);
  const reading = useRef(false);
  useEffect(() => {
    let live = true;
    const key = JSON.stringify([localStorage.getItem('token'), mode, storeId, month]);
    const snapshot = monthlyRewards.cached(month, storeId);
    const retained = snapshot ?? (lastView.current?.key === key ? lastView.current.data : null);
    setLoading(!retained);
    setError("");
    setData(retained);
    if (snapshot) {
      lastView.current = { key, data: snapshot };
      reading.current = false;
      return () => { live = false; };
    }
    reading.current = true;
    monthlyRewards
      .list(month, storeId)
      .then((next) => {
        if (live) { lastView.current = { key, data: next }; setData(next); }
      })
      .catch((err) => {
        if (live)
          setError(
            err instanceof Error ? err.message : "Không tải được thưởng tháng",
          );
      })
      .finally(() => {
        if (live) { setLoading(false); reading.current = false; }
      });
    return () => {
      live = false;
    };
  }, [month, storeId, mode, revision]);
  useEffect(() => {
    // Focus can fire repeatedly while using browser tools/windows. A fresh
    // snapshot needs no read; an expired one refreshes without blanking rows.
    const refresh = () => {
      if (document.visibilityState !== 'visible' || busy || reading.current || monthlyRewards.cached(month, storeId)) return;
      setRevision(value => value + 1);
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [month, storeId, busy]);
  const run = async (work: () => Promise<unknown>) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await work();
      onChanged?.();
      setCreating(false);
      setAction(null);
      setRevision((value) => value + 1);
      toast.success("Đã cập nhật thưởng tháng");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thực hiện được");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const selectGrant = (member: RewardMember, decision: 'APPROVED' | 'REJECTED') => {
    if (!member.grant) return;
    setNote('');
    setAction({ kind: 'grant', id: member.grant.id, decision, title: decision === 'APPROVED' ? `Duyệt & cộng ${money(member.grant.amount)} cho ${member.name}` : 'Từ chối đề nghị thưởng' });
  };
  if (mode === 'kol') return <section className="monthly-rewards grid gap-4" aria-label="Thưởng doanh số tháng">
    <div className="monthly-rewards-toolbar"><VietnamMonthPicker value={month} max="9999-12" onChange={setMonth} /></div>
    {loading && <p role="status" className="p-4 text-sm text-[#7D715E]">Đang tải thưởng tháng…</p>}
    {error && <p role="alert" className="rounded-xl border border-[#EAE4D7] bg-white p-4 text-sm text-[#DC2626]">{error} <button className="underline" onClick={() => setRevision(v => v + 1)}>Thử lại</button></p>}
    {!loading && !error && data && <KolMonthlyRewards data={data} />}
  </section>;
  return (
    <section aria-label="Thưởng doanh số tháng" className={`monthly-rewards grid gap-4 text-[#1A1612] ${mode === 'shop' ? 'monthly-rewards-shop [&_.monthly-rewards-toolbar]:min-h-[60px] [&_.monthly-rewards-toolbar]:rounded-xl [&_.monthly-rewards-toolbar]:border [&_.monthly-rewards-toolbar]:border-[#EAE4D7] [&_.monthly-rewards-toolbar]:bg-white [&_.monthly-rewards-toolbar]:p-3 [&_.monthly-reward-summary]:grid-cols-1! sm:[&_.monthly-reward-summary]:grid-cols-[1.4fr_1fr_1fr]! [&_.monthly-reward-summary]:gap-4! [&_.monthly-reward-summary]:bg-white! [&_.monthly-reward-summary]:py-4! [&_.monthly-reward-team-table_td]:h-[72px] [&_.monthly-reward-team-table_td]:py-3! [&_.monthly-reward-progress]:mt-0! [&_.monthly-reward-progress]:flex-col [&_.monthly-reward-progress]:items-start! [&_.monthly-reward-progress]:gap-1! [&_.monthly-reward-progress-track]:h-[3px]! [&_.monthly-reward-progress-track]:w-full! [&_.monthly-reward-progress-track]:max-w-none! [&_.monthly-reward-initials]:size-7! [&_.monthly-reward-initials]:flex-[0_0_28px]!' : ''}`}>
      <div className="monthly-rewards-toolbar">
          <VietnamMonthPicker
            value={month}
            max="9999-12"
            onChange={setMonth}
            disabled={busy}
          />
          {mode === "shop" && (
            <div className="flex flex-wrap items-center gap-2">
            {storeId && <ShopRewardPolicyHistory key={storeId} storeId={storeId} revision={revision} month={month} onSelect={next => { scrollToDetail.current = true; if (next === month) { scrollToDetail.current = false; detailRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'}); } else setMonth(next); }}/>}
            <button
              className={button}
              onClick={() => {
                setCreateMonth(currentRewardMonth(1));
                setResubmitting(false);
                setCreating(true);
              }}
            >
              <Plus size={16} />
              Tạo thưởng tháng sau
            </button>
            </div>
          )}
      </div>
      {mode === 'shop' && submissionNotice && <div role="status" className="flex items-start gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-3 text-sm text-[#715126]"><CheckCircle2 size={17} className="mt-0.5 shrink-0"/><span>{submissionNotice}</span></div>}
      <div ref={detailRef} className="scroll-mt-4"/>
      {loading && (
        <p role="status" className="p-4 text-sm text-[#7D715E]">
          Đang đối soát dữ liệu thưởng…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-100 bg-white p-4 text-sm text-red-600"
        >
          {error}{" "}
          <button
            className="underline"
            onClick={() => setRevision((value) => value + 1)}
          >
            Thử lại
          </button>
        </p>
      )}
      {!loading && !error && !data?.policies.length && !data?.legacyHistory?.length && (
        <p className="rounded-2xl border border-[#EAE4D7] bg-white p-6 text-sm text-[#7D715E]">
          Chưa có chính sách thưởng cho kỳ này.
        </p>
      )}
      {data?.legacyHistory?.map(history => <article key={`history-${history.storeId}`} className="overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] px-5 py-4">
          <div><h3 className="m-0 text-base font-semibold">Thưởng tháng {history.yearMonth.split('-').reverse().join('/')}</h3><p className="mb-0 mt-1 text-xs text-[#7D715E]">{history.storeName}</p></div>
          <span className="monthly-reward-status">Lịch sử</span>
        </header>
        {history.rules.map(rule => <div key={`${rule.id}-${rule.targetRevenue}`} className="monthly-reward-summary">
          <div className="monthly-reward-identity"><h3>{rule.name}</h3></div>
          <div className="monthly-reward-metric"><span>Mốc doanh số</span><strong>{money(rule.targetRevenue)}</strong></div>
          <div className="monthly-reward-metric monthly-reward-amount"><span>Tiền thưởng</span><strong>{Number(rule.rewardAmount) > 0 ? money(rule.rewardAmount) : `${Number(rule.bonusPercentage).toLocaleString('vi-VN')}%`}</strong></div>
        </div>)}
        {history.warning && <p role="status" className="m-0 px-5 py-3 text-sm text-[#D97706]">{history.warning}</p>}
        {history.members.length ? <div className="overflow-x-auto"><table className="monthly-reward-table w-full min-w-[680px] text-left text-sm">
          <colgroup><col style={{width:'25%'}}/><col style={{width:'27%'}}/><col style={{width:'23%'}}/><col style={{width:'25%'}}/></colgroup>
          <thead className="text-xs text-[#7D715E]"><tr><th className="font-medium">KOL hợp tác</th><th className="font-medium">Doanh số đối soát</th><th className="font-medium">Tiền thưởng</th><th className="text-center font-medium">Trạng thái</th></tr></thead>
          <tbody>{history.members.map(row => <tr key={row.id} className="border-t border-[#EAE4D7]">
            <td><strong className="font-semibold">{row.name}</strong>{row.appliedRuleName && !history.rules.length && <p className="mb-0 mt-1 text-xs text-[#7D715E]">{row.appliedRuleName}</p>}</td>
            <td><strong className="font-semibold tabular-nums">{row.validRevenue === null ? '—' : money(row.validRevenue)}</strong><p className="mb-0 mt-1 text-xs text-[#7D715E]">{row.error ?? (row.isSettled ? 'Đã chốt' : `${row.validOrdersCount ?? 0} đơn`)}</p></td>
            <td className="font-semibold tabular-nums text-[#926729]">{row.amount === null ? '—' : money(row.amount)}</td>
            <td className="text-center"><span className="monthly-reward-status">{row.error ? 'Cần đối soát' : statuses[row.status] ?? row.status}</span>{(row.paidAt ?? row.settledAt) && <p className="mb-0 mt-1 text-xs text-[#7D715E]">{new Date((row.paidAt ?? row.settledAt)!).toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'})}</p>}</td>
          </tr>)}</tbody>
        </table></div> : !history.warning && <p className="m-0 px-5 py-4 text-sm text-[#7D715E]">Chưa có KOL trong kỳ này.</p>}
      </article>)}
      {data?.policies.map((policy) => (
        <div key={policy.id} className="grid min-w-0 gap-4">
          {mode === 'operator' && policy.status === 'PENDING' && <section className="monthly-reward-policy-review" aria-label={`Chính sách chờ duyệt tháng ${policy.yearMonth}`}>
            <header className="monthly-reward-policy-review-heading"><div className="flex flex-wrap items-center gap-2"><h3>Chính sách chờ duyệt</h3><RewardReviewHistoryButton entries={policy.reviewHistory} month={policy.yearMonth}/></div><span>Tháng {policy.yearMonth.split('-').reverse().join('/')}</span></header>
            <div className="monthly-reward-policy-review-body">
              <div className="monthly-reward-identity"><h3>{policy.name}</h3><p>{policy.storeName}</p></div>
              <div className="monthly-reward-metric"><span>Mốc doanh số</span><strong>{money(policy.targetRevenue)}</strong></div>
              <div className="monthly-reward-metric monthly-reward-amount"><span>Tiền thưởng</span><strong>{money(policy.rewardAmount)}</strong></div>
              <div className="monthly-reward-policy-actions"><div className="monthly-reward-actions monthly-reward-policy-action-pair">
                <button type="button" className="monthly-reward-action monthly-reward-action-approve" disabled={busy} onClick={() => { setNote(''); setAction({kind:'policy',id:policy.id,decision:'APPROVED',title:'Duyệt chính sách thưởng'}); }}>Duyệt chính sách</button>
                <button type="button" className="monthly-reward-action monthly-reward-action-reject" disabled={busy} onClick={() => { setNote(''); setAction({kind:'policy',id:policy.id,decision:'REJECTED',title:'Từ chối chính sách'}); }}>Từ chối</button>
              </div></div>
            </div>
          </section>}
        <article
          className="overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white"
        >
          {mode === 'operator' && policy.status === 'PENDING' ? <header className="monthly-reward-roster-heading"><h3>Theo dõi KOL</h3><span>{policy.members.length} KOL · Tháng {policy.yearMonth.split('-').reverse().join('/')}</span></header> : <header className="monthly-reward-summary">
            <div className="monthly-reward-identity">
              <h3 className="flex flex-wrap items-center gap-2">{policy.name}{mode === 'shop' && <span className="monthly-reward-status">{statuses[policy.status] || policy.status}</span>}<RewardReviewHistoryButton entries={policy.reviewHistory} month={policy.yearMonth}/></h3>
              <p>{mode === 'shop' ? 'Tháng ' : `${policy.storeName} · `}{policy.yearMonth.split("-").reverse().join("/")}
              </p>
            </div>
            <div className="monthly-reward-metric"><span>Mốc doanh số</span><strong>{money(policy.targetRevenue)}</strong></div>
            <div className="monthly-reward-metric monthly-reward-amount"><span>Tiền thưởng</span><strong>{money(policy.rewardAmount)}</strong></div>
            {mode !== 'shop' && <span className="monthly-reward-status">
              {statuses[policy.status]}
            </span>}
          </header>}
          {policy.reviewNote && !policy.isDemo && <section className="monthly-reward-note" aria-label={policy.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú xét duyệt'}>
            <span className="monthly-reward-note-icon" aria-hidden="true"><MessageSquareText size={16}/></span>
            <div className="monthly-reward-note-content"><div className="monthly-reward-note-heading"><strong>{policy.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú xét duyệt'}</strong>{policy.reviewedAt && Number.isFinite(Date.parse(policy.reviewedAt)) && <time dateTime={policy.reviewedAt}>{new Date(policy.reviewedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time>}</div><p>{policy.reviewNote}</p></div>
          </section>}
          {mode === 'shop' && policy.status === 'REJECTED' && policy.yearMonth >= currentRewardMonth() && <div className="monthly-reward-resubmit"><span>Chỉnh sửa chính sách rồi gửi lại kiểm duyệt.</span><button type="button" className={button} disabled={busy} onClick={() => { setCreateMonth(policy.yearMonth); setName(policy.name); setTarget(String(Number(policy.targetRevenue))); setReward(String(Number(policy.rewardAmount))); setResubmitting(true); setCreating(true); }}>Chỉnh sửa & gửi lại</button></div>}
          {mode === 'operator' && policy.members.some(member => member.grant?.status === 'PENDING') && <section className="monthly-reward-queue" aria-label={`Đề nghị chờ duyệt tháng ${policy.yearMonth}`}>
            <header className="monthly-reward-queue-heading"><h4>Đề nghị chờ duyệt <span>{policy.members.filter(member => member.grant?.status === 'PENDING').length}</span></h4><span>Tháng {policy.yearMonth.split('-').reverse().join('/')}</span></header>
            {policy.members.filter(member => member.grant?.status === 'PENDING').map(member => <div key={member.grant!.id} className="monthly-reward-queue-row">
              <div className="monthly-reward-person monthly-reward-queue-person"><span aria-hidden="true" className="monthly-reward-initials">{member.name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('')}</span><div><strong>{member.name}</strong><span className="monthly-reward-order-count">{member.error ? 'Cần đối soát' : member.eligible ? 'Đã đạt KPI' : 'Chưa đạt KPI'}</span></div></div>
              <div className="monthly-reward-queue-metric"><span>Doanh số sạch</span><strong>{member.validRevenue === null ? '—' : money(member.validRevenue)}</strong></div>
              <div className="monthly-reward-queue-metric monthly-reward-queue-bonus"><span>Tiền thưởng</span><strong>{money(member.grant!.amount)}</strong></div>
              <div className="monthly-reward-actions"><button type="button" className="monthly-reward-action monthly-reward-action-approve" disabled={busy || !!member.error || !member.eligible} onClick={() => selectGrant(member, 'APPROVED')}><CheckCircle2 size={14}/>Duyệt & cộng ví</button><button type="button" className="monthly-reward-action monthly-reward-action-reject" disabled={busy} onClick={() => selectGrant(member, 'REJECTED')}>Từ chối</button></div>
              {member.error && <p role="status" className="monthly-reward-queue-error">{member.error}</p>}
            </div>)}
          </section>}
          <div className="overflow-x-auto">
            <table className="monthly-reward-table monthly-reward-team-table w-full text-left text-sm">
              <colgroup><col style={{width:'25%'}}/><col style={{width:'22%'}}/><col style={{width:'16%'}}/><col style={{width:'17%'}}/><col style={{width:'20%'}}/></colgroup>
              <thead className="bg-[#FDFCF9] text-xs text-[#7D715E]">
                <tr>
                  <th className="p-4 font-medium">KOL hợp tác</th>
                  <th className="p-4 font-medium" title="Doanh số hợp lệ được hệ thống đối soát theo chính sách thưởng tháng; không phải tổng giá trị đơn tạo mới.">Doanh số đối soát</th>
                  <th className="p-4 font-medium">Tiến độ</th>
                  <th className="p-4 text-right font-medium">Tiền thưởng</th>
                  <th className="p-4 text-center font-medium">
                    {mode === 'operator' ? 'Trạng thái' : 'Trạng thái / Thao tác'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {policy.members.map((member) => (
                  <tr
                    key={member.collaboratorId}
                    className="border-t border-[#EAE4D7]"
                    data-reward-state={member.grant?.status ?? (member.eligible ? 'ELIGIBLE' : 'TRACKING')}
                  >
                    <td className="p-4">
                      <div className="monthly-reward-person"><span aria-hidden="true" className="monthly-reward-initials">{member.name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('')}</span><div><strong>{member.name}</strong><span className="monthly-reward-order-count">{member.validOrdersCount} đơn</span></div></div>
                    </td>
                    <td className="p-4">
                      <strong className="monthly-reward-revenue tabular-nums">
                        {member.validRevenue === null
                          ? "Chưa đối soát"
                          : money(member.validRevenue)}
                      </strong>
                      {member.error && <p role="status" title={member.error} className="mb-0 mt-1 text-xs text-[#D97706]">Cần kiểm tra đối soát</p>}
                    </td>
                    <td className="p-4">
                      {member.validRevenue === null || member.error || Number(policy.targetRevenue) <= 0 ? <span className="text-[#7D715E]">—</span> : <div className="monthly-reward-progress">
                        <div role="progressbar" aria-label={`Tiến độ KPI của ${member.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, Math.round(Number(member.validRevenue) / Number(policy.targetRevenue) * 100)))} className="monthly-reward-progress-track"><span style={{ width: `${Math.min(100, Math.max(0, Number(member.validRevenue) / Number(policy.targetRevenue) * 100))}%` }}/></div>
                        <span>{Math.max(0, Number(member.validRevenue) / Number(policy.targetRevenue) * 100).toLocaleString('vi-VN', {maximumFractionDigits: 1})}%</span>
                      </div>}
                    </td>
                    <td className={`monthly-reward-bonus p-4 text-right font-semibold tabular-nums ${Number(member.grant?.amount ?? member.estimatedReward) > 0 ? 'is-positive' : ''}`}>
                      {(member.validRevenue === null || member.error) && !member.grant ? '—' : money(member.grant?.amount ?? member.estimatedReward)}
                      {!member.grant && member.validRevenue !== null && !member.error && <span className="mt-1 block text-[11px] font-normal text-[#7D715E]">Dự tính</span>}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`monthly-reward-row-status ${member.grant || member.eligible ? 'is-active' : ''}`} data-status={member.grant?.status}>
                        {member.grant
                          ? statuses[member.grant.status]
                          : member.validRevenue === null || member.error
                            ? "Chưa đối soát"
                          : member.eligible
                            ? "Chưa gửi duyệt"
                            : "Đang theo dõi"}
                      </span>
                      {member.grant?.paidAt && <time dateTime={member.grant.paidAt} className="mt-1 block text-[11px] text-[#7D715E]">{new Date(member.grant.paidAt).toLocaleDateString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})}</time>}
                      {member.grant?.reviewNote && !(member.grant.status === 'PAID' && member.grant.reviewNote.trim().toLocaleLowerCase('vi-VN') === 'đủ điều kiện') && (
                        <p className="mb-0 mt-1 text-xs text-[#7D715E]">
                          {member.grant.reviewNote}
                        </p>
                      )}
                      {mode === "shop" &&
                        policy.status === "APPROVED" &&
                        member.eligible &&
                        !member.grant && (
                          <button
                            className={`${button} mx-auto mt-2`}
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                monthlyRewards.request(
                                  policy.id,
                                  member.collaboratorId,
                                ),
                              )
                            }
                          >
                            Gửi duyệt
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!policy.members.length && (
              <p className="p-4 text-sm text-[#7D715E]">
                Chưa có KOL hợp tác trong danh sách.
              </p>
            )}
          </div>
        </article>
        </div>
      ))}
      {creating && (
        <Modal
          isOpen
          title={resubmitting ? 'Chỉnh sửa & gửi lại chính sách' : 'Tạo thưởng doanh số tháng'}
          onClose={() => {
            if (!busy) setCreating(false);
          }}
          maxWidth="xl"
        >
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!storeId) return;
              if (rewardTooHigh) return;
              void run(async () => {
                await monthlyRewards.create(storeId, {
                  yearMonth: createMonth,
                  name,
                  targetRevenue: target,
                  rewardAmount: reward,
                });
                setSubmissionNotice(`${resubmitting ? 'Đã gửi lại' : 'Đã tạo'} mốc thưởng tháng ${createMonth.split('-').reverse().join('/')} · Doanh số ${money(target)} · Thưởng ${money(reward)}. Chờ kiểm duyệt.`);
                setMonth(createMonth);
              });
            }}
          >
            <div className="grid gap-2 text-sm">
              <span>Kỳ áp dụng</span>
              <VietnamMonthPicker
                variant="field"
                min={currentRewardMonth()}
                max="9999-12"
                value={createMonth}
                onChange={setCreateMonth}
                disabled={busy || resubmitting}
              />
            </div>
            <label className="grid gap-2 text-sm">
              Tên chính sách
              <input
                required
                minLength={3}
                maxLength={150}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={input}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                KPI doanh số sạch (đ)
                <input
                  required
                  inputMode="numeric"
                  pattern="[1-9][0-9]{0,11}"
                  value={target}
                  onChange={(event) =>
                    setTarget(event.target.value.replace(/\D/g, ""))
                  }
                  className={input}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Tiền thưởng (đ)
                <input
                  required
                  inputMode="numeric"
                  pattern="[1-9][0-9]{0,11}"
                  value={reward}
                  aria-invalid={rewardTooHigh}
                  aria-describedby={rewardTooHigh ? 'monthly-reward-error' : undefined}
                  onChange={(event) =>
                    setReward(event.target.value.replace(/\D/g, ""))
                  }
                  className={input}
                />
              </label>
            </div>
            {rewardTooHigh && <p id="monthly-reward-error" role="alert" className="m-0 text-sm text-[#DC2626]">Tiền thưởng không được vượt KPI doanh số sạch ({money(target)}).</p>}
            <p className="m-0 text-xs text-[#7D715E]">
              Gửi System Manager/Admin kiểm duyệt. Thưởng tháng không tự động
              thay đổi cấp bậc KOL.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => setCreating(false)}
              >
                Hủy
              </button>
              <button type="submit" disabled={busy || rewardTooHigh} className={button}>
                {busy ? 'Đang gửi…' : resubmitting ? 'Gửi lại kiểm duyệt' : 'Gửi kiểm duyệt'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {action && (
        <Modal
          isOpen
          title={action.title}
          onClose={() => {
            if (!busy) setAction(null);
          }}
          maxWidth="xl"
        >
          <div className="grid gap-4">
            {action.kind === "grant" && action.decision === "APPROVED" && (
              <p className="m-0 text-sm">
                Hệ thống kiểm tra lại doanh số trước khi cộng thưởng. Mỗi KOL
                chỉ được nhận một lần cho chính sách này.
              </p>
            )}
            <label className="grid gap-2 text-sm">
              {action.decision === "REJECTED"
                ? "Lý do từ chối *"
                : "Ghi chú duyệt"}
              <textarea
                rows={2}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={`${input} !h-auto py-2`}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                disabled={busy}
                className={button}
                onClick={() => setAction(null)}
              >
                Hủy
              </button>
              <button
                disabled={
                  busy || (action.decision === "REJECTED" && !note.trim())
                }
                className={button}
                onClick={() =>
                  void run(() =>
                    action.kind === "policy"
                      ? monthlyRewards.reviewPolicy(
                          action.id,
                          action.decision,
                          note,
                        )
                      : monthlyRewards.reviewGrant(
                          action.id,
                          action.decision,
                          note,
                        ),
                  )
                }
              >
                Xác nhận
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

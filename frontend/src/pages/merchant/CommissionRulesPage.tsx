import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Calculator,
  History,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  Award,
  ToggleLeft,
  ToggleRight,
  X,
  Users,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { Select } from '../../components/ui/Select';
import {
  commissionRulesService,
  type CommissionRule,
  type BonusPreviewResult,
  type SettlementHistoryItem,
} from '../../services/commission-rules.service';
import { getVietnamCurrentMonthYear } from '@/utils/date-time.utils';

type KolMember = {
  collaboratorId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  totalFollowers?: number;
  primaryChannel?: {
    platformName: string;
    channelName: string;
    followerCount?: number;
  } | null;
  validRevenue: string;
  validOrdersCount: number;
  currentMilestone: any | null;
  nextMilestone: any | null;
  estimatedTotalBonus: string;
  settlementStatus: string;
  settlement: any | null;
};

export const CommissionRulesPage: React.FC = () => {
  const { year: currentVnYear, month: currentVnMonth } = getVietnamCurrentMonthYear();
  const currentVnYearMonth = `${currentVnYear}-${currentVnMonth}`;

  const [storeId, setStoreId] = useState<string>(() => localStorage.getItem('current_store_id') || '');
  const [currentUserRole, setCurrentUserRole] = useState<string>(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) return JSON.parse(u)?.role || '';
    } catch {}
    return '';
  });
  const isReadOnlyAdmin = !['SHOP_MANAGER', 'SYSTEM_ADMIN'].includes(currentUserRole);

  // Rules state
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [bonusType, setBonusType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [deletingRule, setDeletingRule] = useState<CommissionRule | null>(null);

  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    minMonthlyRevenue: '',
    achievementBonus: '0',
    bonusPercentage: '',
    isActive: true,
  });

  // Month & Team Progress State
  const [selectedYear, setSelectedYear] = useState<string>(currentVnYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentVnMonth);
  const settleYearMonth = `${selectedYear}-${selectedMonth}`;
  const isCurrentMonth = settleYearMonth === currentVnYearMonth;

  const [teamProgress, setTeamProgress] = useState<any | null>(null);
  const [teamLoading, setTeamLoading] = useState<boolean>(false);
  const [batchSettleLoading, setBatchSettleLoading] = useState<boolean>(false);

  // Drill-down Single KOL Inspector State
  const [selectedKolId, setSelectedKolId] = useState<string>('');
  const [kolProgress, setKolProgress] = useState<any | null>(null);
  const [kolProgressLoading, setKolProgressLoading] = useState<boolean>(false);
  const [settleLoading, setSettleLoading] = useState<boolean>(false);

  // Simulator State
  const [simRevenue, setSimRevenue] = useState<string>('120000000');
  const [simResult, setSimResult] = useState<BonusPreviewResult | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  // Settlement History State
  const [historyList, setHistoryList] = useState<SettlementHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const formatVND = (amount: string | number) => `${Number(amount || 0).toLocaleString('vi-VN')} ₫`;

  const isValidUUID = (id?: string | null): boolean => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  // 1. Load Rules
  const loadRules = useCallback(async (sId: string) => {
    if (!isValidUUID(sId)) return;
    try {
      setLoading(true);
      const data = await commissionRulesService.getRules(sId);
      setRules(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không tải được bậc thưởng.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Load Team Progress
  const loadTeamProgress = useCallback(async (sId: string, ym: string) => {
    if (!isValidUUID(sId)) return;
    try {
      setTeamLoading(true);
      const data = await commissionRulesService.getTeamProgress(sId, ym);
      setTeamProgress(data);
      if (data?.members && data.members.length > 0) {
        setSelectedKolId((prev) => {
          const exists = data.members.some((m: any) => m.collaboratorId === prev);
          return exists ? prev : data.members[0].collaboratorId;
        });
      }
    } catch (err) {
      console.warn('Lỗi tải tiến độ đội ngũ KOL:', err);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  // 3. Load Single KOL Progress
  const loadKolProgress = useCallback(async (kolId: string, ym: string, sId: string) => {
    if (!isValidUUID(kolId) || !isValidUUID(sId)) return;
    try {
      setKolProgressLoading(true);
      const progress = await commissionRulesService.getKolProgress(sId, kolId, ym);
      setKolProgress(progress);
    } catch (err) {
      setKolProgress(null);
    } finally {
      setKolProgressLoading(false);
    }
  }, []);

  // 4. Load History
  const loadHistory = useCallback(async (sId?: string, ym?: string) => {
    const targetStore = sId || storeId;
    const targetMonth = ym || settleYearMonth;
    if (!isValidUUID(targetStore)) return;
    try {
      setHistoryLoading(true);
      const history = await commissionRulesService.getSettlementHistory(targetStore, targetMonth);
      setHistoryList(history);
    } catch (err: any) {
      console.warn('Lỗi tải lịch sử đối soát', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [settleYearMonth, storeId]);

  // Initial Auth & Store Resolver
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        let sId = localStorage.getItem('current_store_id') || '';
        const userRes: any = await api.get('/auth/me');
        const user = userRes?.data || userRes;
        if (!active) return;
        if (user?.role) setCurrentUserRole(user.role);

        const myStore = user?.stores?.[0] || user?.ownedStores?.[0] || user?.store;
        if (myStore?.id && isValidUUID(myStore.id)) {
          sId = myStore.id;
          setStoreId(sId);
          localStorage.setItem('current_store_id', sId);
        } else if (!isValidUUID(sId)) {
          try {
            const storesRes: any = await api.get('/stores/me');
            const list = storesRes?.data || storesRes || [];
            if (list?.[0]?.id && isValidUUID(list[0].id)) {
              sId = list[0].id;
              setStoreId(sId);
              localStorage.setItem('current_store_id', sId);
            }
          } catch {}
        }

        if (isValidUUID(sId)) {
          await Promise.all([
            loadRules(sId),
            loadTeamProgress(sId, settleYearMonth),
            loadHistory(sId, settleYearMonth),
          ]);
        }
      } catch (err) {
        if (!active) return;
        if (isValidUUID(storeId)) {
          void loadRules(storeId);
          void loadTeamProgress(storeId, settleYearMonth);
          void loadHistory(storeId, settleYearMonth);
        }
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, [loadHistory, loadRules, loadTeamProgress, settleYearMonth]);

  // When selectedKolId or month changes, reload single inspector
  useEffect(() => {
    if (storeId && selectedKolId) {
      void loadKolProgress(selectedKolId, settleYearMonth, storeId);
    }
  }, [loadKolProgress, selectedKolId, settleYearMonth, storeId]);

  // When month changes, reload team progress & history
  useEffect(() => {
    if (storeId) {
      void loadTeamProgress(storeId, settleYearMonth);
      void loadHistory(storeId, settleYearMonth);
    }
  }, [loadHistory, loadTeamProgress, settleYearMonth, storeId]);

  // Simulator
  useEffect(() => {
    if (!storeId || !simRevenue) return;
    const timer = setTimeout(async () => {
      try {
        setSimLoading(true);
        const res = await commissionRulesService.previewBonus(storeId, simRevenue);
        setSimResult(res);
      } catch {
        setSimResult(null);
      } finally {
        setSimLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [simRevenue, storeId]);

  // Actions
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.name || !ruleForm.minMonthlyRevenue || (bonusType === 'PERCENT' && !ruleForm.bonusPercentage)) {
      toast.error('Nhập đủ tên bậc, doanh số tối thiểu và tỷ lệ thưởng.');
      return;
    }
    try {
      if (editingRule) {
        await commissionRulesService.updateRule(storeId, editingRule.id, {
          name: ruleForm.name.trim(),
          description: ruleForm.description.trim() || undefined,
          minMonthlyRevenue: ruleForm.minMonthlyRevenue.trim(),
          achievementBonus: bonusType === 'FIXED' ? ruleForm.achievementBonus.trim() || '0' : '0',
          bonusPercentage: bonusType === 'PERCENT' ? ruleForm.bonusPercentage.trim() : '0',
          isActive: ruleForm.isActive,
        });
        toast.success('Cập nhật bậc thưởng thành công.');
      } else {
        await commissionRulesService.createRule(storeId, {
          name: ruleForm.name.trim(),
          description: ruleForm.description.trim() || undefined,
          minMonthlyRevenue: ruleForm.minMonthlyRevenue.trim(),
          achievementBonus: bonusType === 'FIXED' ? ruleForm.achievementBonus.trim() || '0' : '0',
          bonusPercentage: bonusType === 'PERCENT' ? ruleForm.bonusPercentage.trim() : '0',
          isActive: ruleForm.isActive,
        });
        toast.success('Tạo bậc thưởng thành công.');
      }
      setIsModalOpen(false);
      setEditingRule(null);
      setRuleForm({
        name: '',
        description: '',
        minMonthlyRevenue: '',
        achievementBonus: '0',
        bonusPercentage: '',
        isActive: true,
      });
      loadRules(storeId);
      loadTeamProgress(storeId, settleYearMonth);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Lưu bậc thưởng thất bại.');
    }
  };

  const handleToggleRuleStatus = async (rule: CommissionRule) => {
    try {
      await commissionRulesService.updateStatus(storeId, rule.id, !rule.isActive);
      toast.success(!rule.isActive ? 'Đã kích hoạt bậc thưởng.' : 'Đã tạm dừng bậc thưởng.');
      loadRules(storeId);
      loadTeamProgress(storeId, settleYearMonth);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Cập nhật trạng thái thất bại.');
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;
    try {
      await commissionRulesService.deleteRule(storeId, deletingRule.id);
      toast.success('Đã xóa bậc thưởng.');
      setDeletingRule(null);
      loadRules(storeId);
      loadTeamProgress(storeId, settleYearMonth);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Xóa thất bại.');
    }
  };

  // Single settle
  const handleSettleSingle = async () => {
    if (!selectedKolId) {
      toast.error('Chọn đối tác KOL để chốt đối soát.');
      return;
    }
    try {
      setSettleLoading(true);
      const res = await commissionRulesService.settleMonthlyBonus(
        storeId,
        selectedKolId,
        settleYearMonth,
        false
      );
      toast.success(res.message || 'Chốt thưởng thành công.');
      await Promise.all([
        loadHistory(storeId, settleYearMonth),
        loadKolProgress(selectedKolId, settleYearMonth, storeId),
        loadTeamProgress(storeId, settleYearMonth),
      ]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Chốt thưởng thất bại.');
    } finally {
      setSettleLoading(false);
    }
  };

  // Batch settle all eligible
  const handleBatchSettle = async () => {
    if (!storeId) return;
    const eligibleCount = teamProgress?.summary?.eligibleCount || 0;
    if (eligibleCount === 0) {
      toast.info('Kỳ này chưa có đối tác nào chạm mốc thưởng để chốt.');
      return;
    }
    const confirm = window.confirm(
      `Xác nhận chốt đối soát hàng loạt cho tất cả ${eligibleCount} đối tác đạt mốc thưởng tháng ${selectedMonth}/${selectedYear}?`
    );
    if (!confirm) return;

    try {
      setBatchSettleLoading(true);
      const res = await commissionRulesService.settleAll(storeId, settleYearMonth);
      toast.success(res.message || 'Chốt đối soát hàng loạt thành công!');
      await Promise.all([
        loadTeamProgress(storeId, settleYearMonth),
        loadHistory(storeId, settleYearMonth),
        selectedKolId ? loadKolProgress(selectedKolId, settleYearMonth, storeId) : Promise.resolve(),
      ]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Lỗi khi chốt đối soát hàng loạt.');
    } finally {
      setBatchSettleLoading(false);
    }
  };

  const handleApprove = async (settlementId: string) => {
    try {
      const res = await commissionRulesService.approveSettlement(storeId, settlementId);
      toast.success(res.message || 'Đã duyệt kỳ thưởng.');
      await Promise.all([
        loadHistory(storeId, settleYearMonth),
        loadTeamProgress(storeId, settleYearMonth),
        selectedKolId ? loadKolProgress(selectedKolId, settleYearMonth, storeId) : Promise.resolve(),
      ]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Duyệt thất bại.');
    }
  };

  const handlePayout = async (settlementId: string) => {
    try {
      const res = await commissionRulesService.payoutSettlement(storeId, settlementId);
      toast.success(res.message || 'Đã chi trả tiền thưởng vào ví đối tác.');
      await Promise.all([
        loadHistory(storeId, settleYearMonth),
        loadTeamProgress(storeId, settleYearMonth),
        selectedKolId ? loadKolProgress(selectedKolId, settleYearMonth, storeId) : Promise.resolve(),
      ]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Chi trả thất bại.');
    }
  };

  const selectedMember = useMemo(
    () => teamProgress?.members?.find((m: KolMember) => m.collaboratorId === selectedKolId),
    [teamProgress, selectedKolId]
  );

  return (
    <div className="commission-workspace mx-auto w-full max-w-[1560px] space-y-5 pb-12 pt-2 text-[#1A1612]">
      {/* TOP HEADER */}
      <div className="commission-heading flex flex-col gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF5EB] text-[#B88E4F]">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1A1612] tracking-tight">
              Thưởng doanh số & Đối soát KPI
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Month & Year Selectors */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-1">
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-8 border-none bg-transparent text-xs font-bold focus:ring-0"
            >
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </Select>
            <input
              type="number"
              min="2020"
              max="2030"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-8 w-16 border-none bg-transparent px-1 text-xs font-bold outline-none"
            />
          </div>

          {!isReadOnlyAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingRule(null);
                setBonusType('FIXED');
                setRuleForm({
                  name: '',
                  description: '',
                  minMonthlyRevenue: '',
                  achievementBonus: '0',
                  bonusPercentage: '',
                  isActive: true,
                });
                setIsModalOpen(true);
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#C59B58] px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-[#B88E4F] transition"
            >
              <Plus className="h-4 w-4" /> Thêm bậc thưởng
            </button>
          )}
        </div>
      </div>

      {/* BLOCK 1: COMMISSION RULES GRID */}
      <section className="commission-tiers space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-[#B88E4F]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7D715E]">
              Bậc thưởng tháng ({rules.length} bậc)
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-6 text-center text-xs text-[#7D715E]">
            Đang tải chính sách thưởng…
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EAE4D7] bg-white p-6 text-center">
            <Award className="mx-auto mb-2 h-6 w-6 text-[#C59B58]/60" />
            <p className="text-xs font-bold text-[#1A1612]">Chưa thiết lập bậc thưởng</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition shadow-2xs ${
                  rule.isActive ? 'border-[#EAE4D7] bg-white hover:border-[#C59B58]/80' : 'border-[#EAE4D7] bg-[#FAF8F5] opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-[#F0EAE0] pb-2">
                    <span className="font-bold text-sm text-[#1A1612] truncate">{rule.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        rule.isActive
                          ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]'
                          : 'border-[#EAE4D7] bg-[#F3EFE6] text-[#7D715E]'
                      }`}
                    >
                      {rule.isActive ? 'Đang áp dụng' : 'Tạm dừng'}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#7D715E]">Doanh số từ</span>
                      <p className="font-bold text-[#1A1612] mt-0.5">{formatVND(rule.minMonthlyRevenue)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7D715E]">Thưởng cố định</span>
                      <p className="font-bold text-[#B88E4F] mt-0.5">{formatVND(rule.achievementBonus)}</p>
                    </div>
                    <div className="col-span-2 rounded-lg bg-[#FAF8F5] p-2 border border-[#EAE4D7]/60">
                      <span className="text-[10px] text-[#7D715E]">Cách tính thưởng tháng</span>
                      <p className="font-extrabold text-[#B88E4F] text-xs mt-0.5">{Number(rule.achievementBonus) > 0 ? 'Thưởng cố định khi đạt mốc' : `${rule.bonusPercentage}% tổng doanh thu sạch`}</p>
                    </div>
                  </div>
                </div>

                {!isReadOnlyAdmin && (
                  <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-[#F0EAE0] pt-2">
                    <button
                      type="button"
                      onClick={() => handleToggleRuleStatus(rule)}
                      className="rounded-lg p-1 text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#B88E4F]"
                      title={rule.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                    >
                      {rule.isActive ? <ToggleRight className="h-4 w-4 text-[#B88E4F]" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRule(rule);
                        setBonusType(Number(rule.achievementBonus) > 0 ? 'FIXED' : 'PERCENT');
                        setRuleForm({
                          name: rule.name,
                          description: rule.description || '',
                          minMonthlyRevenue: rule.minMonthlyRevenue,
                          achievementBonus: rule.achievementBonus,
                          bonusPercentage: rule.bonusPercentage,
                          isActive: rule.isActive,
                        });
                        setIsModalOpen(true);
                      }}
                      className="rounded-lg p-1 text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#1A1612]"
                      title="Sửa"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingRule(rule)}
                      className="rounded-lg p-1 text-[#7D715E] hover:bg-rose-50 hover:text-rose-600"
                      title="Xóa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* BLOCK 2: KOL TEAM PERFORMANCE & SETTLEMENT TABLE */}
      <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#F0EAE0] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBF5EB] text-[#B88E4F]">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-[#1A1612]">Đối soát đội ngũ KOL</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                    isCurrentMonth
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]'
                  }`}
                >
                  {isCurrentMonth ? '⏳ Đang tích lũy' : '🏁 Kỳ đã kết thúc'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isReadOnlyAdmin && (
              <button
                type="button"
                disabled={isCurrentMonth || batchSettleLoading || (teamProgress?.summary?.eligibleCount || 0) === 0}
                onClick={handleBatchSettle}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#C59B58] px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-[#B88E4F] transition disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" />
                {batchSettleLoading
                  ? 'Đang chốt…'
                  : `Chốt đối soát toàn bộ (${teamProgress?.summary?.eligibleCount || 0})`}
              </button>
            )}
            <button
              type="button"
              onClick={() => loadTeamProgress(storeId, settleYearMonth)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#EAE4D7] text-[#7D715E] hover:bg-[#FAF8F5]"
              title="Làm mới"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Quick Stat Summary Cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3">
            <span className="text-[10px] text-[#7D715E] flex items-center gap-1">
              <Users className="h-3 w-3 text-[#B88E4F]" /> Tổng đối tác
            </span>
            <p className="mt-1 font-black text-sm text-[#1A1612]">
              {teamProgress?.summary?.totalCollaborators || 0} KOL
            </p>
          </div>

          <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3">
            <span className="text-[10px] text-[#7D715E] flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-[#B88E4F]" /> Doanh số hợp lệ
            </span>
            <p className="mt-1 font-black text-sm text-[#1A1612]">
              {formatVND(teamProgress?.summary?.totalRevenue || 0)}
            </p>
          </div>

          <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3">
            <span className="text-[10px] text-[#7D715E] flex items-center gap-1">
              <Award className="h-3 w-3 text-[#B88E4F]" /> Quỹ thưởng ước tính
            </span>
            <p className="mt-1 font-black text-sm text-[#B88E4F]">
              {formatVND(teamProgress?.summary?.totalEstimatedBonus || 0)}
            </p>
          </div>

          <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3">
            <span className="text-[10px] text-[#7D715E] flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Đã chốt sổ
            </span>
            <p className="mt-1 font-black text-sm text-emerald-700">
              {teamProgress?.summary?.settledCount || 0} đối tác
            </p>
          </div>
        </div>

        {/* Team Performance Matrix Table */}
        {teamLoading ? (
          <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-8 text-center text-xs text-[#7D715E]">
            Đang quét dữ liệu doanh số đội ngũ đối tác tháng {selectedMonth}/{selectedYear}…
          </div>
        ) : !teamProgress?.members || teamProgress.members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#EAE4D7] bg-[#FAF8F5] p-8 text-center text-xs text-[#7D715E]">
            Shop chưa có đối tác KOL nào tham gia bán hàng trong kỳ này.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#EAE4D7]">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider text-[#7D715E]">
                <tr>
                  <th className="p-3">KOL Đối tác</th>
                  <th className="p-3 text-center">Đơn hoàn tất</th>
                  <th className="p-3">Doanh số hợp lệ</th>
                  <th className="p-3">Bậc chạm mốc</th>
                  <th className="p-3">Thưởng ước tính</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0]">
                {teamProgress.members.map((m: KolMember) => {
                  const isSelected = m.collaboratorId === selectedKolId;
                  return (
                    <tr
                      key={m.collaboratorId}
                      onClick={() => setSelectedKolId(m.collaboratorId)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-[#FBF5EB] font-medium'
                          : 'hover:bg-[#FAF8F5]/80'
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {m.avatarUrl ? (
                            <img
                              src={m.avatarUrl}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover border border-[#EEDFC6]"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C59B58] text-white font-bold text-xs">
                              {m.fullName?.[0] || 'K'}
                            </span>
                          )}
                          <div>
                            <span className="font-bold text-[#1A1612] block">{m.fullName}</span>
                            <span className="text-[10px] text-[#7D715E]">
                              {m.primaryChannel
                                ? `${m.primaryChannel.platformName} (${(m.primaryChannel.followerCount || 0).toLocaleString('vi-VN')})`
                                : m.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-center font-bold text-[#1A1612]">
                        {m.validOrdersCount || 0}
                      </td>

                      <td className="p-3 font-bold text-[#1A1612]">
                        {formatVND(m.validRevenue)}
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-[#B88E4F]">
                          {m.currentMilestone?.name || 'Chưa đạt'}
                        </span>
                      </td>

                      <td className="p-3 font-black text-sm text-[#B88E4F]">
                        {formatVND(m.estimatedTotalBonus)}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            m.settlement?.status === 'PAID'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : m.settlement
                              ? 'border-blue-200 bg-blue-50 text-blue-800'
                              : isCurrentMonth
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-orange-200 bg-orange-50 text-orange-800'
                          }`}
                        >
                          {m.settlement?.status === 'PAID'
                            ? '✓ Đã chi trả'
                            : m.settlement
                            ? 'Đã chốt sổ'
                            : isCurrentMonth
                            ? '⏳ Đang tích lũy'
                            : 'Chờ chốt'}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedKolId(m.collaboratorId);
                          }}
                          className={`rounded-lg p-1.5 transition ${
                            isSelected
                              ? 'bg-[#C59B58] text-white'
                              : 'text-[#7D715E] hover:bg-[#FAF8F5]'
                          }`}
                          title="Xem chi tiết"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* BLOCK 3: DRILL-DOWN INSPECTOR & SIMULATOR */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* Left: Selected KOL Detailed Calculation (8 cols) */}
        <div className="space-y-3 lg:col-span-8">
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0EAE0] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]">
                  <Award className="h-4 w-4" />
                </span>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#1A1612]">
                  Chi tiết tiến độ: {selectedMember?.fullName || 'Chọn KOL'}
                </h3>
              </div>
            </div>

            {kolProgressLoading ? (
              <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-6 text-center text-xs text-[#7D715E]">
                Đang quét đơn hàng hoàn tất…
              </div>
            ) : kolProgress ? (
              <div className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-gradient-to-br from-[#FBF5EB] to-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEDFC6]/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    {selectedMember?.avatarUrl ? (
                      <img
                        src={selectedMember.avatarUrl}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover border border-[#EEDFC6]"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C59B58] text-white font-bold text-xs">
                        {selectedMember?.fullName?.[0] || 'K'}
                      </span>
                    )}
                    <div>
                      <span className="font-extrabold text-sm text-[#1A1612]">
                        {selectedMember?.fullName}
                      </span>
                      <p className="text-[10px] text-[#7D715E]">
                        Kỳ đối soát: <strong>Tháng {selectedMonth}/{selectedYear}</strong>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                      isCurrentMonth
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-[#EEDFC6] bg-white text-[#B88E4F]'
                    }`}
                  >
                    {isCurrentMonth ? '⏳ Kỳ đang tích lũy (Ước tính)' : '🏁 Kỳ đã kết thúc'}
                  </span>
                </div>

                {/* 4 Metric Boxes */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                  <div className="rounded-xl border border-[#EAE4D7] bg-white p-2.5">
                    <span className="text-[10px] text-[#7D715E]">Doanh số hợp lệ</span>
                    <p className="mt-0.5 font-black text-sm text-[#1A1612]">
                      {formatVND(kolProgress.validRevenue)}
                    </p>
                    <span className="text-[10px] text-[#7D715E]">
                      {kolProgress.validOrdersCount || 0} đơn hoàn tất
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#EAE4D7] bg-white p-2.5">
                    <span className="text-[10px] text-[#7D715E]">Bậc KPI đạt</span>
                    <p className="mt-0.5 font-bold text-sm text-[#B88E4F] truncate">
                      {kolProgress.currentMilestone?.name || 'Chưa đạt mốc'}
                    </p>
                    <span className="text-[10px] text-[#7D715E]">
                      Cố định: {formatVND(kolProgress.achievementBonus)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-2.5 sm:col-span-2">
                    <span className="text-[10px] text-[#7D715E]">Tổng thưởng đối soát</span>
                    <p className="mt-0.5 font-black text-base text-[#B88E4F]">
                      {formatVND(kolProgress.estimatedTotalBonus)}
                    </p>
                    {kolProgress.nextMilestone ? (
                      <span className="text-[10px] text-[#7D715E]">
                        Thiếu {formatVND(kolProgress.nextMilestone.missingRevenue)} để lên bậc {kolProgress.nextMilestone.name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 font-bold">✓ Đã đạt bậc cao nhất</span>
                    )}
                  </div>
                </div>

                {/* Settlement Action Bar */}
                {!isReadOnlyAdmin && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEDFC6]/60 pt-3">
                    <span className="text-[11px] text-[#7D715E]">
                      {kolProgress.settlement
                        ? `Đã chốt sổ trạng thái: ${kolProgress.settlement.status}`
                        : isCurrentMonth
                        ? 'Kỳ đang tích lũy. Chỉ được quyết toán sau khi kết thúc tháng.'
                        : 'Chốt chính thức để lập phiếu chi trả vào ví đối tác.'}
                    </span>

                    <button
                      type="button"
                      disabled={isCurrentMonth || settleLoading || !selectedKolId || Boolean(kolProgress.settlement)}
                      onClick={handleSettleSingle}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#C59B58] px-4 text-xs font-bold text-white shadow-2xs hover:bg-[#B88E4F] transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {settleLoading
                        ? 'Đang chốt…'
                        : kolProgress.settlement
                        ? 'Đã chốt đối soát'
                        : isCurrentMonth
                        ? 'Chờ kết thúc kỳ tháng'
                        : 'Chốt đối soát đối tác này'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#EAE4D7] bg-[#FAF8F5] p-5 text-center text-xs text-[#7D715E]">
                Nhấp vào một đối tác trong bảng trên để xem chi tiết tính thưởng.
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Simulator (4 cols) */}
        <div className="space-y-3 lg:col-span-4">
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-[#F0EAE0] pb-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]">
                <Calculator className="h-4 w-4" />
              </span>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#1A1612]">
                Mô phỏng tính thưởng
              </h3>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#5F5547]">Doanh số giả định (₫)</label>
              <input
                type="number"
                value={simRevenue}
                onChange={(e) => setSimRevenue(e.target.value)}
                placeholder="100.000.000"
                className="h-9 w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3 text-xs font-bold outline-none focus:border-[#C59B58] focus:bg-white"
              />
            </div>

            {simLoading ? (
              <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-center text-xs text-[#7D715E] flex items-center justify-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#B88E4F]" />
                Đang tính toán thưởng...
              </div>
            ) : simResult && (
              <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#7D715E]">Bậc đạt:</span>
                  <span className="font-bold text-[#1A1612]">{simResult.highestReachedRule?.name || 'Chưa đạt'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7D715E]">Thưởng cố định:</span>
                  <span className="font-bold text-[#B88E4F]">{formatVND(simResult.achievementBonus)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#EEDFC6] pt-1.5">
                  <span className="font-bold text-[#1A1612]">Tổng thưởng:</span>
                  <span className="font-black text-sm text-[#B88E4F]">{formatVND(simResult.totalBonus)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BLOCK 4: SETTLEMENT HISTORY TABLE */}
      <section className="commission-history space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#B88E4F]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7D715E]">
              Lịch sử đối soát tháng {selectedMonth}/{selectedYear} ({historyList.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => loadHistory(storeId, settleYearMonth)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B88E4F] hover:underline"
          >
            <RefreshCw className="h-3 w-3" /> Tải lại
          </button>
        </div>

        {historyLoading ? (
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-6 text-center text-xs text-[#7D715E]">
            Đang tải lịch sử đối soát…
          </div>
        ) : historyList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EAE4D7] bg-white p-6 text-center text-xs text-[#7D715E]">
            Chưa có lượt chốt đối soát nào cho kỳ tháng {selectedMonth}/{selectedYear}.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#EAE4D7] bg-white shadow-2xs">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider text-[#7D715E]">
                <tr>
                  <th className="p-3">KOL đối tác</th>
                  <th className="p-3">Kỳ đối soát</th>
                  <th className="p-3">Doanh số ghi nhận</th>
                  <th className="p-3">Bậc áp dụng</th>
                  <th className="p-3">Tiền thưởng</th>
                  <th className="p-3">Trạng thái</th>
                  {!isReadOnlyAdmin && <th className="p-3 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0]">
                {historyList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF8F5]/80 transition">
                    <td className="p-3 font-bold text-[#1A1612]">
                      {item.collaboratorName || item.collaboratorEmail || item.collaboratorId.slice(0, 8)}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-[#7D715E]">{item.yearMonth}</td>
                    <td className="p-3 font-bold">{formatVND(item.validRevenue)}</td>
                    <td className="p-3 text-[#7D715E]">{item.appliedRuleName || 'Chưa đạt mốc'}</td>
                    <td className="p-3 font-black text-[#B88E4F]">{formatVND(item.bonusAmount)}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          item.status === 'PAID'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : item.status === 'APPROVED'
                            ? 'border-blue-200 bg-blue-50 text-blue-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {item.status === 'PAID' ? 'Đã chi trả' : item.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    </td>
                    {!isReadOnlyAdmin && (
                      <td className="p-3 text-right">
                        {item.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(item.id)}
                            className="rounded-lg bg-[#C59B58] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#B88E4F]"
                          >
                            Duyệt
                          </button>
                        )}
                        {item.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => handlePayout(item.id)}
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                          >
                            Chi trả vào ví
                          </button>
                        )}
                        {item.status === 'PAID' && <span className="text-[11px] text-emerald-700 font-bold">Hoàn tất</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CREATE / EDIT RULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#EAE4D7] bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0EAE0] pb-3">
              <h3 className="font-extrabold text-sm text-[#1A1612]">
                {editingRule ? 'Chỉnh sửa bậc thưởng' : 'Thêm bậc thưởng mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-[#7D715E] hover:bg-[#FAF8F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3 text-xs">
              <label className="grid gap-1 font-bold text-[#5F5547]">
                Tên bậc *
                <input
                  required
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="Ví dụ: Bạc, Vàng, Kim Cương"
                  className="h-9 rounded-xl border border-[#EAE4D7] px-3 font-normal outline-none focus:border-[#C59B58]"
                />
              </label>

              <label className="grid gap-1 font-bold text-[#5F5547]">
                <div className="flex items-center justify-between">
                  <span>Doanh số tối thiểu (₫) *</span>
                  {ruleForm.minMonthlyRevenue && Number(ruleForm.minMonthlyRevenue) > 0 && (
                    <span className="text-[11px] font-bold font-mono text-[#B88E4F]">
                      {Number(ruleForm.minMonthlyRevenue).toLocaleString('vi-VN')} ₫
                    </span>
                  )}
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  value={ruleForm.minMonthlyRevenue}
                  onChange={(e) => setRuleForm({ ...ruleForm, minMonthlyRevenue: e.target.value })}
                  placeholder="Ví dụ: 50000000"
                  className="h-9 rounded-xl border border-[#EAE4D7] px-3 font-normal font-mono outline-none focus:border-[#C59B58]"
                />
              </label>

              <label className="grid gap-1 font-bold text-[#5F5547]">Cách thưởng khi đạt mốc
                <select value={bonusType} onChange={event => setBonusType(event.target.value as 'FIXED' | 'PERCENT')} className="h-9 rounded-xl border border-[#EAE4D7] px-3">
                  <option value="FIXED">Số tiền cố định</option><option value="PERCENT">Phần trăm tổng doanh thu sạch</option>
                </select>
                <span className="font-normal text-[#7D715E]">Lấy mốc cao nhất. Thay đổi chính sách áp dụng từ kỳ sau.</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 font-bold text-[#5F5547]">
                  <div className="flex items-center justify-between">
                    <span>Thưởng cố định (₫)</span>
                    {ruleForm.achievementBonus && Number(ruleForm.achievementBonus) > 0 && (
                      <span className="text-[10px] font-bold font-mono text-[#B88E4F]">
                        {Number(ruleForm.achievementBonus).toLocaleString('vi-VN')} ₫
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={ruleForm.achievementBonus}
                    disabled={bonusType !== 'FIXED'}
                    onChange={(e) => setRuleForm({ ...ruleForm, achievementBonus: e.target.value })}
                    placeholder="2000000"
                    className="h-9 rounded-xl border border-[#EAE4D7] px-3 font-normal font-mono outline-none focus:border-[#C59B58]"
                  />
                </label>

                <label className="grid gap-1 font-bold text-[#5F5547]">
                  Thưởng trên tổng doanh thu sạch (%)
                  <input
                    required={bonusType === 'PERCENT'}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={ruleForm.bonusPercentage}
                    disabled={bonusType !== 'PERCENT'}
                    onChange={(e) => setRuleForm({ ...ruleForm, bonusPercentage: e.target.value })}
                    placeholder="1.5%"
                    className="h-9 rounded-xl border border-[#EAE4D7] px-3 font-normal outline-none focus:border-[#C59B58]"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#F0EAE0] pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 rounded-xl border border-[#EAE4D7] px-3.5 font-bold text-[#7D715E] hover:bg-[#FAF8F5]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-xl bg-[#C59B58] px-4 font-bold text-white hover:bg-[#B88E4F]"
                >
                  {editingRule ? 'Cập nhật' : 'Tạo bậc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-[#EAE4D7] bg-white p-5 shadow-xl space-y-3 text-xs">
            <h3 className="font-extrabold text-sm text-[#1A1612]">Xác nhận xóa bậc thưởng?</h3>
            <p className="text-[#7D715E]">
              Bạn sắp xóa bậc <strong>{deletingRule.name}</strong>. Dữ liệu lịch sử đã chốt trước đây vẫn được bảo toàn.
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-[#F0EAE0] pt-3">
              <button
                type="button"
                onClick={() => setDeletingRule(null)}
                className="h-8 rounded-xl border border-[#EAE4D7] px-3 font-bold text-[#7D715E]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteRule}
                className="h-8 rounded-xl bg-rose-600 px-3.5 font-bold text-white hover:bg-rose-700"
              >
                Xóa bậc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { BottomSheet } from "../../components/BottomSheet";
import { Avatar, Icon, IconButton } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { useOperation } from "../../hooks/useOperation";
import { validateInput } from "../../utils/validate-input";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  Screen,
  Title,
} from "../../components/ui";
import { money, statusText } from "../../types/contracts";
import {
  DetailLine,
  QueryState,
  amount,
  confirmAction,
  required,
  useActor,
  useCommand,
  useResource,
} from "../common/shared";
const Rule = z.object({
  id: z.string(),
  name: z.string(),
  minMonthlyRevenue: amount,
  achievementBonus: amount,
  bonusPercentage: amount,
  isActive: z.boolean(),
});
const History = z.array(
  z.object({
    id: z.string(),
    yearMonth: z.string(),
    status: z.string(),
    bonusAmount: amount,
    collaboratorName: z.string().nullish(),
    collaborator: z.object({ fullName: z.string() }).optional(),
  }),
);
const Progress = z.object({
  storeName: z.string(),
  yearMonth: z.string(),
  validRevenue: amount,
  validOrdersCount: z.number(),
  estimatedTotalBonus: amount,
  settlementStatus: z.string(),
  nextMilestone: z
    .object({ name: z.string(), missingRevenue: amount })
    .nullish(),
});
const RuleInput = z.object({
  name: required.max(150),
  minMonthlyRevenue: z.string().regex(/^[1-9]\d*$/),
  achievementBonus: z.string().regex(/^(?:0|[1-9]\d*)$/),
  bonusPercentage: z
    .string()
    .regex(/^(?:\d{1,2}(?:\.\d{1,2})?|100(?:\.0{1,2})?)$/),
});
export function BonusesScreen() {
  const { user, store } = useActor(),
    koc = user.role === "COLLABORATOR",
    command = useCommand();
  const [chosenStore, setChosenStore] = useState(""),
    [month, setMonth] = useState(
      new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 7),
    );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<z.infer<typeof Rule> | undefined>();
  const [monthOpen, setMonthOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [historyScope, setHistoryScope] = useState<"all" | "month">("all");
  const id = koc ? chosenStore : store?.id;
  const stores = useResource(
    "bonus-stores",
    "/collaborator/stores",
    z.array(z.object({ id: z.string(), name: z.string(), logoUrl: z.string().nullish() })),
    koc,
  );
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month),
    base = `/stores/${id}/commission-rules`;
  const rules = useResource("bonus-rules", base, z.array(Rule), Boolean(id));
  const progress = useResource(
    "bonus-progress",
    `/collaborator/stores/${id}/bonus-progress?yearMonth=${month}`,
    Progress,
    koc && Boolean(id) && validMonth,
  );
  const history = useResource(
    "bonus-history",
    `${koc ? "/collaborator/bonus-history" : `${base}/history`}${koc && id ? `?storeId=${id}` : ""}`,
    History,
    Boolean(id) && validMonth,
  );
  const historyRows = (history.data || []).filter(item => historyScope === "all" || item.yearMonth === month);
  const edit = (rule?: z.infer<typeof Rule>) => { setEditingRule(rule); setEditorOpen(true); };
  return (
    <Screen scroll>
      {koc && (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Chọn gian hàng xem thưởng tháng" onPress={() => { setStoreSearch(""); setStoreOpen(true); }} style={bs.period}>
            <Avatar uri={stores.data?.find(item => item.id === chosenStore)?.logoUrl} name={stores.data?.find(item => item.id === chosenStore)?.name || "Gian hàng"} size={38} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Text style={bs.tiny}>Thưởng tháng tại</Text><Text numberOfLines={2} style={bs.name}>{stores.data?.find(item => item.id === chosenStore)?.name || "Chọn gian hàng"}</Text></View>
            <Icon name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
          {storeOpen && <BottomSheet title="Chọn gian hàng" close={() => setStoreOpen(false)}>
            <View style={bs.search}><Icon name="search" size={18} color={colors.muted} /><TextInput accessibilityLabel="Tìm gian hàng" placeholder="Tìm tên gian hàng…" placeholderTextColor={colors.muted} value={storeSearch} onChangeText={setStoreSearch} autoCorrect={false} style={bs.searchInput} />{!!storeSearch && <IconButton name="x" label="Xóa tìm kiếm" onPress={() => setStoreSearch("")} />}</View>
            <QueryState loading={stores.isLoading} error={stores.error} retry={() => void stores.refetch()} />
            {(stores.data || []).filter(item => item.name.toLocaleLowerCase("vi").includes(storeSearch.trim().toLocaleLowerCase("vi"))).map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: chosenStore === item.id }} onPress={() => { setChosenStore(item.id); setStoreOpen(false); }} style={[bs.storeRow, chosenStore === item.id && bs.storeSelected]}><Avatar uri={item.logoUrl} name={item.name} size={40} /><Text style={[bs.name, { flex: 1 }]}>{item.name}</Text><Icon name={chosenStore === item.id ? "check-circle" : "circle"} size={19} color={chosenStore === item.id ? colors.strong : colors.line} /></Pressable>)}
            {!stores.isLoading && !stores.error && !(stores.data || []).some(item => item.name.toLocaleLowerCase("vi").includes(storeSearch.trim().toLocaleLowerCase("vi"))) && <View style={bs.empty}><Icon name="shopping-bag" size={24} color={colors.strong} /><Text style={[bs.tiny, { marginTop: 8 }]}>{storeSearch.trim() ? "Không tìm thấy gian hàng phù hợp" : "Chưa có gian hàng để xem thưởng"}</Text></View>}
          </BottomSheet>}
        </>
      )}
      <View style={bs.toolbar}><Pressable accessibilityRole="button" accessibilityLabel="Chọn kỳ tháng" onPress={() => setMonthOpen(true)} style={bs.period}><Icon name="calendar" size={19} color={colors.strong} /><View style={{ flex: 1 }}><Text style={bs.tiny}>Kỳ đối soát</Text><Text numberOfLines={1} style={bs.name}>{month.slice(5)}/{month.slice(0, 4)}</Text></View><Icon name="chevron-down" size={17} color={colors.muted} /></Pressable>{!koc && id && <Pressable accessibilityRole="button" onPress={() => edit()} style={bs.add}><Icon name="plus" size={19} color={colors.strong} /><Text style={bs.name}>Thêm mốc</Text></Pressable>}</View>
      <QueryState
        loading={rules.isLoading || progress.isLoading || history.isLoading}
        error={rules.error || progress.error || history.error || stores.error}
        retry={() => {
          if (id) {
            void rules.refetch();
            if (validMonth) {
              void history.refetch();
              if (koc) void progress.refetch();
            }
          }
        }}
      />
      <ErrorNotice error={command.error} />
      {progress.data && (
        <Card>
          <Title>{progress.data.storeName}</Title>
          <DetailLine
            label="Doanh số hợp lệ"
            value={money(progress.data.validRevenue)}
          />
          <DetailLine
            label="Đơn hợp lệ"
            value={progress.data.validOrdersCount}
          />
          <DetailLine
            label="Thưởng dự kiến"
            value={money(progress.data.estimatedTotalBonus)}
          />
          <Badge>{statusText(progress.data.settlementStatus)}</Badge>
          {progress.data.nextMilestone && (
            <Caption>
              Còn {money(progress.data.nextMilestone.missingRevenue)} để đạt{" "}
              {progress.data.nextMilestone.name}.
            </Caption>
          )}
        </Card>
      )}
      {rules.data?.map((rule) => (
        <View key={rule.id} style={bs.card}>
          <View style={bs.inline}><View style={bs.icon}><Icon name="award" size={20} color={colors.strong} /></View><Text style={[bs.name, { flex: 1 }]}>{rule.name}</Text></View>
          <View style={bs.inline}><Icon name={rule.isActive ? "check-circle" : "pause-circle"} size={13} color={colors.strong} /><Text style={bs.tiny}>{rule.isActive ? "Đang áp dụng" : "Tạm ngừng"}</Text></View>
          <View style={bs.values}><View style={bs.valueCell}><Text style={bs.tiny}>Doanh số từ</Text><Text style={bs.value}>{money(rule.minMonthlyRevenue)}</Text></View><View style={bs.valueCell}><Text style={bs.tiny}>{Number(rule.achievementBonus) > 0 ? "Thưởng cố định" : "Thưởng theo doanh số"}</Text><Text style={[bs.value, { color: colors.strong }]}>{Number(rule.achievementBonus) > 0 ? money(rule.achievementBonus) : `${Number(rule.bonusPercentage)}%`}</Text></View></View>
          {!koc && (
            <View style={bs.inline}>
              <View style={{ flex: 1 }}>
              <Button
                title="Chỉnh sửa"
                secondary
                onPress={() => edit(rule)}
              /></View><View style={{ flex: 1 }}>
              <Button
                title={rule.isActive ? "Tạm ngừng" : "Kích hoạt"}
                secondary
                loading={command.busy}
                onPress={() =>
                  void command.execute(`${base}/${rule.id}/status`, "PATCH", {
                    isActive: !rule.isActive,
                  })
                }
              /></View>
            </View>
          )}
        </View>
      ))}
      {!koc && id && validMonth && (
        <Button
          title="Chốt đối soát kỳ tháng"
          soft
          loading={command.busy}
          onPress={() =>
            confirmAction(
              "Chốt thưởng kỳ tháng?",
              `Kỳ ${month}. Backend kiểm tra kỳ hợp lệ và chống chốt trùng.`,
              () =>
                void command.execute(`${base}/settle-all`, "POST", {
                  yearMonth: month,
                }),
            )
          }
        />
      )}
      <View style={bs.inline}><Icon name="clock" size={17} color={colors.strong} /><Text style={[bs.name, { flex: 1 }]}>Lịch sử thưởng</Text><Text style={bs.tiny}>{history.data ? historyRows.length : "—"} khoản · {historyScope === "all" ? "Mọi kỳ" : month}</Text></View>
      <View style={bs.inline}>{([{ value: "all", label: "Tất cả kỳ" }, { value: "month", label: `Tháng ${Number(month.slice(5))}/${month.slice(0, 4)}` }] as const).map(option => <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected: historyScope === option.value }} onPress={() => setHistoryScope(option.value)} style={[bs.historyTab, historyScope === option.value && bs.monthActive]}><Text style={bs.name}>{option.label}</Text></Pressable>)}</View>
      {!history.isLoading && !history.error && historyRows.length === 0 && <View style={[bs.empty, { gap: 9 }]}><Text style={bs.tiny}>{historyScope === "month" ? `Chưa chốt thưởng tháng ${Number(month.slice(5))}/${month.slice(0, 4)}.` : "Chưa có kỳ thưởng đã chốt."}</Text>{historyScope === "month" && !!history.data?.length && <Button title={`Xem ${history.data.length} khoản ở kỳ khác`} soft onPress={() => setHistoryScope("all")} />}</View>}
      {historyRows.map((item) => (
        <Card key={item.id}>
          <Caption>
            {item.collaboratorName || item.collaborator?.fullName} ·{" "}
            {item.yearMonth}
          </Caption>
          <Title>{money(item.bonusAmount)}</Title>
          <Badge>{statusText(item.status)}</Badge>
          {!koc && item.status === "PENDING" && (
            <Button
              title="Duyệt kỳ thưởng"
              secondary
              loading={command.busy}
              onPress={() =>
                void command.execute(`${base}/settlements/${item.id}/approve`)
              }
            />
          )}
          {!koc && item.status === "APPROVED" && (
            <Button
              title="Chi thưởng vào ví KOL"
              soft
              loading={command.busy}
              onPress={() =>
                confirmAction(
                  "Chi thưởng vào ví?",
                  money(item.bonusAmount),
                  () =>
                    void command.execute(
                      `${base}/settlements/${item.id}/payout`,
                      "POST",
                    ),
                )
              }
            />
          )}
        </Card>
      ))}
      {editorOpen && <RuleEditor rule={editingRule} base={base} close={() => setEditorOpen(false)} />}
      {monthOpen && <MonthPicker value={month} close={() => setMonthOpen(false)} select={value => { setMonth(value); setHistoryScope("month"); }} />}
    </Screen>
  );
}

function MonthPicker({ value, close, select }: { value: string; close(): void; select(value: string): void }) {
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  return <BottomSheet title="Chọn kỳ tháng" close={close}>
    <View style={[bs.inline, { justifyContent: "space-between" }]}><IconButton name="chevron-left" label="Năm trước" disabled={year <= 2000} onPress={() => setYear(y => y - 1)} /><Text style={bs.value}>{year}</Text><IconButton name="chevron-right" label="Năm sau" disabled={year >= 2100} onPress={() => setYear(y => y + 1)} /></View>
    <View style={bs.monthGrid}>{Array.from({ length: 12 }, (_, i) => { const key = `${year}-${String(i + 1).padStart(2, "0")}`; return <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: value === key }} onPress={() => { select(key); close(); }} style={[bs.month, value === key && bs.monthActive]}><Text style={[bs.name, value === key && { color: colors.strong }]}>Tháng {i + 1}</Text></Pressable>; })}</View>
  </BottomSheet>;
}

function RuleEditor({ rule, base, close }: { rule?: z.infer<typeof Rule>; base: string; close(): void }) {
  const [values, setValues] = useState({ name: rule?.name || "", minMonthlyRevenue: rule ? String(rule.minMonthlyRevenue).replace(/\.0+$/, "") : "", achievementBonus: String(rule?.achievementBonus || "0").replace(/\.0+$/, ""), bonusPercentage: String(rule?.bonusPercentage || "0") });
  const command = useCommand(), validation = useOperation();
  const change = (key: keyof typeof values, value: string) => setValues(old => ({ ...old, [key]: value }));
  const busy = command.busy || validation.busy;
  return <BottomSheet title={rule ? "Sửa mốc thưởng" : "Thêm mốc thưởng"} close={() => { if (!busy) close(); }}>
    <View style={bs.inline}><View style={bs.icon}><Icon name="award" size={20} color={colors.strong} /></View><Text style={[bs.tiny, { flex: 1 }]}>Thưởng theo mốc doanh số sạch của KOL.</Text></View>
    <Field label="Tên mốc *" placeholder="VD: Mốc doanh số 50 triệu" value={values.name} onChangeText={text => change("name", text)} editable={!busy} style={bs.input} />
    <Field label="Doanh số tối thiểu (đ) *" placeholder="50000000" keyboardType="number-pad" value={values.minMonthlyRevenue} onChangeText={text => change("minMonthlyRevenue", text)} editable={!busy} style={bs.input} />
    <View style={bs.inline}><View style={{ flex: 1 }}><Field label="Thưởng cố định (đ)" keyboardType="number-pad" value={values.achievementBonus} onChangeText={text => change("achievementBonus", text)} editable={!busy} style={bs.input} /></View><View style={{ flex: 1 }}><Field label="Tỷ lệ thưởng (%)" keyboardType="decimal-pad" value={values.bonusPercentage} onChangeText={text => change("bonusPercentage", text)} editable={!busy} style={bs.input} /></View></View>
    <View style={bs.preview}><Text style={bs.tiny}>Cách tính khi đạt mốc</Text><Text style={bs.name}>{Number(values.achievementBonus) > 0 ? `Thưởng cố định ${money(values.achievementBonus)}` : `${values.bonusPercentage || 0}% doanh số sạch`}</Text><Text style={bs.tiny}>Thưởng cố định được ưu tiên nếu lớn hơn 0.</Text></View>
    <ErrorNotice error={validation.error || command.error} />
    <View style={[bs.inline, { paddingTop: 8, borderTopWidth: 1, borderColor: colors.line }]}><View style={{ flex: 1 }}><Button title="Hủy" secondary disabled={busy} onPress={close} /></View><View style={{ flex: 2 }}><Button title={rule ? "Lưu thay đổi" : "Thêm mốc thưởng"} soft loading={busy} onPress={() => void validation.run(async () => { const input = validateInput(RuleInput, values); await command.execute(rule ? `${base}/${rule.id}` : base, rule ? "PATCH" : "POST", input, close); })} /></View></View>
  </BottomSheet>;
}

const bs = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, minHeight: 46, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 13, color: colors.ink },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 68, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  storeSelected: { borderColor: colors.strong, backgroundColor: colors.soft },
  toolbar: { flexDirection: "row", gap: 10 }, period: { flex: 1, minWidth: 0, minHeight: 66, flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, backgroundColor: colors.white },
  add: { flex: 1, minWidth: 0, minHeight: 66, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.brandBorder },
  historyTab: { flex: 1, minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 11, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, gap: 12 }, inline: { flexDirection: "row", alignItems: "center", gap: 9 },
  icon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }, name: { fontSize: 13, lineHeight: 19, fontWeight: "600", color: colors.ink }, tiny: { fontSize: 11, lineHeight: 16, color: colors.muted },
  values: { flexDirection: "row", gap: 10, backgroundColor: colors.canvas, borderRadius: 11, padding: 11 }, valueCell: { flex: 1, gap: 5 }, value: { fontSize: 17, fontWeight: "700", color: colors.ink },
  empty: { padding: 16, alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, month: { width: "31%", flexGrow: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }, monthActive: { borderColor: colors.strong, backgroundColor: colors.soft },
  input: { minHeight: 46, fontSize: 14, paddingVertical: 10, backgroundColor: colors.white }, preview: { gap: 5, padding: 12, borderRadius: 11, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.brandBorder },
});

import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { BottomSheet } from "./BottomSheet";
import { Icon } from "./commerce";
import { ErrorNotice, Field, Loading } from "./ui";
import { bankMatches, bankStoredName, loadBankCatalog } from "../services/bank-catalog";
import { colors as c } from "../theme/tokens";
export function BankSelect({ value, onChange, disabled = false }: { value: string; onChange(value: string): void; disabled?: boolean }) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState("");
  const banks = useQuery({ queryKey: ["public", "vietqr-banks"], queryFn: ({ signal }) => loadBankCatalog(signal), staleTime: 86400000, enabled: open, retry: 1 });
  const selected = banks.data?.find(bank => bankStoredName(bank) === value || bank.name === value || value.toLowerCase().startsWith(bank.shortName.toLowerCase() + " ("));
  return <>
    <View style={{ gap: 7 }}><Text style={{ fontSize: 14, fontWeight: "600", color: c.ink }}>Ngân hàng *</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ngân hàng: ${selected?.shortName || value || "Chưa chọn"}`} disabled={disabled} onPress={() => { setSearch(""); setOpen(true); }} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12, minHeight: 54, backgroundColor: c.white, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon name="credit-card" color={c.strong} size={18} /><View style={{ flex: 1 }}><Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 20, color: c.ink }}>{selected?.shortName || value || "Chọn ngân hàng"}</Text>{selected && <Text style={{ fontSize: 11, color: c.muted }}>BIN {selected.bin}</Text>}</View><Icon name="chevron-down" size={17} color={c.muted} />
      </Pressable>
    </View>
    {open && <BottomSheet title="Chọn ngân hàng" close={() => setOpen(false)}>
      <Field label="Tìm ngân hàng" value={search} onChangeText={setSearch} placeholder="Tên ngân hàng, tên viết tắt hoặc BIN…" autoCorrect={false} />
      {banks.isLoading && <Loading />}<ErrorNotice error={banks.error} retry={() => void banks.refetch()} />
      {banks.data?.filter(bank => bankMatches(bank, search)).map(bank => <Pressable key={bank.id} accessibilityRole="radio" accessibilityState={{ checked: selected?.id === bank.id }} onPress={() => { onChange(bankStoredName(bank)); setOpen(false); }} style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.line, flexDirection: "row", alignItems: "center", gap: 10 }}>
        {bank.logo.startsWith("https://") ? <Image source={{ uri: bank.logo }} style={{ width: 44, height: 32 }} resizeMode="contain" /> : <Icon name="credit-card" color={c.strong} />}
        <View style={{ flex: 1, gap: 3 }}><Text style={{ fontSize: 14, fontWeight: "700", color: c.ink }}>{bank.shortName}</Text><Text style={{ fontSize: 11, lineHeight: 16, color: c.muted }}>{bank.name}</Text><Text style={{ fontSize: 10, color: c.muted }}>BIN {bank.bin}</Text></View>
        <Icon name={selected?.id === bank.id ? "check-circle" : "circle"} size={18} color={c.strong} />
      </Pressable>)}
      {banks.data && !banks.data.some(bank => bankMatches(bank, search)) && <Text style={{ color: c.muted }}>Không tìm thấy ngân hàng phù hợp.</Text>}
    </BottomSheet>}
  </>;
}

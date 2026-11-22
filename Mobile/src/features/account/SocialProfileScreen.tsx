import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { z } from "zod";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { BottomSheet } from "../../components/BottomSheet";
import { Icon, IconButton } from "../../components/commerce";
import { useOperation } from "../../hooks/useOperation";
import { Button, ErrorNotice, Field, Screen } from "../../components/ui";
import { colors as c } from "../../theme/tokens";
import { money } from "../../types/contracts";
import { QueryState, confirmAction, useCommand, useResource } from "../common/shared";
import { validateInput } from "../../utils/validate-input";
import { channelUrlExamples, evaluationDate, tierEmblem } from "./social-presentation";
import { profileStyles as s } from "./profile-styles";
const platforms = ["TIKTOK", "YOUTUBE", "FACEBOOK", "INSTAGRAM", "SHOPEE_VIDEO", "LEMON8", "OTHER"] as const;
const names: Record<string, string> = { TIKTOK: "TikTok", YOUTUBE: "YouTube", FACEBOOK: "Facebook", INSTAGRAM: "Instagram", SHOPEE_VIDEO: "Shopee Video", LEMON8: "Lemon8", OTHER: "Khác" };
const ChannelInput = z.object({ platformName: z.enum(platforms), channelName: z.string().trim().min(1, "Nhập tên kênh.").max(150), channelUrl: z.string().url("Nhập đường dẫn kênh hợp lệ.").startsWith("https://", "Đường dẫn cần bắt đầu bằng https://"), followerCount: z.coerce.number().int().nonnegative().max(2147483647) });
export function SocialProfileScreen() {
  const channels = useResource("social", "/social-channels", z.array(z.object({ id: z.string(), platformName: z.string(), channelName: z.string().nullish(), channelUrl: z.string(), followerCount: z.number(), isPrimary: z.boolean() })));
  const tier = useResource("social-tier-detail", "/tiers/my-status", z.object({ currentTier: z.object({ name: z.string(), extraBonusPercentage: z.number() }), nextTier: z.object({ name: z.string() }).nullish(), currentRevenue: z.number(), progressPercentage: z.number(), revenueNeeded: z.number(), nextEvaluationAt: z.string() }));
  const command = useCommand(), [edit, setEdit] = useState(false);
  const [channelMenu, setChannelMenu] = useState<string | null>(null);
  const link = useOperation();
  const emblem = tierEmblem(tier.data?.currentTier.name || "");
  const selectedChannel = channels.data?.find(item => item.id === channelMenu);
  const [platformName, setPlatform] = useState<typeof platforms[number]>("TIKTOK"), [channelName, setName] = useState(""), [channelUrl, setUrl] = useState(""), [followers, setFollowers] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { name: string; url: string; followers: string }>>({});
  const choosePlatform = (next: typeof platforms[number]) => {
    if (next === platformName) return;
    setDrafts(old => ({ ...old, [platformName]: { name: channelName, url: channelUrl, followers } }));
    const draft = drafts[next];
    setPlatform(next); setName(draft?.name || ""); setUrl(draft?.url || ""); setFollowers(draft?.followers || "");
  };
  return <Screen scroll>
    <QueryState loading={tier.isLoading} error={tier.error} retry={() => void tier.refetch()} />
    {tier.data && <View style={[s.card, { padding: 16, backgroundColor: c.white, borderColor: c.brandBorder, gap: 15 }]}>
      <View style={[s.row, { alignItems: "flex-start" }]}><View style={{ flex: 1, minWidth: 0, gap: 6 }}><Text style={[s.note, { fontSize: 10, letterSpacing: 1.3, color: c.strong, fontWeight: "700" }]}>ĐỐI TÁC SCANMS</Text><Text style={[s.title, { fontSize: 27, lineHeight: 34 }]}>Hạng {tier.data.currentTier.name}</Text><Text style={[s.note, { color: c.strong, fontWeight: "600", fontSize: 11 }]}>+{tier.data.currentTier.extraBonusPercentage}% hoa hồng cấp bậc</Text></View><View style={{ width: 64, height: 64, borderWidth: 1, borderColor: c.line, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: emblem.background }}><FontAwesome6 name={emblem.icon} iconStyle="solid" size={32} color={emblem.color} /></View></View>
      <View style={{ gap: 4 }}><Text style={[s.note, { fontSize: 11 }]}>Doanh số kỳ đánh giá</Text><Text style={[s.title, { fontSize: 25, lineHeight: 32, fontVariant: ["tabular-nums"] }]}>{money(tier.data.currentRevenue)}</Text></View>
      <View style={{ gap: 10, padding: 12, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 13 }}>
        <View style={s.row}><Text style={[s.label, { fontSize: 12, flex: 1 }]}>{tier.data.nextTier ? `Tiến tới ${tier.data.nextTier.name}` : "Hạng cao nhất"}</Text><Text style={[s.label, { color: c.strong, fontSize: 12 }]}>{Math.round(Math.max(0, Math.min(100, tier.data.progressPercentage)))}%</Text></View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.max(0, Math.min(100, tier.data.progressPercentage)) }} style={{ height: 6, backgroundColor: c.sand, borderRadius: 3, overflow: "hidden" }}><View style={{ height: 6, backgroundColor: "#D8B77F", borderRadius: 3, width: `${Math.max(0, Math.min(100, tier.data.progressPercentage))}%` }} /></View>
        <Text style={[s.note, { fontSize: 11 }]}>{tier.data.revenueNeeded > 0 ? `Còn ${money(tier.data.revenueNeeded)} để lên hạng` : "Đã đạt ngưỡng cấp bậc cao nhất"}</Text>
      </View>
      <View style={[s.row, { flexWrap: "wrap", gap: 5 }]}><View style={[s.inline, { gap: 5 }]}><Icon name="calendar" size={13} color={c.muted} /><Text style={[s.note, { fontSize: 10 }]}>Xét tiếp theo</Text></View><Text style={[s.note, { fontSize: 10 }]}>{evaluationDate(tier.data.nextEvaluationAt)}</Text></View>
    </View>}
    <View style={s.row}><Text style={s.title}>Kênh của bạn</Text><Pressable accessibilityRole="button" onPress={() => setEdit(true)} style={[s.inline, { minHeight: 44 }]}><Icon name="plus" size={17} color={c.strong} /><Text style={s.label}>Thêm kênh</Text></Pressable></View>
    <QueryState loading={channels.isLoading} error={channels.error} retry={() => void channels.refetch()} />
    <ErrorNotice error={command.error} />
    <ErrorNotice error={link.error} />
    {channels.data?.length === 0 && <View style={s.card}><Text style={s.title}>Chưa liên kết kênh</Text><Text style={s.note}>Thêm kênh sáng tạo để sử dụng khi hợp tác và đăng video review.</Text></View>}
    {channels.data?.map(item => <View key={item.id} style={[s.card, { padding: 14, gap: 16 }]}>
      <View style={[s.row, { alignItems: "flex-start", gap: 8 }]}><View style={[s.icon, { width: 44, height: 44, borderRadius: 14 }]}>{item.platformName === "TIKTOK" ? <FontAwesome6 name="tiktok" iconStyle="brands" size={24} color={c.ink} /> : <Icon name={item.platformName === "YOUTUBE" ? "youtube" : item.platformName === "INSTAGRAM" ? "instagram" : item.platformName === "FACEBOOK" ? "facebook" : "globe"} color={c.strong} />}</View><View style={{ flex: 1, minWidth: 0, gap: 5 }}><Text numberOfLines={2} style={[s.title, { fontSize: 15, lineHeight: 20 }]}>{item.channelName || names[item.platformName] || item.platformName}</Text><View style={[s.inline, { flexWrap: "wrap", gap: 6 }]}><Text style={[s.note, { fontSize: 11 }]}>{names[item.platformName] || item.platformName}</Text>{item.isPrimary && <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}><Icon name="check-circle" size={11} color={c.strong} /><Text style={[s.note, { fontSize: 10, color: c.strong }]}>Kênh chính</Text></View>}</View></View><IconButton name="more-horizontal" label={`Tùy chọn kênh ${item.channelName || item.platformName}`} onPress={() => setChannelMenu(item.id)} disabled={command.busy} /></View>
      <View style={[s.row, { flexWrap: "wrap", gap: 10 }]}><View style={{ flexGrow: 1, gap: 2 }}><Text style={[s.title, { fontSize: 23, lineHeight: 28, fontVariant: ["tabular-nums"] }]}>{item.followerCount.toLocaleString("vi-VN")}</Text><Text style={[s.note, { fontSize: 11 }]}>người theo dõi</Text></View><Pressable accessibilityRole="link" accessibilityLabel={`Mở kênh ${item.channelName || item.platformName}`} disabled={link.busy} onPress={() => void link.run(async () => { if (!item.channelUrl.startsWith("https://")) throw new Error("Đường dẫn kênh chưa hợp lệ."); await Linking.openURL(item.channelUrl); })} style={[s.inline, { gap: 6, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: c.brandBorder, borderRadius: 11, backgroundColor: c.white }]}><Text style={[s.label, { fontSize: 12, color: c.strong }]}>{item.platformName === "OTHER" ? "Mở kênh" : `Mở ${names[item.platformName] || "kênh"}`}</Text><Icon name="external-link" size={14} color={c.strong} /></Pressable></View>
    </View>)}
    {selectedChannel && <BottomSheet title="Tùy chọn kênh" close={() => setChannelMenu(null)}><Text style={s.title}>{selectedChannel.channelName || names[selectedChannel.platformName] || selectedChannel.platformName}</Text><Text selectable style={s.note}>{selectedChannel.channelUrl}</Text>{!selectedChannel.isPrimary && <Button title="Đặt làm kênh chính" soft disabled={command.busy} onPress={() => { setChannelMenu(null); void command.execute(`/social-channels/${selectedChannel.id}/primary`); }} />}<Button title="Gỡ liên kết" secondary disabled={command.busy} onPress={() => { setChannelMenu(null); confirmAction("Gỡ liên kết kênh?", selectedChannel.channelName || selectedChannel.platformName, () => void command.execute(`/social-channels/${selectedChannel.id}`, "DELETE")); }} /></BottomSheet>}
    {edit && <BottomSheet title="Liên kết kênh xã hội" close={() => { if (!command.busy) setEdit(false); }}>
      <Text style={s.note}>Chọn nền tảng và nhập thông tin kênh của bạn.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{platforms.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: value === platformName }} disabled={command.busy} onPress={() => choosePlatform(value)} style={[s.tab, { flex: undefined, width: "31%", minHeight: 46 }, value === platformName && s.active]}><Text style={[s.label, { fontSize: 12 }]}>{names[value]}</Text></Pressable>)}</View>
      <Field label="Tên kênh *" value={channelName} onChangeText={setName} placeholder="VD: @yennhi.skintips" maxLength={150} editable={!command.busy} style={s.input} />
      <Field label={`Đường dẫn ${names[platformName]} *`} value={channelUrl} onChangeText={setUrl} placeholder={channelUrlExamples[platformName]} autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!command.busy} style={s.input} />
      <Field label="Số người theo dõi *" value={followers} onChangeText={setFollowers} placeholder="VD: 25000" keyboardType="number-pad" editable={!command.busy} style={s.input} />
      <ErrorNotice error={command.error} />
      <View style={s.row}><View style={{ flex: 1 }}><Button title="Hủy" secondary disabled={command.busy} onPress={() => setEdit(false)} /></View><View style={{ flex: 2 }}><Button title="Liên kết kênh" secondary loading={command.busy} onPress={() => void command.execute("/social-channels", "POST", () => validateInput(ChannelInput, { platformName, channelName, channelUrl: channelUrl.trim(), followerCount: followers }), () => { setEdit(false); setName(""); setUrl(""); setFollowers(""); setDrafts({}); })} /></View></View>
    </BottomSheet>}
  </Screen>;
}

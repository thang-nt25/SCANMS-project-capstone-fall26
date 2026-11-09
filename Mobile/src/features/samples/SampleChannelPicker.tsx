import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { z } from "zod";
import { BottomSheet } from "../../components/BottomSheet";
import { Button, ErrorNotice, Field } from "../../components/ui";
import { Icon } from "../../components/commerce";
import { api } from "../../services/api";
import { unwrapEnvelope } from "../../services/api/client";
import { useOperation } from "../../hooks/useOperation";
import { useQueryClient } from "@tanstack/react-query";
import { useActor, useResource, QueryState } from "../common/shared";
import { colors as c } from "../../theme/tokens";
import { sampleStyles as s } from "./sample-styles";
import { ChannelInput, SocialChannel } from "./channel-contracts";
const platforms = ["TIKTOK", "YOUTUBE", "FACEBOOK", "INSTAGRAM", "THREADS", "ZALO", "TELEGRAM", "SHOPEE_VIDEO", "LEMON8", "OTHER"] as const;
export function SampleChannelPicker({ value, onChange, disabled }: { value: string; onChange(id: string): void; disabled: boolean }) {
  const [open, setOpen] = useState(false), [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState<string>("TIKTOK"), [name, setName] = useState(""), [url, setUrl] = useState(""), [followers, setFollowers] = useState("");
  const channels = useResource("social", "/social-channels", z.array(SocialChannel));
  const selected = channels.data?.find(item => item.id === value);
  const command = useOperation(), client = useQueryClient(), { user } = useActor();
  const close = () => { if (!command.busy) { setOpen(false); setAdding(false); } };
  const submit = () => void command.run(async () => {
    const parsed = ChannelInput.safeParse({ platformName: platform, channelName: name, channelUrl: url.trim(), followerCount: followers });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Kiểm tra thông tin kênh.");
    const response = z.object({ channel: SocialChannel }).parse(unwrapEnvelope(await api.request("/social-channels", { method: "POST", body: parsed.data })));
    onChange(response.channel.id);
    await client.invalidateQueries({ queryKey: [user.id] });
    setOpen(false); setAdding(false); setName(""); setUrl(""); setFollowers("");
  });
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Chọn kênh đăng video" disabled={disabled} onPress={() => { command.clearError(); setOpen(true); }} style={s.select}><Icon name="video" size={19} color={c.strong} /><View style={s.flex}><Text style={s.name}>{selected?.channelName || "Chọn / thêm kênh đăng video"}</Text><Text style={s.tiny}>{selected ? `${selected.platformName} · ${selected.followerCount.toLocaleString("vi-VN")} người theo dõi` : "Sử dụng kênh của chính bạn"}</Text></View><Icon name="chevron-down" size={17} color={c.muted} /></Pressable>
    {open && <BottomSheet title={adding ? "Thêm kênh của bạn" : "Kênh đăng video review"} close={close}>
      {adding ? <>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{platforms.map(item => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: platform === item }} disabled={command.busy} onPress={() => setPlatform(item)} style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, borderColor: platform === item ? c.strong : c.line, backgroundColor: platform === item ? c.soft : c.white }}><Text style={s.tiny}>{item}</Text></Pressable>)}</View>
        <Field label="Tên kênh / @Handle *" value={name} onChangeText={setName} maxLength={150} placeholder="VD: @yennhi.skintips" editable={!command.busy} />
        <Field label="Đường dẫn kênh HTTPS *" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" autoCorrect={false} placeholder="https://www.tiktok.com/@tenkenh" editable={!command.busy} />
        <Field label="Số người theo dõi *" value={followers} onChangeText={setFollowers} keyboardType="number-pad" placeholder="Nhập số thực tế, có thể là 0" editable={!command.busy} />
        <Text style={s.note}>Kênh được lưu vào hồ sơ của bạn và dùng cho yêu cầu này. Thêm kênh không tự xác minh quyền sở hữu hoặc duyệt KYC.</Text>
        <ErrorNotice error={command.error} />
        <Button title="Lưu & chọn kênh" secondary loading={command.busy} onPress={submit} />
        <Pressable disabled={command.busy} onPress={() => { command.clearError(); setAdding(false); }} style={{ minHeight: 40, justifyContent: "center", alignItems: "center" }}><Text style={s.link}>Quay lại danh sách kênh</Text></Pressable>
      </> : <>
        <QueryState loading={channels.isLoading} error={channels.error} retry={() => void channels.refetch()} />
        {channels.data?.map(item => <View key={item.id} style={{ borderWidth: 1, borderColor: value === item.id ? c.strong : c.line, borderRadius: 12, padding: 12, backgroundColor: value === item.id ? c.soft : c.white, gap: 5 }}>
          <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === item.id }} onPress={() => { onChange(item.id); close(); }} style={[s.row, { minHeight: 44 }]}><View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center" }}><Icon name="video" size={17} color={c.strong} /></View><View style={s.flex}><Text style={s.name}>{item.channelName || item.platformName}</Text><Text style={s.tiny}>{item.platformName}{item.isPrimary ? " · Kênh chính" : ""} · {item.followerCount.toLocaleString("vi-VN")} theo dõi</Text></View><Icon name={value === item.id ? "check-circle" : "circle"} size={19} color={c.strong} /></Pressable>
          <Pressable accessibilityRole="link" accessibilityLabel={`Mở kênh ${item.channelName || item.platformName}`} onPress={() => { if (item.channelUrl.startsWith("https://")) void Linking.openURL(item.channelUrl).catch(() => {}); }} style={{ minHeight: 34, justifyContent: "center" }}><Text numberOfLines={1} style={s.link}>{item.channelUrl}</Text></Pressable>
        </View>)}
        {channels.data?.length === 0 && <Text style={s.note}>Chưa có kênh. Thêm kênh bạn sẽ đăng video review.</Text>}
        <Button title="+ Thêm kênh của tôi" secondary onPress={() => { command.clearError(); setAdding(true); }} />
      </>}
    </BottomSheet>}
  </>;
}

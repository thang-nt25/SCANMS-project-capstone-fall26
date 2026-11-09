import { useState } from "react";
import { Image, Modal, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { IconButton } from "./commerce";
import { Button, Loading } from "./ui";
import { colors } from "../theme/tokens";
import { imageSource } from "../services/image-source";

export const evidenceKind = (url: string) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) ? "image" : /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ? "video" : "document";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export function EvidenceViewer({ url, close }: { url: string; close(): void }) {
  const [failed, setFailed] = useState(false), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  const video = evidenceKind(url) === "video";
  const retry = () => { setFailed(false); setLoading(true); setAttempt(value => value + 1); };
  return <Modal visible animationType="slide" onRequestClose={close}><SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 8, paddingHorizontal: 8 }}><IconButton name="arrow-left" label="Quay lại hồ sơ" onPress={close} /><Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: colors.ink }}>{video ? "Video bằng chứng" : "Ảnh bằng chứng"}</Text><IconButton name="x" label="Đóng bằng chứng" onPress={close} /></View>
    {failed ? <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 14 }}><Text style={{ color: colors.ink, textAlign: "center" }}>Không tải được tệp gốc. Kiểm tra kết nối hoặc thử lại.</Text><Button title="Thử lại" soft onPress={retry} /></View> : <View style={{ flex: 1 }}>
      {video ? <WebView key={attempt} style={{ flex: 1, backgroundColor: colors.canvas }} originWhitelist={["*"]} source={{ html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#FAF8F5}body{display:flex;align-items:center}video{width:100%;max-height:100%}</style></head><body><video controls playsinline preload="metadata" onloadedmetadata="window.ReactNativeWebView.postMessage('ready')" onerror="window.ReactNativeWebView.postMessage('error')" src="${escapeHtml(url)}"></video></body></html>` }} allowsFullscreenVideo allowsInlineMediaPlayback mediaPlaybackRequiresUserAction onMessage={event => { setLoading(false); if (event.nativeEvent.data === "error") setFailed(true); }} onError={() => { setFailed(true); setLoading(false); }} /> : <Image key={attempt} source={imageSource(url)} resizeMode="contain" style={{ flex: 1, width: "100%" }} onLoadEnd={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false); }} />}
      {loading && <View pointerEvents="none" style={{ position: "absolute", top: 16, alignSelf: "center" }}><Loading /></View>}
    </View>}
  </SafeAreaView></Modal>;
}

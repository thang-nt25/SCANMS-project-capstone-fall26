import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconButton } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { AttachmentPicker, type Attachment } from "./AttachmentPicker";

/** Native composer; sends through the same authenticated chat/upload contract as web. */
export function ChatComposer({
  conversationId,
  text,
  setText,
  attachment,
  setAttachment,
  sending,
  ready,
  send,
  onUploadBusyChange,
}: {
  conversationId: string;
  text: string;
  setText(value: string): void;
  attachment: Attachment | null;
  setAttachment(value: Attachment | null): void;
  sending: boolean;
  ready: boolean;
  send(): void;
  onUploadBusyChange(busy: boolean): void;
}) {
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);
  const blocked = sending || uploading;
  const canSend = ready && !blocked && Boolean(text.trim() || attachment);
  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}
    >
      {attachment && (
        <View style={styles.preview}>
          {attachment.type === "IMAGE" ? (
            <Image
              source={{ uri: attachment.url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailIcon}>
              <Icon
                name={attachment.type === "VIDEO" ? "video" : "file-text"}
                size={23}
                color={colors.strong}
              />
            </View>
          )}
          <View style={{ flex: 1, gap: 3 }}>
            <Text numberOfLines={1} style={styles.fileName}>
              {attachment.fileName}
            </Text>
            <Text style={styles.fileHint}>
              {attachment.type === "IMAGE"
                ? "Ảnh"
                : attachment.type === "VIDEO"
                  ? "Video"
                  : "Tài liệu"}{" "}
              · Sẵn sàng gửi
            </Text>
          </View>
          <IconButton
            name="x"
            label="Bỏ tệp đính kèm"
            disabled={blocked}
            onPress={() => setAttachment(null)}
          />
        </View>
      )}
      <View style={styles.row}>
        <AttachmentPicker
          conversationId={conversationId}
          disabled={sending || !ready}
          onSelected={setAttachment}
          onBusyChange={(value) => {
            onUploadBusyChange(value);
            setUploading(value);
          }}
        />
        <TextInput
          accessibilityLabel="Tin nhắn"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
          editable={!blocked}
          placeholder="Nhắn tin…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          textAlignVertical="top"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gửi tin nhắn"
          accessibilityState={{ disabled: !canSend, busy: sending }}
          disabled={!canSend}
          onPress={send}
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: canSend || sending ? colors.brand : colors.sand,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : (
            <Icon
              name="arrow-up"
              size={23}
              color={canSend ? colors.ink : colors.muted}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
    padding: 10,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    backgroundColor: colors.canvas,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.soft,
  },
  thumbnail: { width: 48, height: 48, borderRadius: 10 },
  thumbnailIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  fileName: { fontSize: 14, fontWeight: "600", color: colors.ink },
  fileHint: { fontSize: 12, color: colors.muted },
});

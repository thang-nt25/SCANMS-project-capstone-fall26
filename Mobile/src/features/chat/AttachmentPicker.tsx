import { useEffect, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { z } from "zod";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Caption, ErrorNotice } from "../../components/ui";
import { BottomSheet } from "../../components/BottomSheet";
import { Icon } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { useOperation } from "../../hooks/useOperation";
import { api } from "../../services/api";
const AttachmentSchema = z.object({
  url: z.string().url(),
  type: z.enum(["IMAGE", "VIDEO", "DOCUMENT"]),
  fileName: z.string(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;
export function AttachmentPicker({
  conversationId,
  disabled,
  onSelected,
  onBusyChange,
}: {
  conversationId: string;
  disabled: boolean;
  onSelected(value: Attachment): void;
  onBusyChange(busy: boolean): void;
}) {
  const operation = useOperation();
  const [open, setOpen] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const pick = async (document: boolean) => {
    let completed = false;
    await operation.run(async () => {
      // Lock message sending as soon as a native picker opens, including upload.
      onBusyChange(true);
      try {
        let uri: string, name: string, mime: string, size: number | undefined;
        if (document) {
          const selected = await DocumentPicker.getDocumentAsync({
            multiple: false,
            copyToCacheDirectory: true,
            type: [
              "application/pdf",
              "text/plain",
              "application/msword",
              "application/vnd.ms-excel",
              "application/vnd.ms-powerpoint",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              "text/csv",
              "application/csv",
            ],
          });
          if (selected.canceled) {
            completed = true;
            return;
          }
          const asset = selected.assets[0];
          uri = asset.uri;
          name = asset.name;
          mime = asset.mimeType || "application/octet-stream";
          size = asset.size;
        } else {
          const selected = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images", "videos"],
            quality: 1,
          });
          if (selected.canceled) {
            completed = true;
            return;
          }
          const asset = selected.assets[0];
          uri = asset.uri;
          name =
            asset.fileName ||
            (asset.type === "video" ? "video.mp4" : "photo.jpg");
          mime =
            asset.mimeType ||
            (asset.type === "video" ? "video/mp4" : "image/jpeg");
          size = asset.fileSize;
        }
        const max = document ? 20 : mime.startsWith("image/") ? 5 : 50;
        if (
          !size ||
          !Number.isFinite(size) ||
          size < 0 ||
          size > max * 1024 * 1024
        )
          throw new Error(`Tệp tối đa ${max} MB.`);
        const form = new FormData();
        form.append("file", { uri, name, type: mime } as unknown as Blob);
        const uploaded = AttachmentSchema.parse(
          await api.request(
            `/chat/conversations/${conversationId}/attachments`,
            { method: "POST", body: form, timeout: 120000 },
          ),
        );
        if (mounted.current) onSelected(uploaded);
        completed = true;
      } finally {
        if (mounted.current) onBusyChange(false);
      }
    });
    // Keep errors visible in the sheet. Cancelling does not discard the draft.
    if (completed && mounted.current) setOpen(false);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thêm tệp đính kèm"
        accessibilityState={{
          disabled: disabled || operation.busy,
          busy: operation.busy,
          expanded: open,
        }}
        disabled={disabled || operation.busy}
        hitSlop={4}
        style={({ pressed }) => [
          styles.plus,
          { opacity: disabled ? 0.4 : pressed ? 0.65 : 1 },
        ]}
        onPress={() => {
          Keyboard.dismiss();
          operation.clearError();
          setOpen(true);
        }}
      >
        {operation.busy ? (
          <ActivityIndicator size="small" color={colors.strong} />
        ) : (
          <Icon name="plus" size={24} color={colors.ink} />
        )}
      </Pressable>
      {open && (
        <BottomSheet title="Đính kèm" close={() => setOpen(false)}>
          <Caption>Chọn một tệp để xem trước, sau đó bấm gửi tin nhắn.</Caption>
          {[
            {
              document: false,
              icon: "image" as const,
              title: "Ảnh và video",
              detail: "Ảnh tối đa 5 MB · Video tối đa 50 MB",
            },
            {
              document: true,
              icon: "file-text" as const,
              title: "Tài liệu",
              detail: "PDF, Word, Excel hoặc văn bản · Tối đa 20 MB",
            },
          ].map((option) => (
            <Pressable
              key={option.title}
              accessibilityRole="button"
              accessibilityLabel={option.title}
              disabled={disabled || operation.busy}
              onPress={() => void pick(option.document)}
              style={({ pressed }) => [
                styles.option,
                {
                  opacity:
                    disabled || operation.busy ? 0.5 : pressed ? 0.65 : 1,
                },
              ]}
            >
              <View style={styles.optionIcon}>
                <Icon name={option.icon} color={colors.strong} size={23} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Caption>{option.detail}</Caption>
              </View>
              <Icon name="chevron-right" color={colors.muted} size={18} />
            </Pressable>
          ))}
          {operation.busy && (
            <View style={styles.progress}>
              <ActivityIndicator color={colors.strong} />
              <Caption>Đang chọn hoặc tải tệp…</Caption>
            </View>
          )}
          <ErrorNotice error={operation.error} />
        </BottomSheet>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
    borderRadius: 14,
  },
  optionTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  progress: { flexDirection: "row", alignItems: "center", gap: 10 },
});

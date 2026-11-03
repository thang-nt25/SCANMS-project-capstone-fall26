import * as ImagePicker from "expo-image-picker";
import { z } from "zod";
import { View } from "react-native";
import { Button, ErrorNotice } from "../../components/ui";
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
}: {
  conversationId: string;
  disabled: boolean;
  onSelected(value: Attachment): void;
}) {
  const operation = useOperation();
  const pick = (document: boolean) =>
    void operation.run(async () => {
      let uri: string, name: string, mime: string, size: number | undefined;
      if (document) {
        const DocumentPicker = await import("expo-document-picker");
        const selected = await DocumentPicker.getDocumentAsync({
          multiple: false,
          copyToCacheDirectory: true,
          type: [
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ],
        });
        if (selected.canceled) return;
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
        if (selected.canceled) return;
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
      if (!size || size > max * 1024 * 1024)
        throw new Error(`Tệp tối đa ${max} MB.`);
      const form = new FormData();
      form.append("file", { uri, name, type: mime } as unknown as Blob);
      onSelected(
        AttachmentSchema.parse(
          await api.request(
            `/chat/conversations/${conversationId}/attachments`,
            { method: "POST", body: form, timeout: 120000 },
          ),
        ),
      );
    });
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          title="Ảnh/Video"
          secondary
          disabled={disabled}
          loading={operation.busy}
          onPress={() => pick(false)}
        />
        <Button
          title="Tài liệu"
          secondary
          disabled={disabled}
          loading={operation.busy}
          onPress={() => pick(true)}
        />
      </View>
      <ErrorNotice error={operation.error} />
    </>
  );
}

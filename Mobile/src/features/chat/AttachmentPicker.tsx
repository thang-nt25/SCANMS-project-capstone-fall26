import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Platform, View } from "react-native";
import { Button, Caption, ErrorNotice } from "../../components/ui";
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
  onBusyChange?(busy: boolean): void;
}) {
  const operation = useOperation();
  useEffect(() => { onBusyChange?.(operation.busy); }, [operation.busy, onBusyChange]);
  const [active, setActive] = useState<"document" | "media" | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadController = useRef<AbortController | null>(null);
  useEffect(() => () => uploadController.current?.abort(), []);
  const pick = (document: boolean) =>
    void operation.run(async () => {
      setActive(document ? "document" : "media");
      setUploading(false);
      try {
      let uri: string, name: string, mime: string, size: number | undefined;
      if (document) {
        const selected = await DocumentPicker.getDocumentAsync({
          multiple: false,
          copyToCacheDirectory: true,
          type: [
            "application/pdf",
            "text/plain",
            "text/csv",
            "application/csv",
            "application/msword",
            "application/vnd.ms-excel",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          ],
        });
        if (selected.canceled) return;
        const asset = selected.assets[0];
        if (!asset?.uri) throw new Error("Không đọc được tài liệu. Hãy chọn tệp đã tải về thiết bị.");
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
        if (!asset?.uri) throw new Error("Không đọc được ảnh hoặc video đã chọn.");
        uri = asset.uri;
        name =
          asset.fileName ||
          (asset.type === "video" ? "video.mp4" : "photo.jpg");
        mime =
          asset.mimeType ||
          (asset.type === "video" ? "video/mp4" : "image/jpeg");
        size = asset.fileSize;
      }
      const extension = name.toLowerCase().split(".").pop() || "";
      const mimeByExtension: Record<string, string> = {
        pdf: "application/pdf", txt: "text/plain", csv: "text/csv",
        doc: "application/msword", xls: "application/vnd.ms-excel", ppt: "application/vnd.ms-powerpoint",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
        mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
      };
      if (!mime || mime === "application/octet-stream") mime = mimeByExtension[extension] || mime;
      if (document ? !["pdf", "txt", "csv", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension)
        : !["jpg", "jpeg", "png", "mp4", "mov", "webm"].includes(extension))
        throw new Error(document ? "Chọn PDF, Word, Excel, PowerPoint, TXT hoặc CSV." : "Chat hỗ trợ ảnh JPG, PNG và video MP4, MOV, WEBM.");
      const max = document ? 20 : mime.startsWith("image/") ? 5 : 50;
      if (size !== undefined && (!Number.isFinite(size) || size <= 0 || size > max * 1024 * 1024))
        throw new Error(`Tệp tối đa ${max} MB.`);
      setUploading(true);
      const controller = new AbortController();
      uploadController.current = controller;
      const form = new FormData();
      // Expo 58 fetch expects a Blob/File, not the legacy RN { uri, name, type } object.
      const file = Platform.OS === "web" ? await (await fetch(uri)).blob() : new File(uri);
      form.append("file", file, name);
      onSelected(
        { ...AttachmentSchema.parse(
          await api.request(
            `/chat/conversations/${conversationId}/attachments`,
            { method: "POST", body: form, timeout: 120000, signal: controller.signal },
          ),
        ), fileName: name },
      );
      } catch (error) {
        if (uploadController.current?.signal.aborted) throw new Error("Đã hủy tải tệp. Tệp chưa được gửi cho đối tác.");
        throw error;
      } finally {
        uploadController.current = null;
        setUploading(false);
        setActive(null);
      }
    });
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          title="Ảnh/Video"
          secondary
          disabled={disabled || operation.busy}
          loading={uploading && active === "media"}
          onPress={() => pick(false)}
        />
        <Button
          title="Tài liệu"
          secondary
          disabled={disabled || operation.busy}
          loading={uploading && active === "document"}
          onPress={() => pick(true)}
        />
      </View>
      {operation.busy && <Caption>{uploading ? "Đang tải tệp lên… Chưa gửi cho đối tác." : "Chọn tệp trong cửa sổ Android; bấm Quay lại để hủy."}</Caption>}
      {uploading && <Button title="Hủy tải tệp" secondary onPress={() => uploadController.current?.abort()} />}
      <ErrorNotice error={operation.error} />
    </>
  );
}

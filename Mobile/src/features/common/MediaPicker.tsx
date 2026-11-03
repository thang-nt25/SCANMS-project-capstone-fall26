import * as ImagePicker from "expo-image-picker";
import { z } from "zod";
import { Button, Caption, ErrorNotice } from "../../components/ui";
import { api } from "../../services/api";
import { useOperation } from "../../hooks/useOperation";
export function filePart(asset: ImagePicker.ImagePickerAsset) {
  return {
    uri: asset.uri,
    name:
      asset.fileName ||
      (asset.type === "video" ? "evidence.mp4" : "evidence.jpg"),
    type:
      asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
  } as unknown as Blob;
}
export function MediaPicker({
  label,
  video = false,
  cover = false,
  onUploaded,
  disabled = false,
}: {
  label: string;
  video?: boolean;
  cover?: boolean;
  onUploaded(url: string): void;
  disabled?: boolean;
}) {
  const operation = useOperation();
  return (
    <>
      <Button
        title={label}
        secondary
        disabled={disabled}
        loading={operation.busy}
        onPress={() =>
          void operation.run(async () => {
            // System photo picker: no camera/microphone permission is needed to select an existing file.
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: video ? ["videos"] : ["images"],
              quality: 1,
            });
            if (result.canceled || !result.assets[0]) return;
            const asset = result.assets[0],
              max = (video ? 100 : 5) * 1024 * 1024;
            if (!asset.fileSize || asset.fileSize > max)
              throw new Error(
                `Chọn tệp có kích thước tối đa ${video ? 100 : 5} MB.`,
              );
            if (cover && (asset.width !== asset.height || asset.width < 800))
              throw new Error("Ảnh bìa cần vuông, ít nhất 800×800 px.");
            const form = new FormData();
            form.append("file", filePart(asset));
            const response = z
              .object({ secureUrl: z.string().url() })
              .parse(
                await api.request(
                  cover
                    ? "/upload/product-cover"
                    : `/upload/${video ? "video" : "image"}?folder=scanms/evidence`,
                  { method: "POST", body: form, timeout: 120000 },
                ),
              );
            onUploaded(response.secureUrl);
          })
        }
      />
      <Caption>
        {video
          ? "Chọn video có sẵn, tối đa 100 MB."
          : "Chọn ảnh có sẵn, tối đa 5 MB."}
      </Caption>
      <ErrorNotice error={operation.error} />
    </>
  );
}

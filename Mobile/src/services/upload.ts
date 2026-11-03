import { z } from "zod";
import type { ImagePickerAsset } from "expo-image-picker";
import { api } from "./api";

export async function uploadImage(
  asset: ImagePickerAsset,
  cover = false,
): Promise<string> {
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024)
    throw new Error("Ảnh không được vượt quá 5 MB.");
  if (cover && (asset.width !== asset.height || asset.width < 800))
    throw new Error("Ảnh bìa phải vuông và ít nhất 800×800 px.");
  const form = new FormData();
  // React Native's FormData accepts a file URI descriptor; DOM's Blob type cannot express it.
  form.append("file", {
    uri: asset.uri,
    name: asset.fileName || "scanms-image.jpg",
    type: asset.mimeType || "image/jpeg",
  } as unknown as Blob);
  const response = await api.request(
    cover ? "/upload/product-cover" : "/upload/image?folder=scanms/products",
    { method: "POST", body: form, timeout: 45000 },
  );
  return z.object({ secureUrl: z.string().url() }).parse(response).secureUrl;
}

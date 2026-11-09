import type { ImageSourcePropType } from "react-native";
import { environment } from "../config/environment";
import { bundledCatalogImages } from "./bundled-catalog-images";
import { resolveImageReference } from "./image-policy";
export function imageSource(
  uri: string | null | undefined,
): ImageSourcePropType | undefined {
  return (
    resolveImageReference(uri, bundledCatalogImages, environment.socketUrl) ??
    undefined
  );
}

import { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Icon } from "./commerce";
import { colors } from "../theme/tokens";
import { imageSource } from "../services/image-source";

/** Unavailable merchant media falls back to a neutral placeholder, never another product. */
export function ProductPhoto({
  uri,
  style,
  resizeMode = "cover",
}: {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageProps["resizeMode"];
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const source = imageSource(uri);
  return (
    <View style={[styles.container, style]}>
      <Icon name="image" size={26} color={colors.brandBorder} />
      <Text style={styles.label}>SCANMS</Text>
      {source && failedUri !== uri && (
        <Image
          source={source}
          resizeMode={resizeMode}
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          onError={() => setFailedUri(uri || null)}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.sand,
    overflow: "hidden",
  },
  label: { color: colors.muted, fontSize: 8, letterSpacing: 1.2 },
});

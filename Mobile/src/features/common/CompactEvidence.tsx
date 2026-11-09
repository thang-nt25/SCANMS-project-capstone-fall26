import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Icon } from "../../components/commerce";
import { ProductPhoto } from "../../components/ProductPhoto";
import { ErrorNotice } from "../../components/ui";
import { useOperation } from "../../hooks/useOperation";
import { colors } from "../../theme/tokens";
import { https } from "./validation";

/** Every attachment stays reachable without stacking full-size previews in a form. */
export function CompactEvidence({ urls }: { urls: readonly string[] }) {
  const operation = useOperation();
  if (!urls.length) return null;
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {urls.map((url, index) => {
          const image =
            /\.(png|jpe?g|webp)(\?|$)/i.test(url) ||
            url.includes("/image/upload/");
          const video =
            /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ||
            url.includes("/video/upload/");
          return (
            <Pressable
              key={`${index}-${url}`}
              accessibilityRole="button"
              accessibilityLabel={`Mở bằng chứng ${index + 1}`}
              disabled={operation.busy}
              onPress={() =>
                void operation.run(async () => {
                  https.parse(url);
                  await Linking.openURL(url);
                })
              }
              style={styles.file}
            >
              {image ? (
                <ProductPhoto uri={url} style={styles.preview} />
              ) : (
                <View style={[styles.preview, styles.document]}>
                  <Icon
                    name={video ? "play" : "file-text"}
                    size={22}
                    color={colors.strong}
                  />
                </View>
              )}
              <Text style={styles.label}>
                {image ? "Ảnh" : video ? "Video" : "Tài liệu"} {index + 1}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ErrorNotice error={operation.error} />
    </View>
  );
}
const styles = StyleSheet.create({
  list: { gap: 8, paddingVertical: 3 },
  file: {
    width: 76,
    gap: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  preview: { width: 64, height: 64, borderRadius: 5 },
  document: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
  },
  label: {
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    color: colors.muted,
  },
});

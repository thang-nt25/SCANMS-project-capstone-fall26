import { StyleSheet } from "react-native";
import { colors as c } from "../../theme/tokens";

export const sampleStyles = StyleSheet.create({
  card: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 14, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  heading: { fontSize: 15, lineHeight: 21, fontWeight: "700", color: c.ink },
  name: { fontSize: 13, lineHeight: 19, fontWeight: "600", color: c.ink },
  note: { fontSize: 12, lineHeight: 18, color: c.muted },
  tiny: { fontSize: 11, lineHeight: 16, color: c.muted },
  icon: { width: 36, height: 36, borderRadius: 11, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
  step: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.soft, borderWidth: 1, borderColor: c.brandBorder, textAlign: "center", textAlignVertical: "center", color: c.strong, fontSize: 12, fontWeight: "700" },
  line: { height: 1, backgroundColor: c.line },
  pill: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 38, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, alignItems: "center", justifyContent: "center" },
  active: { backgroundColor: c.soft, borderColor: c.strong },
  photo: { width: 62, height: 72, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.white },
  link: { fontSize: 12, fontWeight: "600", color: c.strong },
  select: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, padding: 11, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.white },
  soft: { backgroundColor: c.soft, padding: 11, borderWidth: 1, borderColor: c.brandBorder, borderRadius: 12, gap: 7 },
  check: { width: 21, height: 21, borderRadius: 6, borderWidth: 1, borderColor: c.brand, backgroundColor: c.white, alignItems: "center", justifyContent: "center" },
  cta: { minHeight: 46, backgroundColor: c.soft, borderWidth: 1, borderColor: c.brandBorder, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 10 },
  empty: { alignItems: "center", gap: 9, paddingVertical: 28, paddingHorizontal: 12 },
  summary: { flex: 1, minWidth: 0, gap: 6, paddingVertical: 12, alignItems: "center", backgroundColor: c.soft, borderWidth: 1, borderColor: c.brandBorder, borderRadius: 12 },
});

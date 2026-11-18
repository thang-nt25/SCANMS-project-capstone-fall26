import { StyleSheet } from "react-native";
import { colors as c } from "../../theme/tokens";
export const profileStyles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderColor: c.line, borderRadius: 18, backgroundColor: c.white, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  inline: { flexDirection: "row", alignItems: "center", gap: 9 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "700", color: c.ink },
  label: { fontSize: 13, lineHeight: 19, fontWeight: "600", color: c.ink },
  note: { fontSize: 12, lineHeight: 18, color: c.muted },
  tag: { fontSize: 11, lineHeight: 16, color: c.strong, backgroundColor: c.soft, borderWidth: 1, borderColor: c.brandBorder, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
  line: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 },
  tab: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: c.line, borderRadius: 10, alignItems: "center", justifyContent: "center", padding: 6, backgroundColor: c.white },
  active: { borderColor: c.strong, backgroundColor: c.soft },
  input: { minHeight: 46, fontSize: 14, paddingVertical: 10, backgroundColor: c.white },
});

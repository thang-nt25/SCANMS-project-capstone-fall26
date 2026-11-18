import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./commerce";
import { colors } from "../theme/tokens";

const ToastContext = createContext<(message: string) => void>(() => {});
export const useSuccessToast = () => useContext(ToastContext);

export function SuccessToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const serial = useRef(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const show = useCallback((message: string) => setToast({ message, id: ++serial.current }), []);
  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(({ finished }) => { if (finished) setToast(current => current?.id === toast.id ? null : current); });
    }, 3200);
    return () => { clearTimeout(timer); opacity.stopAnimation(); };
  }, [toast, opacity]);
  return <ToastContext.Provider value={show}>
    <View style={{ flex: 1 }}>{children}
      {toast && <View pointerEvents="box-none" style={[s.position, { top: insets.top + 10 }]}>
        <Animated.View accessibilityLiveRegion="polite" style={[s.toast, { opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
          <View style={s.icon}><Icon name="check" size={14} color={colors.strong} /></View>
          <Text style={s.message}>{toast.message}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo thành công" hitSlop={6} onPress={() => setToast(null)} style={s.close}><Icon name="x" size={16} color={colors.muted} /></Pressable>
        </Animated.View>
      </View>}
    </View>
  </ToastContext.Provider>;
}

const s = StyleSheet.create({
  position: { position: "absolute", right: 12, left: 12, alignItems: "flex-end", zIndex: 9999 },
  toast: { maxWidth: 270, flexDirection: "row", alignItems: "center", gap: 7, paddingLeft: 9, paddingVertical: 3, paddingRight: 2, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.brandBorder, borderRadius: 12, elevation: 5, shadowColor: colors.dark, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  icon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  message: { flexShrink: 1, fontSize: 11, lineHeight: 16, fontWeight: "600", color: colors.ink },
  close: { width: 36, height: 38, alignItems: "center", justifyContent: "center" },
});

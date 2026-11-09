import { useState, type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "../../components/commerce";
import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/ui";
import { colors } from "../../theme/tokens";
import { money } from "../../types/contracts";
import type { Address } from "../customer/customer-contracts";
import { deliveryAddress } from "./checkout-contracts";

function addressSummary(address: Address) {
  try {
    return deliveryAddress(address);
  } catch {
    return address.detailAddress || "Địa chỉ chưa đầy đủ. Vui lòng chỉnh sửa.";
  }
}

export function CheckoutDisclosure({
  title,
  summary,
  icon,
  children,
  disabled = false,
}: PropsWithChildren<{
  title: string;
  summary?: string;
  icon: IconName;
  disabled?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen(!open)}
        style={s.disclosure}
      >
        <Icon name={icon} size={17} color={colors.strong} />
        <Text style={[s.label, { flex: 1 }]}>{title}</Text>
        {!!summary && (
          <Text numberOfLines={1} style={s.summary}>
            {summary}
          </Text>
        )}
        <Icon
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.muted}
        />
      </Pressable>
      {open && <View style={s.expanded}>{children}</View>}
    </View>
  );
}

export function CheckoutAddressPicker({
  addresses,
  selected,
  onSelect,
  onManage,
  close,
}: {
  addresses: Address[];
  selected?: string;
  onSelect(id: string): void;
  onManage(): void;
  close(): void;
}) {
  return (
    <BottomSheet title="Chọn địa chỉ nhận hàng" close={close}>
      {addresses.map((address) => (
        <Pressable
          key={address.id}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === address.id }}
          onPress={() => {
            onSelect(address.id);
            close();
          }}
          style={[s.address, selected === address.id && s.active]}
        >
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.label}>
              {address.fullName} · {address.phoneNumber}
            </Text>
            <Text style={s.caption}>{addressSummary(address)}</Text>
            {address.isDefault && <Text style={s.link}>Mặc định</Text>}
          </View>
          <Icon
            name={selected === address.id ? "check-circle" : "circle"}
            size={19}
            color={colors.strong}
          />
        </Pressable>
      ))}
      <Button
        title="Thêm / chỉnh sửa địa chỉ"
        secondary
        onPress={() => {
          close();
          onManage();
        }}
      />
    </BottomSheet>
  );
}

/** Both methods remain visible; the balance comes only from the authenticated wallet API. */
export function CheckoutPaymentMethods({
  value,
  onChange,
  balance,
  total,
  walletError,
  payosAvailable,
  disabled,
  onTopUp,
}: {
  value: "WALLET" | "PAYOS";
  onChange(value: "WALLET" | "PAYOS"): void;
  balance?: number | string;
  total?: number;
  walletError: boolean;
  payosAvailable?: boolean;
  disabled: boolean;
  onTopUp(): void;
}) {
  const insufficient =
    balance !== undefined && total !== undefined && Number(balance) < total;
  const methods: {
    id: "WALLET" | "PAYOS";
    title: string;
    icon: IconName;
    detail: string;
  }[] = [
    {
      id: "WALLET",
      title: "Ví SCANMS",
      icon: "credit-card",
      detail: walletError
        ? "Chưa tải được số dư"
        : balance === undefined
          ? "Đang tải số dư…"
          : `Số dư: ${money(balance)}`,
    },
    {
      id: "PAYOS",
      title: "Chuyển khoản PayOS",
      icon: "grid",
      detail:
        payosAvailable === false
          ? "Hiện chưa sẵn sàng"
          : "Quét QR / mở ứng dụng ngân hàng",
    },
  ];
  return (
    <View style={{ gap: 8 }}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Phương thức thanh toán"
        style={s.methods}
      >
        {methods.map((method, index) => (
          <Pressable
            key={method.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === method.id, disabled }}
            disabled={disabled}
            onPress={() => onChange(method.id)}
            style={({ pressed }) => [
              s.method,
              index > 0 && s.separator,
              value === method.id && s.active,
              (disabled || pressed) && { opacity: 0.6 },
            ]}
          >
            <Icon name={method.icon} size={20} color={colors.strong} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.label}>{method.title}</Text>
              <Text style={s.caption}>{method.detail}</Text>
            </View>
            <View style={[s.radio, value === method.id && s.radioSelected]}>
              {value === method.id && <View style={s.radioDot} />}
            </View>
          </Pressable>
        ))}
      </View>
      {value === "WALLET" && (
        <View style={s.walletHelp}>
          <Text
            style={[
              s.caption,
              { flex: 1 },
              insufficient && { color: colors.danger },
            ]}
          >
            {insufficient
              ? `Cần thêm ${money(Math.max(0, total! - Number(balance)))} để thanh toán.`
              : "Thanh toán từ số dư khả dụng của bạn."}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={onTopUp}
            style={s.topup}
          >
            <Text style={s.link}>Nạp ví</Text>
            <Icon name="chevron-right" size={14} color={colors.strong} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function CheckoutAmountRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={s.amount}>
      <Text style={s.caption}>{label}</Text>
      <Text style={s.amountValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    overflow: "hidden",
  },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 46,
    paddingVertical: 8,
  },
  expanded: {
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  label: { color: colors.ink, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  summary: { color: colors.strong, fontSize: 11, maxWidth: "38%" },
  link: { color: colors.strong, fontSize: 12, fontWeight: "600" },
  address: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  methods: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    overflow: "hidden",
  },
  method: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  active: { backgroundColor: colors.soft },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.strong },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.strong,
  },
  walletHelp: { flexDirection: "row", alignItems: "center", gap: 8 },
  topup: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: 2,
    paddingLeft: 8,
  },
  amount: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    minHeight: 24,
  },
  amountValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
  },
});

import { useState, type ReactNode } from "react";
import { FlatList, Modal, View } from "react-native";
import { Button, Caption, Field, Screen, Title } from "../../components/ui";
import { BottomSheet } from "../../components/BottomSheet";
import { Icon } from "../../components/commerce";
import { colors } from "../../theme/tokens";
import { Pressable, Text } from "react-native";
export function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  hideLabel = false,
  renderTrigger,
  compact = false,
}: {
  label: string;
  value?: string;
  options: readonly { value: string; label: string }[];
  onChange(value: string): void;
  disabled?: boolean;
  hideLabel?: boolean;
  renderTrigger?: (open: () => void) => ReactNode;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  return (
    <View style={{ gap: 6 }}>
      {!hideLabel && <Caption>{label}</Caption>}
      {renderTrigger ? renderTrigger(() => {
        if (disabled) return;
        setSearch("");
        setOpen(true);
      }) : <Button
        title={
          options.find((option) => option.value === value)?.label ||
          `Chọn ${label.toLowerCase()}`
        }
        secondary
        disabled={disabled}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
      />}
      {compact ? open && <BottomSheet title={label} close={() => setOpen(false)}>{options.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: value === option.value }} onPress={() => { onChange(option.value); setOpen(false); }} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, borderColor: value === option.value ? colors.brandBorder : colors.line, backgroundColor: value === option.value ? colors.soft : colors.white, borderRadius: 11 }}><Icon name={value === option.value ? "check-circle" : "circle"} size={18} color={colors.strong} /><Text style={{ flex: 1, fontSize: 13, color: colors.ink, fontWeight: value === option.value ? "600" : "400" }}>{option.label}</Text></Pressable>)}</BottomSheet> : <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Screen>
          <View style={{ padding: 20, gap: 12, paddingTop: 45 }}>
            <Title>{label}</Title>
            <Field label="Tìm kiếm" value={search} onChangeText={setSearch} />
            <Button title="Đóng" secondary onPress={() => setOpen(false)} />
          </View>
          <FlatList
            data={options.filter((option) =>
              option.label
                .toLocaleLowerCase("vi")
                .includes(search.toLocaleLowerCase("vi")),
            )}
            keyExtractor={(item) => item.value}
            contentContainerStyle={{ padding: 20, gap: 10 }}
            renderItem={({ item }) => (
              <Button
                title={item.label}
                secondary={value !== item.value}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
              />
            )}
          />
        </Screen>
      </Modal>}
    </View>
  );
}

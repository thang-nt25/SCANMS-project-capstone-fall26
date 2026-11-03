import { useState } from "react";
import { FlatList, Modal, View } from "react-native";
import { Button, Caption, Field, Screen, Title } from "../../components/ui";
export function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value?: string;
  options: readonly { value: string; label: string }[];
  onChange(value: string): void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  return (
    <View style={{ gap: 6 }}>
      <Caption>{label}</Caption>
      <Button
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
      />
      <Modal
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
      </Modal>
    </View>
  );
}

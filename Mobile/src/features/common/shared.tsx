import { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Button,
  Caption,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  Title,
} from "../../components/ui";
import { api } from "../../services/api";
import { useAuth } from "../auth/AuthProvider";
import { useStoreScope } from "../auth/StoreScope";
import { useOperation } from "../../hooks/useOperation";
import { validateInput } from "../../utils/validate-input";
import { colors } from "../../theme/tokens";
import { unwrapEnvelope } from "../../services/api/client";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, IconButton } from "../../components/commerce";
import { EvidenceViewer, evidenceKind } from "../../components/EvidenceViewer";
import { ProductPhoto } from "../../components/ProductPhoto";

export { amount, https, required } from "./validation";
import { https } from "./validation";
export function useActor() {
  const { session } = useAuth();
  const { store } = useStoreScope();
  return {
    user: session!.user,
    store,
    reviewer: ["SYSTEM_MANAGER", "SYSTEM_ADMIN"].includes(session!.user.role),
  };
}
export function useResource<T>(
  key: string,
  path: string,
  schema: z.ZodType<T>,
  enabled = true,
) {
  const { user, store } = useActor();
  return useQuery({
    queryKey: [user.id, "business", key, store?.id, path],
    queryFn: async ({ signal }) => {
      const result = schema.safeParse(unwrapEnvelope(await api.request(path, { signal })));
      if (!result.success) {
        if (__DEV__) console.warn("API contract mismatch", key, result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.code}`).join(", "));
        throw result.error;
      }
      return result.data;
    },
    enabled,
    refetchInterval: 30000,
  });
}
export function useCommand() {
  const operation = useOperation();
  const client = useQueryClient();
  const { user } = useActor();
  return {
    ...operation,
    execute: (
      path: string,
      method = "PATCH",
      body?: unknown,
      done?: () => void,
    ) =>
      operation.run(
        () =>
          api.request(path, {
            method,
            body: typeof body === "function" ? body() : body,
            timeout: 60000,
          }),
        async () => {
          await client.invalidateQueries({ queryKey: [user.id] });
          done?.();
        },
      ),
  };
}
export function QueryState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: unknown;
  retry(): void;
}) {
  return (
    <>
      {loading && <Loading />}
      <ErrorNotice error={error} retry={retry} />
    </>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange(value: string): void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Caption>{label}</Caption>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => (
          <Button
            key={option.value}
            title={option.label}
            secondary={value !== option.value}
            disabled={disabled}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}
export interface FormField {
  key: string;
  label: string;
  initial?: string;
  numeric?: boolean;
  secret?: boolean;
  multiline?: boolean;
  options?: readonly { value: string; label: string }[];
}
export interface CommandFormSpec {
  title: string;
  fields: readonly FormField[];
  schema: z.ZodType;
  path: string;
  method?: string;
}
export function CommandForm({
  spec,
  close,
}: {
  spec: CommandFormSpec;
  close(): void;
}) {
  const command = useCommand();
  return (
    <ActionForm
      title={spec.title}
      fields={spec.fields}
      schema={spec.schema}
      busy={command.busy}
      error={command.error}
      close={close}
      submit={(body) =>
        command.execute(spec.path, spec.method || "PATCH", body, close)
      }
    />
  );
}
/** Forms describe an explicit business command; only schema-validated fields reach its API. */
export function ActionForm<T>({
  title,
  fields,
  schema,
  submit,
  busy = false,
  error,
  close,
}: {
  title: string;
  fields: readonly FormField[];
  schema: z.ZodType<T>;
  submit(body: T): Promise<unknown>;
  busy?: boolean;
  error?: unknown;
  close(): void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.initial || ""])),
  );
  const local = useOperation();
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!busy && !local.busy) close();
      }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Screen scroll>
          <Title>{title}</Title>
          {fields.map((field) =>
            field.options ? (
              <Choice
                key={field.key}
                label={field.label}
                value={values[field.key]}
                options={field.options}
                disabled={busy || local.busy}
                onChange={(value) =>
                  setValues((old) => ({ ...old, [field.key]: value }))
                }
              />
            ) : (
              <Field
                key={field.key}
                label={field.label}
                value={values[field.key]}
                secureTextEntry={field.secret}
                keyboardType={field.numeric ? "numeric" : "default"}
                multiline={field.multiline}
                autoCapitalize="none"
                editable={!busy && !local.busy}
                onChangeText={(value) =>
                  setValues((old) => ({ ...old, [field.key]: value }))
                }
              />
            ),
          )}
          <ErrorNotice error={local.error || error} />
          <Button
            title="Xác nhận"
            loading={busy || local.busy}
            onPress={() =>
              void local.run(() => submit(validateInput(schema, values)))
            }
          />
          <Button
            title="Đóng"
            secondary
            disabled={busy || local.busy}
            onPress={close}
          />
        </Screen>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export function confirmAction(
  title: string,
  detail: string,
  action: () => void,
) {
  Alert.alert(title, detail, [
    { text: "Hủy", style: "cancel" },
    { text: "Xác nhận", onPress: action },
  ]);
}
export function Evidence({ urls, compact = false }: { urls: readonly string[]; compact?: boolean }) {
  const operation = useOperation();
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <View style={{ gap: 8 }}>
      {urls.map((url, index) => (
          <View key={`${index}-${url}`} style={compact ? { flexDirection: "row", alignItems: "center", gap: 10 } : undefined}>
          {/\.(png|jpe?g|webp)(\?|$)/i.test(url) && (
              compact ? <ProductPhoto uri={url} style={{ height: 56, width: 56, borderRadius: 8 }} resizeMode="contain" /> : <Image
              source={{ uri: url }}
                style={{ height: 160, width: "100%" }}
              resizeMode="contain"
            />
          )}
          {compact && evidenceKind(url) !== "image" && <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.soft, justifyContent: "center", alignItems: "center" }}><Icon name={evidenceKind(url) === "video" ? "play-circle" : "file-text"} size={24} color={colors.strong} /></View>}
            <View style={compact ? { flex: 1 } : undefined}><Button
            title={evidenceKind(url) === "image" ? `Xem ảnh ${index + 1}` : evidenceKind(url) === "video" ? "Xem video mở hàng" : `Mở tài liệu ${index + 1}`}
            secondary
            loading={operation.busy}
            onPress={() =>
              void operation.run(async () => {
                https.parse(url);
                if (evidenceKind(url) !== "document") setPreview(url);
                else await Linking.openURL(url);
              })
            }
            /></View>
        </View>
      ))}
      <ErrorNotice error={operation.error} />
      {preview && <EvidenceViewer url={preview} close={() => setPreview(null)} />}
    </View>
  );
}
export function Sheet({
  title,
  children,
  close,
  backHeader = false,
}: {
  title: string;
  children: React.ReactNode;
  close(): void;
  backHeader?: boolean;
}) {
  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {backHeader && <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line }}><IconButton name="arrow-left" label="Quay lại danh sách đổi trả" onPress={close} /><View style={{ flex: 1 }}><Title>{title}</Title></View></View>}
        <ScrollView
          contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
            {!backHeader && <Title>{title}</Title>}
          {children}
          <Button title="Quay lại" secondary onPress={close} />
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <View>
      <Caption>{label}</Caption>
      <Text style={{ color: colors.ink, lineHeight: 22 }}>
        {value ?? "Chưa có thông tin"}
      </Text>
    </View>
  );
}

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Caption, ErrorNotice, Field } from "../../components/ui";
import { BottomSheet } from "../../components/BottomSheet";
import { Evidence, Choice, useResource, QueryState } from "../common/shared";
import { z } from "zod";
import { MediaPicker } from "../common/MediaPicker";
import { SelectField } from "../common/SelectField";
import { api } from "../../services/api";
import { useOperation } from "../../hooks/useOperation";
import {
  applicationDraft,
  platforms,
  type KolApplication,
} from "./kyc-contracts";
import { createKycService } from "./kyc-service";
import { colors } from "../../theme/tokens";

export function KolApplicationForm({
  application,
  close,
  saved,
}: {
  application?: KolApplication | null;
  close(): void;
  saved(): Promise<unknown>;
}) {
  const [draft, setDraft] = useState(() => applicationDraft(application)),
    [step, setStep] = useState(0),
    [agreed, setAgreed] = useState(false),
    [uploading, setUploading] = useState(false);
  const operation = useOperation(),
    service = createKycService(api);
  const busy = operation.busy || uploading;
  const categories = useResource(
    "kol-specialties",
    "/public/products/categories",
    z.array(z.object({ name: z.string() })),
  );
  const field = (
    key: Exclude<
      keyof typeof draft,
      "channels" | "specialtyCategories" | "contentStyles"
    >,
    label: string,
  ) => (
    <Field
      key={key}
      label={label}
      value={draft[key]}
      editable={!busy}
      onChangeText={(value) => setDraft((old) => ({ ...old, [key]: value }))}
      multiline={key === "bio"}
    />
  );
  return (
    <BottomSheet
      title="Đăng ký đối tác KOL/KOC"
      close={() => {
        if (!busy) close();
      }}
    >
      <Caption>
        Hồ sơ được kích hoạt sau khi vận hành thẩm định. KOL mới bắt đầu ở bậc
        Đồng.
      </Caption>
      <Choice
        label="Hồ sơ gồm 3 bước"
        value={String(step)}
        disabled={busy}
        options={["Định danh", "Kênh xã hội", "Ngân hàng"].map((label, i) => ({
          value: String(i),
          label: `${i + 1}. ${label}`,
        }))}
        onChange={(value) => setStep(Number(value))}
      />
      {step === 0 && (
        <>
          {field("idCardNumber", "CCCD · 12 chữ số *")}
          {field("taxCode", "Mã số thuế (nếu có)")}
          {field("bio", "Giới thiệu năng lực")}
          <MediaPicker
            label="Ảnh CCCD mặt trước *"
            disabled={busy}
            onBusyChange={setUploading}
            onUploaded={(frontCardUrl) =>
              setDraft((old) => ({ ...old, frontCardUrl }))
            }
          />
          <MediaPicker
            label="Ảnh CCCD mặt sau *"
            disabled={busy}
            onBusyChange={setUploading}
            onUploaded={(backCardUrl) =>
              setDraft((old) => ({ ...old, backCardUrl }))
            }
          />
          <Evidence
            urls={[draft.frontCardUrl, draft.backCardUrl].filter(Boolean)}
          />
        </>
      )}
      {step === 1 && (
        <>
          <Caption>Ngành hàng sở trường giúp Shop tìm đúng đối tác.</Caption>
          <QueryState
            loading={categories.isLoading}
            error={categories.error}
            retry={() => void categories.refetch()}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(categories.data || []).map((category) => (
              <Pressable
                key={category.name}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: draft.specialtyCategories.includes(category.name),
                  disabled: busy,
                }}
                disabled={busy}
                style={{
                  flexBasis: "48%",
                  flexGrow: 1,
                  minHeight: 42,
                  padding: 10,
                  borderWidth: 1,
                  borderRadius: 10,
                  justifyContent: "center",
                  borderColor: draft.specialtyCategories.includes(category.name)
                    ? colors.brand
                    : colors.line,
                  backgroundColor: draft.specialtyCategories.includes(
                    category.name,
                  )
                    ? colors.soft
                    : colors.white,
                }}
                onPress={() =>
                  setDraft((old) => ({
                    ...old,
                    specialtyCategories: old.specialtyCategories.includes(
                      category.name,
                    )
                      ? old.specialtyCategories.filter(
                          (name) => name !== category.name,
                        )
                      : [...old.specialtyCategories, category.name],
                  }))
                }
              >
                <Text
                  style={{ color: colors.ink, fontSize: 12, lineHeight: 18 }}
                >
                  {draft.specialtyCategories.includes(category.name)
                    ? "✓ "
                    : ""}
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field
            label="Phong cách nội dung (cách nhau bằng dấu phẩy)"
            value={draft.contentStyles.join(", ")}
            editable={!operation.busy}
            onChangeText={(value) =>
              setDraft((old) => ({
                ...old,
                contentStyles: value.split(",").map((style) => style.trim()),
              }))
            }
          />
          {draft.channels.map((channel, i) => (
            <View
              key={i}
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: 14,
                gap: 12,
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: "700" }}>
                Kênh {i + 1}
                {i === 0 ? " · Kênh chính" : ""}
              </Text>
              <SelectField
                compact
                label="Nền tảng"
                value={channel.platform}
                disabled={busy}
                options={platforms.map((value) => ({ value, label: value }))}
                onChange={(platform) =>
                  setDraft((old) => ({
                    ...old,
                    channels: old.channels.map((ch, index) =>
                      index === i
                        ? {
                            ...ch,
                            platform: platform as typeof channel.platform,
                          }
                        : ch,
                    ),
                  }))
                }
              />
              {(
                [
                  ["channelName", "Tên kênh *"],
                  ["channelUrl", "URL kênh chính chủ (HTTPS) *"],
                  ["followerCount", "Số người theo dõi *"],
                ] as const
              ).map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={String(channel[key])}
                  editable={!operation.busy}
                  autoCapitalize="none"
                  keyboardType={key === "followerCount" ? "numeric" : "default"}
                  onChangeText={(value) =>
                    setDraft((old) => ({
                      ...old,
                      channels: old.channels.map((ch, index) =>
                        index === i
                          ? {
                              ...ch,
                              [key]:
                                key === "followerCount"
                                  ? value === ""
                                    ? 0
                                    : Number(value)
                                  : value,
                            }
                          : ch,
                      ),
                    }))
                  }
                />
              ))}
              <MediaPicker
                label="Ảnh quản trị chứng minh sở hữu kênh *"
                disabled={busy}
                onBusyChange={setUploading}
                onUploaded={(channelProofUrl) =>
                  setDraft((old) => ({
                    ...old,
                    channels: old.channels.map((ch, index) =>
                      index === i ? { ...ch, channelProofUrl } : ch,
                    ),
                  }))
                }
              />
              <Evidence urls={[channel.channelProofUrl].filter(Boolean)} />
              {i > 0 && (
                <Button
                  title="Bỏ kênh này"
                  secondary
                  disabled={operation.busy}
                  onPress={() =>
                    setDraft((old) => ({
                      ...old,
                      channels: old.channels.filter((_, index) => index !== i),
                    }))
                  }
                />
              )}
            </View>
          ))}
          <Button
            title="Thêm kênh xã hội"
            secondary
            disabled={operation.busy || draft.channels.length >= 5}
            onPress={() =>
              setDraft((old) => ({
                ...old,
                channels: [
                  ...old.channels,
                  {
                    platform: "TIKTOK",
                    channelName: "",
                    channelUrl: "",
                    followerCount: 0,
                    channelProofUrl: "",
                    isPrimary: false,
                  },
                ],
              }))
            }
          />
        </>
      )}
      {step === 2 && (
        <>
          <Caption>
            Có thể bổ sung ngân hàng sau. Nếu nhập, cần đủ thông tin tài khoản
            chính chủ.
          </Caption>
          {field("bankName", "Ngân hàng")}
          {field("bankAccountNumber", "Số tài khoản")}
          {field("bankAccountName", "Tên chủ tài khoản")}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed, disabled: operation.busy }}
            disabled={operation.busy}
            onPress={() => setAgreed((value) => !value)}
            style={{ paddingVertical: 12 }}
          >
            <Text style={{ color: colors.ink, lineHeight: 22 }}>
              {agreed ? "☑" : "☐"} Tôi xác nhận thông tin và kênh là của tôi,
              đồng ý gửi hồ sơ để thẩm định.
            </Text>
          </Pressable>
        </>
      )}
      <ErrorNotice error={operation.error} />
      {step < 2 ? (
        <Button
          title="Tiếp tục"
          disabled={busy}
          onPress={() => setStep((value) => value + 1)}
        />
      ) : (
        <Button
          title="Gửi hồ sơ KOL"
          disabled={!agreed || uploading}
          loading={operation.busy}
          onPress={() =>
            void operation.run(async () => {
              await service.submit({
                ...draft,
                contentStyles: draft.contentStyles.filter(Boolean),
              });
              await saved();
              close();
            })
          }
        />
      )}
      {step > 0 && (
        <Button
          title="Quay lại"
          secondary
          disabled={operation.busy}
          onPress={() => setStep((value) => value - 1)}
        />
      )}
    </BottomSheet>
  );
}

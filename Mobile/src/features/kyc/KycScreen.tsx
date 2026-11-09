import { CompactEvidence as Evidence } from "../common/CompactEvidence";
import { useState } from "react";
import { Text } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  ErrorNotice,
  Field,
  Screen,
} from "../../components/ui";
import {
  Choice,
  CompactCommandForm as CommandForm,
  QueryState,
  CompactSheet as Sheet,
  https,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import {
  ExpandableRecord,
  FilterTabs,
  InfoLine as DetailLine,
  SectionTitle as Title,
} from "../../components/RecordList";
import { MediaPicker } from "../common/MediaPicker";
import { validateInput } from "../../utils/validate-input";
const Meta = z.object({
  frontCardUrl: z.string().nullish(),
  backCardUrl: z.string().nullish(),
  channelProofUrl: z.string().nullish(),
  businessLicenseUrl: z.string().nullish(),
  brandAuthorizationUrl: z.string().nullish(),
  rejectionReason: z.string().nullish(),
});
const Kyc = z.object({
  id: z.string(),
  userId: z.string(),
  kycStatus: z.string(),
  idCardNumber: z.string().nullish(),
  taxCode: z.string().nullish(),
  bankName: z.string().nullish(),
  bankAccountNumber: z.string().nullish(),
  bankAccountName: z.string().nullish(),
  bio: z.string().nullish(),
  socialLinksJson: Meta.nullish(),
  user: z.object({ fullName: z.string(), email: z.string() }).optional(),
  tier: z.object({ name: z.string() }).nullish(),
});
const ShopMetadata = Meta.extend({
  taxCode: z.string().nullish(),
  warehouseAddress: z.string().nullish(),
  businessType: z.string().nullish(),
  contactPhone: z.string().nullish(),
  contactEmail: z.string().nullish(),
  bankName: z.string().nullish(),
  bankAccountNumber: z.string().nullish(),
  bankAccountName: z.string().nullish(),
  idCardNumber: z.string().nullish(),
});
const Shop = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string().optional(),
  onboardingStatus: z.string(),
  onboardingReviewNote: z.string().nullish(),
  onboardingData: ShopMetadata.nullish(),
});
const Applications = z.object({
  kolApplications: z.array(Kyc),
  shopApplications: z.array(Shop),
});
const Submit = z.object({
  idCardNumber: z.string().regex(/^\d{12}$/, "CCCD cần 12 chữ số."),
  taxCode: required.max(30),
  bankName: required.max(100),
  bankAccountNumber: required.max(50),
  bankAccountName: required.max(150),
  bio: z.string().max(1000),
  frontCardUrl: https,
  backCardUrl: https,
});
export function KycScreen({
  pendingOnly = false,
}: { pendingOnly?: boolean } = {}) {
  const [onlyPending, setOnlyPending] = useState(pendingOnly);
  const { reviewer, user } = useActor(),
    command = useCommand(),
    [form, setForm] = useState<CommandFormSpec | null>(null),
    [edit, setEdit] = useState(false);
  const result = useResource(
    "kyc-applications",
    "/kyc/admin/applications",
    Applications,
    reviewer,
  );
  const own = useResource(
    "my-kyc",
    "/kyc/profile",
    Kyc.nullable(),
    !reviewer && user.role === "COLLABORATOR",
  );
  const shop = useResource(
    "my-shop-kyc",
    "/stores/my-store",
    Shop,
    user.role === "SHOP_MANAGER",
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const decision = (id: string, kind: "kol" | "shop") =>
    setForm({
      title: "Quyết định hồ sơ KYC",
      path: `/kyc/admin/${kind}/${id}/review`,
      fields: [
        {
          key: "status",
          label: "Quyết định",
          options: [
            { value: "VERIFIED", label: "Duyệt xác minh" },
            ...(kind === "shop"
              ? [{ value: "NEEDS_INFO", label: "Yêu cầu bổ sung" }]
              : []),
            { value: "REJECTED", label: "Từ chối" },
          ],
        },
        { key: "note", label: "Nhận xét và căn cứ", multiline: true },
      ],
      schema: z.object({
        status: z.enum(["VERIFIED", "NEEDS_INFO", "REJECTED"]),
        note: required.min(10).max(1000),
      }),
    });
  const kolRows = result.data?.kolApplications.filter(
    (item) =>
      !onlyPending ||
      (item.kycStatus === "UNVERIFIED" && Boolean(item.idCardNumber)),
  );
  const shopRows = result.data?.shopApplications.filter(
    (item) => !onlyPending || item.onboardingStatus === "PENDING_APPROVAL",
  );
  return (
    <Screen scroll compact>
      <QueryState
        loading={result.isLoading || own.isLoading || shop.isLoading}
        error={result.error || own.error || shop.error}
        retry={() => {
          if (reviewer) void result.refetch();
          else if (user.role === "SHOP_MANAGER") void shop.refetch();
          else void own.refetch();
        }}
      />
      {reviewer && (
        <>
          <FilterTabs
            label="Danh sách hồ sơ"
            value={onlyPending ? "pending" : "all"}
            options={[
              { value: "pending", label: "Chờ duyệt" },
              { value: "all", label: "Tất cả" },
            ]}
            onChange={(value) => setOnlyPending(value === "pending")}
          />
          <Title>Nhà sáng tạo</Title>
          {kolRows?.length === 0 && (
            <Caption>
              {onlyPending
                ? "Không có hồ sơ KOL chờ duyệt."
                : "Chưa có hồ sơ KOL."}
            </Caption>
          )}
          {kolRows?.map((item) => (
            <ExpandableRecord
              key={item.id}
              title={item.user?.fullName || item.user?.email || "Hồ sơ KOL"}
              subtitle={item.user?.email}
              badge={
                item.kycStatus === "VERIFIED"
                  ? "Đã xác minh"
                  : item.kycStatus === "REJECTED"
                    ? "Đã từ chối"
                    : item.idCardNumber
                      ? "Chờ xác minh"
                      : "Chưa nộp hồ sơ"
              }
              icon="user-check"
              disabled={command.busy}
            >
              <DetailLine label="CCCD" value={item.idCardNumber} />
              <DetailLine label="Mã số thuế" value={item.taxCode} />
              <Text>{item.bio}</Text>
              <Evidence
                urls={Object.values(item.socialLinksJson || {}).filter(
                  (value): value is string =>
                    typeof value === "string" && value.startsWith("https://"),
                )}
              />
              <Button
                title="Duyệt/Từ chối hồ sơ"
                onPress={() => decision(item.id, "kol")}
              />
            </ExpandableRecord>
          ))}
          <Title>Gian hàng</Title>
          {shopRows?.length === 0 && (
            <Caption>
              {onlyPending
                ? "Không có gian hàng chờ duyệt."
                : "Chưa có hồ sơ gian hàng."}
            </Caption>
          )}
          {shopRows?.map((item) => (
            <ExpandableRecord
              key={item.id}
              title={item.name}
              badge={
                item.onboardingStatus === "VERIFIED"
                  ? "Đã xác minh"
                  : item.onboardingStatus === "PENDING_APPROVAL"
                    ? "Chờ duyệt"
                    : item.onboardingStatus === "NEEDS_INFO"
                      ? "Cần bổ sung"
                      : "Đã từ chối"
              }
              icon="shopping-bag"
              disabled={command.busy}
            >
              <DetailLine
                label="Mã số thuế"
                value={item.onboardingData?.taxCode}
              />
              <DetailLine
                label="Địa chỉ kho"
                value={item.onboardingData?.warehouseAddress}
              />
              <Evidence
                urls={Object.values(item.onboardingData || {}).filter(
                  (value): value is string =>
                    typeof value === "string" && value.startsWith("https://"),
                )}
              />
              <Text>{item.onboardingReviewNote}</Text>
              <Button
                title="Xét duyệt gian hàng"
                onPress={() => decision(item.id, "shop")}
              />
            </ExpandableRecord>
          ))}
        </>
      )}
      {user.role === "SHOP_MANAGER" && shop.data && (
        <>
          <Title>{shop.data.name}</Title>
          <Badge>{shop.data.onboardingStatus}</Badge>
          <Text>{shop.data.onboardingReviewNote}</Text>
          <Caption>
            Thông tin doanh nghiệp và kho hàng được cập nhật tại Cài đặt gian
            hàng.
          </Caption>
          {shop.data.ownerId === user.id &&
            ["DRAFT", "NEEDS_INFO", "REJECTED"].includes(
              shop.data.onboardingStatus,
            ) && <ShopApplication shop={shop.data} />}
        </>
      )}
      {!reviewer && user.role === "COLLABORATOR" && (
        <>
          <Badge>{own.data?.kycStatus || "Chưa nộp hồ sơ"}</Badge>
          <DetailLine label="Cấp bậc" value={own.data?.tier?.name} />
          <Text>{own.data?.socialLinksJson?.rejectionReason}</Text>
          <Button
            title="Nộp/Cập nhật hồ sơ KYC"
            onPress={() => {
              const current = own.data;
              setValues({
                idCardNumber: current?.idCardNumber || "",
                taxCode: current?.taxCode || "",
                bankName: current?.bankName || "",
                bankAccountNumber: current?.bankAccountNumber || "",
                bankAccountName: current?.bankAccountName || "",
                bio: current?.bio || "",
                frontCardUrl: current?.socialLinksJson?.frontCardUrl || "",
                backCardUrl: current?.socialLinksJson?.backCardUrl || "",
              });
              setEdit(true);
            }}
          />
        </>
      )}
      <ErrorNotice error={command.error} />
      {edit && (
        <Sheet
          title="Hồ sơ KYC nhà sáng tạo"
          close={() => {
            if (!command.busy) setEdit(false);
          }}
        >
          {[
            ["idCardNumber", "Số CCCD"],
            ["taxCode", "Mã số thuế"],
            ["bankName", "Ngân hàng"],
            ["bankAccountNumber", "Số tài khoản"],
            ["bankAccountName", "Tên chủ tài khoản"],
            ["bio", "Giới thiệu"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={values[key] || ""}
              onChangeText={(value) =>
                setValues((old) => ({ ...old, [key]: value }))
              }
              editable={!command.busy}
            />
          ))}
          <MediaPicker
            label="Ảnh CCCD mặt trước"
            disabled={command.busy}
            onUploaded={(frontCardUrl) =>
              setValues((old) => ({ ...old, frontCardUrl }))
            }
          />
          <MediaPicker
            label="Ảnh CCCD mặt sau"
            disabled={command.busy}
            onUploaded={(backCardUrl) =>
              setValues((old) => ({ ...old, backCardUrl }))
            }
          />
          <Evidence
            urls={[values.frontCardUrl, values.backCardUrl].filter(Boolean)}
          />
          <ErrorNotice error={command.error} />
          <Button
            title="Gửi hồ sơ xác minh"
            loading={command.busy}
            onPress={() =>
              void command.execute(
                "/kyc/submit",
                "PUT",
                () => validateInput(Submit, values),
                () => setEdit(false),
              )
            }
          />
        </Sheet>
      )}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
const ShopInput = z.object({
  shopName: required.max(200),
  warehouseAddress: required.min(10).max(500),
  businessType: z.enum(["INDIVIDUAL", "HOUSEHOLD", "ENTERPRISE"]),
  taxCode: required.max(30),
  contactPhone: required.regex(/^\+?\d{9,15}$/),
  contactEmail: z.string().email(),
  bankName: required.max(100),
  bankAccountNumber: required.max(50),
  bankAccountName: required.max(150),
  idCardNumber: z.string().regex(/^\d{12}$/),
  frontCardUrl: https,
  backCardUrl: https,
  businessLicenseUrl: https,
});
function ShopApplication({ shop }: { shop: z.infer<typeof Shop> }) {
  const command = useCommand(),
    [edit, setEdit] = useState(false);
  const fields = [
    ["shopName", "Tên gian hàng"],
    ["warehouseAddress", "Kho xuất (số nhà, phường, huyện, tỉnh)"],
    ["taxCode", "Mã số thuế"],
    ["contactPhone", "Hotline"],
    ["contactEmail", "Email liên hệ"],
    ["bankName", "Ngân hàng"],
    ["bankAccountNumber", "Số tài khoản"],
    ["bankAccountName", "Chủ tài khoản"],
    ["idCardNumber", "CCCD người đại diện"],
  ];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries([
      ...fields.map(([key]) => [
        key,
        key === "shopName"
          ? shop.name
          : shop.onboardingData?.[key as keyof z.infer<typeof ShopMetadata>] ||
            "",
      ]),
      ["businessType", shop.onboardingData?.businessType || "ENTERPRISE"],
      ["frontCardUrl", shop.onboardingData?.frontCardUrl || ""],
      ["backCardUrl", shop.onboardingData?.backCardUrl || ""],
      ["businessLicenseUrl", shop.onboardingData?.businessLicenseUrl || ""],
    ]),
  );
  return (
    <>
      <Button
        title="Bổ sung & gửi lại hồ sơ doanh nghiệp"
        secondary
        onPress={() => setEdit(true)}
      />
      {edit && (
        <Sheet
          title="Hồ sơ doanh nghiệp"
          close={() => {
            if (!command.busy) setEdit(false);
          }}
        >
          {fields.map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={values[key]}
              editable={!command.busy}
              onChangeText={(value) =>
                setValues((old) => ({ ...old, [key]: value }))
              }
            />
          ))}
          <Choice
            label="Loại hình"
            value={values.businessType}
            disabled={command.busy}
            onChange={(businessType) =>
              setValues((old) => ({ ...old, businessType }))
            }
            options={[
              { value: "INDIVIDUAL", label: "Cá nhân" },
              { value: "HOUSEHOLD", label: "Hộ kinh doanh" },
              { value: "ENTERPRISE", label: "Doanh nghiệp" },
            ]}
          />
          {[
            ["frontCardUrl", "Ảnh CCCD mặt trước"],
            ["backCardUrl", "Ảnh CCCD mặt sau"],
            ["businessLicenseUrl", "Giấy phép kinh doanh"],
          ].map(([key, label]) => (
            <MediaPicker
              key={key}
              label={label}
              disabled={command.busy}
              onUploaded={(url) => setValues((old) => ({ ...old, [key]: url }))}
            />
          ))}
          <Evidence
            urls={[
              values.frontCardUrl,
              values.backCardUrl,
              values.businessLicenseUrl,
            ].filter(Boolean)}
          />
          <ErrorNotice error={command.error} />
          <Button
            title="Gửi lại hồ sơ xét duyệt"
            loading={command.busy}
            onPress={() =>
              void command.execute(
                "/kyc/upgrade/shop",
                "POST",
                () => validateInput(ShopInput, values),
                () => setEdit(false),
              )
            }
          />
        </Sheet>
      )}
    </>
  );
}

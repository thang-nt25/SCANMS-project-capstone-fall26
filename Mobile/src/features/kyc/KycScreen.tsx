import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image, Pressable, Text, View } from "react-native";
import { EvidenceViewer } from "../../components/EvidenceViewer";
import { imageSource } from "../../services/image-source";
import { BankSelect } from "../../components/BankSelect";
import { BottomSheet } from "../../components/BottomSheet";
import { Avatar, Icon } from "../../components/commerce";
import { bankStoredName, loadBankCatalog } from "../../services/bank-catalog";
import { colors } from "../../theme/tokens";
import { profileStyles as ps } from "../account/profile-styles";
import { z } from "zod";
import {
  Badge,
  Button,
  Card,
  ErrorNotice,
  Field,
  Screen,
  Title,
} from "../../components/ui";
import {
  Choice,
  CommandForm,
  DetailLine,
  Evidence,
  QueryState,
  Sheet,
  https,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import { MediaPicker } from "../common/MediaPicker";
import { validateInput } from "../../utils/validate-input";
import { statusText } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
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
export function KycScreen() {
  const navigation = useMobileNavigation();
  const [bankDetails, setBankDetails] = useState(false);
  const { reviewer, user } = useActor(),
    command = useCommand(),
    [form, setForm] = useState<CommandFormSpec | null>(null),
    [edit, setEdit] = useState(false),
    [step, setStep] = useState(0);
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
  return (
    <Screen scroll>
      {reviewer && <Title>Hồ sơ xác minh KYC</Title>}
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
          <Title>Nhà sáng tạo</Title>
          {result.data?.kolApplications.map((item) => (
            <Card key={item.id}>
              <Title>{item.user?.fullName || item.user?.email}</Title>
              <Badge>{item.kycStatus}</Badge>
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
            </Card>
          ))}
          <Title>Gian hàng</Title>
          {result.data?.shopApplications.map((item) => (
            <Card key={item.id}>
              <Title>{item.name}</Title>
              <Badge>{item.onboardingStatus}</Badge>
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
            </Card>
          ))}
        </>
      )}
      {user.role === "SHOP_MANAGER" && shop.data && (
        <>
          <View style={ps.card}>
            <View style={ps.inline}><View style={ps.icon}><Icon name="shield" size={22} color={colors.strong} /></View><View style={{ flex: 1, gap: 4 }}><Text style={ps.title}>{shop.data.name}</Text><Text style={ps.note}>Hồ sơ gian hàng</Text></View></View>
            <View style={[ps.row, ps.line]}><Text style={ps.note}>Trạng thái hồ sơ</Text><Text style={ps.tag}>{statusText(shop.data.onboardingStatus)}</Text></View>
            <View style={[ps.row, ps.line]}><View style={ps.inline}><Icon name="file-text" size={16} color={colors.strong} /><Text style={ps.note}>Mã số thuế</Text></View><Text selectable style={[ps.label, { flex: 1, textAlign: "right" }]}>{shop.data.onboardingData?.taxCode?.trim() || "Chưa bổ sung"}</Text></View>
            <View style={[ps.row, ps.line]}><View style={ps.inline}><Icon name="map-pin" size={16} color={colors.strong} /><Text style={ps.note}>Kho hàng</Text></View><Text style={[ps.label, { flex: 1, textAlign: "right" }]}>{shop.data.onboardingData?.warehouseAddress?.trim() || "Chưa bổ sung"}</Text></View>
            {(!shop.data.onboardingData?.taxCode?.trim() || !shop.data.onboardingData?.warehouseAddress?.trim()) && <Text style={ps.note}>Thông tin hiện tại còn thiếu: {[!shop.data.onboardingData?.taxCode?.trim() && "mã số thuế", !shop.data.onboardingData?.warehouseAddress?.trim() && "địa chỉ kho"].filter(Boolean).join(", ")}. Trạng thái xét duyệt đã lưu được giữ nguyên.</Text>}
            <Button title={!shop.data.onboardingData?.taxCode?.trim() || !shop.data.onboardingData?.warehouseAddress?.trim() ? "Bổ sung hồ sơ" : "Cập nhật hồ sơ"} soft onPress={() => navigation.navigate("Business", { feature: "shop" })} />
          </View>
          {shop.data.ownerId === user.id &&
            ["DRAFT", "NEEDS_INFO", "REJECTED"].includes(
              shop.data.onboardingStatus,
            ) && <ShopApplication shop={shop.data} />}
        </>
      )}
      {!reviewer && user.role === "COLLABORATOR" && (
        <>
          <View style={ps.card}>
            <View style={[ps.inline, { gap: 12 }]}><Avatar uri={user.avatarUrl} name={user.fullName} size={48} /><View style={{ flex: 1, minWidth: 0, gap: 7 }}><Text style={ps.title}>{user.fullName}</Text><View style={[ps.inline, { alignSelf: "flex-start", gap: 5, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.soft }]}><Icon name={own.data?.kycStatus === "VERIFIED" ? "check-circle" : "shield"} size={13} color={colors.strong} /><Text style={[ps.note, { color: colors.strong, fontSize: 11 }]}>{own.isLoading ? "Đang tải hồ sơ…" : own.error ? "Chưa tải được hồ sơ" : own.data ? statusText(own.data.kycStatus) : "Chưa nộp hồ sơ"}</Text></View></View></View>
            <View style={[ps.row, ps.line, { alignItems: "stretch" }]}>{[{ label: "CCCD", icon: "file-text" as const, value: own.data?.idCardNumber ? `•••• ${own.data.idCardNumber.slice(-4)}` : "Chưa bổ sung" }, { label: "Cấp bậc", icon: "award" as const, value: own.data?.tier?.name || "Chưa có dữ liệu" }].map(item => <View key={item.label} style={{ flex: 1, gap: 7, padding: 11, borderRadius: 11, backgroundColor: colors.canvas }}><View style={[ps.inline, { gap: 5 }]}><Icon name={item.icon} size={14} color={colors.strong} /><Text style={ps.note}>{item.label}</Text></View><Text style={ps.label}>{item.value}</Text></View>)}</View>
            {own.data?.socialLinksJson?.rejectionReason && <Text style={[ps.note, { color: colors.danger }]}>{own.data.socialLinksJson.rejectionReason}</Text>}
          </View>
          <KycBeneficiary bankName={own.data?.bankName} accountNumber={own.data?.bankAccountNumber} accountName={own.data?.bankAccountName} details={bankDetails} toggle={() => setBankDetails(value => !value)} />
          <Button
            title={own.data ? "Cập nhật hồ sơ" : "Hoàn thiện hồ sơ"}
            soft
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
              setStep(0);
              setEdit(true);
            }}
          />
          <Text style={[ps.note, { textAlign: "center", fontSize: 11 }]}>{own.data ? "Thay đổi thông tin cần xác minh lại." : "Hoàn thiện thông tin để gửi xét duyệt."}</Text>
        </>
      )}
      <ErrorNotice error={command.error} />
      {edit && (
        <BottomSheet
          title="Hồ sơ KYC nhà sáng tạo"
          close={() => {
            if (!command.busy) setEdit(false);
          }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>{["Định danh", "Ngân hàng", "Giới thiệu"].map((label, index) => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: step === index }} disabled={command.busy} onPress={() => setStep(index)} style={[ps.tab, { minHeight: 52, gap: 4 }, step === index && ps.active]}><Text style={[ps.note, { fontSize: 10, color: step === index ? colors.strong : colors.muted }]}>Bước {index + 1}</Text><Text style={[ps.label, { fontSize: 12 }]}>{label}</Text></Pressable>)}</View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.canvas }}><Icon name="info" size={15} color={colors.strong} /><Text style={[ps.note, { flex: 1, fontSize: 11 }]}>{["CCCD rõ nét, đủ bốn góc và khớp thông tin.", "Tài khoản chính chủ, khớp hồ sơ định danh.", "Giới thiệu nội dung và lĩnh vực sáng tạo."][step]}</Text></View>
          {step === 1 && <BankSelect value={values.bankName || ""} disabled={command.busy} onChange={(bankName) => setValues(old => ({ ...old, bankName }))} />}
          {(step === 0 ? [["idCardNumber", "Số CCCD *"], ["taxCode", "Mã số thuế *"]] : step === 1 ? [["bankAccountNumber", "Số tài khoản *"], ["bankAccountName", "Tên chủ tài khoản *"]] : [["bio", "Giới thiệu"]]).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={values[key] || ""}
              onChangeText={(value) =>
                setValues((old) => ({ ...old, [key]: value }))
              }
              style={[ps.input, key === "bio" && { minHeight: 104, textAlignVertical: "top" }]}
              maxLength={key === "bio" ? 1000 : undefined}
              multiline={key === "bio" || key === "bankName"}
              keyboardType={["idCardNumber", "taxCode", "bankAccountNumber"].includes(key) ? "number-pad" : "default"}
              placeholder={key === "bio" ? "Nội dung, lĩnh vực và phong cách sáng tạo…" : `Nhập ${label.replace(" *", "").toLowerCase()}`}
              editable={!command.busy}
            />
          ))}
          {step === 2 && <Text style={[ps.note, { textAlign: "right" }]}>{(values.bio || "").length}/1000 ký tự</Text>}
          {step === 0 && <>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <KycDocumentCard label="Mặt trước" uri={values.frontCardUrl} disabled={command.busy} onUploaded={frontCardUrl => setValues(old => ({ ...old, frontCardUrl }))} />
            <KycDocumentCard label="Mặt sau" uri={values.backCardUrl} disabled={command.busy} onUploaded={backCardUrl => setValues(old => ({ ...old, backCardUrl }))} />
          </View>
          <Text style={[ps.note, { fontSize: 11 }]}>Chọn ảnh gốc từ thư viện · tối đa 5 MB mỗi ảnh.</Text>
          </>}
          <ErrorNotice error={command.error} />
          <View style={{ flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
          {step > 0 && <View style={{ flex: 1 }}><Button title="Quay lại" secondary disabled={command.busy} onPress={() => setStep(step - 1)} /></View>}
          <View style={{ flex: 2 }}>
          {step < 2 ? <Button title="Tiếp tục" soft onPress={() => setStep(step + 1)} /> : <Button
            title="Gửi hồ sơ xác minh"
            soft
            loading={command.busy}
            onPress={() =>
              void command.execute(
                "/kyc/submit",
                "PUT",
                () => validateInput(Submit, values),
                () => setEdit(false),
              )
            }
          />}
          </View></View>
        </BottomSheet>
      )}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}
function KycBeneficiary({ bankName, accountNumber, accountName, details, toggle }: { bankName?: string | null; accountNumber?: string | null; accountName?: string | null; details: boolean; toggle(): void }) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const banks = useQuery({ queryKey: ["public", "vietqr-banks"], queryFn: ({ signal }) => loadBankCatalog(signal), staleTime: 86400000, enabled: Boolean(bankName), retry: 1 });
  const name = bankName?.trim() || "";
  const normalized = name.toLocaleLowerCase("vi");
  const bank = banks.data?.find(item => bankStoredName(item).toLocaleLowerCase("vi") === normalized || item.name.toLocaleLowerCase("vi") === normalized || item.shortName.toLocaleLowerCase("vi") === normalized || normalized.startsWith(`${item.shortName.toLocaleLowerCase("vi")} (`));
  return <View style={ps.card}>
    <View style={ps.inline}><View style={ps.icon}><Icon name="credit-card" size={18} color={colors.strong} /></View><Text style={[ps.label, { flex: 1 }]}>Ngân hàng thụ hưởng</Text></View>
    <View style={[ps.inline, { gap: 12 }]}><View accessible accessibilityLabel={`Logo ${bank?.shortName || name || "ngân hàng"}`} style={{ width: 60, height: 44, flexShrink: 0, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 5, alignItems: "center", justifyContent: "center" }}>{bank?.logo?.startsWith("https://") && failedLogo !== bank.logo ? <Image source={imageSource(bank.logo)} resizeMode="contain" style={{ width: "100%", height: "100%" }} onError={() => setFailedLogo(bank.logo)} /> : <Icon name="credit-card" size={22} color={colors.strong} />}</View><View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={ps.title}>{bank?.shortName || name.split(" (")[0] || "Chưa bổ sung"}</Text><Text style={[ps.label, { fontSize: 17, letterSpacing: 1 }]}>{accountNumber ? `•••• ${accountNumber.slice(-4)}` : "Chưa có số tài khoản"}</Text></View></View>
    <Text style={[ps.note, { fontSize: 12 }]}>{accountName || "Chưa có tên chủ tài khoản"}</Text>
    {!!name && <><Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} accessibilityLabel={details ? "Thu gọn chi tiết ngân hàng" : "Xem chi tiết ngân hàng"} onPress={toggle} style={[ps.row, ps.line, { minHeight: 44 }]}><Text style={ps.note}>{details ? "Thu gọn" : "Chi tiết ngân hàng"}</Text><Icon name={details ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} /></Pressable>{details && <View style={{ padding: 11, gap: 6, borderRadius: 10, backgroundColor: colors.canvas }}><Text style={ps.note}>{bank?.name || name}</Text>{bank?.bin && <Text style={ps.note}>BIN {bank.bin}</Text>}</View>}</>}
  </View>;
}

function KycDocumentCard({ label, uri, disabled, onUploaded }: { label: string; uri?: string; disabled: boolean; onUploaded(url: string): void }) {
  const [preview, setPreview] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  return <View style={{ flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 10, gap: 8, backgroundColor: colors.white }}>
    <View style={[ps.inline, { gap: 5 }]}><Icon name="file-text" size={14} color={colors.strong} /><Text style={ps.label}>{label}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem ảnh CCCD ${label.toLowerCase()}`} disabled={!uri} onPress={() => setPreview(true)} style={{ width: "100%", aspectRatio: 1.6, borderRadius: 9, backgroundColor: colors.canvas, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      {uri && failed !== uri ? <Image source={imageSource(uri)} resizeMode="contain" onError={() => setFailed(uri)} style={{ width: "100%", height: "100%" }} /> : <><Icon name="image" size={25} color={colors.strong} /><Text style={[ps.note, { fontSize: 10, marginTop: 4 }]}>{uri ? "Bấm xem ảnh gốc" : "Chưa có ảnh"}</Text></>}
    </Pressable>
    <MediaPicker label={`${uri ? "Thay" : "Tải"} ảnh ${label.toLowerCase()}`} hideHint disabled={disabled} onUploaded={onUploaded} renderTrigger={(open, busy) => <Pressable accessibilityRole="button" disabled={busy} onPress={open} style={{ flexDirection: "row", gap: 5, minHeight: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft, borderRadius: 8, borderWidth: 1, borderColor: colors.brandBorder }}><Icon name="camera" size={14} color={colors.strong} /><Text style={[ps.label, { fontSize: 11 }]}>{busy ? "Đang xử lý…" : uri ? "Thay ảnh" : "Tải ảnh"}</Text></Pressable>} />
    {preview && uri && <EvidenceViewer url={uri} close={() => setPreview(false)} />}
  </View>;
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

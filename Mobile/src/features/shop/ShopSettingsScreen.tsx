import { useState } from "react";
import { Text } from "react-native";
import { z } from "zod";
import {
  Badge,
  Button,
  Card,
  ErrorNotice,
  Screen,
  Title,
} from "../../components/ui";
import {
  CommandForm,
  DetailLine,
  QueryState,
  required,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import { MediaPicker } from "../common/MediaPicker";
const Store = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  categoryName: z.string().nullish(),
  policyReturn: z.string().nullish(),
  policyWarranty: z.string().nullish(),
  policyShipping: z.string().nullish(),
  onboardingStatus: z.string().optional(),
  onboardingData: z
    .object({
      companyName: z.string().nullish(),
      contactPhone: z.string().nullish(),
      contactEmail: z.string().nullish(),
      warehouseAddress: z.string().nullish(),
      businessAddress: z.string().nullish(),
      returnWarehouseAddress: z.string().nullish(),
      payoutBankName: z.string().nullish(),
      payoutBankAccountNumber: z.string().nullish(),
      payoutBankAccountName: z.string().nullish(),
    })
    .nullish(),
});
export function ShopSettingsScreen() {
  const result = useResource("shop-settings", "/stores/my-store", Store),
    command = useCommand(),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const item = result.data;
  return (
    <Screen scroll>
      <Title>Cài đặt gian hàng</Title>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {item && (
        <>
          <Title>{item.name}</Title>
          <Badge>{item.onboardingStatus}</Badge>
          <DetailLine label="Ngành hàng" value={item.categoryName} />
          <Text>{item.description}</Text>
          <DetailLine
            label="Kho xuất"
            value={item.onboardingData?.warehouseAddress || item.policyShipping}
          />
          <Button
            title="Sửa thông tin gian hàng"
            secondary
            onPress={() =>
              setForm({
                title: "Thông tin gian hàng",
                path: "/stores/my-store",
                method: "PUT",
                fields: [
                  { key: "name", label: "Tên gian hàng", initial: item.name },
                  {
                    key: "description",
                    label: "Giới thiệu",
                    initial: item.description || "",
                    multiline: true,
                  },
                  {
                    key: "companyName",
                    label: "Tên doanh nghiệp",
                    initial: item.onboardingData?.companyName || "",
                  },
                  {
                    key: "contactPhone",
                    label: "Hotline",
                    initial: item.onboardingData?.contactPhone || "",
                  },
                  {
                    key: "contactEmail",
                    label: "Email hỗ trợ",
                    initial: item.onboardingData?.contactEmail || "",
                  },
                ],
                schema: z.object({
                  name: required.max(200),
                  description: z.string().max(5000),
                  companyName: required.max(200),
                  contactPhone: required.regex(/^\+?[0-9().\-\s]{8,20}$/),
                  contactEmail: z.string().email(),
                }),
              })
            }
          />
          <MediaPicker
            label="Cập nhật logo"
            disabled={command.busy}
            onUploaded={(logoUrl) =>
              void command.execute("/stores/my-store", "PUT", { logoUrl })
            }
          />
          <Button
            title="Cập nhật địa chỉ kho"
            secondary
            onPress={() =>
              setForm({
                title: "Địa chỉ kho",
                path: "/stores/my-store",
                method: "PUT",
                fields: [
                  {
                    key: "warehouseAddress",
                    label: "Kho xuất: số nhà, phường, huyện, tỉnh",
                    initial:
                      item.onboardingData?.warehouseAddress ||
                      item.policyShipping ||
                      "",
                  },
                  {
                    key: "returnWarehouseAddress",
                    label: "Kho nhận trả",
                    initial: item.onboardingData?.returnWarehouseAddress || "",
                  },
                ],
                schema: z.object({
                  warehouseAddress: required
                    .min(10)
                    .max(500)
                    .refine(
                      (value) =>
                        value.split(",").filter((part) => part.trim()).length >=
                        4,
                      "Địa chỉ cần đủ 4 phần, ngăn cách bằng dấu phẩy.",
                    ),
                  returnWarehouseAddress: required.min(10).max(500),
                }),
              })
            }
          />
          <Button
            title="Cập nhật chính sách"
            secondary
            onPress={() =>
              setForm({
                title: "Chính sách gian hàng",
                path: "/stores/my-store",
                method: "PUT",
                fields: [
                  {
                    key: "policyReturn",
                    label: "Đổi trả",
                    initial: item.policyReturn || "",
                    multiline: true,
                  },
                  {
                    key: "policyWarranty",
                    label: "Bảo hành",
                    initial: item.policyWarranty || "",
                    multiline: true,
                  },
                ],
                schema: z.object({
                  policyReturn: required.max(500),
                  policyWarranty: required.max(500),
                }),
              })
            }
          />
          <Card>
            <DetailLine
              label="Ngân hàng chi hoa hồng"
              value={item.onboardingData?.payoutBankName}
            />
            <Button
              title="Cập nhật tài khoản chi trả"
              secondary
              onPress={() =>
                setForm({
                  title: "Ngân hàng chi trả",
                  path: "/stores/my-store",
                  method: "PUT",
                  fields: [
                    {
                      key: "payoutBankName",
                      label: "Ngân hàng",
                      initial: item.onboardingData?.payoutBankName || "",
                    },
                    {
                      key: "payoutBankAccountNumber",
                      label: "Số tài khoản",
                      initial:
                        item.onboardingData?.payoutBankAccountNumber || "",
                    },
                    {
                      key: "payoutBankAccountName",
                      label: "Chủ tài khoản",
                      initial: item.onboardingData?.payoutBankAccountName || "",
                    },
                  ],
                  schema: z.object({
                    payoutBankName: required.max(100),
                    payoutBankAccountNumber: required.max(50),
                    payoutBankAccountName: required.max(150),
                  }),
                })
              }
            />
          </Card>
        </>
      )}
      <ErrorNotice error={command.error} />
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}

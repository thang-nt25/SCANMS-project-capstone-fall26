import { useState } from "react";
import { Text } from "react-native";
import * as Clipboard from "expo-clipboard";
import { z } from "zod";
import {
  Badge,
  Button,
  Caption,
  Card,
  Empty,
  ErrorNotice,
  PageControls,
  Screen,
  Title,
} from "../../components/ui";
import { money, statusText } from "../../types/contracts";
import {
  CommandForm,
  QueryState,
  amount,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
const Coupon = z.object({
  id: z.string(),
  code: z.string().optional(),
  displayCode: z.string().optional(),
  status: z.string().optional(),
  discountType: z.string(),
  discountValue: amount.nullish(),
  minimumOrderAmount: amount.nullish(),
  maximumDiscountAmount: amount.nullish(),
  expiresAt: z.string().nullish(),
  store: z.object({ id: z.string().optional(), name: z.string() }).nullish(),
});
const CouponPage = z.object({
  data: z.array(Coupon),
  meta: z.object({ totalPages: z.number() }),
});
const Code = z
  .string()
  .min(4)
  .max(20)
  .regex(
    /^(?=.*[a-zA-Z])[a-zA-Z0-9]+$/,
    "Mã phải có chữ, chỉ dùng chữ Latin và số.",
  );
const Terms = z
  .object({
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.coerce.number().positive().max(1e12),
    minimumOrderAmount: z.coerce.number().nonnegative().max(1e12),
    maximumDiscountAmount: z.coerce.number().positive().max(1e12),
    budgetTotal: z.coerce.number().positive().max(1e12),
    expiresAt: z.string().datetime({ offset: true }),
  })
  .refine(
    (body) => body.discountType !== "PERCENTAGE" || body.discountValue <= 100,
    "Mức giảm phần trăm không được vượt 100%.",
  );
const termFields = [
  {
    key: "discountType",
    label: "Hình thức giảm",
    initial: "PERCENTAGE",
    options: [
      { value: "PERCENTAGE", label: "Phần trăm" },
      { value: "FIXED_AMOUNT", label: "Số tiền" },
    ],
  },
  { key: "discountValue", label: "Mức giảm", numeric: true },
  {
    key: "minimumOrderAmount",
    label: "Đơn tối thiểu (VNĐ)",
    initial: "0",
    numeric: true,
  },
  { key: "maximumDiscountAmount", label: "Giảm tối đa (VNĐ)", numeric: true },
  { key: "budgetTotal", label: "Ngân sách (VNĐ)", numeric: true },
  {
    key: "expiresAt",
    label: "Hết hạn (ISO có múi giờ)",
    initial: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
];
export function CouponsScreen() {
  const { user, store, reviewer } = useActor(),
    customer = user.role === "CUSTOMER",
    koc = user.role === "COLLABORATOR";
  const command = useCommand(),
    [page, setPage] = useState(1),
    [form, setForm] = useState<CommandFormSpec | null>(null);
  const base = reviewer
    ? "/admin/coupons"
    : koc
      ? "/collaborator/coupons"
      : `/stores/${store?.id}/coupons`;
  const list = useResource(
    "coupons",
    `${base}?page=${page}&limit=20`,
    CouponPage,
    !customer && (user.role !== "SHOP_MANAGER" || Boolean(store)),
  );
  const available = useResource(
    "available-coupons",
    "/coupons/available",
    z.array(Coupon),
    customer,
  );
  const saved = useResource(
    "saved-coupons",
    "/coupons/saved",
    z.array(z.string()),
    customer,
  );
  const eligible = useResource(
    "coupon-stores",
    "/collaborator/coupons/eligible-stores",
    z.array(z.object({ id: z.string(), name: z.string() })),
    koc,
  );
  const reasonForm = (path: string, title: string) =>
    setForm({
      title,
      path,
      fields: [{ key: "reason", label: "Lý do", multiline: true }],
      schema: z.object({ reason: required.min(5).max(255) }),
    });
  return (
    <Screen scroll>
      <Title>Voucher & Coupon</Title>
      <Caption>
        Điều kiện, hạn mức, MAP và quy tắc không chồng voucher được backend kiểm
        tra.
      </Caption>
      {koc && (
        <Button
          title="Đề xuất coupon riêng"
          onPress={() =>
            setForm({
              title: "Đề xuất coupon",
              path: base,
              method: "POST",
              fields: [
                {
                  key: "storeId",
                  label: "Shop đã hợp tác",
                  options: (eligible.data || []).map((item) => ({
                    value: item.id,
                    label: item.name,
                  })),
                },
                { key: "code", label: "Mã đề xuất (4–20 ký tự)" },
                {
                  key: "discountValue",
                  label: "Mức giảm phần trăm đề xuất",
                  numeric: true,
                },
                { key: "note", label: "Mục đích sử dụng", multiline: true },
              ],
              schema: z
                .object({
                  storeId: z.string().uuid(),
                  code: Code,
                  discountValue: z.coerce.number().min(1).max(100),
                  note: required.max(1000),
                })
                .transform((body) => ({
                  ...body,
                  discountType: "PERCENTAGE",
                  scopeType: "STORE_WIDE",
                })),
            })
          }
        />
      )}
      {user.role === "SHOP_MANAGER" && (
        <Button
          title="Tạo voucher Shop"
          disabled={!store}
          onPress={() =>
            setForm({
              title: "Voucher Shop",
              path: base,
              method: "POST",
              fields: [{ key: "code", label: "Mã voucher" }, ...termFields],
              schema: Terms.and(z.object({ code: Code })).transform((body) => ({
                ...body,
                scopeType: "STORE_WIDE",
              })),
            })
          }
        />
      )}
      <QueryState
        loading={list.isLoading || available.isLoading || saved.isLoading}
        error={list.error || available.error || saved.error || eligible.error}
        retry={() => {
          if (customer) {
            void available.refetch();
            void saved.refetch();
          } else void list.refetch();
        }}
      />
      <ErrorNotice error={command.error} />
      {(customer ? available.data : list.data?.data)?.length === 0 && <Empty />}
      {(customer ? available.data : list.data?.data)?.map((item) => (
        <Card key={item.id}>
          <Title>{item.code || item.displayCode}</Title>
          <Caption>{item.store?.name}</Caption>
          <Badge>
            {item.status ? statusText(item.status) : "Đang khả dụng"}
          </Badge>
          <Text>
            {item.discountType === "PERCENTAGE"
              ? `Giảm ${item.discountValue ?? 0}%`
              : `Giảm ${money(item.discountValue)}`}
          </Text>
          <Caption>
            Đơn tối thiểu {money(item.minimumOrderAmount)} · Tối đa{" "}
            {money(item.maximumDiscountAmount)}
          </Caption>
          {item.expiresAt && (
            <Caption>
              Hạn {new Date(item.expiresAt).toLocaleString("vi-VN")}
            </Caption>
          )}
          <Button
            title="Sao chép mã"
            secondary
            loading={command.busy}
            onPress={() =>
              void command.run(() =>
                Clipboard.setStringAsync(item.code || item.displayCode || ""),
              )
            }
          />
          {customer && (
            <Button
              title={
                saved.data?.includes(item.id)
                  ? "Đã lưu · Bỏ lưu"
                  : "Lưu voucher"
              }
              secondary
              loading={command.busy}
              onPress={() =>
                void command.execute(
                  `/coupons/saved/${item.id}`,
                  saved.data?.includes(item.id) ? "DELETE" : "POST",
                )
              }
            />
          )}
          {koc && item.status === "ACTIVE" && (
            <Button
              title="Tạm dừng coupon"
              secondary
              onPress={() =>
                reasonForm(`${base}/${item.id}/pause`, "Tạm dừng coupon")
              }
            />
          )}
          {user.role === "SHOP_MANAGER" && item.status === "PENDING" && (
            <>
              <Button
                title="Duyệt & cấp ngân sách"
                onPress={() =>
                  setForm({
                    title: "Duyệt coupon",
                    path: `${base}/${item.id}/approve`,
                    fields: termFields,
                    schema: Terms,
                  })
                }
              />
              <Button
                title="Từ chối"
                secondary
                onPress={() =>
                  reasonForm(`${base}/${item.id}/reject`, "Từ chối coupon")
                }
              />
            </>
          )}
          {(reviewer || user.role === "SHOP_MANAGER") &&
            !["BLOCKED", "DELETED"].includes(item.status || "") && (
              <Button
                title="Khóa coupon"
                secondary
                onPress={() =>
                  reasonForm(`${base}/${item.id}/block`, "Khóa coupon")
                }
              />
            )}
          {reviewer && item.status === "BLOCKED" && (
            <Button
              title="Mở khóa coupon"
              secondary
              loading={command.busy}
              onPress={() => void command.execute(`${base}/${item.id}/unblock`)}
            />
          )}
        </Card>
      ))}
      {!customer && (
        <PageControls
          page={page}
          totalPages={list.data?.meta.totalPages || 1}
          loading={list.isFetching}
          onChange={setPage}
        />
      )}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}

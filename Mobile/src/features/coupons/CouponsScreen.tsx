import { useState } from "react";
import { Text, View } from "react-native";
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
import { colors } from "../../theme/tokens";
import {
  Choice,
  CommandForm,
  QueryState,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
  type FormField,
} from "../common/shared";
import { couponActions, isCustomerKolCoupon } from "./coupon-policy";
import {
  CouponSchema,
  CouponPageSchema,
  CouponTermsSchema,
  ProposalSchema,
  type Coupon,
} from "./coupon-contracts";

const filters = [
  { value: "", label: "Tất cả" },
  { value: "PENDING_APPROVAL", label: "Chờ duyệt" },
  { value: "ACTIVE", label: "Đang dùng" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "BLOCKED", label: "Đã khóa" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "EXPIRED", label: "Hết hạn" },
];

function termFields(item: Coupon): FormField[] {
  const fields: FormField[] = [
    {
      key: "discountType",
      label: "Hình thức giảm",
      initial: item.discountType,
      options: [
        { value: "PERCENTAGE", label: "Phần trăm" },
        { value: "FIXED_AMOUNT", label: "Số tiền" },
      ],
    },
  ];
  for (const [key, label, initial] of [
    ["discountValue", "Mức giảm", item.discountValue ?? 10],
    ["minimumOrderAmount", "Đơn tối thiểu (VNĐ)", item.minimumOrderAmount ?? 0],
    [
      "maximumDiscountAmount",
      "Giảm tối đa (VNĐ)",
      item.maximumDiscountAmount ?? 50000,
    ],
    ["budgetTotal", "Ngân sách (VNĐ)", item.budgetTotal ?? 1000000],
    ["usageLimitTotal", "Tổng số lượt dùng", item.usageLimitTotal ?? 100],
    [
      "usageLimitPerCustomer",
      "Số lượt mỗi khách",
      item.usageLimitPerCustomer ?? 1,
    ],
  ] as const)
    fields.push({ key, label, numeric: true, initial: String(initial) });
  fields.push({
    key: "expiresAt",
    label: "Hết hạn (ISO có múi giờ, ví dụ 2026-12-01T23:59:00+07:00)",
    initial:
      item.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  return fields;
}

export function CouponsScreen() {
  const { user, store, reviewer } = useActor();
  const customer = user.role === "CUSTOMER",
    koc = user.role === "COLLABORATOR";
  const command = useCommand();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState<CommandFormSpec | null>(null);
  const base = reviewer
    ? "/admin/coupons"
    : koc
      ? "/collaborator/coupons"
      : `/stores/${store?.id}/coupons`;
  const list = useResource(
    "kol-coupon-management-v2",
    `${base}?page=${page}&limit=20${status ? `&status=${status}` : ""}`,
    CouponPageSchema,
    !customer && (user.role !== "SHOP_MANAGER" || Boolean(store)),
  );
  const available = useResource(
    "kol-coupon-discovery-v2",
    "/coupons/available",
    z.array(CouponSchema),
    customer,
  );
  const eligible = useResource(
    "coupon-stores",
    "/collaborator/coupons/eligible-stores",
    z.array(z.object({ id: z.string(), name: z.string() })),
    koc,
  );
  const rows = customer
    ? available.data?.filter(isCustomerKolCoupon)
    : list.data?.data;
  const reasonForm = (path: string, title: string, method = "PATCH") =>
    setForm({
      title,
      path,
      method,
      fields: [{ key: "reason", label: "Lý do", multiline: true }],
      schema: z.object({ reason: required.min(5).max(255) }),
    });
  const policyForm = (item: Coupon, approve: boolean) =>
    setForm({
      title: approve
        ? "Duyệt mã KOL & cấp ngân sách"
        : "Cập nhật chính sách mã KOL",
      path: `${base}/${item.id}/${approve ? "approve" : "policy"}`,
      fields: termFields(item),
      schema: CouponTermsSchema,
    });

  return (
    <Screen scroll>
      <Title>Mã ưu đãi độc quyền KOL</Title>
      <Caption>
        Sao chép mã và tự nhập khi thanh toán trên website. Mã không được lưu
        vào tài khoản và không tự động áp dụng.
      </Caption>
      {user.role === "SHOP_MANAGER" && !store && (
        <Empty text="Chọn gian hàng được phân công trong tab Tôi trước khi xử lý mã KOL." />
      )}
      {koc && (
        <>
          <Button
            title="Đề xuất mã KOL"
            disabled={eligible.isLoading || !eligible.data?.length}
            onPress={() =>
              setForm({
                title: "Đề xuất mã ưu đãi",
                path: base,
                method: "POST",
                schema: ProposalSchema,
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
                    label: "Mức giảm phần trăm",
                    numeric: true,
                  },
                  { key: "note", label: "Mục đích sử dụng", multiline: true },
                ],
              })
            }
          />
          {!eligible.isLoading &&
            !eligible.error &&
            eligible.data?.length === 0 && (
              <Caption>
                Chưa có Shop đủ điều kiện. Hoàn tất hợp tác với Shop trước khi
                đề xuất mã.
              </Caption>
            )}
        </>
      )}
      {!customer && (
        <Choice
          label="Trạng thái mã"
          value={status}
          options={filters}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      )}
      <QueryState
        loading={
          (customer ? available.isLoading : list.isLoading) ||
          (koc && eligible.isLoading)
        }
        error={list.error || available.error || eligible.error}
        retry={() => {
          if (customer) void available.refetch();
          else void list.refetch();
          if (koc) void eligible.refetch();
        }}
      />
      <ErrorNotice error={command.error} />
      {rows?.length === 0 && (
        <Empty text="Chưa có mã KOL trong danh sách này." />
      )}
      {rows?.map((item) => {
        const actions = couponActions(user.role, item.status);
        return (
          <Card key={item.id}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Text
                style={{ fontSize: 19, fontWeight: "700", color: colors.ink }}
              >
                {item.displayCode || item.code}
              </Text>
              <Badge>
                {item.status ? statusText(item.status) : "Đang khả dụng"}
              </Badge>
            </View>
            <Caption>{item.store?.name}</Caption>
            <Text
              style={{ color: colors.strong, fontSize: 18, fontWeight: "600" }}
            >
              {item.discountType === "PERCENTAGE"
                ? `Giảm ${item.discountValue ?? 0}%`
                : `Giảm ${money(item.discountValue)}`}
            </Text>
            <Caption>
              Đơn tối thiểu {money(item.minimumOrderAmount)}
              {item.maximumDiscountAmount != null
                ? ` · Tối đa ${money(item.maximumDiscountAmount)}`
                : ""}
            </Caption>
            {item.expiresAt && (
              <Caption>
                Hạn {new Date(item.expiresAt).toLocaleString("vi-VN")}
              </Caption>
            )}
            <Button
              title={copied === item.id ? "Đã sao chép mã" : "Sao chép mã"}
              secondary
              disabled={!item.displayCode && !item.code}
              loading={command.busy}
              onPress={() =>
                void command.run(async () => {
                  await Clipboard.setStringAsync(
                    item.displayCode || item.code || "",
                  );
                  setCopied(item.id);
                })
              }
            />
            {actions.togglePause && (
              <Button
                secondary
                disabled={command.busy}
                title={
                  item.status === "PAUSED"
                    ? "Tiếp tục sử dụng mã"
                    : "Tạm dừng mã"
                }
                onPress={() =>
                  setForm({
                    title:
                      item.status === "PAUSED"
                        ? "Xác nhận kích hoạt lại mã"
                        : "Xác nhận tạm dừng mã",
                    path: `${base}/${item.id}/pause`,
                    fields: [],
                    schema: z.object({}),
                  })
                }
              />
            )}
            {actions.remove && (
              <Button
                title="Xóa đề xuất"
                secondary
                disabled={command.busy}
                onPress={() =>
                  reasonForm(
                    `${base}/${item.id}`,
                    "Xóa đề xuất mã KOL",
                    "DELETE",
                  )
                }
              />
            )}
            {actions.approve && (
              <>
                <Button
                  title="Duyệt & cấp ngân sách"
                  disabled={command.busy}
                  onPress={() => policyForm(item, true)}
                />
                <Button
                  title="Từ chối đề xuất"
                  secondary
                  disabled={command.busy}
                  onPress={() =>
                    reasonForm(`${base}/${item.id}/reject`, "Từ chối mã KOL")
                  }
                />
              </>
            )}
            {actions.edit && (
              <Button
                title="Chỉnh chính sách & ngân sách"
                secondary
                disabled={command.busy}
                onPress={() => policyForm(item, false)}
              />
            )}
            {actions.block && (
              <Button
                title="Khóa mã KOL"
                secondary
                disabled={command.busy}
                onPress={() =>
                  reasonForm(`${base}/${item.id}/block`, "Khóa mã KOL")
                }
              />
            )}
            {actions.unblock && (
              <Button
                title="Mở khóa mã KOL"
                secondary
                disabled={command.busy}
                onPress={() =>
                  setForm({
                    title: "Xác nhận mở khóa mã KOL",
                    path: `${base}/${item.id}/unblock`,
                    fields: [],
                    schema: z.object({}),
                  })
                }
              />
            )}
          </Card>
        );
      })}
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

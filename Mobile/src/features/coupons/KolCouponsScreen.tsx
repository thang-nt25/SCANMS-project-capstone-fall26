import { KolCouponCard } from "./KolCouponCard";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSuccessToast } from "../../components/SuccessToast";
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
  confirmAction,
  QueryState,
  amount,
  required,
  useActor,
  useCommand,
  useResource,
  type CommandFormSpec,
} from "../common/shared";
import { CouponProposalSheet } from "./CouponProposalSheet";
const Coupon = z.object({
  id: z.string(),
  code: z.string().optional(),
  displayCode: z.string().optional(),
  status: z.string().optional(),
  canSave: z.boolean().optional(),
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
export function KolCouponsScreen({ onScrollOffset }: { onScrollOffset?: (offset: number) => void } = {}) {
  const showSuccess = useSuccessToast();
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  useEffect(() => {
    if (!copiedId) return;
    const timer = setTimeout(() => setCopiedId(null), 3000);
    return () => clearTimeout(timer);
  }, [copiedId]);
  const [proposal, setProposal] = useState(false);
  const reasonForm = (path: string, title: string) =>
    setForm({
      title,
      path,
      fields: [{ key: "reason", label: "Lý do", multiline: true }],
      schema: z.object({ reason: required.min(5).max(255) }),
    });
  return (
    <Screen scroll onScrollOffset={onScrollOffset}>
      {koc && (
        <Button
          title="Đề xuất mã độc quyền"
          secondary
          onPress={() => setProposal(true)}
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
        koc ? <KolCouponCard key={item.id} coupon={item} copied={copiedId === item.id} busy={command.busy}
          copy={() => void command.run(async () => {
            const code = item.code || item.displayCode;
            if (!code) throw new Error("Coupon code unavailable");
            const copied = await Clipboard.setStringAsync(code);
            if (!copied) throw new Error("Could not copy coupon code");
            setCopiedId(item.id);
            showSuccess("Sao ch\u00e9p m\u00e3 th\u00e0nh c\u00f4ng");
          })}
          toggle={() => confirmAction(
            item.status === "ACTIVE" ? "T\u1ea1m d\u1eebng m\u00e3?" : "Ti\u1ebfp t\u1ee5c m\u00e3?",
            "Thay \u0111\u1ed5i tr\u1ea1ng th\u00e1i s\u1eed d\u1ee5ng m\u00e3 cho \u0111\u01a1n m\u1edbi.",
            () => void command.execute(`${base}/${item.id}/pause`, "PATCH"),
          )}
        /> : <Card key={item.id}>
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
            title={copiedId === item.id ? "✓ Đã sao chép mã" : "Sao chép mã"}
            secondary
            loading={command.busy}
            onPress={() =>
              void command.run(async () => {
                const code = item.code || item.displayCode;
                if (!code) throw new Error("Chưa có mã để sao chép.");
                setCopiedId(null);
                const copied = await Clipboard.setStringAsync(code);
                if (!copied) throw new Error("Chưa sao chép được mã. Hãy thử lại.");
                setCopiedId(item.id);
                showSuccess("Sao chép mã thành công");
              })
            }
          />
          {customer && item.canSave !== false && (
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
          {koc && ["ACTIVE", "PAUSED"].includes(item.status || "") && (
            <Button
              title={item.status === "ACTIVE" ? "Tạm dừng mã" : "Tiếp tục mã"}
              disabled={command.busy}
              secondary
              onPress={() =>
                confirmAction(
                  item.status === "ACTIVE" ? "Tạm dừng mã độc quyền?" : "Tiếp tục mã độc quyền?",
                  item.status === "ACTIVE" ? "Khách sẽ không thể dùng mã cho đơn mới. Đơn đã dùng mã vẫn được giữ nguyên." : "Điều kiện và thời hạn của mã sẽ được kiểm tra trước khi kích hoạt lại.",
                  () => void command.execute(`${base}/${item.id}/pause`, "PATCH"),
                )
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
      {proposal && <CouponProposalSheet stores={eligible.data || []} loading={eligible.isLoading} error={eligible.error} retry={() => void eligible.refetch()} close={() => setProposal(false)} />}
      {form && <CommandForm spec={form} close={() => setForm(null)} />}
    </Screen>
  );
}

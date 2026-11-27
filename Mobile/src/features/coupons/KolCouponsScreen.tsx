import { useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { z } from "zod";
import { useSuccessToast } from "../../components/SuccessToast";
import {
  Button,
  Empty,
  ErrorNotice,
  PageControls,
  Screen,
} from "../../components/ui";
import {
  confirmAction,
  QueryState,
  useActor,
  useCommand,
  useResource,
} from "../common/shared";
import { CouponPageSchema } from "./coupon-contracts";
import { CouponProposalSheet } from "./CouponProposalSheet";
import { KolCouponCard } from "./KolCouponCard";

/** KOL manages their own exclusive codes. Retail voucher creation/saving is retired. */
export function KolCouponsScreen({
  onScrollOffset,
}: { onScrollOffset?: (offset: number) => void } = {}) {
  const showSuccess = useSuccessToast();
  const { user } = useActor();
  const isKol = user.role === "COLLABORATOR";
  const command = useCommand();
  const [page, setPage] = useState(1);
  const [proposal, setProposal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const base = "/collaborator/coupons";
  const list = useResource(
    "kol-exclusive-codes",
    `${base}?page=${page}&limit=20`,
    CouponPageSchema,
    isKol,
  );
  const eligible = useResource(
    "coupon-stores",
    "/collaborator/coupons/eligible-stores",
    z.array(z.object({ id: z.string(), name: z.string() })),
    isKol,
  );
  useEffect(() => {
    if (!copiedId) return;
    const timer = setTimeout(() => setCopiedId(null), 3000);
    return () => clearTimeout(timer);
  }, [copiedId]);
  if (!isKol) return <Empty text="Mục này dành cho đối tác KOL." />;
  return (
    <Screen scroll onScrollOffset={onScrollOffset}>
      <Button
        title="Đề xuất mã độc quyền"
        secondary
        onPress={() => setProposal(true)}
      />
      <QueryState
        loading={list.isLoading}
        error={list.error}
        retry={() => void list.refetch()}
      />
      <ErrorNotice error={command.error} />
      {!list.isLoading && !list.error && list.data?.data.length === 0 && (
        <Empty />
      )}
      {list.data?.data.map((item) => (
        <KolCouponCard
          key={item.id}
          coupon={item}
          copied={copiedId === item.id}
          busy={command.busy}
          copy={() =>
            void command.run(async () => {
              const code = item.code || item.displayCode;
              if (!code) throw new Error("Chưa có mã để sao chép.");
              if (!(await Clipboard.setStringAsync(code)))
                throw new Error("Chưa sao chép được mã. Hãy thử lại.");
              setCopiedId(item.id);
              showSuccess("Sao chép mã thành công");
            })
          }
          toggle={() =>
            confirmAction(
              item.status === "ACTIVE"
                ? "Tạm dừng mã độc quyền?"
                : "Tiếp tục mã độc quyền?",
              "Thay đổi trạng thái mã cho đơn mới; đơn đã áp mã được giữ nguyên.",
              () => void command.execute(`${base}/${item.id}/pause`, "PATCH"),
            )
          }
        />
      ))}
      <PageControls
        page={page}
        totalPages={list.data?.meta.totalPages || 1}
        loading={list.isFetching}
        onChange={setPage}
      />
      {proposal && (
        <CouponProposalSheet
          stores={eligible.data || []}
          loading={eligible.isLoading}
          error={eligible.error}
          retry={() => void eligible.refetch()}
          close={() => setProposal(false)}
        />
      )}
    </Screen>
  );
}

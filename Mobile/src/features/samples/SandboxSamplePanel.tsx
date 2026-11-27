import { useState } from "react";
import { View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import {
  Badge,
  Button,
  Caption,
  ErrorNotice,
  Field,
  Title,
} from "../../components/ui";
import {
  Evidence,
  QueryState,
  confirmAction,
  useActor,
} from "../common/shared";
import { useOperation } from "../../hooks/useOperation";
import { colors } from "../../theme/tokens";
import { statusText } from "../../types/contracts";
import { createSandboxService, sandboxActions } from "./sandbox-service";

export function SandboxSamplePanel({ code }: { code: string }) {
  const { user } = useActor(),
    client = useQueryClient(),
    operation = useOperation();
  const service = createSandboxService(api, code),
    key = [user.id, "sample-sandbox", code];
  const result = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => service.read(signal),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.status === "COMPLETED" ? false : 5000,
  });
  const [title, setTitle] = useState(""),
    [videoUrl, setUrl] = useState(""),
    [caption, setCaption] = useState(""),
    [reason, setReason] = useState("");
  const state = result.data,
    actions = state ? sandboxActions(user.role, state) : null;
  const run = (action: () => ReturnType<typeof service.read>) =>
    void operation.run(async () => {
      // Preserve the server result; even after a timeout refresh before retrying a write.
      try {
        client.setQueryData(key, await action());
      } finally {
        await result.refetch();
      }
    });
  return (
    <View
      style={{
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.brandBorder,
        backgroundColor: colors.soft,
      }}
    >
      <Title>Hành trình mẫu · Sandbox</Title>
      <Caption>Mã GHN: {code}</Caption>
      <Caption>
        Kiểm thử riêng; kết quả không thay đổi nghĩa vụ nhận mẫu thật hoặc công
        khai video.
      </Caption>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {state && actions && (
        <>
          <Badge>{statusText(state.status)}</Badge>
          {[
            ["NOT_STARTED", "Chưa bắt đầu"],
            ["WAITING_PICKUP", "Chờ lấy hàng"],
            ["IN_TRANSIT", "Đang vận chuyển"],
            ["DELIVERED", "Đã giao thành công"],
          ].map(([value, label], index, all) => (
            <Caption key={value}>
              {all.findIndex(([item]) => item === state.deliveryStatus) >= index
                ? "✓"
                : "○"}{" "}
              {label}
            </Caption>
          ))}
          {state.deadlineAt && (
            <Caption>
              Hạn video: {new Date(state.deadlineAt).toLocaleString("vi-VN")}
            </Caption>
          )}
          {actions.start && (
            <Button
              title="Bắt đầu hành trình kiểm thử"
              loading={operation.busy}
              onPress={() => run(() => service.act("start"))}
            />
          )}
          {actions.pay && (
            <Button
              title="Xác nhận thanh toán cước mô phỏng"
              secondary
              loading={operation.busy}
              onPress={() =>
                confirmAction(
                  "Thanh toán cước kiểm thử?",
                  "Chỉ ghi nhận mô phỏng, không chuyển tiền thật.",
                  () => run(() => service.act("pay-shipping")),
                )
              }
            />
          )}
          {state.shippingPayment && (
            <Caption>
              Đã ghi nhận cước mô phỏng ·{" "}
              {state.shippingPayment.amount.toLocaleString("vi-VN")} đ ·{" "}
              {state.shippingPayment.reference}
            </Caption>
          )}
          {state.videoUrl && <Evidence urls={[state.videoUrl]} />}
          {state.videoReview?.rejectionReason && (
            <Caption>
              Shop yêu cầu sửa: {state.videoReview.rejectionReason}
            </Caption>
          )}
          {actions.submit && (
            <>
              <Field
                label="Tiêu đề video *"
                value={title}
                onChangeText={setTitle}
                editable={!operation.busy}
              />
              <Field
                label="Link bài đăng video HTTPS *"
                value={videoUrl}
                onChangeText={setUrl}
                editable={!operation.busy}
                autoCapitalize="none"
              />
              <Field
                label="Nội dung và link tiếp thị sản phẩm"
                value={caption}
                onChangeText={setCaption}
                editable={!operation.busy}
                multiline
              />
              <Button
                title={
                  state.status === "REVISION_REQUIRED"
                    ? "Nộp lại video kiểm thử"
                    : "Nộp video kiểm thử"
                }
                loading={operation.busy}
                onPress={() =>
                  run(() => service.submit({ title, videoUrl, caption }))
                }
              />
            </>
          )}
          {actions.review && (
            <>
              <Caption>
                Mở video và kiểm tra nội dung, đúng kênh, sản phẩm và link tiếp
                thị trước khi nghiệm thu.
              </Caption>
              <Field
                label="Lý do nếu yêu cầu sửa"
                value={reason}
                onChangeText={setReason}
                editable={!operation.busy}
                multiline
              />
              <Button
                title="Yêu cầu sửa video kiểm thử"
                secondary
                loading={operation.busy}
                onPress={() =>
                  run(() =>
                    service.review({
                      status: "REJECTED",
                      videoUrl: state.videoUrl,
                      revision: state.videoRevision,
                      rejectionReason: reason,
                    }),
                  )
                }
              />
              <Button
                title="Nghiệm thu video kiểm thử"
                loading={operation.busy}
                onPress={() =>
                  confirmAction(
                    "Nghiệm thu video này?",
                    "Xác nhận bạn đã xem đúng bản video đang hiển thị.",
                    () =>
                      run(() =>
                        service.review({
                          status: "APPROVED",
                          videoUrl: state.videoUrl,
                          revision: state.videoRevision,
                        }),
                      ),
                  )
                }
              />
            </>
          )}
          {actions.expire && (
            <Button
              title="Kiểm thử quá hạn không nộp video"
              secondary
              disabled={operation.busy}
              onPress={() =>
                confirmAction(
                  "Chuyển mẫu kiểm thử quá hạn?",
                  "Thao tác chỉ áp dụng cho vận đơn sandbox này.",
                  () => run(() => service.act("expire")),
                )
              }
            />
          )}
          <ErrorNotice error={operation.error} />
        </>
      )}
    </View>
  );
}

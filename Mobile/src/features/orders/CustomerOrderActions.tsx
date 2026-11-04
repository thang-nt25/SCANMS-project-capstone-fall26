import { useState } from "react";
import { z } from "zod";
import { Button, Caption, ErrorNotice, Field } from "../../components/ui";
import type { Order } from "../../types/contracts";
import { useMobileNavigation } from "../../navigation/router";
import {
  ActionForm,
  Choice,
  Evidence,
  Sheet,
  https,
  required,
  useCommand,
} from "../common/shared";
import { MediaPicker } from "../common/MediaPicker";
import { SelectField } from "../common/SelectField";
import { validateInput } from "../../utils/validate-input";
const ReturnInput = z.object({
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "EXPIRED", "OTHER"]),
  details: z.string().trim().max(1000),
  imageUrls: z.array(https).min(1, "Thêm ít nhất một ảnh bằng chứng.").max(5),
  unboxingVideoUrl: https,
});
const ReviewInput = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: required.min(10).max(1000),
  images: z.array(https).max(5),
});
export function CustomerOrderActions({ order }: { order: Order }) {
  const [mode, setMode] = useState<"cancel" | "review" | "return" | null>(null),
    command = useCommand(),
    navigation = useMobileNavigation();
  const [reason, setReason] = useState("DAMAGED"),
    [details, setDetails] = useState(""),
    [images, setImages] = useState<string[]>([]),
    [video, setVideo] = useState("");
  const [productId, setProductId] = useState(""),
    [rating, setRating] = useState("5");
  const reviewed = new Set(
    order.productReviews?.map((review) => review.productId) || [],
  );
  const reviewable = [
    ...new Map(
      (order.orderItems || [])
        .filter(
          (item) =>
            (item.productId || item.product?.id) &&
            !reviewed.has(item.productId || item.product!.id!),
        )
        .map((item) => [
          item.productId || item.product!.id!,
          {
            value: item.productId || item.product!.id!,
            label: item.product?.title || "Sản phẩm",
          },
        ]),
    ).values(),
  ];
  const open = (value: typeof mode) => {
    command.clearError();
    setDetails("");
    setImages([]);
    setVideo("");
    setProductId("");
    setMode(value);
  };
  return (
    <>
      {order.status === "PENDING" && (
        <Button title="Hủy đơn hàng" secondary onPress={() => open("cancel")} />
      )}
      {order.status === "COMPLETED" && (
        <Button
          title={
            reviewable.length ? "Viết đánh giá" : "Đã đánh giá các sản phẩm"
          }
          disabled={!reviewable.length}
          secondary
          onPress={() => open("review")}
        />
      )}
      {order.returnRequest ? (
        <Button
          title="Xem hồ sơ đổi trả"
          secondary
          onPress={() =>
            navigation.navigate("Business", {
              feature: "returns",
              id: order.returnRequest!.id,
            })
          }
        />
      ) : (
        ["DELIVERED", "COMPLETED"].includes(order.status) && (
          <Button
            title="Yêu cầu trả hàng/hoàn tiền"
            secondary
            onPress={() => open("return")}
          />
        )
      )}
      {mode === "cancel" && (
        <ActionForm
          title="Hủy đơn hàng"
          fields={[{ key: "reason", label: "Lý do hủy", multiline: true }]}
          schema={z.object({ reason: required.min(5).max(500) })}
          submit={(body) =>
            command.execute(
              `/customer/orders/${order.id}/cancel`,
              "POST",
              body,
              () => setMode(null),
            )
          }
          busy={command.busy}
          error={command.error}
          close={() => setMode(null)}
        />
      )}
      {(mode === "review" || mode === "return") && (
        <Sheet
          title={mode === "review" ? "Đánh giá sản phẩm" : "Yêu cầu đổi trả"}
          close={() => {
            if (!command.busy) setMode(null);
          }}
        >
          {mode === "review" ? (
            <>
              <SelectField
                label="Sản phẩm đánh giá"
                value={productId}
                onChange={setProductId}
                disabled={command.busy}
                options={reviewable}
              />
              <Choice
                label="Số sao"
                value={rating}
                options={[1, 2, 3, 4, 5].map((value) => ({
                  value: String(value),
                  label: `${value} ★`,
                }))}
                onChange={setRating}
                disabled={command.busy}
              />
            </>
          ) : (
            <Choice
              label="Lý do trả hàng"
              value={reason}
              onChange={setReason}
              disabled={command.busy}
              options={[
                { value: "DAMAGED", label: "Hàng hư hỏng" },
                { value: "WRONG_ITEM", label: "Giao sai hàng" },
                { value: "EXPIRED", label: "Hết hạn" },
                { value: "OTHER", label: "Khác" },
              ]}
            />
          )}
          <Field
            label={
              mode === "review" ? "Nhận xét (10–1000 ký tự)" : "Mô tả vấn đề"
            }
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={1000}
            editable={!command.busy}
          />
          <Evidence urls={images} />
          {images.length < 5 && (
            <MediaPicker
              label="Thêm ảnh"
              disabled={command.busy}
              onUploaded={(url) =>
                setImages((old) => [...old, url].slice(0, 5))
              }
            />
          )}
          {images.length > 0 && (
            <Button
              title="Bỏ ảnh cuối"
              secondary
              disabled={command.busy}
              onPress={() => setImages((old) => old.slice(0, -1))}
            />
          )}
          {mode === "return" && (
            <>
              <Caption>
                Ảnh bằng chứng và video mở hộp là bắt buộc. Hệ thống kiểm tra
                hạn đổi trả 14 ngày.
              </Caption>
              <MediaPicker
                label="Tải video mở hộp"
                video
                disabled={command.busy}
                onUploaded={setVideo}
              />
              {video && <Evidence urls={[video]} />}
            </>
          )}
          <ErrorNotice error={command.error} />
          <Button
            title="Gửi yêu cầu"
            loading={command.busy}
            onPress={() =>
              void command.execute(
                `/customer/orders/${order.id}/${mode === "review" ? "reviews" : "return-request"}`,
                "POST",
                () =>
                  mode === "review"
                    ? validateInput(ReviewInput, {
                        productId,
                        rating: Number(rating),
                        comment: details,
                        images,
                      })
                    : validateInput(ReturnInput, {
                        reason,
                        details,
                        imageUrls: images,
                        unboxingVideoUrl: video,
                      }),
                () => setMode(null),
              )
            }
          />
        </Sheet>
      )}
    </>
  );
}

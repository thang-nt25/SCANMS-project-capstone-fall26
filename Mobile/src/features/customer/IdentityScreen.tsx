import { useState } from "react";
import { z } from "zod";
import { Badge, Button, Caption, Screen, Title } from "../../components/ui";
import {
  CommandForm,
  DetailLine,
  QueryState,
  required,
  useResource,
} from "../common/shared";
export function IdentityScreen() {
  const result = useResource(
    "identity",
    "/customer/identity",
    z.object({
      isVerified: z.boolean(),
      fullName: z.string(),
      idCardNumber: z.string(),
      address: z.string(),
    }),
  );
  const [edit, setEdit] = useState(false);
  return (
    <Screen scroll>
      <Title>Thông tin định danh</Title>
      <Caption>
        Đây là thông tin khách khai báo; không phải xác minh tự động từ cơ quan
        cấp giấy tờ hoặc quyền KOL/Shop.
      </Caption>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        retry={() => void result.refetch()}
      />
      {result.data && (
        <>
          <Badge>
            {result.data.isVerified ? "Đã lưu thông tin" : "Chưa khai báo"}
          </Badge>
          <DetailLine label="Họ tên" value={result.data.fullName} />
          <DetailLine
            label="CCCD"
            value={
              result.data.idCardNumber
                ? `••••••${result.data.idCardNumber.slice(-4)}`
                : "Chưa khai báo"
            }
          />
          <DetailLine label="Địa chỉ thường trú" value={result.data.address} />
          <Button
            title="Cập nhật thông tin"
            secondary
            onPress={() => setEdit(true)}
          />
        </>
      )}
      {edit && (
        <CommandForm
          close={() => setEdit(false)}
          spec={{
            title: "Khai báo định danh",
            path: "/customer/identity",
            method: "POST",
            fields: [
              {
                key: "fullName",
                label: "Họ tên trên giấy tờ",
                initial: result.data?.fullName,
              },
              {
                key: "idCardNumber",
                label: "CCCD (9 hoặc 12 chữ số)",
                initial: result.data?.idCardNumber,
              },
              {
                key: "address",
                label: "Địa chỉ thường trú",
                initial: result.data?.address,
                multiline: true,
              },
            ],
            schema: z.object({
              fullName: required.min(2).max(150),
              idCardNumber: z.string().regex(/^(?:\d{9}|\d{12})$/),
              address: required.min(5).max(200),
            }),
          }}
        />
      )}
    </Screen>
  );
}

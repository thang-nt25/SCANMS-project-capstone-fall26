import { useState } from "react";
import { z } from "zod";
import { Button, Caption, ErrorNotice, Field } from "../../components/ui";
import { BottomSheet } from "../../components/BottomSheet";
import { RegionPicker } from "../addresses/RegionPicker";
import { SelectField } from "../common/SelectField";
import { MediaPicker } from "../common/MediaPicker";
import { QueryState, useCommand, useResource } from "../common/shared";
import { StoreInput } from "./store-input";
import { validateInput } from "../../utils/validate-input";
export function CreateStoreSheet({ close }: { close(): void }) {
  const command = useCommand();
  const [draft, setDraft] = useState({
    name: "",
    categoryName: "",
    description: "",
    logoUrl: "",
    contactName: "",
    contactPhone: "",
    detailAddress: "",
    provinceCode: "",
    provinceName: "",
    districtCode: "",
    districtName: "",
    wardCode: "",
    wardName: "",
  });
  const categories = useResource(
    "store-categories",
    "/public/products/categories",
    z.array(z.object({ name: z.string() })),
  );
  return (
    <BottomSheet
      title="Tạo cửa hàng nội bộ"
      close={() => {
        if (!command.busy) close();
      }}
    >
      <Caption>
        Admin khởi tạo nhãn hàng và kho xuất. Sau đó tạo hoặc phân công quản lý
        tại mục Nhân sự.
      </Caption>
      <Field
        label="Tên nhãn hàng *"
        value={draft.name}
        editable={!command.busy}
        onChangeText={(name) => setDraft((old) => ({ ...old, name }))}
      />
      <QueryState
        loading={categories.isLoading}
        error={categories.error}
        retry={() => void categories.refetch()}
      />
      <SelectField
        label="Ngành hàng cố định *"
        value={draft.categoryName}
        disabled={command.busy}
        options={(categories.data || []).map((item) => ({
          value: item.name,
          label: item.name,
        }))}
        onChange={(categoryName) =>
          setDraft((old) => ({ ...old, categoryName }))
        }
      />
      <Field
        label="Mô tả nhãn hàng"
        value={draft.description}
        multiline
        editable={!command.busy}
        onChangeText={(description) =>
          setDraft((old) => ({ ...old, description }))
        }
      />
      <MediaPicker
        label={draft.logoUrl ? "Đổi logo đã chọn" : "Chọn logo"}
        disabled={command.busy}
        onUploaded={(logoUrl) => setDraft((old) => ({ ...old, logoUrl }))}
      />
      <Field
        label="Người liên hệ kho *"
        value={draft.contactName}
        editable={!command.busy}
        onChangeText={(contactName) =>
          setDraft((old) => ({ ...old, contactName }))
        }
      />
      <Field
        label="Số điện thoại kho *"
        value={draft.contactPhone}
        keyboardType="phone-pad"
        editable={!command.busy}
        onChangeText={(contactPhone) =>
          setDraft((old) => ({ ...old, contactPhone }))
        }
      />
      <RegionPicker
        value={draft}
        disabled={command.busy}
        onChange={(region) =>
          setDraft((old) => ({
            ...old,
            provinceCode: region.provinceCode || "",
            provinceName: region.provinceName || "",
            districtCode: region.districtCode || "",
            districtName: region.districtName || "",
            wardCode: region.wardCode || "",
            wardName: region.wardName || "",
          }))
        }
      />
      <Field
        label="Số nhà, đường của kho *"
        value={draft.detailAddress}
        editable={!command.busy}
        onChangeText={(detailAddress) =>
          setDraft((old) => ({ ...old, detailAddress }))
        }
      />
      <ErrorNotice error={command.error} />
      <Button
        title="Tạo cửa hàng"
        loading={command.busy}
        onPress={() =>
          void command.execute(
            "/stores",
            "POST",
            () => validateInput(StoreInput, draft),
            close,
          )
        }
      />
    </BottomSheet>
  );
}

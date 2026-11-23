import { z } from "zod";
const text = z.string().trim().min(1, "Bổ sung thông tin kho và nhãn hàng.");
export const StoreInput = z
  .object({
    name: text.max(200),
    categoryName: text.max(100),
    description: z.string().trim().max(1000),
    logoUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]),
    contactName: text.max(150),
    contactPhone: z
      .string()
      .trim()
      .regex(/^(0[35789]\d{8}|\+84[35789]\d{8})$/, "SĐT kho không hợp lệ."),
    detailAddress: text.max(300),
    provinceCode: text.regex(/^\d+$/),
    provinceName: text,
    districtCode: text.regex(/^[1-9]\d*$/),
    districtName: text,
    wardCode: text,
    wardName: text,
  })
  .transform((input) => ({
    ...input,
    defaultCommissionRate: 10,
    ghnDistrictId: Number(input.districtCode),
    ghnWardCode: input.wardCode,
    warehouseAddress: [
      input.detailAddress,
      input.wardName,
      input.districtName,
      input.provinceName,
    ].join(", "),
  }));

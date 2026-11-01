import api from "./api";
export const unwrap = (value: any) => value?.data?.data ?? value?.data ?? value;
export const pricingApi = {
  catalog: () =>
    api
      .get("/pricing/catalog", { headers: { "x-skip-cache": "1" } })
      .then(unwrap),
  promotions: () =>
    api
      .get("/pricing/promotions", { headers: { "x-skip-cache": "1" } })
      .then(unwrap),
  floor: (id: string, body: unknown) =>
    api.put(`/pricing/products/${id}/floor`, body),
  create: (body: unknown) => api.post("/pricing/promotions", body),
  review: (id: string, body: unknown) =>
    api.patch(`/pricing/promotions/${id}/review`, body),
  cancel: (id: string) => api.patch(`/pricing/promotions/${id}/cancel`),
};
export function requestError(error: any): string {
  const message = error?.response?.data?.message || error?.message;
  return Array.isArray(message)
    ? message.join(". ")
    : message || "Không thực hiện được thao tác. Vui lòng thử lại.";
}

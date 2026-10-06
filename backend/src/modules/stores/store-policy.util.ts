/**
 * Hồ sơ pháp lý của luồng nâng cấp Shop cũ được lưu trong policyReturn dưới
 * dạng JSON. Đây không phải chính sách đổi trả và có thể chứa dữ liệu riêng tư.
 * Không đưa giá trị đó ra API công khai hoặc snapshot chính sách đơn hàng.
 */
export function publicReturnPolicy(value: string | null | undefined): string | null {
  const policy = value?.trim();
  if (!policy || policy.startsWith('{') || policy.startsWith('[')) return null;
  return policy;
}

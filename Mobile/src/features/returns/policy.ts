/** UI gates mirror prerequisites; the server always revalidates ownership and transition. */
export function mayBookReturnPickup(
  request: {
    status: string;
    returnWarehouse?: unknown;
    shipByAt?: string | null;
    pickupProviderMode?: string;
  },
  now = Date.now(),
): boolean {
  const deadline = request.shipByAt ? Date.parse(request.shipByAt) : NaN;
  return (
    request.status === "SHOP_APPROVED" &&
    Boolean(request.returnWarehouse) &&
    Number.isFinite(deadline) &&
    deadline > now &&
    Boolean(request.pickupProviderMode) &&
    request.pickupProviderMode !== "disabled"
  );
}

export function mayAssessReturnLiability(status: string): boolean {
  return [
    "REQUESTED",
    "SHOP_APPROVED",
    "PICKUP_BOOKED",
    "RETURN_SHIPPED",
    "RETURN_RECEIVED",
    "INSPECTING",
  ].includes(status);
}

/** Active oversight deliberately excludes open disputes, so merge all queues by request ID. */
export function mergeReturnQueues<T extends { id: string }>(
  ...queues: readonly (readonly T[])[]
): T[] {
  return [...new Map(queues.flat().map((row) => [row.id, row])).values()];
}

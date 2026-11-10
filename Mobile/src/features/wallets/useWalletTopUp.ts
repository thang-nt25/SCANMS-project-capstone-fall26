import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../services/api";
import { useOperation } from "../../hooks/useOperation";
import { useActor } from "../common/shared";
import { TopUpSchema, isOpenTopUp, type WalletTopUp } from "./wallet-contracts";

export function useWalletTopUp() {
  const { user } = useActor();
  const client = useQueryClient(),
    operation = useOperation();
  const [snapshot, setSnapshot] = useState<WalletTopUp | null>(null);
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const [demoReceipt, setDemoReceipt] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const credited = useRef<string | null>(null);
  const pendingKey = [user.id, "wallet-topup", "pending"];
  const availability = useQuery({
    queryKey: [user.id, "wallet-topup", "availability"],
    queryFn: async ({ signal }) => {
      const schema = z.object({ available: z.boolean() });
      const [payos, demo] = await Promise.all([
        api.request("/wallets/top-up-payos/availability", { signal }),
        api.request("/wallets/top-up-demo/availability", { signal }),
      ]);
      return {
        payos: schema.parse(payos).available,
        demo: schema.parse(demo).available,
      };
    },
  });
  const pending = useQuery({
    queryKey: pendingKey,
    queryFn: async ({ signal }) =>
      TopUpSchema.nullable().parse(
        await api.request("/wallets/top-up-payos/pending", { signal }),
      ),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const current = snapshot || pending.data;
  const statusKey = [user.id, "wallet-topup", "status", current?.id];
  const status = useQuery({
    queryKey: statusKey,
    queryFn: async ({ signal }) =>
      TopUpSchema.parse(
        await api.request(`/wallets/top-up-payos/${current!.id}/status`, {
          signal,
          timeout: 20000,
        }),
      ),
    enabled: Boolean(current && isOpenTopUp(current.status) && active),
    refetchOnWindowFocus: false,
    retry: false,
    refetchInterval: (query) =>
      active && (!query.state.data || isOpenTopUp(query.state.data.status))
        ? 8000
        : false,
  });
  const request = status.data?.id === current?.id ? status.data : current;
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (value) =>
      setActive(value === "active"),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (request?.status === "PAID" && credited.current !== request.id) {
      credited.current = request.id;
      // Server reconciliation credited the wallet. Never increase a balance locally.
      void client.invalidateQueries({ queryKey: [user.id, "business"] });
    }
  }, [request?.id, request?.status, client, user.id]);
  const apply = (next: WalletTopUp) => {
    setRecoveryRequired(false);
    setSnapshot(next);
    client.setQueryData([user.id, "wallet-topup", "status", next.id], next);
    client.setQueryData(pendingKey, next);
  };
  const reload = () =>
    operation.run(async () => {
      const result = await pending.refetch({ throwOnError: true });
      if (result.data) apply(result.data);
      setRecoveryRequired(false);
      await availability.refetch({ throwOnError: true });
    });
  const create = (amount: number) =>
    operation.run(async () => {
      // Recover an interrupted request before creating a new payment link.
      const restored = await pending.refetch({ throwOnError: true });
      if (restored.data) {
        apply(restored.data);
        return;
      }
      try {
        apply(
          TopUpSchema.parse(
            await api.request("/wallets/top-up-payos", {
              method: "POST",
              body: { amount },
              timeout: 20000,
            }),
          ),
        );
      } catch (error) {
        setRecoveryRequired(true);
        const result = await pending.refetch();
        if (result.data) apply(result.data);
        throw error;
      }
    });
  const cancel = () =>
    operation.run(async () => {
      if (!request || !isOpenTopUp(request.status)) return;
      await client.cancelQueries({ queryKey: statusKey });
      // Keep the current transaction if cancellation times out or is refused (e.g. underpaid).
      apply(
        TopUpSchema.parse(
          await api.request(`/wallets/top-up-payos/${request.id}/cancel`, {
            method: "POST",
            timeout: 30000,
          }),
        ),
      );
    });
  const demo = (amount: number) =>
    operation.run(async () => {
      setDemoReceipt(false);
      if (!availability.data?.demo)
        throw new Error("Nạp thử nghiệm chưa được bật.");
      try {
        z.object({ success: z.literal(true) }).parse(
          await api.request("/wallets/top-up-demo", {
            method: "POST",
            body: { amount },
          }),
        );
        setDemoReceipt(true);
      } finally {
        // Even a network timeout can mean the transaction committed; reload, never auto-retry.
        await client.invalidateQueries({ queryKey: [user.id, "business"] });
      }
    });
  const reset = () => {
    if (request && isOpenTopUp(request.status)) return;
    setSnapshot(null);
    setRecoveryRequired(false);
    client.setQueryData(pendingKey, null);
    operation.clearError();
  };
  return {
    request,
    availability,
    pending,
    status,
    operation,
    recoveryRequired,
    demoReceipt,
    reload,
    create,
    cancel,
    demo,
    reset,
  };
}

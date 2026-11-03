import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import type { Store } from "../../types/contracts";
import { useAuth } from "./AuthProvider";
const ScopeContext = createContext<{
  store: Store | undefined;
  select(id: string): void;
} | null>(null);
export function StoreScope({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [id, setId] = useState<string>();
  const stores = session?.bootstrap.managedStores || [];
  const store = stores.find((item) => item.id === id) || stores[0];
  const select = (next: string) => {
    if (stores.some((item) => item.id === next)) setId(next);
  };
  return (
    <ScopeContext.Provider value={{ store, select }}>
      {children}
    </ScopeContext.Provider>
  );
}
export function useStoreScope() {
  const value = useContext(ScopeContext);
  if (!value) throw new Error("StoreScope is required");
  return value;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import * as SecureStore from "expo-secure-store";
import { z } from "zod";
import { api, tokenSession } from "../../services/api";
import { ApiError } from "../../services/api/client";
import { queryClient } from "../../services/query-client";
import {
  BootstrapSchema,
  UserSchema,
  type Bootstrap,
  type User,
} from "../../types/contracts";
import { TokenPersistence } from "../../services/auth/token-persistence";
import { clearPrivateExports } from "../../services/exports";

const TOKEN_KEY = "scanms.access-token";
const persistence = new TokenPersistence({
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (value) => SecureStore.setItemAsync(TOKEN_KEY, value),
  remove: () => SecureStore.deleteItemAsync(TOKEN_KEY),
});
interface Session {
  user: User;
  bootstrap: Bootstrap;
}
interface AuthState {
  session: Session | null;
  restoring: boolean;
  restoreError: string;
  login(identifier: string, password: string): Promise<void>;
  logout(): Promise<void>;
  restore(): Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null),
    [restoring, setRestoring] = useState(true),
    [restoreError, setRestoreError] = useState("");
  const generation = useRef(0);
  const logout = useCallback(async () => {
    const version = ++generation.current;
    tokenSession.set(null);
    api.cancelAll();
    // Remove private UI immediately; native storage I/O must not delay socket teardown.
    setSession(null);
    setRestoreError("");
    queryClient.clear();
    void clearPrivateExports(
      () => version === generation.current && tokenSession.get() === null,
    );
    try {
      await persistence.write(null, () => version === generation.current);
    } catch {
      if (version === generation.current)
        setRestoreError(
          "Chưa xóa được phiên trên thiết bị. Hãy thử đăng xuất lại.",
        );
    } finally {
      if (version === generation.current) setRestoring(false);
    }
  }, []);
  const loadSession = async (): Promise<Session> => {
    const [rawUser, rawBootstrap] = await Promise.all([
      api.request("/auth/me"),
      api.request("/mobile/bootstrap"),
    ]);
    const user = UserSchema.parse(rawUser),
      bootstrap = BootstrapSchema.parse(rawBootstrap);
    if (user.id !== bootstrap.actor.id || user.role !== bootstrap.actor.role)
      throw new Error("Phiên đăng nhập không nhất quán. Hãy đăng nhập lại.");
    return { user, bootstrap };
  };
  const restore = useCallback(async () => {
    const version = ++generation.current;
    setRestoring(true);
    setRestoreError("");
    api.cancelAll();
    queryClient.clear();
    try {
      const token = await persistence.read();
      if (version !== generation.current) return;
      tokenSession.set(token);
      if (!token) {
        setSession(null);
        return;
      }
      const loaded = await loadSession();
      if (version === generation.current) setSession(loaded);
    } catch (error) {
      if (version !== generation.current) return;
      if (error instanceof ApiError && error.status === 401) await logout();
      else
        setRestoreError(
          error instanceof Error
            ? error.message
            : "Chưa khôi phục được phiên đăng nhập.",
        );
    } finally {
      if (version === generation.current) setRestoring(false);
    }
  }, [logout]);
  useEffect(() => {
    tokenSession.setUnauthorizedHandler(() => {
      void logout();
    });
    void restore();
    return () => {
      tokenSession.setUnauthorizedHandler(() => {});
      api.cancelAll();
    };
  }, [logout, restore]);
  const login = async (identifier: string, password: string) => {
    const version = ++generation.current;
    const response = z.object({ accessToken: z.string().min(1) }).parse(
      await api.request("/auth/login", {
        method: "POST",
        body: { identifier: identifier.trim(), password },
        anonymous: true,
      }),
    );
    if (version !== generation.current) return;
    tokenSession.set(response.accessToken);
    try {
      const loaded = await loadSession();
      if (version !== generation.current) return;
      await persistence.write(
        response.accessToken,
        () => version === generation.current,
      );
      if (version !== generation.current) return;
      queryClient.clear();
      setSession(loaded);
      setRestoreError("");
    } catch (error) {
      if (version === generation.current) {
        tokenSession.set(null);
        await persistence.write(null, () => version === generation.current);
      }
      throw error;
    }
  };
  return (
    <AuthContext.Provider
      value={{ session, restoring, restoreError, login, logout, restore }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}

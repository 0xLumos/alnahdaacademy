import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "@api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ me: null, loading: true, error: null });

  const refresh = useCallback(async () => {
    try {
      const me = await api.getMe();
      setState({ me, loading: false, error: null });
    } catch (e) {
      setState({ me: null, loading: false, error: e.message });
    }
  }, []);

  useEffect(() => {
    refresh();
    return api.onAuthChange(refresh);
  }, [refresh]);

  return <AuthCtx.Provider value={{ ...state, refresh }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

// Small data hook: runs loader, exposes {data, error, loading, reload}.
export function useLoad(loader, deps = []) {
  const [s, setS] = useState({ data: null, error: null, loading: true });
  const reload = useCallback(async () => {
    try { setS((p) => ({ ...p, loading: true })); setS({ data: await loader(), error: null, loading: false }); }
    catch (e) { setS({ data: null, error: e, loading: false }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...s, reload };
}

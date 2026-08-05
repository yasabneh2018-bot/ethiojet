import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import {
  ensureSeed, getSessionUser, signIn as dbSignIn, signUp as dbSignUp,
  signOut as dbSignOut, subscribeDb, type LocalUser,
} from "@/lib/localDb";

interface AuthCtx {
  user: LocalUser | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (phone: string, password: string) => { user?: LocalUser; error?: string };
  signUp: (phone: string, password: string, username: string) => { user?: LocalUser; error?: string };
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  isAdmin: false,
  loading: true,
  signIn: () => ({ error: "not ready" }),
  signUp: () => ({ error: "not ready" }),
  signOut: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureSeed();
    setUser(getSessionUser());
    setLoading(false);
    const unsub = subscribeDb(() => setUser(getSessionUser()));
    return unsub;
  }, []);

  const signIn = useCallback((phone: string, password: string) => {
    const res = dbSignIn(phone, password);
    if (res.user) setUser(res.user);
    return res;
  }, []);

  const signUp = useCallback((phone: string, password: string, username: string) => {
    const res = dbSignUp(phone, password, username);
    if (res.user) setUser(res.user);
    return res;
  }, []);

  const signOut = useCallback(() => {
    dbSignOut();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, isAdmin: !!user?.is_admin, loading, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);

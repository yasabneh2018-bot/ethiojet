import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getProfile, subscribeDb, updateProfile } from "@/lib/localDb";

export interface Profile {
  id: string;
  username: string;
  balance: number;
  total_wagered: number;
  xp: number;
  level: number;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  const read = useCallback(() => {
    if (!user) return null;
    const p = getProfile(user.id);
    return p
      ? { id: p.id, username: p.username, balance: p.balance, total_wagered: p.total_wagered, xp: p.xp, level: p.level }
      : null;
  }, [user]);

  useEffect(() => {
    setProfile(read());
    const unsub = subscribeDb(() => setProfile(read()));
    return unsub;
  }, [read]);

  const refresh = useCallback(() => { setProfile(read()); }, [read]);

  /** Persist a patch — write-through so every consumer updates instantly. */
  const setLocal = useCallback((patch: Partial<Profile>) => {
    if (!user) return;
    updateProfile(user.id, patch);
  }, [user]);

  return { profile, loading: false, refresh, setLocal };
};

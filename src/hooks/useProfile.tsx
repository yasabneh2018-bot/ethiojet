import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  username: string;
  balance: number;
  total_wagered: number;
  xp: number;
  level: number;
}

// ---- Shared profile store (singleton) so optimistic updates propagate
// to every component that calls useProfile() (e.g. header balance).
let currentProfile: Profile | null = null;
const listeners = new Set<(p: Profile | null) => void>();
const setProfileGlobal = (p: Profile | null) => {
  currentProfile = p;
  listeners.forEach(l => l(p));
};
const patchProfileGlobal = (patch: Partial<Profile>) => {
  if (!currentProfile) return;
  currentProfile = { ...currentProfile, ...patch };
  listeners.forEach(l => l(currentProfile));
};

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(currentProfile);
  const [loading, setLoading] = useState(true);

  // Subscribe this component to the shared store
  useEffect(() => {
    const l = (p: Profile | null) => setProfile(p);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) { setProfileGlobal(null); setLoading(false); return; }
    const { data } = await (supabase as any).from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) setProfileGlobal({
      id: data.id,
      username: data.username,
      balance: Number(data.balance),
      total_wagered: Number(data.total_wagered),
      xp: data.xp,
      level: data.level,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`profile-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setLocal = useCallback((patch: Partial<Profile>) => {
    patchProfileGlobal(patch);
  }, []);

  return { profile, loading, refresh, setLocal };
};

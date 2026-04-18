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

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await (supabase as any).from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) setProfile({
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
      .channel(`profile-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  return { profile, loading, refresh };
};

import { Outlet, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  Wallet, Menu, Plane, TrendingUp, Award, ArrowDownToLine,
  ArrowUpFromLine, History, LogOut, ShieldCheck, Volume2, Music, Fan,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { fmtBirr, coinsToBirr } from "@/lib/jetx";

const items = [
  { title: "Home", url: "/", icon: Award },
  { title: "Play Aviator", url: "/play", icon: Plane },
  { title: "Wagering", url: "/wagering", icon: TrendingUp },
  { title: "My Balance", url: "/balance", icon: Wallet },
  { title: "My Level", url: "/level", icon: Award },
  { title: "Deposit", url: "/deposit", icon: ArrowDownToLine },
  { title: "Withdraw", url: "/withdraw", icon: ArrowUpFromLine },
  { title: "History", url: "/history", icon: History },
];

type ToggleKey = "sound" | "music" | "animation";
const toggles: { key: ToggleKey; title: string; icon: typeof Volume2 }[] = [
  { key: "sound", title: "Sound", icon: Volume2 },
  { key: "music", title: "Music", icon: Music },
  { key: "animation", title: "Animation", icon: Fan },
];

export const AppLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Record<ToggleKey, boolean>>({ sound: true, music: false, animation: true });
  const location = useLocation();
  const nav = useNavigate();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Setting up your account…</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border flex items-center px-3 gap-2">
        <span
          className="text-2xl font-black italic tracking-tight text-[hsl(0_85%_55%)]"
          style={{ fontFamily: "'Brush Script MT', cursive" }}
        >
          Aviator
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border">
            <Wallet className="w-4 h-4 text-primary-glow" />
            <span className="font-bold tabular-nums text-sm">{fmtBirr(coinsToBirr(profile.balance))}</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] max-w-sm bg-[hsl(0_0%_10%)] border-white/10 p-0 overflow-y-auto">

            <div className="p-4 flex items-center gap-3 bg-white/5">
              <div className="w-12 h-12 rounded-full bg-gradient-jet flex items-center justify-center shrink-0">
                <Plane className="w-6 h-6 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="text-lg font-bold tabular-nums truncate">{profile.username}</span>
            </div>

            <div className="divide-y divide-white/10 border-y border-white/10">
              {toggles.map(t => (
                <label key={t.key} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer">
                  <t.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-base">{t.title}</span>
                  <Switch
                    className="ml-auto"
                    checked={settings[t.key]}
                    onCheckedChange={v => setSettings(s => ({ ...s, [t.key]: v }))}
                  />
                </label>
              ))}
            </div>

            <nav className="divide-y divide-white/10">
              {[...items, ...(isAdmin ? [{ title: "Admin Panel", url: "/admin", icon: ShieldCheck }] : [])].map(item => {
                const active = location.pathname === item.url;
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    end
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 text-base ${
                      active ? "text-primary-glow bg-white/5" : "text-sidebar-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}
              <button
                onClick={async () => { setOpen(false); signOut(); nav("/auth"); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-base text-sidebar-foreground"
              >
                <LogOut className="w-5 h-5 text-muted-foreground" />
                <span>Sign out</span>
              </button>
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-jet flex items-center justify-center shadow-glow">
            <Plane className="w-4 h-4 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-black text-gradient-jet">JetX</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border">
          <Wallet className="w-4 h-4 text-primary-glow" />
          <span className="font-bold tabular-nums text-sm">{fmtBirr(coinsToBirr(profile.balance))}</span>
        </div>
      </header>
      <main className="flex-1 container max-w-7xl py-3 px-2 sm:px-4">
        <Outlet />
      </main>
    </div>
  );
};

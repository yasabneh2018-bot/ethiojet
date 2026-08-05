import { Outlet, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  Wallet, Menu, Plane, TrendingUp, Award, ArrowDownToLine,
  ArrowUpFromLine, History, LogOut, ShieldCheck,
} from "lucide-react";
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

export const AppLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const nav = useNavigate();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Setting up your account…</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border flex items-center px-3 gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-sidebar border-sidebar-border p-0">
            <div className="p-4 flex items-center gap-2 border-b border-sidebar-border">
              <div className="w-9 h-9 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow">
                <Plane className="w-5 h-5 text-primary-foreground" fill="currentColor" />
              </div>
              <h1 className="text-lg font-black text-gradient-jet">JetX</h1>
            </div>
            <nav className="p-2 space-y-1">
              {[...items, ...(isAdmin ? [{ title: "Admin Panel", url: "/admin", icon: ShieldCheck }] : [])].map(item => {
                const active = location.pathname === item.url;
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    end
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/20 text-primary-glow"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}
              <button
                onClick={async () => { setOpen(false); signOut(); nav("/auth"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent mt-2 border-t border-sidebar-border pt-3"
              >
                <LogOut className="w-4 h-4" />
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

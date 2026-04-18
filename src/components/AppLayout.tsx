import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Wallet } from "lucide-react";
import { fmtBirr, coinsToBirr } from "@/lib/jetx";

export const AppLayout = () => {
  const { user, loading } = useAuth();
  const { profile } = useProfile();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Setting up your account…</div>;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border flex items-center px-3 gap-2">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border">
              <Wallet className="w-4 h-4 text-primary-glow" />
              <span className="font-bold tabular-nums text-sm">{fmtBirr(coinsToBirr(profile.balance))}</span>
            </div>
          </header>
          <main className="flex-1 container max-w-6xl py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

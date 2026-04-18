import { NavLink, useLocation } from "react-router-dom";
import { Plane, TrendingUp, Wallet, Award, ArrowDownToLine, ArrowUpFromLine, History, LogOut } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const items = [
  { title: "Play JetX", url: "/", icon: Plane },
  { title: "Wagering", url: "/wagering", icon: TrendingUp },
  { title: "My Balance", url: "/balance", icon: Wallet },
  { title: "My Level", url: "/level", icon: Award },
  { title: "Deposit", url: "/deposit", icon: ArrowDownToLine },
  { title: "Withdraw", url: "/withdraw", icon: ArrowUpFromLine },
  { title: "History", url: "/history", icon: History },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const nav = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-3 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow shrink-0">
            <Plane className="w-5 h-5 text-primary-foreground" fill="currentColor" />
          </div>
          {!collapsed && <h1 className="text-lg font-black text-gradient-jet">JetX</h1>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url} end>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={async () => { await signOut(); nav("/auth"); }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Sign out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

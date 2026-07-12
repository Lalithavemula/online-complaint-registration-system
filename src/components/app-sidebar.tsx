import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, PlusCircle, User, Bell, Users, BarChart3, Shield,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";

const commonItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Complaints", url: "/complaints", icon: FileText },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Profile", url: "/profile", icon: User },
];

const userExtras = [
  { title: "New Complaint", url: "/complaints/new", icon: PlusCircle },
];

const adminExtras = [
  { title: "Manage Users", url: "/admin/users", icon: Users },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { role } = useAuth();
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-heading font-semibold text-sidebar-foreground">CivicDesk</span>
            <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Gov Portal</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {commonItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {role === "user" && userExtras.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminExtras.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 text-[11px] text-sidebar-foreground/60">
          {role ? `Signed in as ${role}` : ""}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

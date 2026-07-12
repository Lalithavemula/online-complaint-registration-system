import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Moon, Sun, LogOut, Bell } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const initial = saved === "dark";
    setDark(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("receiver", user.id)
        .eq("status", "unread");
      setUnread(count ?? 0);
    };
    load();
    const channel = supabase
      .channel("notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `receiver=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card/60 backdrop-blur px-3 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="hidden sm:inline text-sm text-muted-foreground">Complaint Management</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/notifications">
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px]">
                      {unread}
                    </Badge>
                  )}
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm">{user?.email}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">{role}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/dashboard">Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 max-w-full">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

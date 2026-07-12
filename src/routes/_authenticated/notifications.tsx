import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("receiver", user.id).order("created_at", { ascending: false }).limit(100);
    setItems(data ?? []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase.channel("notif-page").on("postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `receiver=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markAll = async () => {
    if (!user) return;
    const { error } = await supabase.from("notifications").update({ status: "read" }).eq("receiver", user.id).eq("status", "unread");
    if (error) toast.error(error.message);
    else { toast.success("Marked all as read"); load(); }
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ status: "read" }).eq("id", id);
    load();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={markAll}><CheckCheck className="h-4 w-4 mr-1" />Mark all read</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <div className="text-sm text-muted-foreground mt-2">No notifications</div>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id} className={`p-4 flex items-center gap-3 ${n.status === "unread" ? "bg-primary/5" : ""}`}>
                  <div className={`h-2 w-2 rounded-full ${n.status === "unread" ? "bg-primary" : "bg-muted"}`} />
                  <div className="flex-1">
                    {n.link ? (
                      <Link to={n.link} onClick={() => markOne(n.id)} className="text-sm hover:text-primary">{n.message}</Link>
                    ) : (
                      <span className="text-sm">{n.message}</span>
                    )}
                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                  </div>
                  {n.status === "unread" && (
                    <Button variant="ghost" size="sm" onClick={() => markOne(n.id)}>Mark read</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

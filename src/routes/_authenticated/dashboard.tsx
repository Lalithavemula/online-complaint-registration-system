import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle2, AlertTriangle, PlusCircle, Users } from "lucide-react";
import { statusColor, statusLabel, priorityColor, priorityLabel, categoryLabel } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function StatCard({ icon: Icon, label, value, tone = "primary" }: { icon: any; label: string; value: number | string; tone?: string }) {
  const toneClass: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${toneClass[tone]}`}><Icon className="h-5 w-5" /></div>
          <div>
            <div className="text-2xl font-bold leading-none">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { user, role } = useAuth();

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["dashboard-complaints", user?.id, role],
    queryFn: async () => {
      let q = supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(50);
      if (role === "user") q = q.eq("created_by", user!.id);
      else if (role === "agent") q = q.eq("assigned_agent", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!role,
  });

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "pending").length;
  const inProgress = complaints.filter((c) => ["assigned", "in_progress"].includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === "resolved" || c.status === "closed").length;
  const critical = complaints.filter((c) => c.priority === "critical").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {role === "admin" ? "Admin" : role === "agent" ? "Agent" : "Citizen"} Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of complaints and activity</p>
        </div>
        {role === "user" && (
          <Button asChild><Link to="/complaints/new"><PlusCircle className="h-4 w-4 mr-2" /> New Complaint</Link></Button>
        )}
        {role === "admin" && (
          <Button asChild variant="outline"><Link to="/admin/users"><Users className="h-4 w-4 mr-2" /> Manage Users</Link></Button>
        )}
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        <StatCard icon={FileText} label="Total" value={total} />
        <StatCard icon={Clock} label="Pending" value={pending} tone="warning" />
        <StatCard icon={FileText} label="In Progress" value={inProgress} tone="info" />
        <StatCard icon={CheckCircle2} label="Resolved" value={resolved} tone="success" />
        <StatCard icon={AlertTriangle} label="Critical" value={critical} tone="destructive" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent complaints</CardTitle>
          <Button variant="ghost" size="sm" asChild><Link to="/complaints">View all</Link></Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
          ) : complaints.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <div className="mt-3 text-sm text-muted-foreground">No complaints yet</div>
              {role === "user" && (
                <Button className="mt-4" asChild><Link to="/complaints/new">File your first complaint</Link></Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {complaints.slice(0, 8).map((c) => (
                <Link key={c.id} to="/complaints/$id" params={{ id: c.id }}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-accent/5 transition">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span>{categoryLabel(c.category)}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={priorityColor(c.priority)}>{priorityLabel(c.priority)}</Badge>
                    <Badge variant="outline" className={statusColor(c.status)}>{statusLabel(c.status)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

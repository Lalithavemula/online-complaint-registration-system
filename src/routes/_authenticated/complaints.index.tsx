import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORIES, STATUSES, PRIORITIES, statusColor, priorityColor, statusLabel, priorityLabel, categoryLabel } from "@/lib/constants";
import { PlusCircle, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/complaints/")({
  component: ComplaintsListPage,
});

function ComplaintsListPage() {
  const { user, role } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["complaints-list", user?.id, role],
    queryFn: async () => {
      let query = supabase.from("complaints").select("*").order("created_at", { ascending: false });
      if (role === "user") query = query.eq("created_by", user!.id);
      else if (role === "agent") query = query.eq("assigned_agent", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!role,
  });

  const filtered = useMemo(() => {
    return rows.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (priority !== "all" && c.priority !== priority) return false;
      if (category !== "all" && c.category !== category) return false;
      if (q && !(`${c.title} ${c.description ?? ""} ${c.location ?? ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [rows, status, priority, category, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Complaints</h1>
          <p className="text-sm text-muted-foreground">
            {role === "user" ? "Your complaints" : role === "agent" ? "Assigned to you" : "All complaints"}
          </p>
        </div>
        {role === "user" && (
          <Button asChild><Link to="/complaints/new"><PlusCircle className="h-4 w-4 mr-2" />New</Link></Button>
        )}
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search title, description, location..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Filed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">No complaints found</TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => window.location.assign(`/complaints/${c.id}`)}>
                <TableCell className="font-medium">
                  <Link to="/complaints/$id" params={{ id: c.id }} className="hover:text-primary">{c.title}</Link>
                  <div className="text-xs text-muted-foreground truncate max-w-[280px]">{c.description}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{categoryLabel(c.category)}</TableCell>
                <TableCell><Badge variant="outline" className={priorityColor(c.priority)}>{priorityLabel(c.priority)}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={statusColor(c.status)}>{statusLabel(c.status)}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

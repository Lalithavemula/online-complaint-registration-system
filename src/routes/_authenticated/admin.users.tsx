import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { createAgentAccount } from "@/lib/admin-users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, User as UserIcon, Users as UsersIcon, Search, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { role } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const createAgent = useServerFn(createAgentAccount);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("id,name,email,phone,created_at").order("created_at", { ascending: false });
    const { data: rls } = await supabase.from("user_roles").select("user_id,role");
    const map: Record<string, string[]> = {};
    (rls ?? []).forEach((r) => { (map[r.user_id] ||= []).push(r.role); });
    setRows(profiles ?? []);
    setRoles(map);
  };

  useEffect(() => { if (role === "admin") load(); }, [role]);

  const toggleRole = async (userId: string, target: "agent" | "admin", has: boolean) => {
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", target);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: target });
      if (error) return toast.error(error.message);
    }
    toast.success("Role updated");
    load();
  };

  const handleCreateAgent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setCreating(true);
    try {
      await createAgent({
        data: {
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
          name: String(fd.get("name") ?? ""),
          phone: (fd.get("phone") as string) || undefined,
        },
      });
      toast.success("Agent account created");
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create agent");
    } finally {
      setCreating(false);
    }
  };

  if (role !== "admin") return <div className="text-center py-12">Admins only.</div>;

  const filtered = rows.filter((r) =>
    !q || `${r.name} ${r.email} ${r.phone ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manage Users</h1>
          <p className="text-sm text-muted-foreground">Create agent accounts, promote citizens, or grant admin.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" /> Create Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Agent Account</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="ag-name">Full name</Label><Input id="ag-name" name="name" required maxLength={80} /></div>
              <div className="space-y-1.5"><Label htmlFor="ag-email">Email</Label><Input id="ag-email" name="email" type="email" required /></div>
              <div className="space-y-1.5"><Label htmlFor="ag-phone">Phone (optional)</Label><Input id="ag-phone" name="phone" maxLength={20} /></div>
              <div className="space-y-1.5"><Label htmlFor="ag-pass">Temporary password</Label><Input id="ag-pass" name="password" type="password" required minLength={8} /></div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create Agent"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-3">
            <CardTitle>All accounts ({filtered.length})</CardTitle>
            <div className="relative w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const rs = roles[r.id] ?? [];
                const isAgent = rs.includes("agent");
                const isAdmin = rs.includes("admin");
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.phone ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {rs.length === 0 && <Badge variant="outline"><UserIcon className="h-3 w-3 mr-1" />citizen</Badge>}
                        {!isAgent && !isAdmin && rs.includes("user") && <Badge variant="outline"><UserIcon className="h-3 w-3 mr-1" />citizen</Badge>}
                        {isAgent && <Badge className="bg-info/15 text-info border-info/30" variant="outline"><UsersIcon className="h-3 w-3 mr-1" />agent</Badge>}
                        {isAdmin && <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline"><Shield className="h-3 w-3 mr-1" />admin</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant={isAgent ? "outline" : "default"} onClick={() => toggleRole(r.id, "agent", isAgent)}>
                        {isAgent ? "Revoke agent" : "Make agent"}
                      </Button>
                      <Button size="sm" variant={isAdmin ? "outline" : "secondary"} onClick={() => toggleRole(r.id, "admin", isAdmin)}>
                        {isAdmin ? "Revoke admin" : "Make admin"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

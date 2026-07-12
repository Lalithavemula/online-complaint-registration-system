import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

function ProfilePage() {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"), phone: fd.get("phone"), address: fd.get("address"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <Card>
        <CardHeader><CardTitle>Account details</CardTitle></CardHeader>
        <CardContent>
          {!profile ? <div className="text-sm text-muted-foreground">Loading...</div> : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div><Label>Email</Label><Input value={profile.email} disabled /></div>
              <div><Label>Role</Label><Input value={role ?? ""} disabled className="capitalize" /></div>
              <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" name="name" defaultValue={profile.name} required maxLength={80} /></div>
              <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" defaultValue={profile.phone ?? ""} maxLength={20} /></div>
              <div className="space-y-1.5"><Label htmlFor="address">Address</Label><Textarea id="address" name="address" defaultValue={profile.address ?? ""} maxLength={300} rows={3} /></div>
              <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

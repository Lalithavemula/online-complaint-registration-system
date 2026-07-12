import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

const schema = z.object({
  password: z.string().min(6, "At least 6 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase automatically processes the recovery token from the URL hash
    // and emits a PASSWORD_RECOVERY event.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-1">Reset password</h1>
        <p className="text-sm text-muted-foreground mb-6">Choose a new password for your account.</p>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Validating reset link...</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="rp-pass">New password</Label><Input id="rp-pass" name="password" type="password" required minLength={6} autoComplete="new-password" /></div>
            <div className="space-y-1.5"><Label htmlFor="rp-confirm">Confirm password</Label><Input id="rp-confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Updating..." : "Update password"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}

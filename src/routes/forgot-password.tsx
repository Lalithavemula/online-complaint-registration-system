import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email() });

function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: fd.get("email") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Password reset email sent");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-1">Forgot password</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter your email and we'll send you a reset link.</p>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm">Check your inbox for a link to reset your password.</p>
            <Link to="/auth" className="text-sm text-primary underline">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="fp-email">Email</Label><Input id="fp-email" name="email" type="email" required autoComplete="email" /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending..." : "Send reset link"}</Button>
            <div className="text-center"><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link></div>
          </form>
        )}
      </Card>
    </div>
  );
}

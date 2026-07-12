import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: (s.mode as string) === "signup" ? "signup" : "signin" }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, "At least 6 characters"),
});
const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(2, "Name too short").max(80),
  phone: z.string().trim().max(20).optional(),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && session) navigate({ to: "/dashboard", replace: true }); }, [loading, session, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: fd.get("email"), password: fd.get("password"),
      name: fd.get("name"), phone: fd.get("phone") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const redirect = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: redirect,
        data: { name: parsed.data.name, phone: parsed.data.phone ?? null },
      },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created — signing you in");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-[var(--gradient-hero)] text-primary-foreground">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-white/15 flex items-center justify-center"><Shield className="h-5 w-5" /></div>
          <div><div className="font-heading font-semibold">CivicDesk</div><div className="text-[10px] uppercase tracking-wider opacity-70">Government Portal</div></div>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Your voice shapes better cities.</h2>
          <p className="mt-3 opacity-80 max-w-md">Register complaints, chat with agents, and track every step until it's resolved — with full transparency.</p>
        </div>
        <div className="text-xs opacity-70">Secure • Encrypted • Government-grade</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold mb-1">Welcome</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in with your account, or register as a citizen.
            <br />
            <span className="text-xs">Agent accounts are provisioned by an administrator.</span>
          </p>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register as Citizen</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="pt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="si-email">Email</Label><Input id="si-email" name="email" type="email" required autoComplete="email" /></div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="si-pass">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                  </div>
                  <Input id="si-pass" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="pt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="su-name">Full name</Label><Input id="su-name" name="name" required maxLength={80} /></div>
                <div className="space-y-1.5"><Label htmlFor="su-email">Email</Label><Input id="su-email" name="email" type="email" required autoComplete="email" /></div>
                <div className="space-y-1.5"><Label htmlFor="su-phone">Phone (optional)</Label><Input id="su-phone" name="phone" maxLength={20} /></div>
                <div className="space-y-1.5"><Label htmlFor="su-pass">Password</Label><Input id="su-pass" name="password" type="password" required minLength={6} autoComplete="new-password" /></div>
                <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Creating..." : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-6 text-center">By continuing you agree to our terms of service.</p>
        </Card>
      </div>
    </div>
  );
}

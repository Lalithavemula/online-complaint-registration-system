import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Shield, FileText, MessageSquare, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { session, loading } = useAuth();
  if (!loading && session) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="font-heading font-semibold">CivicDesk</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Government Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth" search={{ mode: "signup" } as never}>Register</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,var(--color-primary)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success" /> Official Citizen Grievance System
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight">
              Raise your voice.<br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Get it resolved.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl">
              Submit civic complaints, track their status in real time, chat with assigned agents,
              and get transparent updates from your local administration — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild><Link to="/auth" search={{ mode: "signup" } as never}>File a Complaint <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/auth">Track Complaint</Link></Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                ["24/7", "Availability"],
                ["11", "Departments"],
                ["Real-time", "Tracking"],
              ].map(([n, l]) => (
                <div key={l}><div className="text-2xl font-bold text-primary">{n}</div><div className="text-xs text-muted-foreground">{l}</div></div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border bg-card p-6 shadow-[0_20px_60px_-20px_oklch(0.3_0.1_265/0.35)]">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div className="font-semibold">Complaint #A-102</div>
                <span className="text-xs px-2 py-1 rounded-full bg-info/15 text-info">In Progress</span>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  { t: "Submitted", d: "Pothole reported on Main Street", ok: true },
                  { t: "Assigned to agent", d: "Ravi K. (Road Damage dept.)", ok: true },
                  { t: "Work in progress", d: "On-site inspection scheduled", ok: true },
                  { t: "Resolution", d: "Awaiting completion", ok: false },
                ].map((s, i) => (
                  <div key={i} className="flex gap-3">
                    <CheckCircle2 className={`h-5 w-5 ${s.ok ? "text-success" : "text-muted-foreground/40"}`} />
                    <div>
                      <div className="font-medium">{s.t}</div>
                      <div className="text-muted-foreground text-xs">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-3xl font-bold text-center">Built for citizens, agents & administrators</h2>
          <p className="mt-2 text-center text-muted-foreground">Role-based dashboards, transparent workflows, real-time chat.</p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { i: FileText, t: "Easy Registration", d: "Submit complaints with photos and documents in under a minute." },
              { i: MessageSquare, t: "Direct Communication", d: "Chat with assigned agents to share more details and updates." },
              { i: BarChart3, t: "Full Transparency", d: "See timelines, resolutions, and analytics of civic performance." },
            ].map((f) => (
              <div key={f.t} className="rounded-xl border bg-card p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <f.i className="h-5 w-5" />
                </div>
                <div className="font-semibold text-lg">{f.t}</div>
                <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CivicDesk. A modern citizen grievance portal.
      </footer>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";
import { CATEGORIES, STATUSES, categoryLabel, statusLabel } from "@/lib/constants";
import { format, subDays, startOfDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AnalyticsPage,
});

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function AnalyticsPage() {
  const { role } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);

  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      const [{ data: c }, { data: f }] = await Promise.all([
        supabase.from("complaints").select("id,category,status,priority,created_at"),
        supabase.from("feedback").select("rating"),
      ]);
      setRows(c ?? []); setFeedback(f ?? []);
    })();
  }, [role]);

  if (role !== "admin") return <div className="text-center py-12">Admins only.</div>;

  const byCategory = CATEGORIES.map((c) => ({ name: c.label, value: rows.filter((r) => r.category === c.value).length }));
  const byStatus = STATUSES.map((s) => ({ name: s.label, value: rows.filter((r) => r.status === s.value).length }));
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = startOfDay(subDays(new Date(), 6 - i));
    const next = subDays(d, -1);
    return {
      day: format(d, "MMM d"),
      count: rows.filter((r) => new Date(r.created_at) >= d && new Date(r.created_at) < next).length,
    };
  });
  const avgRating = feedback.length ? (feedback.reduce((a, b) => a + b.rating, 0) / feedback.length).toFixed(2) : "—";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground">Insights across all complaints</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatBox label="Total complaints" value={rows.length} />
        <StatBox label="Resolved" value={rows.filter(r => r.status === "resolved" || r.status === "closed").length} />
        <StatBox label="Pending" value={rows.filter(r => r.status === "pending").length} />
        <StatBox label="Avg rating" value={avgRating} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Complaints in last 7 days</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-64">
              <ResponsiveContainer>
                <LineChart data={last7}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="var(--color-chart-1)" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>By status</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>By category</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-72">
              <ResponsiveContainer>
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} fontSize={11} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </CardContent></Card>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, PRIORITIES } from "@/lib/constants";
import { Upload, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/complaints/new")({
  component: NewComplaint,
});

const schema = z.object({
  title: z.string().trim().min(4, "Title too short").max(120),
  description: z.string().trim().min(10, "Please describe the issue").max(4000),
  location: z.string().trim().max(200).optional(),
});

function NewComplaint() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState("others");
  const [priority, setPriority] = useState("medium");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (role && role !== "user") {
    return <div className="text-center py-12 text-muted-foreground">Only citizens can file complaints.</div>;
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      title: fd.get("title"),
      description: fd.get("description"),
      location: fd.get("location") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    try {
      const { data: created, error } = await supabase.from("complaints").insert({
        title: parsed.data.title,
        description: parsed.data.description,
        location: parsed.data.location ?? null,
        category: category as any,
        priority: priority as any,
        created_by: user.id,
      }).select("id").single();
      if (error) throw error;

      if (files.length) {
        const uploaded: { name: string; path: string; size: number; type: string }[] = [];
        for (const f of files) {
          const path = `${user.id}/${created.id}/${Date.now()}-${f.name}`;
          const { error: upErr } = await supabase.storage.from("complaint-attachments").upload(path, f, { upsert: false });
          if (upErr) { toast.error(`Upload failed: ${f.name}`); continue; }
          uploaded.push({ name: f.name, path, size: f.size, type: f.type });
        }
        if (uploaded.length) {
          await supabase.from("complaints").update({ attachments: uploaded as any }).eq("id", created.id);
        }
      }

      toast.success("Complaint submitted");
      navigate({ to: "/complaints/$id", params: { id: created.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">File a Complaint</h1>
        <p className="text-sm text-muted-foreground">Provide clear details so agents can act quickly.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Complaint details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required maxLength={120} placeholder="Brief summary of the issue" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority *</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" maxLength={200} placeholder="Street, area, landmark" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" name="description" required rows={6} maxLength={4000} placeholder="Explain what happened, when, and any impact..." />
            </div>
            <div className="space-y-1.5">
              <Label>Attachments</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <label className="flex flex-col items-center justify-center py-6 cursor-pointer">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="mt-2 text-sm text-muted-foreground">Click to upload images or documents</span>
                  <input type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                </label>
                {files.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-sm bg-secondary rounded px-3 py-2">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => setFiles((prev) => prev.filter((_, x) => x !== i))}>
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={() => navigate({ to: "/complaints" })}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Complaint"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

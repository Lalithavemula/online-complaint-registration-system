import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { STATUSES, statusColor, statusLabel, priorityColor, priorityLabel, categoryLabel } from "@/lib/constants";
import { ArrowLeft, Send, Star, Paperclip, Upload, CheckCircle2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/complaints/$id")({
  component: ComplaintDetail,
});

function ComplaintDetail() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const qc = useQueryClient();

  const { data: complaint, isLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("complaints").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: creator } = useQuery({
    queryKey: ["profile", complaint?.created_by],
    enabled: !!complaint?.created_by,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name,email,phone").eq("id", complaint!.created_by).maybeSingle();
      return data;
    },
  });

  const { data: agent } = useQuery({
    queryKey: ["profile", complaint?.assigned_agent],
    enabled: !!complaint?.assigned_agent,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name,email").eq("id", complaint!.assigned_agent!).maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["complaint-history", id],
    queryFn: async () => {
      const { data } = await supabase.from("complaint_status_history").select("*").eq("complaint_id", id).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: feedback } = useQuery({
    queryKey: ["complaint-feedback", id],
    queryFn: async () => {
      const { data } = await supabase.from("feedback").select("*").eq("complaint_id", id).maybeSingle();
      return data;
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents-list"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, profiles!inner(id,name,email)").eq("role", "agent");
      return (data ?? []) as any[];
    },
  });

  const canView = complaint && (complaint.created_by === user?.id || complaint.assigned_agent === user?.id || role === "admin");
  const canManageStatus = complaint && (complaint.assigned_agent === user?.id || role === "admin");
  const canAssign = role === "admin";
  const canFeedback = complaint && complaint.created_by === user?.id && (complaint.status === "resolved" || complaint.status === "closed");

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!complaint || !canView) return <div className="text-center py-12">Complaint not found or access denied.</div>;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <Button variant="ghost" size="sm" asChild><Link to="/complaints"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-xl">{complaint.title}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-1">
                    #{complaint.id.slice(0, 8)} · filed {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={priorityColor(complaint.priority)}>{priorityLabel(complaint.priority)}</Badge>
                  <Badge variant="outline" className={statusColor(complaint.status)}>{statusLabel(complaint.status)}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Category</div><div>{categoryLabel(complaint.category)}</div></div>
                <div><div className="text-xs text-muted-foreground">Location</div><div>{complaint.location || "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Filed by</div><div>{creator?.name ?? "—"}</div></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Description</div>
                <p className="text-sm whitespace-pre-wrap">{complaint.description}</p>
              </div>
              <AttachmentList files={(complaint.attachments as any[]) ?? []} label="Attachments" />
              {complaint.resolution_notes && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                  <div className="text-xs font-semibold text-success mb-1">Resolution notes</div>
                  <p className="text-sm whitespace-pre-wrap">{complaint.resolution_notes}</p>
                  <AttachmentList files={(complaint.resolution_files as any[]) ?? []} label="Resolution files" />
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              {canFeedback || feedback ? <TabsTrigger value="feedback">Feedback</TabsTrigger> : null}
            </TabsList>
            <TabsContent value="timeline">
              <Card><CardContent className="pt-6">
                <div className="space-y-4">
                  {history.map((h, i) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        </div>
                        {i < history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-4">
                        <div className="text-sm font-medium">
                          {h.from_status ? `${statusLabel(h.from_status)} → ${statusLabel(h.to_status)}` : statusLabel(h.to_status)}
                        </div>
                        <div className="text-xs text-muted-foreground">{format(new Date(h.created_at), "PPp")}</div>
                        {h.note && <div className="text-sm mt-1">{h.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="chat">
              <ChatPanel complaintId={id} />
            </TabsContent>
            {(canFeedback || feedback) && (
              <TabsContent value="feedback">
                <FeedbackPanel complaintId={id} userId={user!.id} existing={feedback} canEdit={!!canFeedback} onSaved={() => qc.invalidateQueries({ queryKey: ["complaint-feedback", id] })} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="space-y-4">
          {canManageStatus && (
            <ManageStatusCard complaint={complaint} onSaved={() => {
              qc.invalidateQueries({ queryKey: ["complaint", id] });
              qc.invalidateQueries({ queryKey: ["complaint-history", id] });
            }} />
          )}
          {canAssign && (
            <AssignCard complaintId={id} current={complaint.assigned_agent} agents={agents} onSaved={() => qc.invalidateQueries({ queryKey: ["complaint", id] })} />
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">Assigned agent</CardTitle></CardHeader>
            <CardContent>
              {agent ? (
                <div className="flex items-center gap-3">
                  <Avatar><AvatarFallback>{(agent.name ?? "A").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div><div className="font-medium text-sm">{agent.name}</div><div className="text-xs text-muted-foreground">{agent.email}</div></div>
                </div>
              ) : <div className="text-sm text-muted-foreground">Not assigned yet</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AttachmentList({ files, label }: { files: any[]; label: string }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const m: Record<string, string> = {};
      for (const f of files) {
        const { data } = await supabase.storage.from("complaint-attachments").createSignedUrl(f.path, 3600);
        if (data?.signedUrl) m[f.path] = data.signedUrl;
      }
      setUrls(m);
    })();
  }, [files]);
  if (!files.length) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground mt-2 mb-1">{label}</div>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <a key={i} href={urls[f.path] ?? "#"} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs hover:bg-accent/10">
            <Paperclip className="h-3 w-3" />{f.name}
          </a>
        ))}
      </div>
    </div>
  );
}

function ManageStatusCard({ complaint, onSaved }: { complaint: any; onSaved: () => void }) {
  const { user } = useAuth();
  const [status, setStatus] = useState(complaint.status);
  const [notes, setNotes] = useState(complaint.resolution_notes ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const patch: any = { status };
      if (status === "resolved" || status === "closed" || notes) patch.resolution_notes = notes || null;
      if (files.length && user) {
        const uploaded: any[] = [...((complaint.resolution_files as any[]) ?? [])];
        for (const f of files) {
          const path = `${user.id}/${complaint.id}/resolution-${Date.now()}-${f.name}`;
          const { error } = await supabase.storage.from("complaint-attachments").upload(path, f);
          if (!error) uploaded.push({ name: f.name, path, size: f.size, type: f.type });
        }
        patch.resolution_files = uploaded;
      }
      const { error } = await supabase.from("complaints").update(patch).eq("id", complaint.id);
      if (error) throw error;
      toast.success("Complaint updated");
      setFiles([]);
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Manage complaint</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Resolution notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What was done..." />
        </div>
        <div>
          <Label className="text-xs">Resolution files</Label>
          <label className="mt-1 flex items-center gap-2 text-xs cursor-pointer rounded border border-dashed p-2 hover:bg-accent/5">
            <Upload className="h-3 w-3" />{files.length ? `${files.length} file(s)` : "Attach files"}
            <input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          </label>
        </div>
        <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
      </CardContent>
    </Card>
  );
}

function AssignCard({ complaintId, current, agents, onSaved }: { complaintId: string; current: string | null; agents: any[]; onSaved: () => void }) {
  const [val, setVal] = useState<string>(current ?? "unassigned");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const patch: any = { assigned_agent: val === "unassigned" ? null : val };
    if (val !== "unassigned") patch.status = "assigned";
    const { error } = await supabase.from("complaints").update(patch).eq("id", complaintId);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Assignment updated"); onSaved(); }
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Assign agent</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Select value={val} onValueChange={setVal}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {agents.map((a: any) => (
              <SelectItem key={a.user_id} value={a.user_id}>{a.profiles?.name ?? a.profiles?.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="w-full" onClick={save} disabled={busy}>{busy ? "..." : "Update"}</Button>
      </CardContent>
    </Card>
  );
}

function ChatPanel({ complaintId }: { complaintId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("messages").select("*").eq("complaint_id", complaintId).order("created_at", { ascending: true });
      setMessages(data ?? []);
    };
    load();
    const channel = supabase.channel(`msg-${complaintId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `complaint_id=eq.${complaintId}` },
        (payload) => setMessages((p) => [...p, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [complaintId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ complaint_id: complaintId, sender: user.id, message: body });
    if (error) toast.error(error.message);
  };

  return (
    <Card>
      <CardContent className="p-0 flex flex-col h-[500px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">No messages yet. Start the conversation.</div>
          ) : messages.map((m) => {
            const mine = m.sender === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  <div>{m.message}</div>
                  <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t p-3">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." maxLength={1000} />
          <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FeedbackPanel({ complaintId, userId, existing, canEdit, onSaved }: { complaintId: string; userId: string; existing: any; canEdit: boolean; onSaved: () => void }) {
  const [rating, setRating] = useState<number>(existing?.rating ?? 5);
  const [comment, setComment] = useState<string>(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const payload = { complaint_id: complaintId, user_id: userId, rating, comment: comment || null };
    const { error } = existing
      ? await supabase.from("feedback").update(payload).eq("id", existing.id)
      : await supabase.from("feedback").insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Feedback saved"); onSaved(); }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div>
          <Label className="text-xs">Rating</Label>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" disabled={!canEdit && !!existing} onClick={() => setRating(n)}>
                <Star className={`h-6 w-6 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Comment</Label>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} disabled={!canEdit && !!existing} placeholder="How was your experience?" />
        </div>
        {canEdit && <Button onClick={save} disabled={busy}>{busy ? "Saving..." : existing ? "Update feedback" : "Submit feedback"}</Button>}
      </CardContent>
    </Card>
  );
}

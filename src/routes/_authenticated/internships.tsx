import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/internships")({
  head: () => ({
    meta: [
      { title: "Internships — Nexus" },
      { name: "description", content: "Track internship applications from saved to offer." },
      { property: "og:title", content: "Internships — Nexus" },
      { property: "og:description", content: "Track internship applications from saved to offer." },
    ],
  }),
  component: InternshipsPage,
});

const STAGES = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
];

function InternshipsPage() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["internships"] });

  const { data: rows = [] } = useQuery({
    queryKey: ["internships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internships")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell
      title="Internships"
      description="Your application pipeline, stage by stage."
      action={<NewApplicationDialog onDone={invalidate} />}
    >
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const items = rows.filter((r) => r.status === stage.id);
          return (
            <div key={stage.id} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{stage.label}</h2>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              {items.map((r) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{r.role}</CardTitle>
                    <p className="text-xs text-muted-foreground">{r.company}</p>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-4">
                    {r.deadline && (
                      <p className="text-xs text-muted-foreground">
                        Deadline {format(new Date(r.deadline), "d MMM")}
                      </p>
                    )}
                    {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                    <Select
                      value={r.status}
                      onValueChange={async (status) => {
                        await supabase.from("internships").update({ status }).eq("id", r.id);
                        invalidate();
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      {r.link && (
                        <Button asChild variant="ghost" size="sm" className="flex-1">
                          <a href={r.link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Posting
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Delete application"
                        onClick={async () => {
                          await supabase.from("internships").delete().eq("id", r.id);
                          invalidate();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Empty
                </p>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function NewApplicationDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    company: "",
    role: "",
    link: "",
    deadline: "",
    notes: "",
    status: "saved",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("internships").insert({
      user_id: userData.user!.id,
      company: form.company,
      role: form.role,
      link: form.link || null,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      notes: form.notes || null,
      status: form.status,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ company: "", role: "", link: "", deadline: "", notes: "", status: "saved" });
    setOpen(false);
    onDone();
    toast.success("Application added");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> Add application
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track an application</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                required
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                required
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link</Label>
              <Input
                id="link"
                type="url"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inotes">Notes</Label>
            <Textarea
              id="inotes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Nexus" },
      { name: "description", content: "Track coursework and personal projects with progress and deadlines." },
      { property: "og:title", content: "Projects — Nexus" },
      { property: "og:description", content: "Track coursework and personal projects with progress and deadlines." },
    ],
  }),
  component: ProjectsPage,
});

const STATUSES = [
  { id: "planning", label: "Planning" },
  { id: "active", label: "Active" },
  { id: "on_hold", label: "On hold" },
  { id: "complete", label: "Complete" },
];

function ProjectsPage() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["projects"] });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell
      title="Projects"
      description="Bigger pieces of work, with progress you can see."
      action={<NewProjectDialog onDone={invalidate} />}
    >
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No projects yet. Add your dissertation, group work or side build.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.due_date ? `Due ${format(new Date(p.due_date), "d MMM yyyy")}` : "No deadline"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete project"
                  onClick={async () => {
                    await supabase.from("projects").delete().eq("id", p.id);
                    invalidate();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} />
                  <Slider
                    className="mt-3"
                    value={[p.progress]}
                    max={100}
                    step={5}
                    onValueChange={async (values) => {
                      const v = values[0] ?? 0;
                      await supabase.from("projects").update({ progress: v }).eq("id", p.id);
                      invalidate();
                    }}
                  />
                </div>
                <Select
                  value={p.status}
                  onValueChange={async (status) => {
                    await supabase.from("projects").update({ status }).eq("id", p.id);
                    invalidate();
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function NewProjectDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", status: "planning" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("projects").insert({
      user_id: userData.user!.id,
      title: form.title,
      description: form.description || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      status: form.status,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ title: "", description: "", due_date: "", status: "planning" });
    setOpen(false);
    onDone();
    toast.success("Project added");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ptitle">Title</Label>
            <Input
              id="ptitle"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdesc">Description</Label>
            <Textarea
              id="pdesc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pdue">Deadline</Label>
              <Input
                id="pdue"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full">
            Add project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

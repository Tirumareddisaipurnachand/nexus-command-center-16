import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle2, Circle, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { breakdownTask } from "@/lib/ai.functions";
import { priorityClass, statusLabel } from "@/lib/useCurrentUser";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Nexus" },
      { name: "description", content: "Create, prioritize and complete your coursework tasks." },
      { property: "og:title", content: "Tasks — Nexus" },
      { property: "og:description", content: "Create, prioritize and complete your coursework tasks." },
    ],
  }),
  component: TasksPage,
});

type Task = {
  id: string;
  title: string;
  details: string | null;
  course: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  estimated_minutes: number | null;
  ai_generated: boolean;
};

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

function TasksPage() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useTasks();
  const [filter, setFilter] = useState("all");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const toggle = useMutation({
    mutationFn: async (task: Task) => {
      const next = task.status === "done" ? "todo" : "done";
      const { error } = await supabase.from("tasks").update({ status: next }).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Task deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const visible = tasks.filter((t) => (filter === "all" ? true : t.status === filter));

  return (
    <AppShell
      title="Tasks"
      description="Everything you owe, in one list."
      action={
        <div className="flex gap-2">
          <AiBreakdownDialog onDone={invalidate} />
          <NewTaskDialog onDone={invalidate} />
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { id: "all", label: "All" },
          { id: "todo", label: "To do" },
          { id: "in_progress", label: "In progress" },
          { id: "done", label: "Done" },
        ].map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No tasks here yet. Add one, or let AI break down an assignment for you.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((task) => (
            <Card key={task.id} className="transition-shadow hover:shadow-sm">
              <CardContent className="flex items-start gap-3 py-4">
                <button
                  onClick={() => toggle.mutate(task)}
                  className="mt-0.5 text-muted-foreground transition-colors hover:text-primary"
                  aria-label="Toggle complete"
                >
                  {task.status === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={
                        task.status === "done"
                          ? "font-medium line-through text-muted-foreground"
                          : "font-medium"
                      }
                    >
                      {task.title}
                    </p>
                    {task.ai_generated && (
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" /> AI
                      </Badge>
                    )}
                  </div>
                  {task.details && (
                    <p className="mt-1 text-sm text-muted-foreground">{task.details}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className={`rounded-full border px-2 py-0.5 ${priorityClass(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.course && <span>{task.course}</span>}
                    {task.due_date && <span>Due {format(new Date(task.due_date), "d MMM")}</span>}
                    {task.estimated_minutes && <span>~{task.estimated_minutes} min</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={task.status}
                    onValueChange={(status) => setStatus.mutate({ id: task.id, status })}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <SelectValue>{statusLabel(task.status)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To do</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(task.id)}
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function NewTaskDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    details: "",
    course: "",
    due_date: "",
    priority: "medium",
    estimated_minutes: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("tasks").insert({
      user_id: userData.user!.id,
      title: form.title,
      details: form.details || null,
      course: form.course || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      priority: form.priority,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ title: "", details: "", course: "", due_date: "", priority: "medium", estimated_minutes: "" });
    setOpen(false);
    onDone();
    toast.success("Task added");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> New task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">Details</Label>
            <Textarea
              id="details"
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Input
                id="course"
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">Due</Label>
              <Input
                id="due"
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(priority) => setForm({ ...form, priority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="est">Estimate (min)</Label>
              <Input
                id="est"
                type="number"
                min={5}
                value={form.estimated_minutes}
                onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Add task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AiBreakdownDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const run = useServerFn(breakdownTask);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await run({ data: { prompt, dueDate: dueDate || null } });
      const { data: userData } = await supabase.auth.getUser();
      const rows = result.subtasks.map((s) => {
        const due = new Date();
        due.setDate(due.getDate() + (s.day_offset ?? 0));
        return {
          user_id: userData.user!.id,
          title: s.title,
          details: s.details || null,
          course: result.course || null,
          due_date: due.toISOString(),
          priority: s.priority ?? "medium",
          estimated_minutes: s.estimated_minutes ?? null,
          ai_generated: true,
        };
      });
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;
      setPrompt("");
      setDueDate("");
      setOpen(false);
      onDone();
      toast.success(`Added ${rows.length} steps to your task list`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI breakdown failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="mr-1 h-4 w-4" /> AI breakdown
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Break an assignment into steps</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">What do you need to do?</Label>
            <Textarea
              id="prompt"
              required
              rows={4}
              placeholder="I have a 3000-word essay on climate policy for POL210 due next Friday, and I haven't started research."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Final deadline (optional)</Label>
            <Input
              id="deadline"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Planning…
              </>
            ) : (
              "Generate plan"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

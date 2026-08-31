import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, isBefore, startOfWeek } from "date-fns";
import { ArrowRight, CalendarClock, CheckCircle2, Flame, Timer } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { priorityClass } from "@/lib/useCurrentUser";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nexus" },
      { name: "description", content: "Your deadlines, study hours and progress at a glance." },
      { property: "og:title", content: "Dashboard — Nexus" },
      { property: "og:description", content: "Your deadlines, study hours and progress at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
      const [tasks, sessions, profile, projects] = await Promise.all([
        supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("study_sessions").select("minutes, subject, started_at").gte("started_at", weekStart),
        supabase.from("profiles").select("*").maybeSingle(),
        supabase.from("projects").select("*").order("due_date", { ascending: true, nullsFirst: false }).limit(3),
      ]);
      return {
        tasks: tasks.data ?? [],
        sessions: sessions.data ?? [],
        profile: profile.data,
        projects: projects.data ?? [],
      };
    },
  });

  const tasks = data?.tasks ?? [];
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done").length;
  const overdue = open.filter((t) => t.due_date && isBefore(new Date(t.due_date), new Date()));
  const minutes = (data?.sessions ?? []).reduce((sum, s) => sum + s.minutes, 0);
  const goalHours = data?.profile?.weekly_goal_hours ?? 10;
  const hours = minutes / 60;
  const pct = Math.min(100, Math.round((hours / goalHours) * 100));

  const stats = [
    { label: "Open tasks", value: open.length, icon: CalendarClock },
    { label: "Completed", value: done, icon: CheckCircle2 },
    { label: "Overdue", value: overdue.length, icon: Flame },
    { label: "Hours this week", value: hours.toFixed(1), icon: Timer },
  ];

  return (
    <AppShell
      title={`Welcome back${data?.profile?.full_name ? `, ${data.profile.full_name.split(" ")[0]}` : ""}`}
      description="Here's where things stand today."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between py-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-3xl font-bold">{value}</p>
              </div>
              <Icon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Up next</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/tasks">
                All tasks <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {open.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing pending. Add a task to get started.
              </p>
            ) : (
              open.slice(0, 6).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.course ? `${task.course} · ` : ""}
                      {task.due_date ? `Due ${format(new Date(task.due_date), "d MMM, HH:mm")}` : "No deadline"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${priorityClass(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly study goal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">
                {hours.toFixed(1)}
                <span className="text-base font-normal text-muted-foreground"> / {goalHours} h</span>
              </p>
              <Progress value={pct} className="mt-3" />
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link to="/study">Log a session</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.projects ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects tracked yet.</p>
              ) : (
                data!.projects.map((p) => (
                  <div key={p.id}>
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium">{p.title}</span>
                      <span className="text-muted-foreground">{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="mt-1.5" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/study")({
  head: () => ({
    meta: [
      { title: "Study sessions — Nexus" },
      { name: "description", content: "Run a focus timer and log the hours you put into each subject." },
      { property: "og:title", content: "Study sessions — Nexus" },
      { property: "og:description", content: "Run a focus timer and log the hours you put into each subject." },
    ],
  }),
  component: StudyPage,
});

function StudyPage() {
  const queryClient = useQueryClient();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  const { data: sessions = [] } = useQuery({
    queryKey: ["study_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (minutes: number) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("study_sessions").insert({
        user_id: userData.user!.id,
        subject: subject || "General",
        minutes,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSeconds(0);
      setRunning(false);
      setNotes("");
      toast.success("Session logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const total = sessions.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <AppShell title="Study" description="Time on task is the only metric that compounds.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Focus timer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center font-display text-6xl font-bold tabular-nums">
              {mm}:{ss}
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => setRunning((r) => !r)}>
                {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
                {running ? "Pause" : "Start"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRunning(false);
                  setSeconds(0);
                }}
              >
                <RotateCcw className="mr-1 h-4 w-4" /> Reset
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Organic chemistry"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button
              className="w-full"
              disabled={seconds < 60 || save.isPending}
              onClick={() => save.mutate(Math.round(seconds / 60))}
            >
              Log {Math.max(1, Math.round(seconds / 60))} min
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent sessions · {(total / 60).toFixed(1)} h logged</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No sessions yet — start the timer above.
              </p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{s.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(s.started_at), "d MMM, HH:mm")}
                      {s.notes ? ` · ${s.notes}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{s.minutes} min</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

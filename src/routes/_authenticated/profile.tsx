import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Nexus" },
      { name: "description", content: "Your student details and weekly study goal." },
      { property: "og:title", content: "Profile — Nexus" },
      { property: "og:description", content: "Your student details and weekly study goal." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    school: "",
    major: "",
    year: "",
    weekly_goal_hours: "10",
  });
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        school: profile.school ?? "",
        major: profile.major ?? "",
        year: profile.year ?? "",
        weekly_goal_hours: String(profile.weekly_goal_hours ?? 10),
      });
    }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").upsert({
      id: userData.user!.id,
      full_name: form.full_name || null,
      school: form.school || null,
      major: form.major || null,
      year: form.year || null,
      weekly_goal_hours: Number(form.weekly_goal_hours) || 10,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Profile saved");
  }

  return (
    <AppShell title="Profile" description="Tune the command center to your course load.">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Student details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school">School</Label>
                <Input
                  id="school"
                  value={form.school}
                  onChange={(e) => setForm({ ...form, school: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Major</Label>
                <Input
                  id="major"
                  value={form.major}
                  onChange={(e) => setForm({ ...form, major: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  placeholder="2nd year"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal">Weekly study goal (hours)</Label>
                <Input
                  id="goal"
                  type="number"
                  min={1}
                  max={80}
                  value={form.weekly_goal_hours}
                  onChange={(e) => setForm({ ...form, weekly_goal_hours: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}

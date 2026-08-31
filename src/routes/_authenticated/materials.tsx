import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/materials")({
  head: () => ({
    meta: [
      { title: "Materials — Nexus" },
      { name: "description", content: "Upload and organise lecture slides, notes and readings." },
      { property: "og:title", content: "Materials — Nexus" },
      { property: "og:description", content: "Upload and organise lecture slides, notes and readings." },
    ],
  }),
  component: MaterialsPage,
});

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function MaterialsPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("materials").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("materials").insert({
        user_id: uid,
        title: title || file.name,
        course: course || null,
        file_path: path,
        file_size: file.size,
        file_type: file.type || null,
      });
      if (error) throw error;
      setFile(null);
      setTitle("");
      setCourse("");
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const remove = useMutation({
    mutationFn: async (m: { id: string; file_path: string }) => {
      await supabase.storage.from("materials").remove([m.file_path]);
      const { error } = await supabase.from("materials").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function open(path: string) {
    const { data, error } = await supabase.storage.from("materials").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <AppShell title="Materials" description="Every slide deck, note and reading in one library.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={upload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mtitle">Title</Label>
                <Input
                  id="mtitle"
                  placeholder="Week 4 lecture slides"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mcourse">Course</Label>
                <Input id="mcourse" value={course} onChange={(e) => setCourse(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={uploading || !file}>
                <Upload className="mr-1 h-4 w-4" />
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {materials.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing uploaded yet.
              </p>
            ) : (
              materials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <FileText className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.course ? `${m.course} · ` : ""}
                      {formatSize(m.file_size)} · {format(new Date(m.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => open(m.file_path)} aria-label="Open">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate({ id: m.id, file_path: m.file_path })}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

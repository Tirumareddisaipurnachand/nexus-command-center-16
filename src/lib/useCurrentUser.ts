import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
    staleTime: 60_000,
  });
}

export const PRIORITIES = ["low", "medium", "high"] as const;
export const STATUSES = ["todo", "in_progress", "done"] as const;

export function priorityClass(priority: string) {
  if (priority === "high") return "bg-destructive/10 text-destructive border-destructive/20";
  if (priority === "low") return "bg-muted text-muted-foreground border-border";
  return "bg-accent/25 text-accent-foreground border-accent/40";
}

export function statusLabel(status: string) {
  return status === "in_progress" ? "In progress" : status === "done" ? "Done" : "To do";
}

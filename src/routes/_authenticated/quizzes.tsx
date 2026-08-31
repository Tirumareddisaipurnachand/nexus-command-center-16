import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { generateQuiz } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/quizzes")({
  head: () => ({
    meta: [
      { title: "Quizzes — Nexus" },
      { name: "description", content: "Generate AI practice quizzes on any topic and test yourself." },
      { property: "og:title", content: "Quizzes — Nexus" },
      { property: "og:description", content: "Generate AI practice quizzes on any topic and test yourself." },
    ],
  }),
  component: QuizzesPage,
});

type Question = { question: string; options: string[]; answer: number; explanation?: string };

function QuizzesPage() {
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const run = useServerFn(generateQuiz);

  const { data: quizzes = [] } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await run({ data: { topic, count: Number(count) } });
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          user_id: userData.user!.id,
          title: result.title,
          subject: topic,
          questions: result.questions,
        })
        .select()
        .single();
      if (error) throw error;
      setTopic("");
      setActiveId(data.id);
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast.success("Quiz ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate quiz");
    } finally {
      setLoading(false);
    }
  }

  const active = quizzes.find((q) => q.id === activeId);

  return (
    <AppShell title="Quizzes" description="Practice retrieval, not re-reading.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate a quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={generate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    required
                    placeholder="Krebs cycle"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="count">Questions</Label>
                  <Input
                    id="count"
                    type="number"
                    min={3}
                    max={12}
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing questions…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" /> Generate
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your quizzes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quizzes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No quizzes yet.</p>
              ) : (
                quizzes.map((q) => (
                  <div key={q.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveId(q.id)}
                      className={`min-w-0 flex-1 rounded-lg border p-3 text-left text-sm transition-colors ${
                        activeId === q.id ? "border-primary bg-secondary" : "border-border hover:bg-secondary/60"
                      }`}
                    >
                      <p className="truncate font-medium">{q.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {(q.questions as unknown as Question[]).length} questions
                        {q.last_score !== null ? ` · last score ${q.last_score}%` : ""}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete quiz"
                      onClick={async () => {
                        await supabase.from("quizzes").delete().eq("id", q.id);
                        if (activeId === q.id) setActiveId(null);
                        queryClient.invalidateQueries({ queryKey: ["quizzes"] });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {active ? (
            <QuizRunner
              key={active.id}
              id={active.id}
              title={active.title}
              questions={active.questions as unknown as Question[]}
              onScored={() => queryClient.invalidateQueries({ queryKey: ["quizzes"] })}
            />
          ) : (
            <Card>
              <CardContent className="py-20 text-center text-sm text-muted-foreground">
                Generate or pick a quiz to start practising.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function QuizRunner({
  id,
  title,
  questions,
  onScored,
}: {
  id: string;
  title: string;
  questions: Question[];
  onScored: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const correct = questions.filter((q, i) => answers[i] === q.answer).length;
  const score = Math.round((correct / questions.length) * 100);

  async function submit() {
    setSubmitted(true);
    await supabase.from("quizzes").update({ last_score: score }).eq("id", id);
    onScored();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q, i) => (
          <div key={i}>
            <p className="font-medium">
              {i + 1}. {q.question}
            </p>
            <div className="mt-2 space-y-2">
              {q.options.map((opt, oi) => {
                const chosen = answers[i] === oi;
                const isAnswer = q.answer === oi;
                return (
                  <button
                    key={oi}
                    disabled={submitted}
                    onClick={() => setAnswers({ ...answers, [i]: oi })}
                    className={`flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
                      submitted && isAnswer
                        ? "border-primary bg-primary/10"
                        : submitted && chosen
                          ? "border-destructive bg-destructive/10"
                          : chosen
                            ? "border-primary bg-secondary"
                            : "border-border hover:bg-secondary/60"
                    }`}
                  >
                    {submitted && isAnswer && <Check className="h-4 w-4 text-primary" />}
                    {submitted && chosen && !isAnswer && <X className="h-4 w-4 text-destructive" />}
                    {opt}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
            )}
          </div>
        ))}
        {submitted ? (
          <div className="rounded-lg border border-border p-4 text-center">
            <p className="font-display text-3xl font-bold">{score}%</p>
            <p className="text-sm text-muted-foreground">
              {correct} of {questions.length} correct
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
            >
              Retry
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            disabled={Object.keys(answers).length !== questions.length}
            onClick={submit}
          >
            Submit answers
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

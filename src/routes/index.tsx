import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Brain,
  Briefcase,
  FolderKanban,
  GraduationCap,
  ListChecks,
  Sparkles,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus — AI Student Command Center" },
      {
        name: "description",
        content:
          "One workspace for tasks, study sessions, materials, quizzes, flashcards, projects and internships — with AI that breaks big assignments into a plan.",
      },
      { property: "og:title", content: "Nexus — AI Student Command Center" },
      {
        property: "og:description",
        content:
          "One workspace for tasks, study sessions, materials, quizzes, flashcards, projects and internships — with AI that breaks big assignments into a plan.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ListChecks, title: "Tasks that plan themselves", body: "Describe an assignment in plain English and AI turns it into scheduled, prioritized steps." },
  { icon: Timer, title: "Focused study sessions", body: "Run a timer, log what you studied, and watch your weekly hours build up." },
  { icon: Brain, title: "Instant quizzes", body: "Generate multiple-choice practice on any topic and score yourself." },
  { icon: Sparkles, title: "Flashcards on demand", body: "Build decks by hand or let AI draft them from a topic." },
  { icon: FolderKanban, title: "Project tracking", body: "Keep group and personal projects moving with progress and deadlines." },
  { icon: Briefcase, title: "Internship pipeline", body: "Track applications from saved to offer, with deadlines and notes." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <GraduationCap className="h-6 w-6 text-primary" />
          Nexus
        </span>
        <Button asChild variant="outline">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-20">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Sparkles className="h-3.5 w-3.5" /> AI study planning built in
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          Your whole semester, running from one command center.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Nexus keeps deadlines, study time, notes, revision and career applications in a single
          place — and uses AI to turn "I have a 3000-word essay due Friday" into an actual plan.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">
              Start free <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        Built for students who juggle a lot.
      </footer>
    </div>
  );
}

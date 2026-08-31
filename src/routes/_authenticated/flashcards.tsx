import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { generateFlashcards } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — Nexus" },
      { name: "description", content: "Build decks by hand or generate them with AI, then review." },
      { property: "og:title", content: "Flashcards — Nexus" },
      { property: "og:description", content: "Build decks by hand or generate them with AI, then review." },
    ],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [deck, setDeck] = useState<string | null>(null);
  const [manual, setManual] = useState({ deck: "", front: "", back: "" });
  const run = useServerFn(generateFlashcards);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["flashcards"] });

  const { data: cards = [] } = useQuery({
    queryKey: ["flashcards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const decks = Array.from(new Set(cards.map((c) => c.deck)));
  const active = deck ?? decks[0] ?? null;
  const deckCards = cards.filter((c) => c.deck === active);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await run({ data: { topic, count: 8 } });
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("flashcards").insert(
        result.cards.map((c) => ({
          user_id: userData.user!.id,
          deck: result.deck || topic,
          front: c.front,
          back: c.back,
        })),
      );
      if (error) throw error;
      setDeck(result.deck || topic);
      setTopic("");
      invalidate();
      toast.success(`Added ${result.cards.length} cards`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate cards");
    } finally {
      setLoading(false);
    }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("flashcards").insert({
      user_id: userData.user!.id,
      deck: manual.deck || "General",
      front: manual.front,
      back: manual.back,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setDeck(manual.deck || "General");
    setManual({ deck: manual.deck, front: "", back: "" });
    invalidate();
    toast.success("Card added");
  }

  return (
    <AppShell title="Flashcards" description="Short prompts, clear answers, repeated often.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI deck</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={generate} className="space-y-3">
                <Input
                  required
                  placeholder="Topic, e.g. Spanish irregular verbs"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" /> Generate 8 cards
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add a card</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addManual} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="deckname">Deck</Label>
                  <Input
                    id="deckname"
                    value={manual.deck}
                    onChange={(e) => setManual({ ...manual, deck: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="front">Front</Label>
                  <Textarea
                    id="front"
                    required
                    value={manual.front}
                    onChange={(e) => setManual({ ...manual, front: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="back">Back</Label>
                  <Textarea
                    id="back"
                    required
                    value={manual.back}
                    onChange={(e) => setManual({ ...manual, back: e.target.value })}
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full">
                  <Plus className="mr-1 h-4 w-4" /> Add card
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {decks.map((d) => (
              <Button
                key={d}
                size="sm"
                variant={active === d ? "default" : "outline"}
                onClick={() => setDeck(d)}
              >
                {d}
              </Button>
            ))}
          </div>
          {deckCards.length === 0 ? (
            <Card>
              <CardContent className="py-20 text-center text-sm text-muted-foreground">
                No cards yet — generate a deck or add one manually.
              </CardContent>
            </Card>
          ) : (
            <Reviewer key={active ?? ""} cards={deckCards} onDelete={invalidate} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Reviewer({
  cards,
  onDelete,
}: {
  cards: { id: string; front: string; back: string; reviews: number }[];
  onDelete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[Math.min(index, cards.length - 1)]!;

  async function next(step: number) {
    setFlipped(false);
    setIndex((i) => (i + step + cards.length) % cards.length);
    await supabase.from("flashcards").update({ reviews: card.reviews + 1 }).eq("id", card.id);
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="flex min-h-56 w-full items-center justify-center rounded-xl border border-border bg-secondary/50 p-8 text-center text-lg font-medium transition-colors hover:bg-secondary"
        >
          {flipped ? card.back : card.front}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          {flipped ? "Answer" : "Tap to reveal"} · card {index + 1} of {cards.length}
        </p>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => next(-1)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.from("flashcards").delete().eq("id", card.id);
              setFlipped(false);
              setIndex(0);
              onDelete();
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
          <Button size="sm" onClick={() => next(1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

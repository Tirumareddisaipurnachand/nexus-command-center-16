import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MODEL = "google/gemini-3.7-flash";

async function callGateway(system: string, user: string): Promise<unknown> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this app.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("AI is busy right now — try again in a moment.");
    if (res.status === 402)
      throw new Error("AI credits are exhausted. Add credits in Lovable to keep using AI.");
    if (res.status === 403) throw new Error("AI access is blocked for this workspace.");
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI returned an unexpected response.");
  }
}

const subtaskSchema = z.object({
  subtasks: z
    .array(
      z.object({
        title: z.string(),
        details: z.string().optional().default(""),
        estimated_minutes: z.number().int().positive().max(600).optional().default(45),
        priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
        day_offset: z.number().int().min(0).max(120).optional().default(0),
      }),
    )
    .min(1)
    .max(10),
  course: z.string().optional().default(""),
  summary: z.string().optional().default(""),
});

export const breakdownTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; dueDate?: string | null }) =>
    z.object({ prompt: z.string().min(3).max(2000), dueDate: z.string().nullish() }).parse(input),
  )
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        "You are a study planner for university students.",
        "Break the student's request into 3-7 concrete, actionable subtasks ordered by what to do first.",
        'Reply ONLY with JSON: {"summary": string, "course": string, "subtasks": [{"title": string, "details": string, "estimated_minutes": number, "priority": "low"|"medium"|"high", "day_offset": number}]}',
        "day_offset is days from today when the subtask should be done (0 = today).",
      ].join(" "),
      `Request: ${data.prompt}${data.dueDate ? `\nFinal deadline: ${data.dueDate}` : ""}`,
    );
    return subtaskSchema.parse(raw);
  });

const quizSchema = z.object({
  title: z.string().default("Practice quiz"),
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(2).max(6),
        answer: z.number().int().min(0),
        explanation: z.string().optional().default(""),
      }),
    )
    .min(1)
    .max(15),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topic: string; count?: number }) =>
    z.object({ topic: z.string().min(2).max(500), count: z.number().int().min(3).max(12).default(5) }).parse(input),
  )
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        "You write multiple-choice practice quizzes for students.",
        `Create exactly ${data.count} questions.`,
        'Reply ONLY with JSON: {"title": string, "questions": [{"question": string, "options": [string], "answer": number, "explanation": string}]}',
        "answer is the 0-based index of the correct option.",
      ].join(" "),
      `Topic: ${data.topic}`,
    );
    return quizSchema.parse(raw);
  });

const cardsSchema = z.object({
  deck: z.string().default("General"),
  cards: z.array(z.object({ front: z.string(), back: z.string() })).min(1).max(25),
});

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topic: string; count?: number }) =>
    z.object({ topic: z.string().min(2).max(500), count: z.number().int().min(3).max(20).default(8) }).parse(input),
  )
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        "You create concise study flashcards.",
        `Create exactly ${data.count} cards with short prompts and clear answers.`,
        'Reply ONLY with JSON: {"deck": string, "cards": [{"front": string, "back": string}]}',
      ].join(" "),
      `Topic: ${data.topic}`,
    );
    return cardsSchema.parse(raw);
  });

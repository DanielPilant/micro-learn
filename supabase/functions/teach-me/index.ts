// Supabase Edge Function: teach-me
// Runtime: Deno (managed by Supabase)
//
// Flow:
//   1. Verify caller JWT
//   2. Parse { question_text, language } from request body
//   3. Call Gemini 2.5 Flash with a "Socratic tutor" prompt
//   4. Return { explanation } — stateless, nothing persisted

import { createClient } from "npm:@supabase/supabase-js@2";

// ── CORS ─────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Language config ───────────────────────────────────────────
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  he: "Hebrew",
};

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Verify JWT ────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing or malformed Authorization header" }, 401);
    }
    const jwt = authHeader.slice(7);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(jwt);
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ── 2. Parse and validate request body ───────────────────
    const body = await req.json().catch(() => ({}));
    const { question_text, language } = body as {
      question_text?: unknown;
      language?: unknown;
    };

    if (!question_text || typeof question_text !== "string") {
      return json({ error: "question_text (string) is required" }, 400);
    }
    if (!language || typeof language !== "string") {
      return json({ error: "language (string) is required" }, 400);
    }

    const languageName = LANGUAGE_NAMES[language] ?? language.toUpperCase();

    // ── 3. Call Gemini 2.5 Flash ─────────────────────────────
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return json({ error: "GEMINI_API_KEY secret is not configured" }, 500);
    }

    const prompt = `You are a Senior FAANG Interviewer and Educator. \
A student is preparing for a technical interview and does not understand the \
underlying concepts required to answer the following question:

QUESTION: ${question_text}

Your task is to write a short, educational crash course (2-3 paragraphs) that \
teaches the core concepts the student needs to understand in order to form their \
own answer. Do NOT give the direct answer to the question. Do NOT show sample \
code answers or walk through a solution step-by-step. Instead, explain the \
underlying topic clearly — what it is, why it matters, and how it works — so \
the student can reason through the answer themselves.

LANGUAGE REQUIREMENT: You MUST write the entire explanation in ${languageName} \
(language code: "${language}"). Do NOT use English unless quoting a strictly \
technical identifier (e.g. a function name, a protocol name, an algorithm name).

Return ONLY a JSON object with this exact shape (no markdown, no code fences):
{"explanation": "<2-3 paragraphs in ${languageName}>"}`;

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4, // slightly higher than eval for more natural prose
          },
        }),
      },
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("Gemini API error:", errText);
      return json({ error: "LLM service unavailable" }, 502);
    }

    // ── 4. Parse Gemini response ──────────────────────────────
    const geminiData = await geminiResp.json();
    const rawContent: string =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let result: { explanation: string };
    try {
      result = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse Gemini JSON:", rawContent);
      return json({ error: "Failed to parse LLM response" }, 502);
    }

    const explanation = result.explanation?.trim() ?? "";
    if (!explanation) {
      return json({ error: "LLM returned an empty explanation" }, 502);
    }

    // ── 5. Return explanation to client ──────────────────────
    return json({ explanation });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

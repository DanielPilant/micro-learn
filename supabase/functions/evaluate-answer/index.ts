// Supabase Edge Function: evaluate-answer
// Runtime: Deno (managed by Supabase)
//
// Flow:
//   1. Verify caller JWT
//   2. Load answer + question from DB
//   3. Call Gemini 2.0 Flash (JSON MIME mode)
//   4. Persist score + feedback back to user_answers
//   5. Return { score, feedback } to the React Native client

import { createClient } from "npm:@supabase/supabase-js@2";

// ── CORS headers (required even for mobile when using Supabase Functions) ──
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

// ── Score helpers ────────────────────────────────────────────
interface EvalResult {
  score: number;
  feedback: string;
}

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Parse request ────────────────────────────────────
    const { answer_id } = await req.json();
    if (!answer_id || typeof answer_id !== "string") {
      return json({ error: "answer_id (string) is required" }, 400);
    }

    // ── 2. Verify JWT ───────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing or malformed Authorization header" }, 401);
    }
    const jwt = authHeader.slice(7);

    // Admin client – bypasses RLS for reads/writes inside this function.
    // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically
    // by Supabase into every Edge Function environment.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Validate the JWT and extract the authenticated user.
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(jwt);
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ── 3. Fetch the answer (scoped to the calling user) ────
    const { data: answer, error: answerError } = await admin
      .from("user_answers")
      .select("id, answer_text, question_id")
      .eq("id", answer_id)
      .eq("user_id", user.id) // prevents a user from evaluating someone else's answer
      .single();

    if (answerError || !answer) {
      return json({ error: "Answer not found or access denied" }, 404);
    }

    // ── 4. Fetch the associated question ────────────────────
    const { data: question, error: questionError } = await admin
      .from("questions")
      .select("question, sample_answer")
      .eq("id", answer.question_id)
      .single();

    if (questionError || !question) {
      return json({ error: "Question not found" }, 404);
    }

    // ── 5. Call Gemini 2.0 Flash ────────────────────────────
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return json({ error: "GEMINI_API_KEY secret is not configured" }, 500);
    }

    const prompt = `You are a senior software engineer conducting a FAANG-level \
technical interview. Evaluate the candidate's answer for technical correctness, \
depth, and clarity. Score 70+ only when key concepts are clearly and accurately \
explained. Be honest and constructive.

QUESTION: ${question.question}

MODEL ANSWER: ${question.sample_answer ?? "Not provided — evaluate on general correctness."}

CANDIDATE'S ANSWER: ${answer.answer_text}

Return ONLY a JSON object with this exact shape (no markdown, no code fences):
{"score": <integer 0-100>, "feedback": "<2-3 specific, constructive sentences>"}`;

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json", // enforces pure JSON output
            temperature: 0.1,                     // low variance = consistent scoring
          },
        }),
      },
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("Gemini API error:", errText);
      return json({ error: "LLM service unavailable" }, 502);
    }

    // ── 6. Parse Gemini response ─────────────────────────────
    const geminiData = await geminiResp.json();
    const rawContent: string =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let evalResult: EvalResult;
    try {
      evalResult = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse Gemini JSON:", rawContent);
      return json({ error: "Failed to parse LLM response" }, 502);
    }

    // Clamp score defensively – mistrustful of LLM arithmetic.
    const score = Math.max(0, Math.min(100, Math.round(evalResult.score)));
    const feedback = evalResult.feedback?.trim() ?? "";

    // ── 7. Persist score + feedback ─────────────────────────
    const { error: updateError } = await admin
      .from("user_answers")
      .update({ score, feedback })
      .eq("id", answer_id);

    if (updateError) {
      // Non-fatal: the evaluation is still valid even if the DB write fails.
      // Log it so it shows up in Supabase Function logs.
      console.error("Failed to persist evaluation:", updateError.message);
    }

    // ── 8. Return to client ─────────────────────────────────
    return json({ score, feedback });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

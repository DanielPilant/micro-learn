// Supabase Edge Function: evaluate-answer
// Runtime: Deno (managed by Supabase)
//
// Flow:
//   1. Verify caller JWT
//   2. Fetch user's content_language from profiles
//   3. Load answer + question from DB
//   4. Call Gemini 2.5 Flash (JSON MIME mode) with localized feedback prompt
//   5. Persist score + feedback back to user_answers
//   6. Return { score, feedback } to the React Native client

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

interface EvalResult {
  score: number;
  feedback: string;
}

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Parse request ─────────────────────────────────────
    const { answer_id } = await req.json();
    if (!answer_id || typeof answer_id !== "string") {
      return json({ error: "answer_id (string) is required" }, 400);
    }

    // ── 2. Verify JWT ────────────────────────────────────────
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

    // ── 3. Fetch the user's preferred content language ───────
    const { data: profile } = await admin
      .from("profiles")
      .select("content_language")
      .eq("id", user.id)
      .single();

    const userLanguage = profile?.content_language ?? "en";
    const languageName =
      LANGUAGE_NAMES[userLanguage] ?? userLanguage.toUpperCase();

    // ── 4. Fetch the answer (scoped to the calling user) ─────
    const { data: answer, error: answerError } = await admin
      .from("user_answers")
      .select("id, answer_text, question_id")
      .eq("id", answer_id)
      .eq("user_id", user.id) // prevents evaluating another user's answer
      .single();

    if (answerError || !answer) {
      return json({ error: "Answer not found or access denied" }, 404);
    }

    // ── 5. Fetch the associated question ─────────────────────
    const { data: question, error: questionError } = await admin
      .from("questions")
      .select("question, sample_answer")
      .eq("id", answer.question_id)
      .single();

    if (questionError || !question) {
      return json({ error: "Question not found" }, 404);
    }

    // ── 6. Call Gemini 2.5 Flash ─────────────────────────────
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

LANGUAGE REQUIREMENT: You MUST write the feedback entirely in ${languageName} \
(language code: "${userLanguage}"). Do NOT use English in the feedback text unless \
quoting code snippets or strictly technical identifiers (e.g. function names, \
protocol names). The JSON field names must remain in English.

Return ONLY a JSON object with this exact shape (no markdown, no code fences):
{"score": <integer 0-100>, "feedback": "<2-3 specific, constructive sentences in ${languageName}>"}`;

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1, // low variance = consistent scoring
          },
        }),
      },
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("Gemini API error:", errText);
      return json({ error: "LLM service unavailable" }, 502);
    }

    // ── 7. Parse Gemini response ──────────────────────────────
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

    // Clamp score defensively
    const score = Math.max(0, Math.min(100, Math.round(evalResult.score)));
    const feedback = evalResult.feedback?.trim() ?? "";

    // ── 8. Persist score + feedback ───────────────────────────
    const { error: updateError } = await admin
      .from("user_answers")
      .update({ score, feedback })
      .eq("id", answer_id);

    if (updateError) {
      // Non-fatal: evaluation is still valid even if the DB write fails
      console.error("Failed to persist evaluation:", updateError.message);
    }

    // ── 9. Return to client ───────────────────────────────────
    return json({ score, feedback });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

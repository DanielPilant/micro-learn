// Supabase Edge Function: generate-practice-questions
// Runtime: Deno (managed by Supabase)
//
// Generates 5 new open-ended FAANG practice questions via Gemini 2.5 Flash,
// inserts them into the questions table, and returns the rows.
//
// Auth: accepts EITHER a CRON_SECRET bearer token (for the nightly cron job)
//       OR a valid Supabase Auth JWT (for mobile "Generate More" button).

import { createClient } from "npm:@supabase/supabase-js@2";

// ── CORS ────────────────────────────────────────────────────
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

// ── Categories to randomize across ──────────────────────────
const CATEGORIES = [
  "system_design",
  "algorithms",
  "databases",
  "networking",
  "operating_systems",
] as const;

function pickRandomCategories(count: number): string[] {
  const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
}

// ── Main handler ────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Dual auth: CRON_SECRET or Supabase JWT ────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing or malformed Authorization header" }, 401);
    }
    const token = authHeader.slice(7);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Try CRON_SECRET first
    const cronSecret = Deno.env.get("CRON_SECRET");
    let authenticated = false;

    if (cronSecret && token === cronSecret) {
      authenticated = true;
    }

    // If not cron, try validating as a Supabase user JWT
    if (!authenticated) {
      const {
        data: { user },
        error: authError,
      } = await admin.auth.getUser(token);
      if (authError || !user) {
        return json({ error: "Unauthorized" }, 401);
      }
      authenticated = true;
    }

    // ── 2. Call Gemini 2.5 Flash ─────────────────────────────
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return json({ error: "GEMINI_API_KEY secret is not configured" }, 500);
    }

    const categories = pickRandomCategories(5);

    const prompt = `You are a Senior FAANG Interviewer. Generate exactly 5 open-ended \
technical interview questions. Each question should be thoughtful and require a \
multi-sentence answer.

Assign each question one of these categories in order: ${categories.join(", ")}.

For each question, also assign a difficulty from: easy, medium, hard. Mix the \
difficulties (at least one of each easy and hard, rest can be medium).

Return ONLY a JSON array with exactly 5 objects (no markdown, no code fences):
[
  {
    "category": "<one of: system_design, algorithms, databases, networking, operating_systems>",
    "difficulty": "<easy|medium|hard>",
    "question": "<the interview question>",
    "hint": "<a short hint to guide the candidate>",
    "sample_answer": "<a concise model answer, 2-4 sentences>"
  }
]`;

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        }),
      },
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("Gemini API error:", errText);
      return json({ error: "LLM service unavailable" }, 502);
    }

    // ── 3. Parse Gemini response ─────────────────────────────
    const geminiData = await geminiResp.json();
    const rawContent: string =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: Array<{
      category: string;
      difficulty: string;
      question: string;
      hint: string;
      sample_answer: string;
    }>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse Gemini JSON:", rawContent);
      return json({ error: "Failed to parse LLM response" }, 502);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.error("Invalid questions array from Gemini:", parsed);
      return json({ error: "LLM returned an invalid response structure" }, 502);
    }

    // ── 4. Insert into questions table ───────────────────────
    const rows = parsed.map((q) => ({
      category: q.category,
      difficulty: q.difficulty,
      question: q.question,
      hint: q.hint || null,
      sample_answer: q.sample_answer || null,
    }));

    const { data: inserted, error: insertError } = await admin
      .from("questions")
      .insert(rows)
      .select("*");

    if (insertError) {
      console.error("Insert error:", insertError.message);
      return json({ error: "Failed to save questions" }, 500);
    }

    // ── 5. Return the newly created questions ────────────────
    return json({ questions: inserted });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

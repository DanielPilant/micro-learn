// Supabase Edge Function: generate-daily-concept
// Runtime: Deno (managed by Supabase)
//
// Designed to be invoked by a cron job or webhook — NOT by end users.
// Authenticates via a shared CRON_SECRET header instead of a user JWT.
//
// Flow:
//   1. Validate CRON_SECRET
//   2. Pick ONE random subtopic for the day (same topic across all languages)
//   3. For each supported language ['en', 'he']:
//        a. Skip if a concept for (today, language) already exists (idempotent)
//        b. Call Gemini 2.5 Flash to generate article + quiz in that language
//        c. INSERT into daily_concepts with the language tag
//   4. Return a summary of what was inserted

import { json, optionsResponse } from "../_shared/response.ts";
import { createAdminClient } from "../_shared/auth.ts";
import { requireGeminiKey, callGemini } from "../_shared/gemini.ts";
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from "../_shared/language.ts";
import { SYLLABUS } from "../_shared/syllabus.ts";

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();

  try {
    // ── 1. Authenticate via CRON_SECRET ──────────────────────
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret) {
      return json({ error: "CRON_SECRET is not configured" }, 500);
    }
    if (req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    const geminiApiKey = requireGeminiKey();
    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

    // ── 2. Pick ONE topic for the day (shared across all languages) ──
    const topic = SYLLABUS[Math.floor(Math.random() * SYLLABUS.length)];

    // ── 3. Generate a concept for each supported language ────
    const results = [];

    for (const lang of SUPPORTED_LANGUAGES) {
      const langName = LANGUAGE_NAMES[lang];

      // Per-language idempotency: only skip if this specific language
      // already has a concept for today.
      const { data: existing } = await admin
        .from("daily_concepts")
        .select("id")
        .eq("date", today)
        .eq("language", lang)
        .maybeSingle();

      if (existing) {
        results.push({
          language: lang,
          skipped: true,
          reason: "Already exists",
          id: existing.id,
        });
        continue;
      }

      // Build prompt with explicit language instruction
      const prompt = `You are a Senior FAANG Interviewer and technical educator. \
Write a short, engaging, and highly technical article (2-3 paragraphs, roughly 250-350 words) \
about the following topic:

CATEGORY: ${topic.category}
TOPIC: ${topic.subtopic}

The article should:
- Open with a compelling hook that explains WHY this concept matters in real-world engineering or interviews.
- Cover the core mechanics with concrete examples or analogies.
- End with a practical insight or common interview pitfall.

Then, generate exactly 3 challenging multiple-choice questions that test deep understanding \
(not surface-level recall). Each question must have exactly 4 options.

LANGUAGE REQUIREMENT: You MUST write the entire article, all questions, all answer options, \
and all explanations entirely in ${langName} (language code: "${lang}"). \
Do NOT use English unless quoting code snippets or strictly technical identifiers (e.g. function names).

CRITICAL JSON FORMAT RULES — FOLLOW EXACTLY OR THE SYSTEM WILL REJECT YOUR RESPONSE:
1. Output ONLY raw JSON. Do NOT wrap in markdown code fences (\`\`\`json or \`\`\`). Do NOT add any text before or after the JSON.
2. The outer object MUST have EXACTLY these English keys: "title", "content", "quiz_data". DO NOT translate these keys.
3. "quiz_data" MUST be a JSON array of exactly 3 objects.
4. Each quiz object MUST have EXACTLY these English keys: "question", "options", "correct_index", "explanation". DO NOT translate these keys.
5. "options" MUST be an array of exactly 4 strings. "correct_index" MUST be an integer 0-3.
6. ONLY the string VALUES should be written in ${langName}. The keys stay in English.

ANSWER PLACEMENT RULES — CRITICAL:
7. "correct_index" MUST be the 0-based index of the CORRECT answer inside the "options" array. \
If the correct answer is the third option, correct_index MUST be 2. Double-check this for EVERY question.
8. RANDOMIZE where you place the correct answer. Do NOT always put it first. \
Vary the position across the 3 questions (e.g. one at index 1, one at index 3, one at index 0).
9. "explanation" MUST explicitly state WHICH option is correct and WHY the others are wrong.

{
  "title": "<concise article title in ${langName}>",
  "content": "<full article text in ${langName}>",
  "quiz_data": [
    {
      "question": "<question text in ${langName}>",
      "options": ["<wrong>", "<wrong>", "<correct answer>", "<wrong>"],
      "correct_index": 2,
      "explanation": "<explain why option C (index 2) is correct in ${langName}>"
    }
  ]
}`;

      let rawContent: string;
      try {
        rawContent = await callGemini(geminiApiKey, prompt, {
          temperature: 0.4,
        });
      } catch (err) {
        console.error(`Gemini error for lang=${lang}:`, err);
        results.push({ language: lang, skipped: true, reason: "Gemini error" });
        continue;
      }

      let parsed: { title: string; content: string; quiz_data: unknown[] };
      try {
        // Strip markdown code fences that Gemini sometimes wraps around JSON
        const cleanedContent = rawContent
          .replace(/^```(?:json)?\s*\n?/i, "")
          .replace(/\n?\s*```\s*$/i, "")
          .trim();
        parsed = JSON.parse(cleanedContent);
      } catch {
        console.error(
          `Failed to parse Gemini JSON for lang=${lang}:`,
          rawContent,
        );
        results.push({ language: lang, skipped: true, reason: "Parse error" });
        continue;
      }

      // ── Validate top-level structure ─────────────────────────
      if (
        typeof parsed.title !== "string" ||
        !parsed.title ||
        typeof parsed.content !== "string" ||
        !parsed.content ||
        !Array.isArray(parsed.quiz_data) ||
        parsed.quiz_data.length < 1
      ) {
        console.error(`Invalid concept structure for lang=${lang}:`, parsed);
        results.push({
          language: lang,
          skipped: true,
          reason: "Invalid structure",
        });
        continue;
      }

      // ── Validate each quiz item has the required English keys ──
      const quizValid = parsed.quiz_data.every((item) => {
        const q = item as Record<string, unknown>;
        return (
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          (q.options as unknown[]).length === 4 &&
          typeof q.correct_index === "number" &&
          q.correct_index >= 0 &&
          q.correct_index <= 3 &&
          typeof q.explanation === "string"
        );
      });

      if (!quizValid) {
        console.error(
          `quiz_data items have invalid/translated keys for lang=${lang}:`,
          JSON.stringify(parsed.quiz_data),
        );
        results.push({
          language: lang,
          skipped: true,
          reason: "Invalid quiz_data item structure",
        });
        continue;
      }

      const { data: inserted, error: insertError } = await admin
        .from("daily_concepts")
        .insert({
          date: today,
          language: lang,
          title: parsed.title,
          content: parsed.content,
          quiz_data: parsed.quiz_data,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Insert error for lang=${lang}:`, insertError.message);
        results.push({ language: lang, skipped: true, reason: "Insert error" });
        continue;
      }

      results.push({
        language: lang,
        skipped: false,
        id: inserted.id,
        title: parsed.title,
      });
    }

    return json({
      message: "Daily concept generation complete",
      date: today,
      category: topic.category,
      subtopic: topic.subtopic,
      results,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

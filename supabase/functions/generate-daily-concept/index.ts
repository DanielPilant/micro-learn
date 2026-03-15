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
const SUPPORTED_LANGUAGES = ["en", "he"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  he: "Hebrew",
};

// ── FAANG Interview Syllabus ──────────────────────────────────
interface SyllabusTopic {
  category: string;
  subtopic: string;
}

const SYLLABUS: SyllabusTopic[] = [
  // DSA
  {
    category: "DSA",
    subtopic: "Big O Notation & Time/Space Complexity Analysis",
  },
  {
    category: "DSA",
    subtopic: "Hash Tables: Internals, Collision Resolution & Use Cases",
  },
  {
    category: "DSA",
    subtopic: "Trees: Binary Search Trees, AVL Trees & Red-Black Trees",
  },
  {
    category: "DSA",
    subtopic: "Graphs: BFS, DFS, Dijkstra & Topological Sort",
  },
  {
    category: "DSA",
    subtopic: "Dynamic Programming: Memoization vs Tabulation",
  },
  { category: "DSA", subtopic: "Sliding Window & Two-Pointer Techniques" },

  // System Design
  {
    category: "System Design",
    subtopic: "CAP Theorem & Trade-offs in Distributed Systems",
  },
  {
    category: "System Design",
    subtopic: "Load Balancing: Algorithms & Layer 4 vs Layer 7",
  },
  {
    category: "System Design",
    subtopic:
      "Caching Strategies: Write-Through, Write-Back & Eviction Policies",
  },
  {
    category: "System Design",
    subtopic: "Database Sharding: Horizontal Partitioning & Consistent Hashing",
  },
  {
    category: "System Design",
    subtopic: "Message Queues: Kafka, RabbitMQ & Event-Driven Architecture",
  },

  // Fullstack & API
  {
    category: "Fullstack & API",
    subtopic: "REST vs gRPC vs GraphQL: Trade-offs & When to Use Each",
  },
  {
    category: "Fullstack & API",
    subtopic: "The Event Loop: Node.js Concurrency Model in Depth",
  },
  {
    category: "Fullstack & API",
    subtopic: "JWT & OAuth 2.0: Token-Based Authentication Flows",
  },
  {
    category: "Fullstack & API",
    subtopic: "Web Security: XSS, CSRF & Content Security Policies",
  },

  // Networks
  {
    category: "Networks",
    subtopic: "TCP vs UDP: Reliability, Flow Control & Congestion Handling",
  },
  {
    category: "Networks",
    subtopic: "DNS Resolution: Recursive Lookups, Caching & Anycast",
  },
  {
    category: "Networks",
    subtopic:
      "TLS Handshake: Certificate Chains, Key Exchange & Perfect Forward Secrecy",
  },

  // Operating Systems
  {
    category: "OS",
    subtopic: "Processes vs Threads: Scheduling, Context Switching & IPC",
  },
  {
    category: "OS",
    subtopic: "Deadlocks: Conditions, Detection, Prevention & Avoidance",
  },
  {
    category: "OS",
    subtopic: "Memory Management: Paging, Segmentation & Virtual Memory",
  },

  // DevOps
  {
    category: "DevOps",
    subtopic: "Containers: Docker Internals, Namespaces & Cgroups",
  },
  {
    category: "DevOps",
    subtopic: "Kubernetes Pods: Scheduling, Services & Autoscaling",
  },
  {
    category: "DevOps",
    subtopic: "CI/CD Pipelines: Build, Test & Deployment Automation",
  },
  {
    category: "DevOps",
    subtopic: "Infrastructure as Code: Terraform, Declarative vs Imperative",
  },
];

// ── Gemini helper ─────────────────────────────────────────────
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      }),
    },
  );
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error: ${errText}`);
  }
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Authenticate via CRON_SECRET ──────────────────────
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret) {
      return json({ error: "CRON_SECRET is not configured" }, 500);
    }
    if (req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return json({ error: "GEMINI_API_KEY secret is not configured" }, 500);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

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

{
  "title": "<concise article title in ${langName}>",
  "content": "<full article text in ${langName}>",
  "quiz_data": [
    {
      "question": "<question text in ${langName}>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_index": 0,
      "explanation": "<explanation in ${langName}>"
    }
  ]
}`;

      let rawContent: string;
      try {
        rawContent = await callGemini(geminiApiKey, prompt);
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
      const quizValid = parsed.quiz_data.every((q: Record<string, unknown>) =>
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correct_index === "number" &&
        q.correct_index >= 0 &&
        q.correct_index <= 3 &&
        typeof q.explanation === "string"
      );

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

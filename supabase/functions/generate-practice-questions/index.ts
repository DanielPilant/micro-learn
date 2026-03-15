// Supabase Edge Function: generate-practice-questions
// Runtime: Deno (managed by Supabase)
//
// Generates open-ended FAANG practice questions via Gemini 2.5 Flash:
//   - 3–4 questions from random SYLLABUS subtopics
//   - 1–2 "Wildcard Hot Topic" questions on cutting-edge interview themes
//
// Auth:
//   - CRON_SECRET bearer token → generates 5 questions for EACH supported
//     language ('en', 'he') in a single invocation.
//   - Supabase Auth JWT (mobile "Generate More" button) → fetches the user's
//     content_language from profiles and generates 5 for that language only.

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

// ── Helpers ──────────────────────────────────────────────────
function pickRandom<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

type ParsedQuestion = {
  category: string;
  difficulty: string;
  question: string;
  hint: string;
  sample_answer: string;
};

async function generateForLanguage(
  apiKey: string,
  lang: string,
): Promise<ParsedQuestion[]> {
  const langName =
    LANGUAGE_NAMES[lang as SupportedLanguage] ?? lang.toUpperCase();

  const syllabusCount = Math.random() < 0.5 ? 3 : 4;
  const wildcardCount = 5 - syllabusCount;
  const selectedTopics = pickRandom(SYLLABUS, syllabusCount);

  const syllabusLines = selectedTopics
    .map((t, i) => `  ${i + 1}. [${t.category}] ${t.subtopic}`)
    .join("\n");

  const prompt = `You are a Senior FAANG Interviewer. Generate exactly 5 open-ended \
technical interview questions that require multi-sentence answers.

PART A — Syllabus Questions (generate exactly ${syllabusCount}):
Each question MUST be based on one of these specific subtopics:
${syllabusLines}

PART B — Wildcard Hot Topics (generate exactly ${wildcardCount}):
These should cover cutting-edge concepts highly relevant in modern FAANG \
interviews today. Pick from themes like: Vector Databases, AI/LLM System Design, \
Edge Computing, Distributed Tracing, WebAssembly, eBPF, Service Mesh, \
Observability & OpenTelemetry, CRDT-based Collaboration, or similar.

RULES:
- Mix difficulties: at least 1 easy, at least 1 hard, the rest medium.
- Use these DB-friendly category values: system_design, algorithms, databases, \
networking, operating_systems, dsa_theory, devops, fullstack_api. \
Pick the best fit for each question.
- Every question must have a helpful hint and a concise model answer.

LANGUAGE REQUIREMENT: All generated content — the question text, hint, and \
sample_answer — MUST be written entirely in ${langName} (language code: "${lang}"). \
Do NOT use English unless quoting code snippets or strictly technical identifiers \
(e.g. function names, API names). The "category" and "difficulty" fields must \
remain in English as they are DB enum values.

Return ONLY a JSON array with exactly 5 objects (no markdown, no code fences):
[
  {
    "category": "<DB category value in English>",
    "difficulty": "<easy|medium|hard>",
    "question": "<the interview question in ${langName}>",
    "hint": "<a short hint in ${langName}>",
    "sample_answer": "<a concise model answer in ${langName}, 2-4 sentences>"
  }
]`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error for lang=${lang}: ${errText}`);
  }

  const geminiData = await resp.json();
  const rawContent: string =
    geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const parsed: ParsedQuestion[] = JSON.parse(rawContent);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Invalid response structure for lang=${lang}`);
  }

  return parsed;
}

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
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

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return json({ error: "GEMINI_API_KEY secret is not configured" }, 500);
    }

    const cronSecret = Deno.env.get("CRON_SECRET");
    let languagesToGenerate: string[];

    if (cronSecret && token === cronSecret) {
      // ── Cron path: generate for all supported languages ────
      languagesToGenerate = [...SUPPORTED_LANGUAGES];
    } else {
      // ── User JWT path: generate for the user's language ───
      const {
        data: { user },
        error: authError,
      } = await admin.auth.getUser(token);
      if (authError || !user) {
        return json({ error: "Unauthorized" }, 401);
      }

      // Fetch the user's preferred content language
      const { data: profile } = await admin
        .from("profiles")
        .select("content_language")
        .eq("id", user.id)
        .single();

      languagesToGenerate = [profile?.content_language ?? "en"];
    }

    // ── 2. Generate + insert for each target language ────────
    const allInserted = [];

    for (const lang of languagesToGenerate) {
      let parsed: ParsedQuestion[];
      try {
        parsed = await generateForLanguage(geminiApiKey, lang);
      } catch (err) {
        // Don't fail the whole request if one language errors
        console.error(`Generation failed for lang=${lang}:`, err);
        continue;
      }

      const rows = parsed.map((q) => ({
        category: q.category,
        difficulty: q.difficulty,
        question: q.question,
        hint: q.hint || null,
        sample_answer: q.sample_answer || null,
        language: lang,
      }));

      const { data: inserted, error: insertError } = await admin
        .from("questions")
        .insert(rows)
        .select("*");

      if (insertError) {
        console.error(`Insert error for lang=${lang}:`, insertError.message);
        continue;
      }

      allInserted.push(...(inserted ?? []));
    }

    return json({ questions: allInserted });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

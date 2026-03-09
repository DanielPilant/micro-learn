// Supabase Edge Function: generate-daily-concept
// Runtime: Deno (managed by Supabase)
//
// Designed to be invoked by a cron job or webhook — NOT by end users.
// Authenticates via a shared CRON_SECRET header instead of a user JWT.
//
// Flow:
//   1. Validate CRON_SECRET
//   2. Check if today's concept already exists (idempotent)
//   3. Pick a random subtopic from the FAANG syllabus
//   4. Call Gemini 2.5 Flash to generate article + quiz (JSON mode)
//   5. INSERT into daily_concepts for today's date

import { createClient } from "npm:@supabase/supabase-js@2";

// ── CORS (needed even for server-to-server when routing through Supabase) ──
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

// ── FAANG Interview Syllabus ─────────────────────────────────
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

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Authenticate via CRON_SECRET ──────────────────────
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret) {
      return json({ error: "CRON_SECRET is not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ── 2. Build admin Supabase client ───────────────────────
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // ── 3. Idempotency: skip if today's concept already exists ─
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC

    const { data: existing } = await admin
      .from("daily_concepts")
      .select("id")
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      return json({
        message: "Concept for today already exists",
        id: existing.id,
        date: today,
      });
    }

    // ── 4. Pick a random subtopic from the syllabus ──────────
    const topic = SYLLABUS[Math.floor(Math.random() * SYLLABUS.length)];

    // ── 5. Call Gemini 2.5 Flash ─────────────────────────────
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return json({ error: "GEMINI_API_KEY secret is not configured" }, 500);
    }

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

Return ONLY a JSON object with this exact shape (no markdown, no code fences):
{
  "title": "<concise article title>",
  "content": "<full article text>",
  "quiz_data": [
    {
      "question": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_index": <0-3>,
      "explanation": "<1-2 sentence explanation of the correct answer>"
    }
  ]
}`;

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4, // slightly creative but consistent
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

    let parsed: { title: string; content: string; quiz_data: unknown[] };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse Gemini JSON:", rawContent);
      return json({ error: "Failed to parse LLM response" }, 502);
    }

    // Basic validation
    if (
      !parsed.title ||
      !parsed.content ||
      !Array.isArray(parsed.quiz_data) ||
      parsed.quiz_data.length < 1
    ) {
      console.error("Invalid concept structure from Gemini:", parsed);
      return json({ error: "LLM returned an invalid concept structure" }, 502);
    }

    // ── 7. Insert into daily_concepts ────────────────────────
    const { data: inserted, error: insertError } = await admin
      .from("daily_concepts")
      .insert({
        date: today,
        title: parsed.title,
        content: parsed.content,
        quiz_data: parsed.quiz_data,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError.message);
      return json({ error: "Failed to save concept" }, 500);
    }

    return json({
      message: "Daily concept generated successfully",
      id: inserted.id,
      date: today,
      title: parsed.title,
      category: topic.category,
      subtopic: topic.subtopic,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

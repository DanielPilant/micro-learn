-- ============================================================
-- Micro-Learn: Complete Schema (Step 1 + Step 2)
-- Run this entire file as a single script in the Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.
-- ============================================================

-- ── Tables ────────────────────────────────────────────────────

create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,         -- 'system_design' | 'os' | 'networking' | 'dsa_theory'
  difficulty    text not null default 'medium',   -- 'easy' | 'medium' | 'hard'
  question      text not null,
  hint          text,
  sample_answer text,
  created_at    timestamptz not null default now()
);

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  current_streak  int not null default 0,
  longest_streak  int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.user_answers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  question_id   uuid not null references public.questions(id) on delete cascade,
  answer_text   text not null,
  score         int,           -- 0-100, set by Edge Function after LLM evaluation
  feedback      text,          -- written feedback from LLM, set alongside score
  answered_at   timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────

create index if not exists idx_user_answers_user     on public.user_answers(user_id);
create index if not exists idx_user_answers_date     on public.user_answers(answered_at);
create index if not exists idx_questions_category    on public.questions(category);

-- ── Trigger: auto-insert profile on sign-up ──────────────────
-- Fires whenever Supabase Auth creates a row in auth.users.
-- Reads the optional display_name from the user metadata object.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Row-Level Security ────────────────────────────────────────

alter table public.questions    enable row level security;
alter table public.profiles     enable row level security;
alter table public.user_answers enable row level security;

-- Questions: any authenticated user can read
drop policy if exists "Authenticated users can read questions" on public.questions;
create policy "Authenticated users can read questions"
  on public.questions for select
  to authenticated
  using (true);

-- Profiles: users can only read and update their own row
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- User answers: users can only read and insert their own rows
drop policy if exists "Users can insert own answers" on public.user_answers;
create policy "Users can insert own answers"
  on public.user_answers for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own answers" on public.user_answers;
create policy "Users can view own answers"
  on public.user_answers for select
  to authenticated
  using (auth.uid() = user_id);

-- ── Seed Data ─────────────────────────────────────────────────
-- Three sample questions to test the live data connection.

insert into public.questions (category, difficulty, question, hint, sample_answer) values
(
  'system_design',
  'medium',
  'Explain the difference between horizontal and vertical scaling. When would you prefer one over the other?',
  'Think about cost, complexity, and single points of failure.',
  'Vertical scaling adds more power to a single machine (CPU, RAM). Horizontal scaling adds more machines behind a load balancer. Prefer vertical for simplicity when traffic is predictable; prefer horizontal for high availability and elastic workloads that must survive machine failures.'
),
(
  'operating_systems',
  'medium',
  'What is the difference between a process and a thread? How does context switching differ between the two?',
  'Consider shared memory space and switching overhead.',
  'A process is an independent program with its own virtual address space. A thread is a unit of execution that lives inside a process and shares its memory. Context switching between threads is cheaper than between processes because no memory map swap is needed.'
),
(
  'networking',
  'easy',
  'Explain the difference between TCP and UDP. Give one real-world use case where each protocol is the right choice.',
  'Think about reliability vs. latency trade-offs.',
  'TCP is connection-oriented and guarantees ordered, reliable delivery via handshakes and acknowledgements. UDP is connectionless and faster but offers no delivery guarantees. Use TCP for HTTP/file transfers where correctness matters; use UDP for live video or gaming where low latency trumps occasional packet loss.'
);

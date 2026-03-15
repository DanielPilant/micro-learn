-- Step 7: Multi-Language Content Support
-- Adds content_language / language columns to relevant tables and updates
-- the get_unanswered_questions RPC to filter by language.

-- ── 1. profiles: preferred content language ──────────────────
alter table profiles
  add column if not exists content_language text not null default 'en';

-- ── 2. questions: language of the question text ──────────────
alter table questions
  add column if not exists language text not null default 'en';

-- ── 3. daily_concepts: language of the concept text ─────────
alter table daily_concepts
  add column if not exists language text not null default 'en';

-- ── 4. Rebuild get_unanswered_questions with language filter ─
--
-- The original function (step 6) took only one argument: p_user_id uuid.
-- Postgres treats different argument lists as different overloads, so we
-- must drop the old signature before replacing it with the new one.

drop function if exists get_unanswered_questions(uuid);

create or replace function get_unanswered_questions(
  p_user_id  uuid,
  p_language text default 'en'
)
returns setof questions
language sql
stable
security definer
as $$
  select q.*
  from   questions q
  where  q.id not in (
           select ua.question_id
           from   user_answers ua
           where  ua.user_id = p_user_id
         )
    and  q.language = p_language
  order  by q.created_at desc
  limit  20;
$$;

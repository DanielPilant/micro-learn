-- ============================================================
-- Step 8: Fix daily_concepts unique constraint for multi-language support
--
-- Step 5 created UNIQUE(date) -- one concept per calendar day.
-- Step 7 added a `language` column but did not update the constraint.
-- This causes inserts for a second language on the same date to fail.
--
-- Fix: drop UNIQUE(date), add UNIQUE(date, language).
-- Safe to re-run.
-- ============================================================

-- Drop the old single-column unique constraint.
-- Postgres auto-names inline UNIQUE as <table>_<column>_key,
-- but we use a DO block to find the real name just in case.
DO $$
DECLARE
  _constraint_name text;
BEGIN
  -- Find the unique constraint that covers ONLY the "date" column
  SELECT con.conname INTO _constraint_name
  FROM   pg_constraint  con
  JOIN   pg_class       rel ON rel.oid = con.conrelid
  JOIN   pg_namespace   nsp ON nsp.oid = rel.relnamespace
  WHERE  nsp.nspname = 'public'
    AND  rel.relname = 'daily_concepts'
    AND  con.contype  = 'u'                       -- unique constraint
    AND  con.conkey   = ARRAY(                     -- covers exactly the "date" column
           SELECT a.attnum
           FROM   pg_attribute a
           WHERE  a.attrelid = rel.oid
             AND  a.attname  = 'date'
         );

  IF _constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.daily_concepts DROP CONSTRAINT %I', _constraint_name);
  END IF;
END;
$$;

-- Add the correct composite unique constraint.
ALTER TABLE public.daily_concepts
  ADD CONSTRAINT daily_concepts_date_language_key UNIQUE (date, language);

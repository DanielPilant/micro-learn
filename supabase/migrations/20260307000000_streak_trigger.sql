-- ============================================================
-- Step 4: Streak maintenance trigger
--
-- Fires AFTER every INSERT into user_answers and keeps
-- profiles.current_streak / longest_streak accurate.
--
-- Logic (all dates in UTC):
--   last_date IS NULL        → first-ever answer → streak = 1
--   last_date = today        → already answered today → no-op
--   last_date = today - 1   → answered yesterday → increment
--   last_date < today - 1   → gap ≥ 2 days → reset to 1
-- ============================================================

CREATE OR REPLACE FUNCTION update_streak()
RETURNS TRIGGER AS $$
DECLARE
  today      date := (NOW() AT TIME ZONE 'UTC')::date;
  last_date  date;
BEGIN
  -- Most recent answer date for this user, excluding the row just inserted.
  SELECT MAX((answered_at AT TIME ZONE 'UTC')::date)
    INTO last_date
    FROM user_answers
   WHERE user_id = NEW.user_id
     AND id      != NEW.id;

  IF last_date IS NULL THEN
    -- Very first answer ever.
    UPDATE profiles
       SET current_streak = 1,
           longest_streak = GREATEST(longest_streak, 1)
     WHERE id = NEW.user_id;

  ELSIF last_date = today THEN
    -- User already submitted at least one answer today — streak unchanged.
    NULL;

  ELSIF last_date = today - INTERVAL '1 day' THEN
    -- Answered yesterday; extend the streak.
    -- NOTE: longest_streak uses current_streak + 1 because the UPDATE
    --       reads the pre-update value of current_streak.
    UPDATE profiles
       SET current_streak = current_streak + 1,
           longest_streak = GREATEST(longest_streak, current_streak + 1)
     WHERE id = NEW.user_id;

  ELSE
    -- Gap of two or more days; start a fresh streak.
    UPDATE profiles
       SET current_streak = 1
     WHERE id = NEW.user_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger first so this script is idempotent (safe to re-run).
DROP TRIGGER IF EXISTS trg_update_streak ON user_answers;

CREATE TRIGGER trg_update_streak
  AFTER INSERT ON user_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_streak();

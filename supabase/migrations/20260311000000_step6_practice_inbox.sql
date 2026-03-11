-- Step 6: Practice Inbox – get_unanswered_questions RPC
--
-- Returns up to 20 questions that the given user has NOT yet answered,
-- ordered by newest first so freshly generated questions appear at the top.

create or replace function get_unanswered_questions(p_user_id uuid)
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
  order  by q.created_at desc
  limit  20;
$$;

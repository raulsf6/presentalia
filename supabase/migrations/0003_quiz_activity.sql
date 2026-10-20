-- Quiz activity module.
-- Adds a second choice activity with one correct option. Quiz-specific data
-- lives in sibling tables, following the typed-module pattern used by polls.
ALTER TABLE public.activities
DROP CONSTRAINT activities_type_check;

ALTER TABLE public.activities
ADD CONSTRAINT activities_type_check CHECK (type IN ('poll', 'quiz'));

CREATE TABLE public.quizzes (
  activity_id uuid PRIMARY KEY REFERENCES public.activities (id) ON DELETE CASCADE,
  question text NOT NULL CHECK (length(trim(question)) BETWEEN 1 AND 500),
  -- Immutable once the activity is launched: the app never updates it and
  -- there is no update path; anonymous by default.
  results_identifiable boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE public.quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes (activity_id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 200),
  position int NOT NULL DEFAULT 0,
  is_correct boolean NOT NULL DEFAULT FALSE
);

-- At most one correct option per quiz. The app enforces exactly one; this
-- index is the database backstop against two.
CREATE UNIQUE INDEX quiz_options_one_correct ON public.quiz_options (quiz_id)
WHERE
  is_correct;

-- One immutable vote per attendee per quiz (primary key). voter_email is
-- denormalized from auth.users by the app at insert time; it exists so results
-- can show identities in identifiable mode without granting app access to the
-- auth schema.
CREATE TABLE public.quiz_votes (
  quiz_id uuid NOT NULL REFERENCES public.quizzes (activity_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.quiz_options (id) ON DELETE CASCADE,
  voter_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (quiz_id, user_id)
);

-- Pre-aggregated counts, maintained by triggers, so live results can be read
-- without ever exposing vote rows in anonymous mode.
CREATE TABLE public.quiz_vote_counts (
  quiz_id uuid NOT NULL REFERENCES public.quizzes (activity_id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.quiz_options (id) ON DELETE CASCADE,
  votes bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (quiz_id, option_id)
);

CREATE FUNCTION public.bump_quiz_vote_count () returns trigger language plpgsql security definer
SET
  search_path = public AS $$
begin
  insert into public.quiz_vote_counts (quiz_id, option_id, votes)
  values (new.quiz_id, new.option_id, 1)
  on conflict (quiz_id, option_id)
  do update set votes = public.quiz_vote_counts.votes + 1;
  return new;
end;
$$;

CREATE TRIGGER quiz_vote_counts_after_insert
AFTER INSERT ON public.quiz_votes FOR EACH ROW
EXECUTE FUNCTION public.bump_quiz_vote_count ();

CREATE FUNCTION public.drop_quiz_vote_count () returns trigger language plpgsql security definer
SET
  search_path = public AS $$
begin
  update public.quiz_vote_counts
  set votes = greatest(votes - 1, 0)
  where quiz_id = old.quiz_id
    and option_id = old.option_id;
  return old;
end;
$$;

CREATE TRIGGER quiz_vote_counts_after_delete
AFTER DELETE ON public.quiz_votes FOR EACH ROW
EXECUTE FUNCTION public.drop_quiz_vote_count ();

REVOKE ALL ON TABLE public.quizzes,
public.quiz_options,
public.quiz_votes,
public.quiz_vote_counts
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.bump_quiz_vote_count ()
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.drop_quiz_vote_count ()
FROM
  PUBLIC,
  anon,
  authenticated;

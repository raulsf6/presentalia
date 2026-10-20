-- Free-text ranking activity module.
--
-- A third activity type: attendees submit one short text answer while the
-- activity is active, the presenter triggers an AI ranking, and the closed
-- activity exposes either the ranked list or every answer unranked.
--
-- The database owns the lifecycle and immutability guarantees:
--   draft -> active -> locked -> closed
--   active -> closed (publish without ranking)
-- A closed activity row, its answers, and any published ranking are read-only.
-- Deleting an Auth user keeps the answer slot but replaces the body, so a
-- published result keeps its shape while PII disappears.

-- ------------------------------------------------------------
-- Shared lifecycle
-- ------------------------------------------------------------
ALTER TABLE public.activities
DROP CONSTRAINT activities_type_check;

ALTER TABLE public.activities
ADD CONSTRAINT activities_type_check CHECK (type IN ('poll', 'quiz', 'text'));

ALTER TABLE public.activities
DROP CONSTRAINT activities_status_check;

ALTER TABLE public.activities
ADD CONSTRAINT activities_status_check CHECK (
  status IN ('draft', 'active', 'locked', 'closed')
);

-- A talk has at most one live activity. `locked` still counts as live: its
-- answers are final but its results are not published yet.
DROP INDEX public.activities_one_active_per_talk;

CREATE UNIQUE INDEX activities_one_active_per_talk ON public.activities (talk_id)
WHERE
  status IN ('active', 'locked');

-- ------------------------------------------------------------
-- Text activity module
-- ------------------------------------------------------------
CREATE TABLE public.text_activities (
  activity_id uuid PRIMARY KEY REFERENCES public.activities (id) ON DELETE CASCADE,
  prompt text NOT NULL CHECK (length(trim(prompt)) BETWEEN 1 AND 500),
  criteria text NOT NULL CHECK (length(trim(criteria)) BETWEEN 1 AND 500),
  results_identifiable boolean NOT NULL DEFAULT FALSE
);

-- user_id is nullable only for GDPR deletion. The write guard pairs a NULL
-- author with the removal notice and rejects every other update.
CREATE TABLE public.text_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.text_activities (activity_id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR body = '[answer removed]')
);

CREATE UNIQUE INDEX text_answers_activity_user_unique ON public.text_answers (activity_id, user_id);

CREATE INDEX text_answers_activity_idx ON public.text_answers (activity_id, created_at, id);

CREATE TABLE public.text_ranking_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.text_activities (activity_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed')),
  model text,
  prompt_version text NOT NULL,
  criteria_snapshot text NOT NULL,
  answer_count int NOT NULL CHECK (answer_count >= 0),
  error text,
  summary text CHECK (summary IS NULL OR length(summary) <= 300),
  generation_id text,
  prompt_tokens int,
  completion_tokens int,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  published_at timestamptz,
  CHECK ((status = 'running') = (finished_at IS NULL)),
  CHECK (published_at IS NULL OR status = 'succeeded')
);

-- One in-flight run per activity: double clicks and stale retries are safe.
CREATE UNIQUE INDEX text_ranking_runs_one_running ON public.text_ranking_runs (activity_id)
WHERE
  status = 'running';

-- One published result per activity.
CREATE UNIQUE INDEX text_ranking_runs_one_published ON public.text_ranking_runs (activity_id)
WHERE
  published_at IS NOT NULL;

-- One row per submitted answer per run: either ranked (rank + score) or
-- dropped (drop_reason, no rank).
CREATE TABLE public.text_rankings (
  run_id uuid NOT NULL REFERENCES public.text_ranking_runs (id) ON DELETE CASCADE,
  answer_id uuid NOT NULL REFERENCES public.text_answers (id) ON DELETE CASCADE,
  rank int,
  score int CHECK (score BETWEEN 0 AND 100),
  rationale text CHECK (rationale IS NULL OR length(rationale) <= 200),
  drop_reason text,
  PRIMARY KEY (run_id, answer_id),
  CHECK ((rank IS NULL) = (drop_reason IS NOT NULL)),
  CHECK (rank IS NULL OR score IS NOT NULL),
  CHECK (drop_reason IS NULL OR score IS NULL)
);

CREATE UNIQUE INDEX text_rankings_one_per_rank ON public.text_rankings (run_id, rank)
WHERE
  rank IS NOT NULL;

-- ------------------------------------------------------------
-- Guards
-- ------------------------------------------------------------
CREATE FUNCTION public.guard_activity_status_transition () returns trigger language plpgsql
SET
  search_path = public AS $$
begin
  if old.status = 'closed' then
    if new is distinct from old then
      raise exception 'closed activities are immutable';
    end if;
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if (old.status = 'draft' and new.status = 'active')
     or (old.status = 'active' and new.status = 'locked')
     or (old.status = 'active' and new.status = 'closed')
     or (old.status = 'locked' and new.status = 'closed') then
    return new;
  end if;

  raise exception 'invalid activity status transition % -> %', old.status, new.status;
end;
$$;

CREATE TRIGGER activities_status_transition_guard
BEFORE UPDATE ON public.activities FOR EACH ROW
EXECUTE FUNCTION public.guard_activity_status_transition ();

-- Prompt and criteria freeze when the activity leaves draft.
CREATE FUNCTION public.guard_text_activity_update () returns trigger language plpgsql
SET
  search_path = public AS $$
begin
  if exists (
    select 1 from public.activities
    where id = new.activity_id and status <> 'draft'
  ) then
    raise exception 'text activity configuration is frozen after launch';
  end if;
  return new;
end;
$$;

CREATE TRIGGER text_activities_freeze_guard
BEFORE UPDATE ON public.text_activities FOR EACH ROW
EXECUTE FUNCTION public.guard_text_activity_update ();

CREATE FUNCTION public.guard_text_answer_write () returns trigger language plpgsql
SET
  search_path = public AS $$
begin
  if tg_op = 'INSERT' then
    if new.user_id is null then
      raise exception 'answers require an author';
    end if;
    if not exists (
      select 1 from public.activities
      where id = new.activity_id and status = 'active'
    ) then
      raise exception 'answers are only accepted while the activity is active';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- The only permitted update is the auth.users cascade: the slot survives,
    -- the author disappears, and the body is forced to the removal notice.
    if old.user_id is not null
       and new.user_id is null
       and new.id = old.id
       and new.activity_id = old.activity_id
       and new.created_at = old.created_at then
      new.body := '[answer removed]';
      return new;
    end if;
    raise exception 'answers are immutable';
  end if;

  -- DELETE is allowed only while the parent activity is already gone, which is
  -- true inside a talk/activity cascade.
  if exists (
    select 1 from public.activities where id = old.activity_id
  ) then
    raise exception 'answers cannot be deleted directly';
  end if;
  return old;
end;
$$;

CREATE TRIGGER text_answers_write_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.text_answers FOR EACH ROW
EXECUTE FUNCTION public.guard_text_answer_write ();

CREATE FUNCTION public.guard_text_ranking_run_write () returns trigger language plpgsql
SET
  search_path = public AS $$
begin
  if tg_op = 'UPDATE' then
    if old.status in ('succeeded', 'failed') or old.published_at is not null then
      raise exception 'published ranking runs are immutable';
    end if;
    return new;
  end if;

  if exists (
    select 1 from public.text_activities where activity_id = old.activity_id
  ) then
    raise exception 'ranking runs cannot be deleted directly';
  end if;
  return old;
end;
$$;

CREATE TRIGGER text_ranking_runs_guard
BEFORE UPDATE OR DELETE ON public.text_ranking_runs FOR EACH ROW
EXECUTE FUNCTION public.guard_text_ranking_run_write ();

CREATE FUNCTION public.guard_text_ranking_write () returns trigger language plpgsql
SET
  search_path = public AS $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'rankings are immutable';
  end if;

  -- A cascade from either parent may remove the row; a direct delete while
  -- both parents still exist may not.
  if exists (select 1 from public.text_ranking_runs where id = old.run_id)
     and exists (select 1 from public.text_answers where id = old.answer_id) then
    raise exception 'rankings cannot be deleted directly';
  end if;
  return old;
end;
$$;

CREATE TRIGGER text_rankings_guard
BEFORE UPDATE OR DELETE ON public.text_rankings FOR EACH ROW
EXECUTE FUNCTION public.guard_text_ranking_write ();

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
REVOKE ALL ON TABLE public.text_activities,
public.text_answers,
public.text_ranking_runs,
public.text_rankings
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.guard_activity_status_transition ()
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.guard_text_activity_update ()
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.guard_text_answer_write ()
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.guard_text_ranking_run_write ()
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.guard_text_ranking_write ()
FROM
  PUBLIC,
  anon,
  authenticated;

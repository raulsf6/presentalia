-- Activities between slides.
--
-- The pre-launch state is renamed from `draft` to `ready`: it is the editable
-- state and the only one an activity can be placed in the deck from. The live
-- value stays `active`; the UI calls it LIVE.
--
-- A talk's position can now be an activity instead of a page. A placement says
-- which gap an activity sits in (after page N) and its order inside that gap.
-- ------------------------------------------------------------
-- Kept as the source of truth for both statements below.
--
-- | status   | meaning                                                   |
-- | -------- | --------------------------------------------------------- |
-- | ready    | not live, editable, placeable in the deck                 |
-- | active   | live: answers accepted, content frozen                    |
-- | locked   | text only: ranking in progress; still blocks another live |
-- | closed   | read-only, results final                                  |
-- ------------------------------------------------------------
ALTER TABLE public.activities
DROP CONSTRAINT activities_status_check;

UPDATE public.activities
SET
  status = 'ready'
WHERE
  status = 'draft';

ALTER TABLE public.activities
ALTER COLUMN status
SET DEFAULT 'ready';

ALTER TABLE public.activities
ADD CONSTRAINT activities_status_check CHECK (status IN ('ready', 'active', 'locked', 'closed'));

-- Same lifecycle, with ready in place of draft.
CREATE OR REPLACE FUNCTION public.guard_activity_status_transition () returns trigger language plpgsql
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

  if (old.status = 'ready' and new.status = 'active')
     or (old.status = 'active' and new.status = 'locked')
     or (old.status = 'active' and new.status = 'closed')
     or (old.status = 'locked' and new.status = 'closed') then
    return new;
  end if;

  raise exception 'invalid activity status transition % -> %', old.status, new.status;
end;
$$;

-- Prompt and criteria freeze when the activity leaves ready.
CREATE OR REPLACE FUNCTION public.guard_text_activity_update () returns trigger language plpgsql
SET
  search_path = public AS $$
begin
  if exists (
    select 1 from public.activities
    where id = new.activity_id and status <> 'ready'
  ) then
    raise exception 'text activity configuration is frozen after launch';
  end if;
  return new;
end;
$$;

-- The deck's step: null while a page is on screen, set while an activity is.
ALTER TABLE public.talks
ADD COLUMN current_activity_id uuid REFERENCES public.activities (id) ON DELETE SET NULL;

-- One placement per activity. The talk is reached through activities.talk_id,
-- so there is no second copy of it to disagree with.
CREATE TABLE public.talk_deck_activities (
  activity_id uuid PRIMARY KEY REFERENCES public.activities (id) ON DELETE CASCADE,
  after_slide integer NOT NULL CHECK (after_slide >= 1),
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE public.talk_deck_activities
FROM
  PUBLIC,
  anon,
  authenticated;

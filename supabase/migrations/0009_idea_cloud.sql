-- Idea cloud activity module.
--
-- A fourth activity type: attendees submit one word or short phrase while the
-- activity is active. The presenter's screen groups identical ideas and makes
-- the most repeated ones larger. The cloud is anonymous: author columns exist
-- only to enforce one submission per attendee and disappear with the account.
--
-- The shared lifecycle is ready -> active -> closed. There is no ranking or
-- locked state for this module.
ALTER TABLE public.activities
DROP CONSTRAINT activities_type_check;

ALTER TABLE public.activities
ADD CONSTRAINT activities_type_check CHECK (type IN ('poll', 'quiz', 'text', 'cloud'));

-- ------------------------------------------------------------
-- Idea cloud module
-- ------------------------------------------------------------
CREATE TABLE public.cloud_activities (
  activity_id uuid PRIMARY KEY REFERENCES public.activities (id) ON DELETE CASCADE,
  prompt text NOT NULL CHECK (length(trim(prompt)) BETWEEN 1 AND 500)
);

-- Authors are nullable for the cascades only: deleting the Auth user, guest, or
-- talk removes the idea rather than leaving an orphaned word in the cloud.
CREATE TABLE public.cloud_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.cloud_activities (activity_id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.talk_guests (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((user_id IS NULL) <> (guest_id IS NULL))
);

CREATE UNIQUE INDEX cloud_answers_activity_user_unique ON public.cloud_answers (activity_id, user_id);

CREATE UNIQUE INDEX cloud_answers_activity_guest_unique ON public.cloud_answers (activity_id, guest_id)
WHERE
  guest_id IS NOT NULL;

CREATE INDEX cloud_answers_activity_idx ON public.cloud_answers (activity_id, created_at, id);

-- ------------------------------------------------------------
-- Guards
-- ------------------------------------------------------------
-- The prompt freezes when the activity leaves ready.
CREATE FUNCTION public.guard_cloud_activity_update () returns trigger language plpgsql
SET
  search_path = public AS $$
begin
  if exists (
    select 1 from public.activities
    where id = new.activity_id and status <> 'ready'
  ) then
    raise exception 'idea cloud configuration is frozen after launch';
  end if;
  return new;
end;
$$;

CREATE TRIGGER cloud_activities_freeze_guard
BEFORE UPDATE ON public.cloud_activities FOR EACH ROW
EXECUTE FUNCTION public.guard_cloud_activity_update ();

CREATE FUNCTION public.guard_cloud_answer_write () returns trigger language plpgsql
SET
  search_path = public AS $$
begin
  if tg_op = 'INSERT' then
    if (new.user_id is null) = (new.guest_id is null) then
      raise exception 'ideas require an author';
    end if;
    if not exists (
      select 1 from public.activities
      where id = new.activity_id and status = 'active'
    ) then
      raise exception 'ideas are only accepted while the activity is active';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    raise exception 'ideas are immutable';
  end if;

  -- A direct delete is refused while the activity and the author still exist.
  -- The Auth-user, guest, and talk cascades are allowed.
  if exists (
    select 1 from public.activities where id = old.activity_id
  ) and (
    (
      old.user_id is not null
      and exists (select 1 from auth.users where id = old.user_id)
    )
    or (
      old.guest_id is not null
      and exists (select 1 from public.talk_guests where id = old.guest_id)
    )
  ) then
    raise exception 'ideas cannot be deleted directly';
  end if;
  return old;
end;
$$;

CREATE TRIGGER cloud_answers_write_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.cloud_answers FOR EACH ROW
EXECUTE FUNCTION public.guard_cloud_answer_write ();

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
REVOKE ALL ON TABLE public.cloud_activities,
public.cloud_answers
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.guard_cloud_activity_update ()
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.guard_cloud_answer_write ()
FROM
  PUBLIC,
  anon,
  authenticated;

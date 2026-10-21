-- Anonymous talk access.
--
-- A public talk can be joined without an account. Guests pick a username that
-- is unique inside that talk and carry a hashed session token in an HttpOnly
-- cookie. Votes and text answers gain a guest identity alongside the existing
-- app-user identity, so both kinds of attendee share the same tallies.
--
-- `is_public` turns guest access on for a talk; `anonymous_join_open` stops
-- admitting new guests without ejecting anyone already in the room.
ALTER TABLE public.talks
ADD COLUMN is_public boolean NOT NULL DEFAULT FALSE;

ALTER TABLE public.talks
ADD COLUMN anonymous_join_open boolean NOT NULL DEFAULT TRUE;

CREATE TABLE public.talk_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_id uuid NOT NULL REFERENCES public.talks (id) ON DELETE CASCADE,
  username text NOT NULL CHECK (length(trim(username)) BETWEEN 2 AND 32),
  username_normalized text NOT NULL,
  token_hash text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX talk_guests_talk_username_unique ON public.talk_guests (talk_id, username_normalized);

CREATE INDEX talk_guests_talk_idx ON public.talk_guests (talk_id);

REVOKE ALL ON TABLE public.talk_guests
FROM
  PUBLIC,
  anon,
  authenticated;

-- ------------------------------------------------------------
-- Votes and answers
-- ------------------------------------------------------------
-- One identity per vote: a registered user or a guest, never both and never
-- neither. voter_key flattens the two columns for the one-vote primary key.
ALTER TABLE public.poll_votes
DROP CONSTRAINT poll_votes_pkey;

ALTER TABLE public.poll_votes
ALTER COLUMN user_id
DROP NOT NULL;

ALTER TABLE public.poll_votes
ADD COLUMN guest_id uuid REFERENCES public.talk_guests (id) ON DELETE CASCADE;

ALTER TABLE public.poll_votes
ADD COLUMN voter_key uuid GENERATED ALWAYS AS (coalesce(user_id, guest_id)) STORED;

ALTER TABLE public.poll_votes
ADD CONSTRAINT poll_votes_one_voter CHECK ((user_id IS NULL) <> (guest_id IS NULL));

ALTER TABLE public.poll_votes
ADD PRIMARY KEY (poll_id, voter_key);

ALTER TABLE public.quiz_votes
DROP CONSTRAINT quiz_votes_pkey;

ALTER TABLE public.quiz_votes
ALTER COLUMN user_id
DROP NOT NULL;

ALTER TABLE public.quiz_votes
ADD COLUMN guest_id uuid REFERENCES public.talk_guests (id) ON DELETE CASCADE;

ALTER TABLE public.quiz_votes
ADD COLUMN voter_key uuid GENERATED ALWAYS AS (coalesce(user_id, guest_id)) STORED;

ALTER TABLE public.quiz_votes
ADD CONSTRAINT quiz_votes_one_voter CHECK ((user_id IS NULL) <> (guest_id IS NULL));

ALTER TABLE public.quiz_votes
ADD PRIMARY KEY (quiz_id, voter_key);

ALTER TABLE public.text_answers
ADD COLUMN guest_id uuid REFERENCES public.talk_guests (id) ON DELETE CASCADE;

ALTER TABLE public.text_answers
DROP CONSTRAINT text_answers_check;

ALTER TABLE public.text_answers
ADD CONSTRAINT text_answers_one_author CHECK (
  (user_id IS NOT NULL) <> (guest_id IS NOT NULL)
  OR (
    user_id IS NULL
    AND guest_id IS NULL
    AND body = '[answer removed]'
  )
);

CREATE UNIQUE INDEX text_answers_activity_guest_unique ON public.text_answers (activity_id, guest_id)
WHERE
  guest_id IS NOT NULL;

-- The author may be an app user or a guest. The auth deletion tombstone still
-- replaces the body; deleting a guest removes their answer (and a talk delete
-- cascades the guest and their answer together).
CREATE OR REPLACE FUNCTION public.guard_text_answer_write () returns trigger language plpgsql
SET
  search_path = public AS $$
begin
  if tg_op = 'INSERT' then
    if (new.user_id is null) = (new.guest_id is null) then
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
       and new.guest_id is null
       and new.id = old.id
       and new.activity_id = old.activity_id
       and new.created_at = old.created_at then
      new.body := '[answer removed]';
      return new;
    end if;
    raise exception 'answers are immutable';
  end if;

  -- A direct delete is refused while the activity exists. A guest cascade and a
  -- talk cascade are allowed: the former because the guest row is already gone,
  -- the latter because the activity is gone.
  if exists (
    select 1 from public.activities where id = old.activity_id
  ) and (
    old.guest_id is null
    or exists (
      select 1 from public.talk_guests where id = old.guest_id
    )
  ) then
    raise exception 'answers cannot be deleted directly';
  end if;
  return old;
end;
$$;

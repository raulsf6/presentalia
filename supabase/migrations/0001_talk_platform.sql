-- Talk Companion Platform — initial schema.
--
-- Platform-level concepts: talks, per-talk user rosters, and a shared
-- activity lifecycle (`activities`). Polls are the first activity module:
-- poll-specific data lives in `polls` / `poll_options` / `poll_votes`, so a
-- future activity type can add its own sibling tables and reuse talk
-- authorization and lifecycle without a generic form engine.
--
-- Authorization is enforced in the server-side app before using the owner
-- connection. The database cannot read ADMIN_EMAIL directly; see the bootstrap
-- flow in README.
-- ============================================================
-- Platform tables
-- ============================================================
CREATE TABLE public.talks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  description text,
  held_at timestamptz,
  slides_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Mirror of auth.users (id + lowercased email + verification state), maintained
-- by the trigger below. Roles are app-owned and added after the enum is created.
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  email_verified_at timestamptz
);

CREATE UNIQUE INDEX app_users_email_unique ON public.app_users (email)
WHERE
  email IS NOT NULL;

CREATE TABLE public.talk_roster (
  talk_id uuid NOT NULL REFERENCES public.talks (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (talk_id, user_id)
);

CREATE INDEX talk_roster_user_id_idx ON public.talk_roster (user_id);

-- Shared activity lifecycle. `type` names the activity module that owns the
-- type-specific data (only 'poll' today). One activity may be active per
-- talk at a time (simplifying call for the first release).
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_id uuid NOT NULL REFERENCES public.talks (id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'poll' CHECK (type IN ('poll')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  launched_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX activities_one_active_per_talk ON public.activities (talk_id)
WHERE
  status = 'active';

-- ============================================================
-- Poll activity module
-- ============================================================
CREATE TABLE public.polls (
  activity_id uuid PRIMARY KEY REFERENCES public.activities (id) ON DELETE CASCADE,
  question text NOT NULL CHECK (length(trim(question)) BETWEEN 1 AND 500),
  -- Immutable once the activity is launched: the app never updates it and
  -- there is no update path; anonymous by default.
  results_identifiable boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls (activity_id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 200),
  position int NOT NULL DEFAULT 0
);

-- One immutable vote per attendee per poll (primary key). voter_email is
-- denormalized from auth.users by the app at insert time; it exists so results
-- can show identities in identifiable mode without granting app access to the
-- auth schema.
CREATE TABLE public.poll_votes (
  poll_id uuid NOT NULL REFERENCES public.polls (activity_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options (id) ON DELETE CASCADE,
  voter_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

-- Pre-aggregated counts, maintained by trigger, so live results can be read
-- without ever exposing vote rows in anonymous mode.
CREATE TABLE public.poll_vote_counts (
  poll_id uuid NOT NULL REFERENCES public.polls (activity_id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options (id) ON DELETE CASCADE,
  votes bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (poll_id, option_id)
);

CREATE FUNCTION public.bump_vote_count () returns trigger language plpgsql security definer
SET
  search_path = public AS $$
begin
  insert into public.poll_vote_counts (poll_id, option_id, votes)
  values (new.poll_id, new.option_id, 1)
  on conflict (poll_id, option_id)
  do update set votes = public.poll_vote_counts.votes + 1;
  return new;
end;
$$;

CREATE TRIGGER poll_vote_counts_after_insert
AFTER INSERT ON public.poll_votes FOR EACH ROW
EXECUTE FUNCTION public.bump_vote_count ();

-- ============================================================
-- Application user sync
-- ============================================================
CREATE FUNCTION public.sync_app_user () returns trigger language plpgsql security definer
SET
  search_path = public AS $$
begin
  insert into public.app_users (id, email, email_verified_at)
  values (new.id, lower(new.email), new.email_confirmed_at)
  on conflict (id) do update
  set
    email = lower(new.email),
    email_verified_at = new.email_confirmed_at;
  return new;
end;
$$;

CREATE TRIGGER app_users_sync_after_insert
AFTER INSERT OR UPDATE OF email,
email_confirmed_at ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.sync_app_user ();

-- Backfill users that already existed before this migration was applied.
INSERT INTO
  public.app_users (id, email, email_verified_at)
SELECT
  id,
  lower(email),
  email_confirmed_at
FROM
  auth.users
ON CONFLICT (id) DO UPDATE
SET
  email = excluded.email,
  email_verified_at = excluded.email_verified_at;

-- ============================================================
-- Storage: private slides bucket
-- ============================================================
INSERT INTO
  storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
VALUES
  (
    'talk-slides',
    'talk-slides',
    FALSE,
    20971520,
    ARRAY['application/pdf']::TEXT[]
  )
ON CONFLICT (id) DO UPDATE
SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Objects are stored as `${talkId}/slides.pdf`. The app authorizes access
-- server-side and issues short-lived signed upload/download URLs.
-- ============================================================
-- Role-backed authorization and presenter ownership
-- ============================================================
-- Roles live in app_users and are checked by the server app. Supabase JWTs
-- remain identity-only.
CREATE TYPE public.app_role AS ENUM('attendee', 'presenter', 'admin');

ALTER TABLE public.app_users
ADD COLUMN role public.app_role NOT NULL DEFAULT 'attendee';

ALTER TABLE public.talks
ADD COLUMN created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX talks_created_by_idx ON public.talks (created_by);

-- Serialize all transitions that could affect the last-admin invariant.
CREATE TABLE public.app_role_change_guard (id integer PRIMARY KEY CHECK (id = 1));

INSERT INTO
  public.app_role_change_guard (id)
VALUES
  (1);

-- App data is accessed only through the server's owner connection after
-- application authorization; prevent direct PostgREST access by API roles.
REVOKE ALL ON TABLE public.talks,
public.talk_roster,
public.activities,
public.polls,
public.poll_options,
public.poll_votes,
public.poll_vote_counts,
public.app_users,
public.app_role_change_guard
FROM
  PUBLIC,
  anon,
  authenticated;

CREATE FUNCTION public.change_app_user_role (target_user_id uuid, target_role public.app_role) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
  existing_role public.app_role;
  admin_count integer;
BEGIN
  PERFORM 1
  FROM public.app_role_change_guard
  WHERE id = 1
  FOR UPDATE;

  SELECT role
  INTO existing_role
  FROM public.app_users
  WHERE id = target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.' USING ERRCODE = 'P0002';
  END IF;

  IF existing_role = 'admin' AND target_role <> 'admin' THEN
    SELECT count(*)
    INTO admin_count
    FROM public.app_users
    WHERE role = 'admin';

    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'At least one admin must remain.' USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.app_users
  SET role = target_role
  WHERE id = target_user_id;
END;
$$;

CREATE FUNCTION public.bootstrap_initial_admin (admin_email text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
  bootstrap_user_id uuid;
BEGIN
  PERFORM 1
  FROM public.app_role_change_guard
  WHERE id = 1
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE role = 'admin'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT id
  INTO bootstrap_user_id
  FROM public.app_users
  WHERE email = lower(trim(admin_email))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No Auth user exists for the initial admin email.'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.app_users
  SET role = 'admin'
  WHERE id = bootstrap_user_id;

  UPDATE public.talks
  SET created_by = bootstrap_user_id
  WHERE created_by IS NULL;

  RETURN bootstrap_user_id;
END;
$$;

CREATE FUNCTION public.prevent_last_admin_delete () RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
  admin_count integer;
BEGIN
  PERFORM 1
  FROM public.app_role_change_guard
  WHERE id = 1
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE id = OLD.id AND role = 'admin'
  ) THEN
    SELECT count(*)
    INTO admin_count
    FROM public.app_users
    WHERE role = 'admin';

    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'At least one admin must remain.' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER auth_users_prevent_last_admin_delete
BEFORE DELETE ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_admin_delete ();

REVOKE ALL ON FUNCTION public.change_app_user_role (uuid, public.app_role)
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.bootstrap_initial_admin (text)
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.prevent_last_admin_delete ()
FROM
  PUBLIC,
  anon,
  authenticated;

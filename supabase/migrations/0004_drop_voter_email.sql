-- Voter identity lives on app_users and is resolved by user_id. The email
-- snapshot copied onto vote rows is redundant, can drift when an account email
-- changes, and is not needed for results.
ALTER TABLE public.poll_votes
DROP COLUMN voter_email;

ALTER TABLE public.quiz_votes
DROP COLUMN voter_email;

-- Deleting a user cascades their poll votes. Keep the pre-aggregated counts in
-- step with the remaining votes; until now only inserts were tallied.
CREATE FUNCTION public.drop_vote_count () returns trigger language plpgsql security definer
SET
  search_path = public AS $$
begin
  update public.poll_vote_counts
  set votes = greatest(votes - 1, 0)
  where poll_id = old.poll_id
    and option_id = old.option_id;
  return old;
end;
$$;

CREATE TRIGGER poll_vote_counts_after_delete
AFTER DELETE ON public.poll_votes FOR EACH ROW
EXECUTE FUNCTION public.drop_vote_count ();

REVOKE ALL ON FUNCTION public.drop_vote_count ()
FROM
  PUBLIC,
  anon,
  authenticated;

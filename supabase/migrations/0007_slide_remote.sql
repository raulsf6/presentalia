-- Slide projection and phone remote.
--
-- One deck per talk and one current position. `slide_revision` lets the
-- projector discard a poll response older than a keystroke it already applied.
-- Uploading slides resets the position.
ALTER TABLE public.talks
ADD COLUMN current_slide integer NOT NULL DEFAULT 1 CHECK (current_slide >= 1);

ALTER TABLE public.talks
ADD COLUMN slide_count integer CHECK (slide_count >= 1);

ALTER TABLE public.talks
ADD COLUMN slide_revision integer NOT NULL DEFAULT 0;

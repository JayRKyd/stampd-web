-- Applied via production_roadmap_core migration.
-- Kept for reference; safe to re-run.
CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_user_token_unique
  ON public.push_tokens (user_id, token);

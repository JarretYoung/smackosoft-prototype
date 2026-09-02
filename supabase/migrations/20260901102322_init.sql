BEGIN;

-- ============================================================
-- ACCOUNTS
-- ============================================================

-- schema ------------------------------------------------------

CREATE TABLE "public"."accounts" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"      uuid,
  "display_name" text                     NOT NULL,
  "handle"       text                     NOT NULL,
  "avatar_url"   text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone,
  CONSTRAINT "accounts_pkey" PRIMARY KEY (id),
  CONSTRAINT "accounts_user_id_key" UNIQUE (user_id),
  CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "accounts_handle_format_check" CHECK (handle ~ '^[a-z0-9_]{3,30}$')
);

CREATE UNIQUE INDEX "accounts_handle_lower_key" ON "public"."accounts" (lower(handle));

GRANT SELECT, INSERT, UPDATE ON TABLE "public"."accounts" TO "authenticated";

CREATE FUNCTION public.current_account_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.accounts WHERE user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.current_account_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_account_id() TO "authenticated";

-- security ----------------------------------------------------

ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_insert_own" ON "public"."accounts"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "accounts_select_all" ON "public"."accounts"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "accounts_update_own" ON "public"."accounts"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- ============================================================
-- SESSIONS & ACCESS
-- ============================================================

-- schema ----------------------------------------------------

CREATE TABLE "public"."sessions" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "label"        text                     NOT NULL,
  "date"         date                     NOT NULL,
  "organiser_id" uuid,
  "location"     text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"   uuid                     NOT NULL,
  "updated_at"   timestamp with time zone,
  "updated_by"   uuid,
  CONSTRAINT "sessions_pkey" PRIMARY KEY (id),
  CONSTRAINT "sessions_organiser_id_fkey" FOREIGN KEY (organiser_id) REFERENCES public.accounts(id),
  CONSTRAINT "sessions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.accounts(id),
  CONSTRAINT "sessions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.accounts(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."sessions" TO "authenticated";

CREATE TABLE "public"."session_access" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "session_id"   uuid                     NOT NULL,
  "account_id"   uuid                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"   uuid                     NOT NULL,
  CONSTRAINT "session_access_pkey" PRIMARY KEY (id),
  CONSTRAINT "session_access_session_id_account_id_key" UNIQUE (session_id, account_id),
  CONSTRAINT "session_access_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
  CONSTRAINT "session_access_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT "session_access_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.accounts(id)
);

GRANT SELECT, INSERT, DELETE ON TABLE "public"."session_access" TO "authenticated";

CREATE INDEX "session_access_account_id_idx" ON "public"."session_access" (account_id);

-- access control ----------------------------------------------

CREATE FUNCTION public.session_creator_account_id(p_session_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT created_by FROM public.sessions WHERE id = p_session_id;
$$;

REVOKE ALL ON FUNCTION public.session_creator_account_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_creator_account_id(uuid) TO "authenticated";

CREATE FUNCTION public.has_session_access(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.session_access
    WHERE session_id = p_session_id
      AND account_id = public.current_account_id()
  );
$$;

REVOKE ALL ON FUNCTION public.has_session_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_session_access(uuid) TO "authenticated";

-- security ----------------------------------------------------

ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_insert_any" ON "public"."sessions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

CREATE POLICY "sessions_select_accessor" ON "public"."sessions"
  FOR SELECT
  TO "authenticated"
  USING (public.has_session_access(id));

CREATE POLICY "sessions_update_accessor" ON "public"."sessions"
  FOR UPDATE
  TO "authenticated"
  USING (public.has_session_access(id))
  WITH CHECK (public.has_session_access(id));

CREATE POLICY "sessions_delete_creator" ON "public"."sessions"
  FOR DELETE
  TO "authenticated"
  USING (created_by = public.current_account_id());

ALTER TABLE "public"."session_access" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_access_select_accessor" ON "public"."session_access"
  FOR SELECT
  TO "authenticated"
  USING (public.has_session_access(session_id));

CREATE POLICY "session_access_insert_accessor" ON "public"."session_access"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (
    public.has_session_access(session_id)
    OR public.session_creator_account_id(session_id) = public.current_account_id()
  );

CREATE POLICY "session_access_delete_accessor" ON "public"."session_access"
  FOR DELETE
  TO "authenticated"
  USING (
    public.has_session_access(session_id)
    AND account_id <> public.session_creator_account_id(session_id)
  );

-- ============================================================
-- MATCHES
-- ============================================================

-- schema ------------------------------------------------------

CREATE TYPE "public"."match_types" AS ENUM ('MS', 'WS', 'XS', 'MD', 'WD', 'XD', 'PRACTICE', 'OTHER');

CREATE TABLE "public"."matches" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "label"        text                     NOT NULL,
  "session_id"   uuid                     NOT NULL,
  "match_type"   "public"."match_types"   NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"   uuid                     NOT NULL,
  "updated_at"   timestamp with time zone,
  "updated_by"   uuid,
  CONSTRAINT "matches_pkey" PRIMARY KEY (id),
  CONSTRAINT "matches_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT "matches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.accounts(id),
  CONSTRAINT "matches_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.accounts(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."matches" TO "authenticated";

CREATE INDEX "matches_session_id_idx" ON "public"."matches" (session_id);

CREATE FUNCTION public.session_id_for_match(p_match_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT session_id FROM public.matches WHERE id = p_match_id;
$$;

REVOKE ALL ON FUNCTION public.session_id_for_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_id_for_match(uuid) TO "authenticated";

-- security ----------------------------------------------------

ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_open_to_accessors" ON "public"."matches"
  FOR ALL
  TO "authenticated"
  USING (public.has_session_access(session_id))
  WITH CHECK (public.has_session_access(session_id));

-- ============================================================
-- MATCH_TEAMS
-- ============================================================

-- schema ------------------------------------------------------

CREATE TABLE "public"."match_teams" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "label"        text                     NOT NULL,
  "match_id"     uuid                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"   uuid                     NOT NULL,
  "updated_at"   timestamp with time zone,
  "updated_by"   uuid,
  CONSTRAINT "match_teams_pkey" PRIMARY KEY (id),
  CONSTRAINT "match_teams_match_id_fkey" FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT "match_teams_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.accounts(id),
  CONSTRAINT "match_teams_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.accounts(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."match_teams" TO "authenticated";

CREATE INDEX "match_teams_match_id_idx" ON "public"."match_teams" (match_id);

CREATE FUNCTION public.session_id_for_team(p_match_team_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.session_id_for_match(match_id) FROM public.match_teams WHERE id = p_match_team_id;
$$;

REVOKE ALL ON FUNCTION public.session_id_for_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_id_for_team(uuid) TO "authenticated";

-- security ----------------------------------------------------

ALTER TABLE "public"."match_teams" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_teams_open_to_accessors" ON "public"."match_teams"
  FOR ALL
  TO "authenticated"
  USING (public.has_session_access(public.session_id_for_match(match_id)))
  WITH CHECK (public.has_session_access(public.session_id_for_match(match_id)));

-- ============================================================
-- MATCH_GAMES
-- ============================================================

-- schema ------------------------------------------------------

CREATE TABLE "public"."match_games" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "match_id"     uuid                     NOT NULL,
  "game_number"  int                      NOT NULL,
  "start_time"   timestamp with time zone NOT NULL,
  "end_time"     timestamp with time zone NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"   uuid                     NOT NULL,
  "updated_at"   timestamp with time zone,
  "updated_by"   uuid,
  CONSTRAINT "match_games_pkey" PRIMARY KEY (id),
  CONSTRAINT "match_games_match_id_game_number_key" UNIQUE (match_id, game_number),
  CONSTRAINT "match_games_game_number_check" CHECK (game_number > 0),
  CONSTRAINT "match_games_time_order_check" CHECK (end_time > start_time),
  CONSTRAINT "match_games_match_id_fkey" FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT "match_games_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.accounts(id),
  CONSTRAINT "match_games_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.accounts(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."match_games" TO "authenticated";

CREATE FUNCTION public.session_id_for_game(p_match_game_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.session_id_for_match(match_id) FROM public.match_games WHERE id = p_match_game_id;
$$;

REVOKE ALL ON FUNCTION public.session_id_for_game(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_id_for_game(uuid) TO "authenticated";

-- security ----------------------------------------------------

ALTER TABLE "public"."match_games" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_games_open_to_accessors" ON "public"."match_games"
  FOR ALL
  TO "authenticated"
  USING (public.has_session_access(public.session_id_for_match(match_id)))
  WITH CHECK (public.has_session_access(public.session_id_for_match(match_id)));

-- ============================================================
-- MATCH_PLAYERS
-- ============================================================

-- schema ------------------------------------------------------

CREATE TABLE "public"."match_players" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "match_team_id"  uuid                     NOT NULL,
  "account_id"     uuid                     NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"     uuid                     NOT NULL,
  "updated_at"     timestamp with time zone,
  "updated_by"     uuid,
  CONSTRAINT "match_players_pkey" PRIMARY KEY (id),
  CONSTRAINT "match_players_match_team_id_account_id_key" UNIQUE (match_team_id, account_id),
  CONSTRAINT "match_players_match_team_id_fkey" FOREIGN KEY (match_team_id) REFERENCES public.match_teams(id),
  CONSTRAINT "match_players_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT "match_players_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.accounts(id),
  CONSTRAINT "match_players_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.accounts(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."match_players" TO "authenticated";

CREATE INDEX "match_players_account_id_idx" ON "public"."match_players" (account_id);

-- security ----------------------------------------------------

ALTER TABLE "public"."match_players" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_players_open_to_accessors" ON "public"."match_players"
  FOR ALL
  TO "authenticated"
  USING (public.has_session_access(public.session_id_for_team(match_team_id)))
  WITH CHECK (public.has_session_access(public.session_id_for_team(match_team_id)));

-- ============================================================
-- MATCH_GAME_SCORES
-- ============================================================

-- schema ------------------------------------------------------

CREATE TABLE "public"."match_game_scores" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "match_team_id"  uuid                     NOT NULL,
  "match_game_id"  uuid                     NOT NULL,
  "score"          int                      NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"     uuid                     NOT NULL,
  "updated_at"     timestamp with time zone,
  "updated_by"     uuid,
  CONSTRAINT "match_game_scores_pkey" PRIMARY KEY (id),
  CONSTRAINT "match_game_scores_match_team_id_match_game_id_key" UNIQUE (match_team_id, match_game_id),
  CONSTRAINT "match_game_scores_score_check" CHECK (score >= 0),
  CONSTRAINT "match_game_scores_match_team_id_fkey" FOREIGN KEY (match_team_id) REFERENCES public.match_teams(id),
  CONSTRAINT "match_game_scores_match_game_id_fkey" FOREIGN KEY (match_game_id) REFERENCES public.match_games(id),
  CONSTRAINT "match_game_scores_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.accounts(id),
  CONSTRAINT "match_game_scores_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.accounts(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."match_game_scores" TO "authenticated";

CREATE INDEX "match_game_scores_match_game_id_idx" ON "public"."match_game_scores" (match_game_id);

-- security ----------------------------------------------------

ALTER TABLE "public"."match_game_scores" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_game_scores_open_to_accessors" ON "public"."match_game_scores"
  FOR ALL
  TO "authenticated"
  USING (public.has_session_access(public.session_id_for_team(match_team_id)))
  WITH CHECK (public.has_session_access(public.session_id_for_team(match_team_id)));

-- ============================================================
-- VIDEOS
-- ============================================================

-- schema ------------------------------------------------------

CREATE TABLE "public"."videos" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "label"          text                     NOT NULL,
  "match_game_id"  uuid                     NOT NULL,
  "video_url"      text                     NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"     uuid                     NOT NULL,
  "updated_at"     timestamp with time zone,
  "updated_by"     uuid,
  CONSTRAINT "videos_pkey" PRIMARY KEY (id),
  CONSTRAINT "videos_match_game_id_fkey" FOREIGN KEY (match_game_id) REFERENCES public.match_games(id),
  CONSTRAINT "videos_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.accounts(id),
  CONSTRAINT "videos_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.accounts(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."videos" TO "authenticated";

CREATE INDEX "videos_match_game_id_idx" ON "public"."videos" (match_game_id);

-- security ----------------------------------------------------

ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "videos_open_to_accessors" ON "public"."videos"
  FOR ALL
  TO "authenticated"
  USING (public.has_session_access(public.session_id_for_game(match_game_id)))
  WITH CHECK (public.has_session_access(public.session_id_for_game(match_game_id)));

COMMIT;

-- ============================================================
-- SETUP
-- ============================================================

CREATE ROLE smackosoft_service LOGIN;

CREATE SCHEMA smackosoft;

GRANT USAGE ON SCHEMA smackosoft TO smackosoft_service;

-- ============================================================
-- ACCOUNTS
-- ============================================================

CREATE TYPE smackosoft.account_type AS ENUM ('STANDARD', 'GUEST');

CREATE TABLE smackosoft.accounts (
  id                  uuid                    NOT NULL DEFAULT gen_random_uuid(),
  user_id             uuid,
  account_type        smackosoft.account_type NOT NULL DEFAULT 'STANDARD',
  display_name        text                    NOT NULL,
  handle              text                    NOT NULL,
  handle_change_count integer                 NOT NULL DEFAULT 0,
  avatar_url          text,
  claim_code          text,                             -- used to claim a guest account
  deleted             boolean                 NOT NULL DEFAULT false,
  created_at          timestamptz             NOT NULL DEFAULT now(),
  created_by          uuid                    NOT NULL, -- has write access to guest accounts
  updated_at          timestamptz,
  updated_by          uuid,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_key UNIQUE (user_id),
  CONSTRAINT accounts_claim_code_key UNIQUE (claim_code),
  CONSTRAINT accounts_guest_has_no_user_check CHECK (account_type = 'STANDARD' OR user_id IS NULL),
  CONSTRAINT accounts_claim_code_guest_check CHECK (claim_code IS NULL OR account_type = 'GUEST'),
  CONSTRAINT accounts_handle_format_check CHECK (handle ~ '^[a-z0-9_]{3,30}$'),
  CONSTRAINT accounts_handle_change_count_check CHECK (handle_change_count >= 0),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT accounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT accounts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

CREATE INDEX accounts_created_by_guest_idx ON smackosoft.accounts (created_by) WHERE account_type = 'GUEST' AND NOT deleted;

CREATE UNIQUE INDEX accounts_handle_key ON smackosoft.accounts (handle) WHERE NOT deleted;

GRANT ALL ON TABLE smackosoft.accounts TO smackosoft_service;

-- ------------------------------------------------------------
-- Handling supabase user transitions
-- ------------------------------------------------------------

CREATE FUNCTION smackosoft.handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE smackosoft.accounts
  SET deleted = true
  WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION smackosoft.handle_deleted_user();

-- ============================================================
-- SESSIONS
-- ============================================================

CREATE TABLE smackosoft.sessions (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  label        text        NOT NULL,
  date         date        NOT NULL,
  timezone     text        NOT NULL,
  location     text,
  location_url text,
  latitude     double precision,
  longitude    double precision,
  start_time   timestamptz,
  end_time     timestamptz,
  cover_url    text,
  court_fee    numeric(10, 2),
  currency     text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid        NOT NULL,
  updated_at   timestamptz,
  updated_by   uuid,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_timezone_check CHECK (timezone <> ''),
  CONSTRAINT sessions_time_order_check CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time),
  CONSTRAINT sessions_latitude_check CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT sessions_longitude_check CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  CONSTRAINT sessions_coordinates_together_check CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CONSTRAINT sessions_court_fee_check CHECK (court_fee IS NULL OR court_fee >= 0),
  CONSTRAINT sessions_currency_format_check CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  CONSTRAINT sessions_court_fee_currency_check CHECK ((court_fee IS NULL) = (currency IS NULL)),
  CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT sessions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.sessions TO smackosoft_service;

COMMENT ON COLUMN smackosoft.sessions.date IS
  'The calendar day of the session in its timezone. Not shifted for the viewer.';
COMMENT ON COLUMN smackosoft.sessions.timezone IS
  'IANA name of the zone the session happens in, for example Asia/Kuala_Lumpur. Times are shown and entered in this zone, whatever the viewer''s zone. The app checks the name.';
COMMENT ON COLUMN smackosoft.sessions.latitude IS
  'Where the session is, in degrees (WGS 84). Read from the maps link when it is pasted. NULL when unknown. Set with longitude or not at all.';
COMMENT ON COLUMN smackosoft.sessions.longitude IS
  'See latitude.';

-- ============================================================
-- SESSION_ACCESS
-- ============================================================

CREATE TYPE smackosoft.role_type AS ENUM ('VIEWER', 'EDITOR', 'MANAGER', 'OWNER');

CREATE TABLE smackosoft.session_access (
  id         uuid                 NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid                 NOT NULL,
  account_id uuid                 NOT NULL,
  role       smackosoft.role_type NOT NULL DEFAULT 'VIEWER',
  created_at timestamptz          NOT NULL DEFAULT now(),
  created_by uuid                 NOT NULL,
  updated_at timestamptz,
  updated_by uuid,
  CONSTRAINT session_access_pkey PRIMARY KEY (id),
  CONSTRAINT session_access_session_id_account_id_key UNIQUE (session_id, account_id),
  CONSTRAINT session_access_session_id_fkey FOREIGN KEY (session_id) REFERENCES smackosoft.sessions(id) ON DELETE CASCADE,
  CONSTRAINT session_access_account_id_fkey FOREIGN KEY (account_id) REFERENCES smackosoft.accounts(id),
  CONSTRAINT session_access_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT session_access_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.session_access TO smackosoft_service;

CREATE INDEX session_access_account_id_idx ON smackosoft.session_access (account_id);

CREATE UNIQUE INDEX session_access_one_owner_key ON smackosoft.session_access (session_id) WHERE role = 'OWNER';

-- ============================================================
-- MATCHES
-- ============================================================

CREATE TYPE smackosoft.match_type AS ENUM ('MS', 'WS', 'XS', 'MD', 'WD', 'XD', 'PRACTICE', 'OTHER');

-- How many games decide a match. A one-off game is a BO1 match with one game.
CREATE TYPE smackosoft.match_format AS ENUM ('BO1', 'BO3', 'BO5');

CREATE TABLE smackosoft.matches (
  id         uuid                    NOT NULL DEFAULT gen_random_uuid(),
  label      text                    NOT NULL,
  session_id uuid                    NOT NULL,
  match_type smackosoft.match_type   NOT NULL,
  format     smackosoft.match_format NOT NULL,
  created_at timestamptz             NOT NULL DEFAULT now(),
  created_by uuid                   NOT NULL,
  updated_at timestamptz,
  updated_by uuid,
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_session_id_fkey FOREIGN KEY (session_id) REFERENCES smackosoft.sessions(id) ON DELETE CASCADE,
  CONSTRAINT matches_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT matches_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.matches TO smackosoft_service;

CREATE INDEX matches_session_id_idx ON smackosoft.matches (session_id);

-- ============================================================
-- MATCH_TEAMS
-- ============================================================

CREATE TABLE smackosoft.match_teams (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  label      text        NOT NULL,
  match_id   uuid        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid        NOT NULL,
  updated_at timestamptz,
  updated_by uuid,
  CONSTRAINT match_teams_pkey PRIMARY KEY (id),
  CONSTRAINT match_teams_match_id_fkey FOREIGN KEY (match_id) REFERENCES smackosoft.matches(id) ON DELETE CASCADE,
  CONSTRAINT match_teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT match_teams_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.match_teams TO smackosoft_service;

CREATE INDEX match_teams_match_id_idx ON smackosoft.match_teams (match_id);

-- ============================================================
-- MATCH_GAMES
-- ============================================================

CREATE TABLE smackosoft.match_games (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  match_id    uuid        NOT NULL,
  game_number int         NOT NULL,
  start_time  timestamptz NOT NULL,
  end_time    timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        NOT NULL,
  updated_at  timestamptz,
  updated_by  uuid,
  CONSTRAINT match_games_pkey PRIMARY KEY (id),
  CONSTRAINT match_games_match_id_game_number_key UNIQUE (match_id, game_number),
  CONSTRAINT match_games_game_number_check CHECK (game_number > 0),
  CONSTRAINT match_games_time_order_check CHECK (end_time > start_time),
  CONSTRAINT match_games_match_id_fkey FOREIGN KEY (match_id) REFERENCES smackosoft.matches(id) ON DELETE CASCADE,
  CONSTRAINT match_games_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT match_games_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.match_games TO smackosoft_service;

-- ============================================================
-- MATCH_PLAYERS
-- ============================================================

CREATE TABLE smackosoft.match_players (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  match_team_id uuid        NOT NULL,
  account_id    uuid        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        NOT NULL,
  updated_at    timestamptz,
  updated_by    uuid,
  CONSTRAINT match_players_pkey PRIMARY KEY (id),
  CONSTRAINT match_players_match_team_id_account_id_key UNIQUE (match_team_id, account_id),
  CONSTRAINT match_players_match_team_id_fkey FOREIGN KEY (match_team_id) REFERENCES smackosoft.match_teams(id) ON DELETE CASCADE,
  CONSTRAINT match_players_account_id_fkey FOREIGN KEY (account_id) REFERENCES smackosoft.accounts(id),
  CONSTRAINT match_players_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT match_players_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.match_players TO smackosoft_service;

CREATE INDEX match_players_account_id_idx ON smackosoft.match_players (account_id);

-- ============================================================
-- MATCH_GAME_SCORES
-- ============================================================

CREATE TABLE smackosoft.match_game_scores (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  match_team_id uuid        NOT NULL,
  match_game_id uuid        NOT NULL,
  score         int         NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        NOT NULL,
  updated_at    timestamptz,
  updated_by    uuid,
  CONSTRAINT match_game_scores_pkey PRIMARY KEY (id),
  CONSTRAINT match_game_scores_match_team_id_match_game_id_key UNIQUE (match_team_id, match_game_id),
  CONSTRAINT match_game_scores_score_check CHECK (score >= 0),
  CONSTRAINT match_game_scores_match_team_id_fkey FOREIGN KEY (match_team_id) REFERENCES smackosoft.match_teams(id) ON DELETE CASCADE,
  CONSTRAINT match_game_scores_match_game_id_fkey FOREIGN KEY (match_game_id) REFERENCES smackosoft.match_games(id) ON DELETE CASCADE,
  CONSTRAINT match_game_scores_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT match_game_scores_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.match_game_scores TO smackosoft_service;

CREATE INDEX match_game_scores_match_game_id_idx ON smackosoft.match_game_scores (match_game_id);

-- ============================================================
-- MATCH_GAME_HIGHLIGHTS
-- ============================================================

CREATE TABLE smackosoft.match_game_highlights (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  match_game_id    uuid        NOT NULL,
  match_player_id  uuid        NOT NULL,
  canonical_offset interval    NOT NULL,
  skill_used       text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        NOT NULL,
  updated_at       timestamptz,
  updated_by       uuid,
  CONSTRAINT match_game_highlights_pkey PRIMARY KEY (id),
  CONSTRAINT match_game_highlights_match_game_id_fkey FOREIGN KEY (match_game_id) REFERENCES smackosoft.match_games(id) ON DELETE CASCADE,
  CONSTRAINT match_game_highlights_match_player_id_fkey FOREIGN KEY (match_player_id) REFERENCES smackosoft.match_players(id) ON DELETE CASCADE,
  CONSTRAINT match_game_highlights_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT match_game_highlights_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

COMMENT ON COLUMN smackosoft.match_game_highlights.canonical_offset IS
  'Time since the game''s canonical 0 (the sync marker shared by all videos of the game). Not a position in any one video.';

GRANT ALL ON TABLE smackosoft.match_game_highlights TO smackosoft_service;

CREATE INDEX match_game_highlights_match_game_id_idx ON smackosoft.match_game_highlights (match_game_id);
CREATE INDEX match_game_highlights_match_player_id_idx ON smackosoft.match_game_highlights (match_player_id);

-- ============================================================
-- VIDEOS
-- ============================================================

CREATE TABLE smackosoft.videos (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  label            text        NOT NULL,
  video_url        text        NOT NULL,
  thumbnail_url    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        NOT NULL,
  updated_at       timestamptz,
  updated_by       uuid,
  CONSTRAINT videos_pkey PRIMARY KEY (id),
  CONSTRAINT videos_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT videos_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.videos TO smackosoft_service;

CREATE INDEX videos_created_by_idx ON smackosoft.videos (created_by);

-- ============================================================
-- VIDEO_SESSIONS
-- ============================================================

CREATE TABLE smackosoft.video_sessions (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  video_id   uuid        NOT NULL,
  session_id uuid        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid        NOT NULL,
  updated_at timestamptz,
  updated_by uuid,
  CONSTRAINT video_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT video_sessions_video_id_session_id_key UNIQUE (video_id, session_id),
  CONSTRAINT video_sessions_video_id_fkey FOREIGN KEY (video_id) REFERENCES smackosoft.videos(id) ON DELETE CASCADE,
  CONSTRAINT video_sessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES smackosoft.sessions(id) ON DELETE CASCADE,
  CONSTRAINT video_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT video_sessions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

COMMENT ON TABLE smackosoft.video_sessions IS
  'A video in a session''s pool. Any session member with the right role can contribute footage here before it is linked to a game.';

GRANT ALL ON TABLE smackosoft.video_sessions TO smackosoft_service;

CREATE INDEX video_sessions_session_id_idx ON smackosoft.video_sessions (session_id);

-- ============================================================
-- VIDEO_GAMES
-- ============================================================

CREATE TABLE smackosoft.video_games (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  video_id         uuid        NOT NULL,
  match_game_id    uuid        NOT NULL,
  canonical_offset interval,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        NOT NULL,
  updated_at       timestamptz,
  updated_by       uuid,
  CONSTRAINT video_games_pkey PRIMARY KEY (id),
  CONSTRAINT video_games_video_id_match_game_id_key UNIQUE (video_id, match_game_id),
  CONSTRAINT video_games_video_id_fkey FOREIGN KEY (video_id) REFERENCES smackosoft.videos(id) ON DELETE CASCADE,
  CONSTRAINT video_games_match_game_id_fkey FOREIGN KEY (match_game_id) REFERENCES smackosoft.match_games(id) ON DELETE CASCADE,
  CONSTRAINT video_games_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT video_games_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

COMMENT ON TABLE smackosoft.video_games IS
  'A video that covers a game. canonical_offset says how it lines up with the other videos of the same game.';
COMMENT ON COLUMN smackosoft.video_games.canonical_offset IS
  'Video timestamp of the game''s canonical 0, a sync marker chosen per game (for example the first shuttle hit or a clap). Negative when the video started after that moment. NULL means not synced yet. To show canonical time t, seek to canonical_offset + t.';

GRANT ALL ON TABLE smackosoft.video_games TO smackosoft_service;

CREATE INDEX video_games_match_game_id_idx ON smackosoft.video_games (match_game_id);

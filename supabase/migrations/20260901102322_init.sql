-- ============================================================
-- SETUP
-- ============================================================

CREATE ROLE smackosoft_service LOGIN;

CREATE SCHEMA smackosoft;

GRANT USAGE ON SCHEMA smackosoft TO smackosoft_service;

-- ============================================================
-- ACCOUNTS
-- ============================================================

CREATE TABLE smackosoft.accounts (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid,
  display_name text        NOT NULL,
  handle       text        NOT NULL,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_key UNIQUE (user_id),
  CONSTRAINT accounts_handle_key UNIQUE (handle),
  CONSTRAINT accounts_handle_format_check CHECK (handle ~ '^[a-z0-9_]{3,30}$'),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT ALL ON TABLE smackosoft.accounts TO smackosoft_service;

-- ============================================================
-- SESSIONS
-- ============================================================

CREATE TABLE smackosoft.sessions (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  label        text        NOT NULL,
  date         date        NOT NULL,
  organiser_id uuid,
  location     text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid        NOT NULL,
  updated_at   timestamptz,
  updated_by   uuid,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_organiser_id_fkey FOREIGN KEY (organiser_id) REFERENCES smackosoft.accounts(id),
  CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT sessions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.sessions TO smackosoft_service;

CREATE INDEX sessions_organiser_id_idx ON smackosoft.sessions (organiser_id);

-- ============================================================
-- SESSION_ACCESS
-- ============================================================

CREATE TABLE smackosoft.session_access (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid        NOT NULL,
  account_id uuid        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid        NOT NULL,
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

-- ============================================================
-- MATCHES
-- ============================================================

CREATE TYPE smackosoft.match_type AS ENUM ('MS', 'WS', 'XS', 'MD', 'WD', 'XD', 'PRACTICE', 'OTHER');

CREATE TABLE smackosoft.matches (
  id         uuid                   NOT NULL DEFAULT gen_random_uuid(),
  label      text                   NOT NULL,
  session_id uuid                   NOT NULL,
  match_type smackosoft.match_type  NOT NULL,
  created_at timestamptz            NOT NULL DEFAULT now(),
  created_by uuid                   NOT NULL,
  updated_at timestamptz,
  updated_by uuid,
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_session_id_fkey FOREIGN KEY (session_id) REFERENCES smackosoft.sessions(id),
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
  CONSTRAINT match_teams_match_id_fkey FOREIGN KEY (match_id) REFERENCES smackosoft.matches(id),
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
  CONSTRAINT match_games_match_id_fkey FOREIGN KEY (match_id) REFERENCES smackosoft.matches(id),
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
  CONSTRAINT match_players_match_team_id_fkey FOREIGN KEY (match_team_id) REFERENCES smackosoft.match_teams(id),
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
  CONSTRAINT match_game_scores_match_team_id_fkey FOREIGN KEY (match_team_id) REFERENCES smackosoft.match_teams(id),
  CONSTRAINT match_game_scores_match_game_id_fkey FOREIGN KEY (match_game_id) REFERENCES smackosoft.match_games(id),
  CONSTRAINT match_game_scores_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT match_game_scores_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.match_game_scores TO smackosoft_service;

CREATE INDEX match_game_scores_match_game_id_idx ON smackosoft.match_game_scores (match_game_id);

-- ============================================================
-- VIDEOS
-- ============================================================

CREATE TABLE smackosoft.videos (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  label         text        NOT NULL,
  match_game_id uuid        NOT NULL,
  video_url     text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        NOT NULL,
  updated_at    timestamptz,
  updated_by    uuid,
  CONSTRAINT videos_pkey PRIMARY KEY (id),
  CONSTRAINT videos_match_game_id_fkey FOREIGN KEY (match_game_id) REFERENCES smackosoft.match_games(id),
  CONSTRAINT videos_created_by_fkey FOREIGN KEY (created_by) REFERENCES smackosoft.accounts(id),
  CONSTRAINT videos_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES smackosoft.accounts(id)
);

GRANT ALL ON TABLE smackosoft.videos TO smackosoft_service;

CREATE INDEX videos_match_game_id_idx ON smackosoft.videos (match_game_id);

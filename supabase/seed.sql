-- ============================================================
-- LOCAL DEV SEED. Runs on `pnpm supabase db reset`. Never run in production.
-- Every user signs in with the password `Password123`.
--   ian@smacko.test  izaaq@smacko.test  nadree@smacko.test
--   justin@smacko.test  jarret@smacko.test
-- ============================================================

-- The backend connects as this role. Its password is not part of the migrations.
ALTER ROLE smackosoft_service WITH PASSWORD 'postgres';

-- ------------------------------------------------------------
-- Auth users and accounts
-- ------------------------------------------------------------

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
SELECT
  u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  u.email, crypt('Password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
FROM (VALUES
  ('5b60f606-2850-4943-a964-ae4285d7db92'::uuid, 'ian@smacko.test'),
  ('db7b6603-77f2-488f-94f8-7906072e373c'::uuid, 'izaaq@smacko.test'),
  ('2ac754ed-e996-42ca-9ab8-c49672f44fe8'::uuid, 'nadree@smacko.test'),
  ('b638f94e-4a79-4ee7-852a-493850fb13ed'::uuid, 'justin@smacko.test'),
  ('60357636-416a-4a5e-b954-637beb84143b'::uuid, 'jarret@smacko.test')
) AS u(id, email);

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
FROM auth.users u
WHERE u.email LIKE '%@smacko.test';

-- Account ids match the user ids to keep the seed readable.
INSERT INTO smackosoft.accounts (id, user_id, display_name, handle, created_by) VALUES
  ('5b60f606-2850-4943-a964-ae4285d7db92', '5b60f606-2850-4943-a964-ae4285d7db92', 'Ian Chong',    'ianczm',  '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('db7b6603-77f2-488f-94f8-7906072e373c', 'db7b6603-77f2-488f-94f8-7906072e373c', 'Izaaq Izham',  'izaaq',   'db7b6603-77f2-488f-94f8-7906072e373c'),
  ('2ac754ed-e996-42ca-9ab8-c49672f44fe8', '2ac754ed-e996-42ca-9ab8-c49672f44fe8', 'Nadree Omar',  'nadree',  '2ac754ed-e996-42ca-9ab8-c49672f44fe8'),
  ('b638f94e-4a79-4ee7-852a-493850fb13ed', 'b638f94e-4a79-4ee7-852a-493850fb13ed', 'Justin Chong', 'justin',  'b638f94e-4a79-4ee7-852a-493850fb13ed'),
  ('60357636-416a-4a5e-b954-637beb84143b', '60357636-416a-4a5e-b954-637beb84143b', 'Jarret Young', 'jayrome', '60357636-416a-4a5e-b954-637beb84143b');

INSERT INTO smackosoft.accounts (id, account_type, display_name, handle, created_by) VALUES
  ('e98b7abc-3a80-4a0f-800b-2f3f9277bfcb', 'GUEST', 'Aadit', 'aadit', '5b60f606-2850-4943-a964-ae4285d7db92');

-- ------------------------------------------------------------
-- Sessions
--   s1 today, Ian owns. Two matches, one finished, one in progress.
--   s2 and s3 upcoming. s4 last week, Jarret owns, Ian is a viewer.
-- ------------------------------------------------------------

-- Every seeded session is in Kuala Lumpur, so "today" is the day there and not the day in the database's zone.
SET TIME ZONE 'Asia/Kuala_Lumpur';

INSERT INTO smackosoft.sessions (id, label, date, timezone, start_time, end_time, location, location_url, latitude, longitude, court_fee, currency, created_by) VALUES
  ('5a27b3f7-4464-4a5a-a97b-7d20ad844b50', 'Badminton with da Laddies', current_date, 'Asia/Kuala_Lumpur', (current_date + time '09:00') AT TIME ZONE 'Asia/Kuala_Lumpur', (current_date + time '11:00') AT TIME ZONE 'Asia/Kuala_Lumpur', 'Sunway Serene', 'https://maps.google.com/?q=Sunway+Serene', 3.0906026, 101.6063411, 20, 'MYR', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('2732fcf3-fdd9-45c4-9d55-6afaade0f1f8', 'Thursday Smash',            current_date + 3, 'Asia/Kuala_Lumpur', ((current_date + 3) + time '20:00') AT TIME ZONE 'Asia/Kuala_Lumpur', ((current_date + 3) + time '22:00') AT TIME ZONE 'Asia/Kuala_Lumpur', 'Bukit Jalil', NULL, NULL, NULL, NULL, NULL, '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('46e7531b-ab17-4680-8a94-5f900b1b33f8', 'Monday Singles',            current_date + 7, 'Asia/Kuala_Lumpur', NULL, NULL, 'Setia Alam', NULL, NULL, NULL, 15, 'MYR', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('c88c8371-e40a-4ba5-8188-3dff895ebd29', 'Last Week Doubles',         current_date - 7, 'Asia/Kuala_Lumpur', ((current_date - 7) + time '09:00') AT TIME ZONE 'Asia/Kuala_Lumpur', ((current_date - 7) + time '11:00') AT TIME ZONE 'Asia/Kuala_Lumpur', 'Sunway Serene', NULL, 3.0906026, 101.6063411, 18, 'MYR', '60357636-416a-4a5e-b954-637beb84143b');

INSERT INTO smackosoft.session_access (session_id, account_id, role, created_by) VALUES
  -- s1
  ('5a27b3f7-4464-4a5a-a97b-7d20ad844b50', '5b60f606-2850-4943-a964-ae4285d7db92', 'OWNER',   '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('5a27b3f7-4464-4a5a-a97b-7d20ad844b50', 'db7b6603-77f2-488f-94f8-7906072e373c', 'VIEWER',  '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('5a27b3f7-4464-4a5a-a97b-7d20ad844b50', '2ac754ed-e996-42ca-9ab8-c49672f44fe8', 'VIEWER',  '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('5a27b3f7-4464-4a5a-a97b-7d20ad844b50', 'b638f94e-4a79-4ee7-852a-493850fb13ed', 'VIEWER',  '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('5a27b3f7-4464-4a5a-a97b-7d20ad844b50', 'e98b7abc-3a80-4a0f-800b-2f3f9277bfcb', 'EDITOR',  '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('5a27b3f7-4464-4a5a-a97b-7d20ad844b50', '60357636-416a-4a5e-b954-637beb84143b', 'VIEWER',  '5b60f606-2850-4943-a964-ae4285d7db92'),
  -- s2
  ('2732fcf3-fdd9-45c4-9d55-6afaade0f1f8', '5b60f606-2850-4943-a964-ae4285d7db92', 'OWNER',   '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('2732fcf3-fdd9-45c4-9d55-6afaade0f1f8', 'db7b6603-77f2-488f-94f8-7906072e373c', 'EDITOR',  '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('2732fcf3-fdd9-45c4-9d55-6afaade0f1f8', '2ac754ed-e996-42ca-9ab8-c49672f44fe8', 'VIEWER',  '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('2732fcf3-fdd9-45c4-9d55-6afaade0f1f8', 'b638f94e-4a79-4ee7-852a-493850fb13ed', 'VIEWER',  '5b60f606-2850-4943-a964-ae4285d7db92'),
  -- s3
  ('46e7531b-ab17-4680-8a94-5f900b1b33f8', '5b60f606-2850-4943-a964-ae4285d7db92', 'OWNER',   '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('46e7531b-ab17-4680-8a94-5f900b1b33f8', 'b638f94e-4a79-4ee7-852a-493850fb13ed', 'VIEWER',  '5b60f606-2850-4943-a964-ae4285d7db92'),
  -- s4
  ('c88c8371-e40a-4ba5-8188-3dff895ebd29', '60357636-416a-4a5e-b954-637beb84143b', 'OWNER',   '60357636-416a-4a5e-b954-637beb84143b'),
  ('c88c8371-e40a-4ba5-8188-3dff895ebd29', '5b60f606-2850-4943-a964-ae4285d7db92', 'VIEWER',  '60357636-416a-4a5e-b954-637beb84143b'),
  ('c88c8371-e40a-4ba5-8188-3dff895ebd29', 'db7b6603-77f2-488f-94f8-7906072e373c', 'VIEWER',  '60357636-416a-4a5e-b954-637beb84143b');

-- ------------------------------------------------------------
-- Matches, teams, players, games, scores
-- ------------------------------------------------------------

INSERT INTO smackosoft.matches (id, label, session_id, match_type, format, created_by) VALUES
  ('9eb0daa3-9d48-40de-9516-a6347150db04', 'Match 1', '5a27b3f7-4464-4a5a-a97b-7d20ad844b50', 'MD', 'BO3', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('89868493-987c-40fb-b4c4-9e5d1d33765f', 'Game 1', '5a27b3f7-4464-4a5a-a97b-7d20ad844b50', 'MS', 'BO1', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('1c294583-1a46-4528-befd-085cf615e74a', 'Match 1', 'c88c8371-e40a-4ba5-8188-3dff895ebd29', 'MD', 'BO3', '60357636-416a-4a5e-b954-637beb84143b');

INSERT INTO smackosoft.match_teams (id, label, match_id, created_by) VALUES
  ('a04b592b-12e2-47aa-a727-ece0c222ac00', 'Team 1', '9eb0daa3-9d48-40de-9516-a6347150db04', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('83ce3d97-9e9f-4653-9afd-f37ea611a02d', 'Team 2', '9eb0daa3-9d48-40de-9516-a6347150db04', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('b9cb29c9-9508-4d37-baec-a16376d527e8', 'Team 1', '89868493-987c-40fb-b4c4-9e5d1d33765f', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('6a641eb4-8866-4609-a712-451238d2dc0d', 'Team 2', '89868493-987c-40fb-b4c4-9e5d1d33765f', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('62a755e7-dc99-4dda-8748-f37ea1486193', 'Team 1', '1c294583-1a46-4528-befd-085cf615e74a', '60357636-416a-4a5e-b954-637beb84143b'),
  ('b21e5edf-df2a-45df-9651-9913683b40ac', 'Team 2', '1c294583-1a46-4528-befd-085cf615e74a', '60357636-416a-4a5e-b954-637beb84143b');

INSERT INTO smackosoft.match_players (match_team_id, account_id, created_by) VALUES
  ('a04b592b-12e2-47aa-a727-ece0c222ac00', '5b60f606-2850-4943-a964-ae4285d7db92', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('a04b592b-12e2-47aa-a727-ece0c222ac00', 'db7b6603-77f2-488f-94f8-7906072e373c', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('83ce3d97-9e9f-4653-9afd-f37ea611a02d', '2ac754ed-e996-42ca-9ab8-c49672f44fe8', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('83ce3d97-9e9f-4653-9afd-f37ea611a02d', 'b638f94e-4a79-4ee7-852a-493850fb13ed', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('b9cb29c9-9508-4d37-baec-a16376d527e8', '5b60f606-2850-4943-a964-ae4285d7db92', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('6a641eb4-8866-4609-a712-451238d2dc0d', 'e98b7abc-3a80-4a0f-800b-2f3f9277bfcb', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('62a755e7-dc99-4dda-8748-f37ea1486193', '5b60f606-2850-4943-a964-ae4285d7db92', '60357636-416a-4a5e-b954-637beb84143b'),
  ('62a755e7-dc99-4dda-8748-f37ea1486193', '60357636-416a-4a5e-b954-637beb84143b', '60357636-416a-4a5e-b954-637beb84143b'),
  ('b21e5edf-df2a-45df-9651-9913683b40ac', 'db7b6603-77f2-488f-94f8-7906072e373c', '60357636-416a-4a5e-b954-637beb84143b'),
  ('b21e5edf-df2a-45df-9651-9913683b40ac', '2ac754ed-e996-42ca-9ab8-c49672f44fe8', '60357636-416a-4a5e-b954-637beb84143b');

INSERT INTO smackosoft.match_games (id, match_id, game_number, start_time, end_time, created_by) VALUES
  ('a0af34e8-8a97-4f4a-bb28-ab49c1a37ed5', '9eb0daa3-9d48-40de-9516-a6347150db04', 1, now() - interval '3 hours',      now() - interval '2 hours 40 minutes', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('2355dfb7-d893-49b4-a38b-8b4f1675f052', '9eb0daa3-9d48-40de-9516-a6347150db04', 2, now() - interval '2 hours 35 minutes', now() - interval '2 hours 15 minutes', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('474ace5d-8bea-43ee-aadf-9e297d3eaf13', '9eb0daa3-9d48-40de-9516-a6347150db04', 3, now() - interval '2 hours 10 minutes', now() - interval '1 hour 45 minutes', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('da77b4f9-80b9-41e3-afbc-9fc670d205b2', '89868493-987c-40fb-b4c4-9e5d1d33765f', 1, now() - interval '1 hour 30 minutes', now() - interval '1 hour 10 minutes', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('21d7f760-5e2b-46d4-8f40-d84b8f073ea6', '1c294583-1a46-4528-befd-085cf615e74a', 1, now() - interval '7 days 3 hours',  now() - interval '7 days 2 hours 40 minutes', '60357636-416a-4a5e-b954-637beb84143b'),
  ('81430aa8-7012-4ad7-be55-60420c33838b', '1c294583-1a46-4528-befd-085cf615e74a', 2, now() - interval '7 days 2 hours 35 minutes', now() - interval '7 days 2 hours 15 minutes', '60357636-416a-4a5e-b954-637beb84143b');

INSERT INTO smackosoft.match_game_scores (match_team_id, match_game_id, score, created_by) VALUES
  -- Match 1: Team 1 wins 2-1, as in the Edit Session mockup
  ('a04b592b-12e2-47aa-a727-ece0c222ac00', 'a0af34e8-8a97-4f4a-bb28-ab49c1a37ed5', 21, '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('83ce3d97-9e9f-4653-9afd-f37ea611a02d', 'a0af34e8-8a97-4f4a-bb28-ab49c1a37ed5', 17, '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('a04b592b-12e2-47aa-a727-ece0c222ac00', '2355dfb7-d893-49b4-a38b-8b4f1675f052',  6, '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('83ce3d97-9e9f-4653-9afd-f37ea611a02d', '2355dfb7-d893-49b4-a38b-8b4f1675f052', 21, '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('a04b592b-12e2-47aa-a727-ece0c222ac00', '474ace5d-8bea-43ee-aadf-9e297d3eaf13', 27, '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('83ce3d97-9e9f-4653-9afd-f37ea611a02d', '474ace5d-8bea-43ee-aadf-9e297d3eaf13', 25, '5b60f606-2850-4943-a964-ae4285d7db92'),
  -- Match 2: one game, in progress, only one score entered
  ('b9cb29c9-9508-4d37-baec-a16376d527e8', 'da77b4f9-80b9-41e3-afbc-9fc670d205b2', 14, '5b60f606-2850-4943-a964-ae4285d7db92'),
  -- Last week: Ian and Jarret lose 0-2
  ('62a755e7-dc99-4dda-8748-f37ea1486193', '21d7f760-5e2b-46d4-8f40-d84b8f073ea6', 15, '60357636-416a-4a5e-b954-637beb84143b'),
  ('b21e5edf-df2a-45df-9651-9913683b40ac', '21d7f760-5e2b-46d4-8f40-d84b8f073ea6', 21, '60357636-416a-4a5e-b954-637beb84143b'),
  ('62a755e7-dc99-4dda-8748-f37ea1486193', '81430aa8-7012-4ad7-be55-60420c33838b', 19, '60357636-416a-4a5e-b954-637beb84143b'),
  ('b21e5edf-df2a-45df-9651-9913683b40ac', '81430aa8-7012-4ad7-be55-60420c33838b', 21, '60357636-416a-4a5e-b954-637beb84143b');

-- ------------------------------------------------------------
-- Videos. Ian's recording is in the session pool and synced to game 1 of Match 1.
-- It is linked to game 2 but not synced yet. The second video is only in the pool.
-- ------------------------------------------------------------

INSERT INTO smackosoft.videos (id, label, video_url, created_by) VALUES
  ('e953055b-f8ac-467d-ada8-c403fe5a868c', 'Court 3 full recording', 'https://www.youtube.com/watch?v=SbmMMj88kmc', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('dfb2e6c8-320c-4efe-8ccc-5aa1a1470d2e', 'Warm up clip',           'https://www.youtube.com/watch?v=SbmMMj88kmc', '5b60f606-2850-4943-a964-ae4285d7db92');

INSERT INTO smackosoft.video_sessions (video_id, session_id, created_by) VALUES
  ('e953055b-f8ac-467d-ada8-c403fe5a868c', '5a27b3f7-4464-4a5a-a97b-7d20ad844b50', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('dfb2e6c8-320c-4efe-8ccc-5aa1a1470d2e', '5a27b3f7-4464-4a5a-a97b-7d20ad844b50', '5b60f606-2850-4943-a964-ae4285d7db92');

INSERT INTO smackosoft.video_games (video_id, match_game_id, canonical_offset, created_by) VALUES
  ('e953055b-f8ac-467d-ada8-c403fe5a868c', 'a0af34e8-8a97-4f4a-bb28-ab49c1a37ed5', interval '10 seconds', '5b60f606-2850-4943-a964-ae4285d7db92'),
  ('e953055b-f8ac-467d-ada8-c403fe5a868c', '2355dfb7-d893-49b4-a38b-8b4f1675f052', NULL,                  '5b60f606-2850-4943-a964-ae4285d7db92');

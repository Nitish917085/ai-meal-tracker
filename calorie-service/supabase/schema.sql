-- CaloriePal — PostgreSQL schema
--
-- This mirrors the schema applied automatically by `src/db/connection.ts` on
-- startup. Use this file when you prefer to create the tables manually via the
-- Supabase SQL editor or `supabase db push` instead of letting the app run DDL.

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure the column exists on databases created before email_verified was added.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS goals (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calorie_target DOUBLE PRECISION NOT NULL DEFAULT 2000,
  protein_target DOUBLE PRECISION NOT NULL DEFAULT 0,
  carb_target    DOUBLE PRECISION NOT NULL DEFAULT 0,
  fat_target     DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_weight DOUBLE PRECISION,
  target_weight  DOUBLE PRECISION,
  weight_goal    TEXT,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS food_entries (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type   TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  food_name   TEXT NOT NULL,
  quantity    DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit        TEXT NOT NULL DEFAULT 'serving',
  calories    DOUBLE PRECISION NOT NULL DEFAULT 0,
  protein     DOUBLE PRECISION NOT NULL DEFAULT 0,
  carbs       DOUBLE PRECISION NOT NULL DEFAULT 0,
  fat         DOUBLE PRECISION NOT NULL DEFAULT 0,
  fiber       DOUBLE PRECISION NOT NULL DEFAULT 0,
  sugar       DOUBLE PRECISION NOT NULL DEFAULT 0,
  sodium      DOUBLE PRECISION NOT NULL DEFAULT 0,
  vitamins    JSONB NOT NULL DEFAULT '{}'::jsonb,
  minerals    JSONB NOT NULL DEFAULT '{}'::jsonb,
  consumed_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_seeded   BOOLEAN NOT NULL DEFAULT false
);

-- Ensure the column exists on databases created before is_seeded was added.
ALTER TABLE food_entries ADD COLUMN IF NOT EXISTS is_seeded BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_memories (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  image_url  TEXT,
  file_name  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_user_time ON food_entries(user_id, consumed_at);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_user ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);

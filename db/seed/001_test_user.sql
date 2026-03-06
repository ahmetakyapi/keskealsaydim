-- Test user seed (upsert)
-- Email: ahmet@ahmet.com
-- Password: ahmet1907

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  experience_level,
  email_verified,
  is_active,
  preferred_currency,
  theme
)
VALUES (
  gen_random_uuid(),
  'ahmet@ahmet.com',
  crypt('ahmet1907', gen_salt('bf', 12)),
  'Ahmet Test',
  'BEGINNER',
  false,
  true,
  'TRY',
  'dark'
)
ON CONFLICT (email)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  experience_level = EXCLUDED.experience_level,
  is_active = true,
  updated_at = NOW();

-- =========================================================
-- OmniSpace — bootstrap seed script
-- =========================================================
-- WHY THIS EXISTS:
-- Self-registration (POST /api/auth/register) always creates a STUDENT.
-- Promoting anyone to another role requires PATCH /api/users/{id}/role,
-- which itself requires an ADMIN to call it. That's a chicken-and-egg gap
-- for the *very first* admin — nothing in the API can create it. Every
-- other table (profiles, classrooms, resources, routines, bookings) IS
-- reachable through the API once this one admin exists, so this script
-- only touches `users` (+ optionally `profiles`, purely for convenience).
--
-- Run this ONCE, directly against Postgres, after the backend has started
-- at least once (so Flyway has created the schema). Pick ONE of the two
-- options below depending on your situation, then delete/comment out the
-- other.
--
-- HOW TO RUN:
--   psql -h localhost -U omnispace -d omnispace -f seed-admin.sql
-- or paste the relevant block into DBeaver/TablePlus/pgAdmin.
-- =========================================================


-- ---------------------------------------------------------
-- OPTION A — You haven't registered any account yet.
-- Creates a brand-new ADMIN user directly.
--
-- Login credentials this creates:
--   email:    admin@omnispace.local
--   password: ChangeMe123!
--
-- The hash below is a real BCrypt hash of "ChangeMe123!" (10 rounds),
-- compatible with Spring Security's BCryptPasswordEncoder — you can log
-- in with POST /api/auth/login using the plaintext password above.
-- OmniSpace requires this password to be changed immediately after login.
-- ---------------------------------------------------------

INSERT INTO users (email, password_hash, display_name, role, must_change_password, created_at)
VALUES (
    'admin@omnispace.local',
    '$2b$10$oPR.0XDBiZ3Rc2floGHwP.icjvkg.0V/XT11yVpOtePQeRCAR9KWa',
    'OmniSpace Admin',
    'ADMIN',
    TRUE,
    now()
)
ON CONFLICT (email) DO UPDATE SET must_change_password = TRUE;

-- Optional: give the admin a profile row too (not required for ADMIN to
-- function — ADMIN never needs department-scope checks — but harmless
-- and keeps /api/users/me/profile from 404-ing if you poke at it).
INSERT INTO profiles (user_id, department, designation, created_at, updated_at)
SELECT id, 'Administration', 'System Administrator', now(), now()
FROM users
WHERE email = 'admin@omnispace.local'
ON CONFLICT (user_id) DO NOTHING;


-- ---------------------------------------------------------
-- OPTION B — You already registered a real account through
-- POST /api/auth/register and just want THAT account promoted
-- to ADMIN instead of creating a separate seed one.
--
-- Uncomment and edit the email below, then run just this block
-- (comment out or skip Option A above).
-- ---------------------------------------------------------

-- UPDATE users
-- SET role = 'ADMIN'
-- WHERE email = 'your-real-email@example.com';


-- ---------------------------------------------------------
-- Sanity check — confirm the admin exists with the right role.
-- ---------------------------------------------------------
SELECT id, email, display_name, role, created_at
FROM users
WHERE role = 'ADMIN';

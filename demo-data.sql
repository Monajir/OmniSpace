-- =============================================================================
-- OmniSpace coherent demonstration dataset
-- =============================================================================
-- Run only after the backend has started once and Flyway has created the schema.
-- This is intentionally NOT a Flyway migration: demo data should be loaded only
-- when wanted, never in every production/development database automatically.
--
-- Primary demonstration login
--   Email:    demo.admin@omnispace.local
--   Password: Demo@12345
--   Role:     ADMIN
--
-- The BCrypt hash below was generated for Demo@12345 with work factor 12.
-- The script is repeatable: rerunning it updates its users/reference records and
-- replaces only rows marked [DEMO] (plus the listed demo routine course codes).
-- It does not delete unrelated application data.
-- =============================================================================

BEGIN;
SET LOCAL TIME ZONE 'UTC';

-- Prevent two copies of this seed script from running concurrently.
SELECT pg_advisory_xact_lock(hashtext('omnispace-demo-data-v1'));

-- The demonstration term deliberately follows the date on which the script is
-- loaded, so its recurring routines remain relevant during a future demo.
-- Production terms should be maintained by an Admin from Routine Management.
INSERT INTO academic_terms
    (academic_year, semester, start_date, end_date, created_at, updated_at)
VALUES
    ('2025-2026', 'Fall', CURRENT_DATE - 120, CURRENT_DATE + 240,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (academic_year, semester) DO UPDATE SET
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    updated_at = CURRENT_TIMESTAMP;

-- -----------------------------------------------------------------------------
-- Users
-- Supporting accounts make faculty ownership, resource management, classroom
-- requests and maintenance resolution believable. Only the admin login above is
-- needed for the demonstration.
-- -----------------------------------------------------------------------------

INSERT INTO users (email, password_hash, display_name, role, must_change_password, created_at)
VALUES
    ('demo.admin@omnispace.local',
     '$2b$12$bQ5BhP7XN9iZ.GKjEhwDNO/hnvk8sP1.uBwVxyvtXCGh331IK/6CK',
     'Ayesha Rahman', 'ADMIN', FALSE, CURRENT_TIMESTAMP),
    ('demo.faculty@omnispace.local',
     '$2b$12$bQ5BhP7XN9iZ.GKjEhwDNO/hnvk8sP1.uBwVxyvtXCGh331IK/6CK',
     'Dr. Mahmud Hasan', 'FACULTY', FALSE, CURRENT_TIMESTAMP),
    ('demo.cr@omnispace.local',
     '$2b$12$bQ5BhP7XN9iZ.GKjEhwDNO/hnvk8sP1.uBwVxyvtXCGh331IK/6CK',
     'Nadia Islam', 'CR', FALSE, CURRENT_TIMESTAMP),
    ('demo.manager@omnispace.local',
     '$2b$12$bQ5BhP7XN9iZ.GKjEhwDNO/hnvk8sP1.uBwVxyvtXCGh331IK/6CK',
     'Karim Ahmed', 'RESOURCE_MANAGER', FALSE, CURRENT_TIMESTAMP),
    ('demo.maintenance@omnispace.local',
     '$2b$12$bQ5BhP7XN9iZ.GKjEhwDNO/hnvk8sP1.uBwVxyvtXCGh331IK/6CK',
     'Farzana Akter', 'MAINTENANCE_STAFF', FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    must_change_password = FALSE;

-- Remove old sessions for demo accounts so the seeded password/session state is
-- deterministic after every rerun.
DELETE FROM refresh_tokens
WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'demo.%@omnispace.local'
);

-- -----------------------------------------------------------------------------
-- Profiles
-- The main account belongs to CSE, BSc CSE, batch 2025, section A. Routines and cohort
-- bookings later in this script use these exact values.
-- -----------------------------------------------------------------------------

INSERT INTO profiles
    (user_id, department, student_id, faculty_id, designation,
     contact_number, academic_year, program, batch, section, created_at, updated_at)
SELECT id, 'Computer Science and Engineering', NULL, 'CSE-DEMO-ADMIN-01',
       'Department Demo Administrator', '+8801700000001', '2025-2026',
       'BSc in Computer Science and Engineering', '2025', 'A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email = 'demo.admin@omnispace.local'
ON CONFLICT (user_id) DO UPDATE SET
    department = EXCLUDED.department,
    student_id = EXCLUDED.student_id,
    faculty_id = EXCLUDED.faculty_id,
    designation = EXCLUDED.designation,
    contact_number = EXCLUDED.contact_number,
    academic_year = EXCLUDED.academic_year,
    program = EXCLUDED.program,
    batch = EXCLUDED.batch,
    section = EXCLUDED.section,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO profiles
    (user_id, department, student_id, faculty_id, designation,
     contact_number, academic_year, program, batch, section, created_at, updated_at)
SELECT id, 'Computer Science and Engineering', NULL, 'CSE-DEMO-FAC-01',
       'Associate Professor', '+8801700000002', '2025-2026',
       'BSc in Computer Science and Engineering', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email = 'demo.faculty@omnispace.local'
ON CONFLICT (user_id) DO UPDATE SET
    department = EXCLUDED.department,
    student_id = EXCLUDED.student_id,
    faculty_id = EXCLUDED.faculty_id,
    designation = EXCLUDED.designation,
    contact_number = EXCLUDED.contact_number,
    academic_year = EXCLUDED.academic_year,
    program = EXCLUDED.program,
    batch = EXCLUDED.batch,
    section = EXCLUDED.section,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO profiles
    (user_id, department, student_id, faculty_id, designation,
     contact_number, academic_year, program, batch, section, created_at, updated_at)
SELECT id, 'Computer Science and Engineering', 'CSE-DEMO-2025-017', NULL,
       'Class Representative', '+8801700000003', '2025-2026',
       'BSc in Computer Science and Engineering', '2025', 'A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email = 'demo.cr@omnispace.local'
ON CONFLICT (user_id) DO UPDATE SET
    department = EXCLUDED.department,
    student_id = EXCLUDED.student_id,
    faculty_id = EXCLUDED.faculty_id,
    designation = EXCLUDED.designation,
    contact_number = EXCLUDED.contact_number,
    academic_year = EXCLUDED.academic_year,
    program = EXCLUDED.program,
    batch = EXCLUDED.batch,
    section = EXCLUDED.section,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO profiles
    (user_id, department, designation, contact_number, created_at, updated_at)
SELECT id, 'Central Resource Office', 'Resource Manager', '+8801700000004',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email = 'demo.manager@omnispace.local'
ON CONFLICT (user_id) DO UPDATE SET
    department = EXCLUDED.department,
    designation = EXCLUDED.designation,
    contact_number = EXCLUDED.contact_number,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO profiles
    (user_id, department, designation, contact_number, created_at, updated_at)
SELECT id, 'Campus Operations', 'Senior Maintenance Technician', '+8801700000005',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email = 'demo.maintenance@omnispace.local'
ON CONFLICT (user_id) DO UPDATE SET
    department = EXCLUDED.department,
    designation = EXCLUDED.designation,
    contact_number = EXCLUDED.contact_number,
    updated_at = CURRENT_TIMESTAMP;

-- -----------------------------------------------------------------------------
-- CSE classrooms
-- -----------------------------------------------------------------------------

INSERT INTO classrooms
    (room_code, name, building, floor, capacity, has_projector,
     has_whiteboard, is_lab, department_owned, status, status_managed_by_issue, created_at)
VALUES
    ('CSE-301', 'CSE Smart Classroom 301', 'Academic Building A', 3, 60,
     TRUE, TRUE, FALSE, 'Computer Science and Engineering', 'AVAILABLE', FALSE, CURRENT_TIMESTAMP),
    ('CSE-LAB-02', 'CSE Software Laboratory 02', 'Engineering Building', 2, 40,
     TRUE, TRUE, TRUE, 'Computer Science and Engineering', 'AVAILABLE', FALSE, CURRENT_TIMESTAMP),
    ('CSE-402', 'CSE Seminar Room 402', 'Academic Building A', 4, 35,
     TRUE, TRUE, FALSE, 'Computer Science and Engineering', 'MAINTENANCE', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (room_code) DO UPDATE SET
    name = EXCLUDED.name,
    building = EXCLUDED.building,
    floor = EXCLUDED.floor,
    capacity = EXCLUDED.capacity,
    has_projector = EXCLUDED.has_projector,
    has_whiteboard = EXCLUDED.has_whiteboard,
    is_lab = EXCLUDED.is_lab,
    department_owned = EXCLUDED.department_owned,
    status = EXCLUDED.status,
    status_managed_by_issue = EXCLUDED.status_managed_by_issue;

-- -----------------------------------------------------------------------------
-- Resources
-- Resources do not have a natural-key constraint in V1, so update the known
-- demo records first and insert only when the name/location pair is absent.
-- -----------------------------------------------------------------------------

UPDATE resources SET
    category = 'Audio Visual', capacity = 1, status = 'AVAILABLE',
    status_managed_by_issue = FALSE,
    requires_approval = TRUE,
    managed_by_user_id = (SELECT id FROM users WHERE email = 'demo.manager@omnispace.local')
WHERE name = 'CSE Portable Projector' AND location = 'CSE Equipment Desk';

INSERT INTO resources
    (name, category, location, capacity, status, status_managed_by_issue,
     requires_approval, managed_by_user_id, created_at)
SELECT 'CSE Portable Projector', 'Audio Visual', 'CSE Equipment Desk', 1,
       'AVAILABLE', FALSE, TRUE, id, CURRENT_TIMESTAMP
FROM users
WHERE email = 'demo.manager@omnispace.local'
  AND NOT EXISTS (
      SELECT 1 FROM resources
      WHERE name = 'CSE Portable Projector' AND location = 'CSE Equipment Desk'
  );

UPDATE resources SET
    category = 'Laboratory Equipment', capacity = 8, status = 'AVAILABLE',
    status_managed_by_issue = FALSE,
    requires_approval = FALSE,
    managed_by_user_id = (SELECT id FROM users WHERE email = 'demo.manager@omnispace.local')
WHERE name = 'Robotics Development Kit' AND location = 'CSE Robotics Lab';

INSERT INTO resources
    (name, category, location, capacity, status, status_managed_by_issue,
     requires_approval, managed_by_user_id, created_at)
SELECT 'Robotics Development Kit', 'Laboratory Equipment', 'CSE Robotics Lab', 8,
       'AVAILABLE', FALSE, FALSE, id, CURRENT_TIMESTAMP
FROM users
WHERE email = 'demo.manager@omnispace.local'
  AND NOT EXISTS (
      SELECT 1 FROM resources
      WHERE name = 'Robotics Development Kit' AND location = 'CSE Robotics Lab'
  );

UPDATE resources SET
    category = 'Video Conferencing', capacity = 1, status = 'PENDING_INSPECTION',
    status_managed_by_issue = TRUE,
    requires_approval = TRUE,
    managed_by_user_id = (SELECT id FROM users WHERE email = 'demo.manager@omnispace.local')
WHERE name = 'Conference Camera Kit' AND location = 'CSE Department Office';

INSERT INTO resources
    (name, category, location, capacity, status, status_managed_by_issue,
     requires_approval, managed_by_user_id, created_at)
SELECT 'Conference Camera Kit', 'Video Conferencing', 'CSE Department Office', 1,
       'PENDING_INSPECTION', TRUE, TRUE, id, CURRENT_TIMESTAMP
FROM users
WHERE email = 'demo.manager@omnispace.local'
  AND NOT EXISTS (
      SELECT 1 FROM resources
      WHERE name = 'Conference Camera Kit' AND location = 'CSE Department Office'
  );

-- -----------------------------------------------------------------------------
-- Current CSE routine: matches CURRENT_ACADEMIC_YEAR=2025-2026 and
-- CURRENT_SEMESTER=Fall from docker-compose.yml/application.yml.
-- -----------------------------------------------------------------------------

DELETE FROM routines
WHERE course_code IN ('CSE-211', 'CSE-315', 'CSE-321', 'CSE-499');

INSERT INTO routines
    (classroom_id, course_code, course_name, faculty_id, day_of_week,
     start_time, end_time, semester, academic_year, program, batch, section,
     is_recurring, created_at, updated_at)
SELECT c.id, valueset.course_code, valueset.course_name, faculty.id,
       valueset.day_of_week, valueset.start_time, valueset.end_time,
       'Fall', '2025-2026', 'BSc in Computer Science and Engineering', '2025', 'A',
       TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('CSE-301',    'CSE-211', 'Data Structures and Algorithms', 'MONDAY',
     TIME '08:00', TIME '09:15'),
    ('CSE-LAB-02', 'CSE-315', 'Database Systems Laboratory',    'TUESDAY',
     TIME '09:15', TIME '10:30'),
    ('CSE-301',    'CSE-321', 'Software Engineering',           'WEDNESDAY',
     TIME '10:30', TIME '11:45'),
    ('CSE-301',    'CSE-499', 'Capstone Project',               'THURSDAY',
     TIME '14:30', TIME '15:45')
) AS valueset(room_code, course_code, course_name, day_of_week, start_time, end_time)
JOIN classrooms c ON c.room_code = valueset.room_code
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE email = 'demo.faculty@omnispace.local'
) faculty;

-- -----------------------------------------------------------------------------
-- Bookings
-- Relative dates keep the demonstration useful whenever the script is run.
-- All classroom bookings use fixed OmniSpace slot boundaries.
-- -----------------------------------------------------------------------------

DELETE FROM bookings WHERE purpose LIKE '[DEMO]%';

-- Active booking owned by the demonstration admin; useful for cancellation.
INSERT INTO bookings
    (resource_id, classroom_id, user_id, start_time, end_time, purpose,
     booking_type, status, approved_by, approved_at, created_at)
SELECT r.id, NULL, admin_user.id,
       (CURRENT_DATE + INTERVAL '2 days 10 hours'),
       (CURRENT_DATE + INTERVAL '2 days 11 hours'),
       '[DEMO] Robotics kit for capstone prototype testing',
       'RESOURCE', 'CONFIRMED', admin_user.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM resources r
JOIN users admin_user ON admin_user.email = 'demo.admin@omnispace.local'
WHERE r.name = 'Robotics Development Kit' AND r.location = 'CSE Robotics Lab';

-- Confirmed cohort event appears in the BSc CSE batch-2025 section-A personal schedule.
INSERT INTO bookings
    (resource_id, classroom_id, user_id, start_time, end_time, purpose,
     booking_type, target_program, target_batch, target_section, status,
     approved_by, approved_at, created_at)
SELECT NULL, c.id, cr.id,
       (date_trunc('week', CURRENT_DATE)::timestamp + INTERVAL '11 days 14 hours 30 minutes'),
       (date_trunc('week', CURRENT_DATE)::timestamp + INTERVAL '11 days 15 hours 45 minutes'),
       '[DEMO] CSE section A project progress presentation',
       'ACADEMIC', 'BSc in Computer Science and Engineering', '2025', 'A', 'CONFIRMED',
       admin_user.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM classrooms c
JOIN users cr ON cr.email = 'demo.cr@omnispace.local'
JOIN users admin_user ON admin_user.email = 'demo.admin@omnispace.local'
WHERE c.room_code = 'CSE-301';

-- Pending classroom request for the admin approval queue.
INSERT INTO bookings
    (resource_id, classroom_id, user_id, start_time, end_time, purpose,
     booking_type, target_program, target_batch, target_section, status, created_at)
SELECT NULL, c.id, faculty.id,
       (date_trunc('week', CURRENT_DATE)::timestamp + INTERVAL '12 days 15 hours 45 minutes'),
       (date_trunc('week', CURRENT_DATE)::timestamp + INTERVAL '12 days 17 hours'),
       '[DEMO] Inter-university programming contest briefing',
       'EVENT', 'BSc in Computer Science and Engineering', '2025', 'A',
       'PENDING_APPROVAL', CURRENT_TIMESTAMP
FROM classrooms c
JOIN users faculty ON faculty.email = 'demo.faculty@omnispace.local'
WHERE c.room_code = 'CSE-LAB-02';

-- Pending managed-resource request for the same admin approval queue.
INSERT INTO bookings
    (resource_id, classroom_id, user_id, start_time, end_time, purpose,
     booking_type, status, created_at)
SELECT r.id, NULL, faculty.id,
       (CURRENT_DATE + INTERVAL '4 days 13 hours'),
       (CURRENT_DATE + INTERVAL '4 days 14 hours'),
       '[DEMO] Projector for CSE research seminar',
       'RESOURCE', 'PENDING_APPROVAL', CURRENT_TIMESTAMP
FROM resources r
JOIN users faculty ON faculty.email = 'demo.faculty@omnispace.local'
WHERE r.name = 'CSE Portable Projector' AND r.location = 'CSE Equipment Desk';

-- Historical examples for status badges and booking history.
INSERT INTO bookings
    (resource_id, classroom_id, user_id, start_time, end_time, purpose,
     booking_type, status, approved_by, approved_at, created_at)
SELECT r.id, NULL, admin_user.id,
       (CURRENT_DATE - INTERVAL '8 days' + INTERVAL '10 hours'),
       (CURRENT_DATE - INTERVAL '8 days' + INTERVAL '11 hours'),
       '[DEMO] Completed robotics workshop equipment booking',
       'RESOURCE', 'COMPLETED', admin_user.id,
       CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '12 days'
FROM resources r
JOIN users admin_user ON admin_user.email = 'demo.admin@omnispace.local'
WHERE r.name = 'Robotics Development Kit' AND r.location = 'CSE Robotics Lab';

INSERT INTO bookings
    (resource_id, classroom_id, user_id, start_time, end_time, purpose,
     booking_type, status, created_at)
SELECT NULL, c.id, admin_user.id,
       (CURRENT_DATE + INTERVAL '9 days 11 hours 45 minutes'),
       (CURRENT_DATE + INTERVAL '9 days 13 hours'),
       '[DEMO] Cancelled CSE alumni planning meeting',
       'EVENT', 'CANCELLED', CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM classrooms c
JOIN users admin_user ON admin_user.email = 'demo.admin@omnispace.local'
WHERE c.room_code = 'CSE-301';

INSERT INTO bookings
    (resource_id, classroom_id, user_id, start_time, end_time, purpose,
     booking_type, status, approved_by, approved_at, rejection_reason, created_at)
SELECT r.id, NULL, cr.id,
       (CURRENT_DATE - INTERVAL '3 days' + INTERVAL '14 hours'),
       (CURRENT_DATE - INTERVAL '3 days' + INTERVAL '15 hours'),
       '[DEMO] Rejected projector request for section presentation',
       'RESOURCE', 'REJECTED', manager.id, CURRENT_TIMESTAMP - INTERVAL '4 days',
       'The projector was already reserved for the department seminar.',
       CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM resources r
JOIN users cr ON cr.email = 'demo.cr@omnispace.local'
JOIN users manager ON manager.email = 'demo.manager@omnispace.local'
WHERE r.name = 'CSE Portable Projector' AND r.location = 'CSE Equipment Desk';

-- -----------------------------------------------------------------------------
-- Maintenance and issue history
-- -----------------------------------------------------------------------------

DELETE FROM issue_reports WHERE description LIKE '[DEMO]%';

-- Unverified resource issue explains why the camera is pending inspection.
INSERT INTO issue_reports
    (resource_id, classroom_id, reporter_id, description, status, created_at)
SELECT r.id, NULL, faculty.id,
       '[DEMO] Camera intermittently disconnects during video calls.',
       'OPEN', CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM resources r
JOIN users faculty ON faculty.email = 'demo.faculty@omnispace.local'
WHERE r.name = 'Conference Camera Kit' AND r.location = 'CSE Department Office';

-- Confirmed classroom issue explains the maintenance status of CSE-402.
INSERT INTO issue_reports
    (resource_id, classroom_id, reporter_id, description, status,
     reviewed_by, reviewed_at, created_at)
SELECT NULL, c.id, cr.id,
       '[DEMO] Ceiling projector in CSE-402 is not receiving an HDMI signal.',
       'IN_PROGRESS', maintenance.id, CURRENT_TIMESTAMP - INTERVAL '1 day',
       CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM classrooms c
JOIN users cr ON cr.email = 'demo.cr@omnispace.local'
JOIN users maintenance ON maintenance.email = 'demo.maintenance@omnispace.local'
WHERE c.room_code = 'CSE-402';

-- Resolved issue provides visible maintenance history without affecting status.
INSERT INTO issue_reports
    (resource_id, classroom_id, reporter_id, description, status,
     reviewed_by, reviewed_at, resolved_by, resolved_at, created_at)
SELECT r.id, NULL, faculty.id,
       '[DEMO] One robotics kit had a damaged USB cable.',
       'RESOLVED', maintenance.id, CURRENT_TIMESTAMP - INTERVAL '5 days', maintenance.id,
       CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '6 days'
FROM resources r
JOIN users faculty ON faculty.email = 'demo.faculty@omnispace.local'
JOIN users maintenance ON maintenance.email = 'demo.maintenance@omnispace.local'
WHERE r.name = 'Robotics Development Kit' AND r.location = 'CSE Robotics Lab';

COMMIT;

-- Summary returned by pgAdmin/psql after a successful load.
SELECT
    (SELECT COUNT(*) FROM users WHERE email LIKE 'demo.%@omnispace.local') AS demo_users,
    (SELECT COUNT(*) FROM classrooms WHERE room_code IN ('CSE-301', 'CSE-LAB-02', 'CSE-402')) AS demo_classrooms,
    (SELECT COUNT(*) FROM routines WHERE course_code IN ('CSE-211', 'CSE-315', 'CSE-321', 'CSE-499')) AS demo_routines,
    (SELECT COUNT(*) FROM bookings WHERE purpose LIKE '[DEMO]%') AS demo_bookings,
    (SELECT COUNT(*) FROM issue_reports WHERE description LIKE '[DEMO]%') AS demo_issues;

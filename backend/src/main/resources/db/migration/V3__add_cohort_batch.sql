ALTER TABLE profiles ADD COLUMN batch VARCHAR(32);
ALTER TABLE routines ADD COLUMN batch VARCHAR(32);
ALTER TABLE bookings ADD COLUMN target_batch VARCHAR(32);

DROP INDEX IF EXISTS idx_routine_program_section;
DROP INDEX IF EXISTS idx_booking_target_cohort;

CREATE INDEX idx_routine_cohort_term
    ON routines(program, batch, section, academic_year, semester);

CREATE INDEX idx_booking_target_cohort
    ON bookings(target_program, target_batch, target_section, status);

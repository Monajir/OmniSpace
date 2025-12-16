ALTER TABLE profiles ADD COLUMN section VARCHAR(16);

ALTER TABLE routines ADD COLUMN program VARCHAR(255);
ALTER TABLE routines ADD COLUMN section VARCHAR(16);

ALTER TABLE bookings ADD COLUMN target_program VARCHAR(255);
ALTER TABLE bookings ADD COLUMN target_section VARCHAR(16);

CREATE INDEX idx_routine_program_section ON routines(program, section);
CREATE INDEX idx_booking_target_cohort ON bookings(target_program, target_section, status);

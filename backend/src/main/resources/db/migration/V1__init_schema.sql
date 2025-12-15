-- =========================================================
-- V1: Initial schema for the combined booking + academic
-- scheduling platform.
-- =========================================================

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(255) NOT NULL,
    role          VARCHAR(32)  NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    revoked_at      TIMESTAMP,
    replaced_by_id  BIGINT REFERENCES refresh_tokens(id),
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_token_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token_hash ON refresh_tokens(token_hash);

CREATE TABLE profiles (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    department      VARCHAR(255),
    student_id      VARCHAR(64) UNIQUE,
    faculty_id      VARCHAR(64) UNIQUE,
    designation     VARCHAR(255),
    contact_number  VARCHAR(32),
    academic_year   VARCHAR(32),
    program         VARCHAR(255),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE resources (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    category            VARCHAR(128),
    location            VARCHAR(255),
    capacity            INTEGER,
    status              VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    requires_approval   BOOLEAN NOT NULL DEFAULT FALSE,
    managed_by_user_id  BIGINT REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE classrooms (
    id                BIGSERIAL PRIMARY KEY,
    room_code         VARCHAR(64) NOT NULL UNIQUE,
    name              VARCHAR(255) NOT NULL,
    building          VARCHAR(255),
    floor             INTEGER,
    capacity          INTEGER,
    has_projector     BOOLEAN NOT NULL DEFAULT FALSE,
    has_whiteboard    BOOLEAN NOT NULL DEFAULT FALSE,
    is_lab            BOOLEAN NOT NULL DEFAULT FALSE,
    department_owned  VARCHAR(255),
    status            VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE routines (
    id            BIGSERIAL PRIMARY KEY,
    classroom_id  BIGINT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    course_code   VARCHAR(64) NOT NULL,
    course_name   VARCHAR(255) NOT NULL,
    faculty_id    BIGINT NOT NULL REFERENCES users(id),
    day_of_week   VARCHAR(16) NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    semester      VARCHAR(64),
    academic_year VARCHAR(32),
    is_recurring  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT chk_routine_time CHECK (start_time < end_time)
);
CREATE INDEX idx_routine_classroom_day ON routines(classroom_id, day_of_week);

CREATE TABLE bookings (
    id            BIGSERIAL PRIMARY KEY,
    resource_id   BIGINT REFERENCES resources(id),
    classroom_id  BIGINT REFERENCES classrooms(id),
    user_id       BIGINT NOT NULL REFERENCES users(id),
    start_time    TIMESTAMP NOT NULL,
    end_time      TIMESTAMP NOT NULL,
    purpose       VARCHAR(1000) NOT NULL,
    booking_type  VARCHAR(32) NOT NULL,
    status        VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL',
    approved_by   BIGINT REFERENCES users(id),
    approved_at   TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT chk_booking_time CHECK (start_time < end_time),
    CONSTRAINT chk_booking_target CHECK (
        (resource_id IS NOT NULL AND classroom_id IS NULL) OR
        (resource_id IS NULL AND classroom_id IS NOT NULL)
    )
);
CREATE INDEX idx_booking_resource_time ON bookings(resource_id, start_time, end_time);
CREATE INDEX idx_booking_classroom_time ON bookings(classroom_id, start_time, end_time);
CREATE INDEX idx_booking_user_status ON bookings(user_id, status);

CREATE TABLE issue_reports (
    id            BIGSERIAL PRIMARY KEY,
    resource_id   BIGINT REFERENCES resources(id),
    classroom_id  BIGINT REFERENCES classrooms(id),
    reporter_id   BIGINT NOT NULL REFERENCES users(id),
    description   VARCHAR(1000) NOT NULL,
    status        VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    resolved_by   BIGINT REFERENCES users(id),
    resolved_at   TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT chk_issue_target CHECK (
        (resource_id IS NOT NULL AND classroom_id IS NULL) OR
        (resource_id IS NULL AND classroom_id IS NOT NULL)
    )
);
CREATE INDEX idx_issue_resource_status ON issue_reports(resource_id, status);
CREATE INDEX idx_issue_classroom_status ON issue_reports(classroom_id, status);

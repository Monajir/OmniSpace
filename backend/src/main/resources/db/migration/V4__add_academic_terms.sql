CREATE TABLE academic_terms (
    id              BIGSERIAL PRIMARY KEY,
    academic_year   VARCHAR(32) NOT NULL,
    semester        VARCHAR(64) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT chk_academic_term_dates CHECK (start_date <= end_date),
    CONSTRAINT uq_academic_term_name UNIQUE (academic_year, semester)
);

CREATE INDEX idx_academic_term_dates ON academic_terms(start_date, end_date);
CREATE UNIQUE INDEX ux_academic_term_name_lower
    ON academic_terms(LOWER(academic_year), LOWER(semester));

-- Separate an unverified report from confirmed maintenance work and remember
-- whether the issue workflow owns the target's current operational status.
ALTER TABLE resources
    ADD COLUMN status_managed_by_issue BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE classrooms
    ADD COLUMN status_managed_by_issue BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE issue_reports
    ADD COLUMN reviewed_by BIGINT REFERENCES users(id),
    ADD COLUMN reviewed_at TIMESTAMP;

-- Backfill only states that the old IssueService itself produced. If staff
-- manually selected another state, preserve it and leave ownership false.
UPDATE resources r
SET status = CASE
        WHEN EXISTS (
            SELECT 1 FROM issue_reports i
            WHERE i.resource_id = r.id AND i.status = 'IN_PROGRESS'
        ) THEN 'MAINTENANCE'
        ELSE 'PENDING_INSPECTION'
    END,
    status_managed_by_issue = TRUE
WHERE r.status = 'UNAVAILABLE'
  AND EXISTS (
      SELECT 1 FROM issue_reports i
      WHERE i.resource_id = r.id AND i.status IN ('OPEN', 'IN_PROGRESS')
  );

UPDATE classrooms c
SET status = CASE
        WHEN EXISTS (
            SELECT 1 FROM issue_reports i
            WHERE i.classroom_id = c.id AND i.status = 'IN_PROGRESS'
        ) THEN 'MAINTENANCE'
        ELSE 'PENDING_INSPECTION'
    END,
    status_managed_by_issue = TRUE
WHERE c.status = 'MAINTENANCE'
  AND EXISTS (
      SELECT 1 FROM issue_reports i
      WHERE i.classroom_id = c.id AND i.status IN ('OPEN', 'IN_PROGRESS')
  );

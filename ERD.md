# OmniSpace Entity-Relationship Diagram

This ERD is derived from the Flyway migrations currently applied by the
OmniSpace backend:

- `V1__init_schema.sql`
- `V2__personal_schedule_and_slots.sql`
- `V3__add_cohort_batch.sql`

## Complete database ERD

```mermaid
erDiagram
    USERS {
        BIGINT id PK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR display_name
        VARCHAR role
        TIMESTAMP created_at
    }

    REFRESH_TOKENS {
        BIGINT id PK
        BIGINT user_id FK
        VARCHAR token_hash
        TIMESTAMP expires_at
        TIMESTAMP revoked_at
        BIGINT replaced_by_id FK
        TIMESTAMP created_at
    }

    PROFILES {
        BIGINT id PK
        BIGINT user_id FK
        VARCHAR department
        VARCHAR student_id UK
        VARCHAR faculty_id UK
        VARCHAR designation
        VARCHAR contact_number
        VARCHAR academic_year
        VARCHAR program
        VARCHAR batch
        VARCHAR section
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    RESOURCES {
        BIGINT id PK
        VARCHAR name
        VARCHAR category
        VARCHAR location
        INTEGER capacity
        VARCHAR status
        BOOLEAN requires_approval
        BIGINT managed_by_user_id FK
        TIMESTAMP created_at
    }

    CLASSROOMS {
        BIGINT id PK
        VARCHAR room_code UK
        VARCHAR name
        VARCHAR building
        INTEGER floor
        INTEGER capacity
        BOOLEAN has_projector
        BOOLEAN has_whiteboard
        BOOLEAN is_lab
        VARCHAR department_owned
        VARCHAR status
        TIMESTAMP created_at
    }

    ROUTINES {
        BIGINT id PK
        BIGINT classroom_id FK
        VARCHAR course_code
        VARCHAR course_name
        BIGINT faculty_id FK
        VARCHAR day_of_week
        TIME start_time
        TIME end_time
        VARCHAR semester
        VARCHAR academic_year
        VARCHAR program
        VARCHAR batch
        VARCHAR section
        BOOLEAN is_recurring
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    BOOKINGS {
        BIGINT id PK
        BIGINT resource_id FK
        BIGINT classroom_id FK
        BIGINT user_id FK
        TIMESTAMP start_time
        TIMESTAMP end_time
        VARCHAR purpose
        VARCHAR booking_type
        VARCHAR target_program
        VARCHAR target_batch
        VARCHAR target_section
        VARCHAR status
        BIGINT approved_by FK
        TIMESTAMP approved_at
        VARCHAR rejection_reason
        TIMESTAMP created_at
    }

    ISSUE_REPORTS {
        BIGINT id PK
        BIGINT resource_id FK
        BIGINT classroom_id FK
        BIGINT reporter_id FK
        VARCHAR description
        VARCHAR status
        BIGINT resolved_by FK
        TIMESTAMP resolved_at
        TIMESTAMP created_at
    }

    USERS ||--o| PROFILES : "has profile"
    USERS ||--o{ REFRESH_TOKENS : "owns sessions"
    REFRESH_TOKENS o|--o{ REFRESH_TOKENS : "replaces"

    USERS o|--o{ RESOURCES : "manages"
    USERS ||--o{ ROUTINES : "teaches"
    CLASSROOMS ||--o{ ROUTINES : "hosts"

    USERS ||--o{ BOOKINGS : "requests"
    USERS o|--o{ BOOKINGS : "approves"
    RESOURCES o|--o{ BOOKINGS : "is booking target"
    CLASSROOMS o|--o{ BOOKINGS : "is booking target"

    USERS ||--o{ ISSUE_REPORTS : "reports"
    USERS o|--o{ ISSUE_REPORTS : "resolves"
    RESOURCES o|--o{ ISSUE_REPORTS : "has issues"
    CLASSROOMS o|--o{ ISSUE_REPORTS : "has issues"
```

## Compact presentation ERD

Use this version when the complete diagram is too dense for a presentation
slide.

```mermaid
erDiagram
    USERS ||--o| PROFILES : has
    USERS ||--o{ REFRESH_TOKENS : owns
    REFRESH_TOKENS o|--o{ REFRESH_TOKENS : rotates_to

    USERS o|--o{ RESOURCES : manages
    USERS ||--o{ ROUTINES : teaches
    CLASSROOMS ||--o{ ROUTINES : hosts

    USERS ||--o{ BOOKINGS : creates
    USERS o|--o{ BOOKINGS : approves
    RESOURCES o|--o{ BOOKINGS : targeted_by
    CLASSROOMS o|--o{ BOOKINGS : targeted_by

    USERS ||--o{ ISSUE_REPORTS : reports
    USERS o|--o{ ISSUE_REPORTS : resolves
    RESOURCES o|--o{ ISSUE_REPORTS : affected_by
    CLASSROOMS o|--o{ ISSUE_REPORTS : affected_by
```

## Relationship summary

| Parent           | Child                       | Relationship                                                        |
| ---------------- | --------------------------- | ------------------------------------------------------------------- |
| `users`          | `profiles`                  | One user has zero or one profile; every profile belongs to one user |
| `users`          | `refresh_tokens`            | One user can have many refresh-token records                        |
| `refresh_tokens` | `refresh_tokens`            | A refresh token may reference its replacement token                 |
| `users`          | `resources`                 | One user may manage many resources; a resource manager is optional  |
| `users`          | `routines`                  | One Faculty user can teach many routines                            |
| `classrooms`     | `routines`                  | One classroom can host many routines                                |
| `users`          | `bookings`                  | One user can create many bookings                                   |
| `users`          | `bookings.approved_by`      | One approver can approve many bookings; approval is optional        |
| `resources`      | `bookings`                  | A resource can have many bookings                                   |
| `classrooms`     | `bookings`                  | A classroom can have many bookings                                  |
| `users`          | `issue_reports`             | One user can report many issues                                     |
| `users`          | `issue_reports.resolved_by` | One user can resolve many issues; resolver is optional              |
| `resources`      | `issue_reports`             | A resource can have many issue reports                              |
| `classrooms`     | `issue_reports`             | A classroom can have many issue reports                             |

## Important schema constraints

### Booking target

Every booking must target exactly one asset type:

```text
Resource booking:  resource_id is set AND classroom_id is null
Classroom booking: classroom_id is set AND resource_id is null
```

This is enforced by the `chk_booking_target` database constraint.

### Issue target

Every issue report must target exactly one asset type:

```text
Resource issue:  resource_id is set AND classroom_id is null
Classroom issue: classroom_id is set AND resource_id is null
```

This is enforced by the `chk_issue_target` database constraint.

### Cohort matching

Profiles and routines store cohort information as separate text fields:

```text
program + batch + section
```

Targeted classroom bookings store the corresponding snapshot as:

```text
target_program + target_batch + target_section
```

These are currently matching fields rather than foreign keys to a separate
cohort table.

### Time validity

- `routines.start_time` must be earlier than `routines.end_time`.
- `bookings.start_time` must be earlier than `bookings.end_time`.
- Additional overlap and fixed-slot rules are enforced in the service layer.

### Cascading deletion

- Deleting a user cascades to that user's profile and refresh tokens.
- Deleting a classroom cascades to its routines.
- Other relationships use the database's default restrictive behavior unless
  explicitly handled by application logic.

## Key indexes

- Refresh-token lookup by user and token hash
- Routine lookup by classroom and weekday
- Routine cohort lookup by program, batch, section, academic year, and semester
- Booking overlap lookup by resource/classroom and time window
- Booking lookup by user and status
- Targeted booking lookup by program, batch, section, and status
- Issue lookup by resource/classroom and status

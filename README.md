# OmniSpace

OmniSpace is a campus scheduling and booking system. Students can view their
class routine and request resources. Class representatives and faculty can book
classrooms. Staff handle approvals, maintenance reports, routines, rooms,
resources, and user accounts.

## Features

- Login and registration with JWT access and refresh tokens
- Permission checks based on user roles
- Personal routines based on program, batch, section, department, and term
- Classroom bookings using fixed class periods
- Resource bookings using start and end times
- Approval pages for classroom and resource requests
- Management pages for users, rooms, resources, routines, and academic terms
- Issue reporting and maintenance tracking
- Redis cache for rooms, resources, and routines
- PostgreSQL migrations with Flyway
- Swagger page for API testing

## Technology

| Part | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, TanStack Router, TanStack Query, Tailwind CSS |
| Backend | Java 21, Spring Boot, Spring Security, Spring Data JPA |
| Database | PostgreSQL 16, Flyway |
| Cache | Redis 7 |
| Containers | Docker Compose |

## Start the project

Docker Desktop must be running.

```bash
docker compose up --build -d
```

| Service | Address |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8081/api |
| Swagger UI | http://localhost:8081/swagger-ui.html |
| Health check | http://localhost:8081/actuator/health |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |

The default PostgreSQL database, username, and password are all `omnispace`.
PostgreSQL uses port `5433` on the host and port `5432` inside Docker.

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```

`docker compose down` keeps the database volume. `docker compose down -v`
deletes it.

## Demo accounts

Each demo account uses the password `Demo@12345`.

| Email | Role |
| --- | --- |
| `demo.admin@omnispace.local` | Admin |
| `demo.faculty@omnispace.local` | Faculty |
| `demo.cr@omnispace.local` | Class Representative |
| `demo.manager@omnispace.local` | Resource Manager |
| `demo.maintenance@omnispace.local` | Maintenance Staff |

Load the demo data after the backend starts:

```bash
docker cp demo-data.sql omnispace-postgres:/tmp/demo-data.sql
docker exec omnispace-postgres psql -v ON_ERROR_STOP=1 -U omnispace -d omnispace -f /tmp/demo-data.sql
docker exec omnispace-redis redis-cli FLUSHDB
```

The last command clears old cached values after the SQL file changes the
database directly.

## Roles

| Role | Access |
| --- | --- |
| Student | View routine, book resources, manage own bookings, report issues |
| CR | Student access plus classroom booking for the assigned class |
| Faculty | Manage own routines, book rooms and resources, approve department room requests |
| Resource Manager | Manage assigned resources and approve their requests |
| Maintenance Staff | Inspect issues and update maintenance status |
| Admin | Manage users, assignments, terms, routines, rooms, resources, and approvals |

The backend checks every protected request. Hiding a button in the frontend
does not grant or remove permission.

## Scheduling and bookings

A student group is matched by `program + batch + section`. Admin controls these
fields. Users can edit their own contact details, but not their academic
assignment.

The personal schedule shows:

- routines for the user's group and current academic term;
- confirmed classroom bookings for the same group.

Classroom bookings use fixed class periods and cannot cross the lunch or prayer
break. A room cannot be booked when another active booking or routine already
uses that room. Resource bookings use start and end times and can last up to
four hours by default. Pending and confirmed requests hold the selected asset's
time.

The system checks conflicts for each room or resource. It does not yet stop the
same student group from being scheduled in two different rooms at the same
time.

## Authentication

- New registrations receive the `STUDENT` role.
- Email matching ignores letter case.
- The frontend keeps the access token in memory.
- A refresh cookie restores the login after a page reload.
- Refresh tokens are replaced after use.
- Changing a password signs out all existing sessions.
- Accounts with temporary passwords can only open Profile Settings.
- Only Admin can change roles and academic assignments.

To call a protected endpoint in Swagger:

1. Call `POST /api/auth/login`.
2. Copy the returned access token.
3. Select **Authorize**.
4. Paste the token.

## Approvals and maintenance

- Faculty approve classroom requests from their department.
- Resource Managers approve requests for their assigned resources.
- Admin can view all pending requests.
- A rejection must include a reason.
- Booking and approval lists refresh after a change.

A new issue starts with the `OPEN` status and appears as **Pending inspection**.
Maintenance staff can confirm, dismiss, or resolve it. Issue status and asset
status are separate values.

## Database and cache

Flyway creates and updates the database tables. Hibernate uses
`ddl-auto: validate` to check that the tables match the JPA entities; it does
not recreate the database. JPA relationships represent links in Java, while
PostgreSQL foreign keys enforce those links in the database.

Redis stores room, resource, and routine responses for 60 seconds. It does not
store bookings, profiles, issues, users, availability results, or login tokens.

## Configuration

Copy `.env.example` to `.env`. Change the database password and JWT secret
before deploying the project.

- `JWT_SECRET`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `CORS_ALLOWED_ORIGINS`
- `VITE_API_URL`
- `REFRESH_COOKIE_SECURE`
- `CURRENT_ACADEMIC_YEAR`, `CURRENT_SEMESTER`

Use HTTPS in production and set `REFRESH_COOKIE_SECURE=true`.

## Tests

Backend tests use PostgreSQL Testcontainers and need Docker Desktop:

```bash
cd backend
mvn test
```

Frontend checks:

```bash
cd frontend
npm ci
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```

Run the API smoke test after loading the demo data:

```powershell
.\scripts\verify-phase5.ps1
```

## Project folders

```text
omnispace/
├── backend/          Spring Boot API
├── frontend/         React application
├── scripts/          Backup, audit, and test scripts
├── demo-data.sql     Demo records
├── ERD.md            Database diagram
├── USER_FLOWS.md     User-flow diagrams
└── docker-compose.yml
```

Backend code is grouped by feature, including `auth`, `booking`, `classroom`,
`issue`, `profile`, `resource`, `routine`, and `user`.

## Not implemented

- Notifications and waitlists
- External calendar sync
- Payments
- A shared list of valid programs, batches, and sections
- Conflict checks for the same student group across different rooms

See [ERD.md](./ERD.md) and [USER_FLOWS.md](./USER_FLOWS.md) for the diagrams.

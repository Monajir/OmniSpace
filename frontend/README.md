# OmniSpace frontend

React 19, TypeScript and TanStack Start frontend for the OmniSpace Spring Boot API.

## Features

- Login, registration, access-token refresh and logout
- Backend-controlled role-based navigation and page access
- Dedicated dashboards for every Student, CR, Faculty and operations role
- Personal student/CR schedules and faculty teaching schedules
- Classroom slot availability and resource booking timelines
- Validated classroom/resource booking creation with cohort targeting and approval guidance
- Searchable booking history with status filters and confirmed cancellation
- Faculty/resource-manager/admin approval queues with guarded approve/reject actions
- Resource status management for permitted roles

Self-registration creates a `STUDENT`. An admin can promote accounts through
`PATCH /api/users/{id}/role` (also available in Swagger).

## Local development

Start the backend on port 8081, then run:

```bash
npm install
npm run dev
```

The API URL defaults to `http://localhost:8081`. Override `VITE_API_URL` when
the browser reaches the backend at another URL.

## Production build

```bash
npm run build
node server.mjs
```

The repository Docker Compose file builds this application and exposes it at
http://localhost:3000.

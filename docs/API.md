# API reference

Base URL (local dev): `http://localhost:4000/api`

All endpoints except `/auth/login` require `Authorization: Bearer <token>`.

## Auth

`POST /auth/login`
Body: `{ "email": "...", "password": "..." }` — the `email` field accepts an email (admins) **or
a mobile number (residents)**.
Returns: `{ "token": "...", "user": { id, name, email, phone, role, buildingId, flatNumber, mustChangePassword } }`
If `mustChangePassword` is true, the apps force a password change before anything else.

`POST /auth/change-password` (authenticated)
Body: `{ "currentPassword": "...", "newPassword": "..." }` (min 6 chars, must differ).
Returns: `{ success, user }` with `mustChangePassword` cleared.

## Buildings

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/buildings` | any | List all buildings |
| POST | `/buildings` | super_admin | Body `{ name, code, address }` |
| DELETE | `/buildings/:id` | super_admin | Also removes that building's users/tickets |

## Admins

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/admins` | super_admin | List all admins |
| POST | `/admins` | super_admin | Body `{ name, email, phone, password, buildingId }` |
| DELETE | `/admins/:id` | super_admin | |

## Users / residents

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/users?buildingId=` | admin, super_admin | Admin is auto-scoped to their own building |
| POST | `/users` | admin, super_admin | Body `{ phone, flatNumber, name?, email?, buildingId? }` — no password: every new resident gets the default password (`DEFAULT_USER_PASSWORD`, returned in the response as `defaultPassword`) and must change it on first login. Flat must exist in the building's flat list and not already have a user. |
| DELETE | `/users/:id` | admin, super_admin | |

## Tickets

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/tickets/categories` | any | The 10 fixed issue types |
| GET | `/tickets?status=&buildingId=` | any | Scoped: user → own tickets, admin → own building, super_admin → all/filtered |
| GET | `/tickets/:id` | any (scoped) | Single ticket |
| POST | `/tickets` | user | Body `{ category, description?, images? }` — only `category` is required. `description` ≤ 50 words if provided; `images` up to 3 base64 data URLs (JPEG/PNG/WebP, ≤5 MB each). Uses the caller's own buildingId/flatNumber. Returns the created ticket incl. `ticketNumber`. |
| PATCH | `/tickets/:id/status` | admin, super_admin | Body `{ status: "open"\|"in_progress"\|"closed", resolutionNotes? }` — `resolutionNotes` required when closing |
| POST | `/tickets/:id/notify-technician` | admin, super_admin | No body. Looks up the technician for the ticket's category (`backend/src/config/technicians.js`), logs the trigger, and returns `{ whatsappUrl, technicianPhone, ticket }`. The frontend opens `whatsappUrl` (a `wa.me` link) in a new tab with the message pre-filled; the admin presses Send in WhatsApp. |

Every ticket create/status-change triggers WhatsApp + email notifications (currently logged to
`backend/data/notifications.log`; see the deployment guide to enable real sending).

## Errors

Non-2xx responses return `{ "error": "human readable message" }`.

# Data model

## Building
| field   | type   | notes                                 |
|---------|--------|----------------------------------------|
| id      | string | UUID                                   |
| name    | string | e.g. "SV RESIDENCY"                    |
| code    | string | short code used in ticket numbers, e.g. "SV" |
| address | string | optional                               |
| image   | string | optional photo filename in the project's `Images` folder, served at `/images/<filename>` |

Current buildings (seeded): SV RESIDENCY (SV, SVresidency.jpg), LAASYA HOMES (LH, LasyaHomes.jpg),
TECH PRO (TP, TechPro.jpg), SRI SIRI RESIDENCY (SSR, SriSiri.jpg), Urban Stays (US, UrbanStays.jpg).

## User
| field        | type   | notes                                              |
|--------------|--------|-----------------------------------------------------|
| id           | string | UUID                                                 |
| name         | string |                                                       |
| email        | string | admins/super admin log in with this; optional for residents |
| phone        | string | **residents log in with this** (their username IS their mobile number); also used for WhatsApp |
| role         | enum   | `super_admin` \| `admin` \| `user`                    |
| buildingId   | string | null for super admin; required for admin/user         |
| flatNumber   | string | only set for role `user`; **one user per flat**, must be in the building's flat list |
| passwordHash | string | bcrypt hash, never returned by the API                |
| mustChangePassword | bool | true for admin-created residents until they set their own password on first login |

### Resident account rules

- The building lists its valid flats in `building.flats`; a resident can only be created for a
  flat on that list, and each flat can have at most one user.
- When an admin creates a resident, only the mobile number and flat are required. The account's
  password is always the default (`Welcome@123`, configurable via `DEFAULT_USER_PASSWORD` in
  `.env`); the create response tells the admin what to share with the resident.
- On first login the app forces the resident to change the password before they can do anything
  else (`POST /auth/change-password`).

## Ticket (service request)
| field           | type   | notes                                                       |
|-----------------|--------|---------------------------------------------------------------|
| id              | string | UUID                                                           |
| ticketNumber    | string | `<buildingCode><5 random digits>`, e.g. `LH12345`, `SVL48213` |
| buildingId      | string |                                                                 |
| userId          | string | resident who raised it                                         |
| flatNumber      | string | copied from the resident at creation time                      |
| category        | enum   | Plumbing, Carpentry, Electricity, Water Issue, Internet Not Working, Lift Not Working, Backup Power Issue, Cleaning, Access Not Working, Washing Machine, Others |
| description     | string | **optional**, max 50 words if provided (enforced server-side)  |
| images          | array  | **optional**, up to 3 photos (JPEG/PNG/WebP, ≤5 MB each); stored in `backend/data/uploads/`, served at `/uploads/<file>` |
| status          | enum   | `open` → `in_progress` → `closed`                              |
| resolutionNotes | string | required when closing                                          |
| technicianPhone | string | set once an admin triggers a technician notification (see below) |
| technicianNotifiedAt | string | ISO date string, set when the technician was last notified |
| createdAt / updatedAt / closedAt | ISO date strings |                                            |

## Notifications

- **On ticket create and on status change**, the resident, the building's admin(s), and the
  super admin all receive the same WhatsApp + email notification (currently logged to
  `backend/data/notifications.log`; see `docs/DEPLOYMENT_AND_APPSTORE_GUIDE.md` to turn on real
  sending).
- **Technician notification (admin-triggered):** once a ticket exists, a building admin (or
  super admin) can press "Notify Technician" on the ticket. The backend looks up the technician
  for that ticket's category and returns a `wa.me` link pre-filled with the ticket details; the
  admin's browser opens WhatsApp with the message ready to send. This needs no WhatsApp Business
  API credentials — it works today.

### Technician phone numbers (`backend/src/config/technicians.js`)

| Category | Phone |
|---|---|
| Plumbing | 918553227280 |
| Carpentry | 919035517844 |
| Electricity | 918105870377 |
| Water Issue | 918105870377 |
| Internet Not Working | 918105870377 |
| Lift Not Working | 918105870377 |
| Backup Power Issue | 918105870377 |
| Cleaning | 918105870377 |
| Access Not Working | 918105870377 |
| Others | 918105870377 |

## Roles & permissions

| Action                              | Super admin | Admin (own building) | User |
|--------------------------------------|:-----------:|:---------------------:|:----:|
| Add/delete buildings                 | ✅          | ❌                     | ❌   |
| Add/delete admins                    | ✅          | ❌                     | ❌   |
| Add/delete residents                 | ✅ (any)    | ✅ (own building)      | ❌   |
| Raise a ticket                       | —           | —                      | ✅   |
| View tickets                         | all         | own building           | own only |
| Move ticket to in-progress / close   | ✅          | ✅ (own building)      | ❌   |

## Ticket number generation

`buildingCode + random 5-digit number`, regenerated on collision, so it's always unique across
the whole system (`backend/src/utils/ticketNumber.js`). Examples: Lasaya Home → `LH12345`,
SVL Residency → `SVL48213`.

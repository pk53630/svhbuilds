# Building Maintenance App

A maintenance-request system for residential buildings (inspired by MyGate): residents raise
tickets for issues like plumbing, electrical, lift, or internet problems; building admins and a
super admin track and resolve them. One backend serves a web app, an Android app, and an iPhone
app, so all three always show the same data.

## What's in this project

```
backend/    Node.js + Express REST API (shared by web, Android, iOS)
web/        React web app (Vite)
android/    Native Android app (Kotlin + Jetpack Compose)
ios/        Native iOS app (Swift + SwiftUI source files)
docs/       API reference, data model, deployment & app-store guide
```

## Roles & flow

- **Super admin** — adds/deletes buildings, adds/deletes building admins.
- **Admin** — adds/deletes residents in their building, views/manages that building's tickets,
  closes tickets with resolution notes.
- **User (resident)** — raises requests for their building/flat, tracks status of their own
  requests.

A resident raises a request by picking an issue type (Plumbing, Carpentry, Electricity, Water
Issue, Internet Not Working, Lift Not Working, Backup Power Issue, Cleaning, Access Not Working,
Others) and a description (50 words max). Submitting creates a service ticket number like
**LH12345** (building code + 5 digits) and notifies the resident, the building's admin(s), and
the super admin — currently stubbed to a log file, ready to wire up to real WhatsApp/Gmail
sending (see `docs/DEPLOYMENT_AND_APPSTORE_GUIDE.md`).

## Quick start (local)

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env
npm run seed     # creates 4 demo buildings + super admin + admins + a resident + a sample ticket
npm start         # http://localhost:4000
```

Demo super admin login: `ks2.praveen@gmail.com` / `Admin@123` (change this password before going live).

**2. Web app**

```bash
cd web
npm install
npm run dev       # http://localhost:5173, proxies /api to the backend
```

**3. Android app**

Open the `android/` folder in Android Studio (Hedgehog or newer), let Gradle sync, run on an
emulator. The emulator reaches your backend automatically via `10.0.2.2:4000` — see
`android/app/src/main/java/.../network/RetrofitClient.kt`.

**4. iOS app**

See `ios/README_IOS_SETUP.md` — a few minutes of one-time Xcode project setup, then drop in the
provided Swift files and run on the simulator.

## Full documentation

- `docs/DATA_MODEL.md` — entities, roles, ticket numbering
- `docs/API.md` — every backend endpoint
- `docs/DEPLOYMENT_AND_APPSTORE_GUIDE.md` — hosting the backend/web, wiring real WhatsApp/Gmail
  notifications, and submitting to the Google Play Store and Apple App Store

## Current status: working prototype

This is a functional prototype you can run and click through end-to-end today. Before real
residents use it, you'll want to: swap the file-based database for a real one (Postgres/MySQL),
turn on real WhatsApp + Gmail sending, add password-reset/forgot-password, and go through the
store submission steps in the deployment guide (which need your own developer accounts —
those can't be created on your behalf).

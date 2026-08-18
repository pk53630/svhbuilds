# Deployment & app store submission guide

This covers going from "runs on my laptop" to "live on the web, Google Play, and the App Store."
The account-creation and submission steps must be done by you (Praveen) — they require your
identity/payment details and can't be delegated.

## 1. Move off the file-based database

`backend/src/db.js` currently stores everything in `backend/data/db.json`. That's fine for a
prototype but won't survive redeploys or handle concurrent writes well. Before going live, swap
it for a real database — e.g. Postgres on [Supabase](https://supabase.com) or
[Neon](https://neon.tech) (both have free tiers), using an ORM like Prisma. The route files
(`backend/src/routes/*.js`) would change their data access but the API shape stays the same, so
the web/Android/iOS apps don't need to change.

## 2. Deploy the backend

Any Node.js host works — e.g. [Railway](https://railway.app), [Render](https://render.com), or
[Fly.io](https://fly.io). Steps are similar everywhere:
1. Push this repo to a GitHub repository.
2. Create a new web service pointing at the `backend/` folder, build command `npm install`,
   start command `npm start`.
3. Set environment variables from `backend/.env.example` (JWT_SECRET, GMAIL_*, WHATSAPP_*).
4. Note the resulting URL, e.g. `https://your-app.up.railway.app`.

## 3. Deploy the web app

Any static host works — e.g. [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
1. Set `VITE_API_URL` to your deployed backend URL (from step 2).
2. Build command `npm run build`, output directory `dist`.
3. Point your domain at it if you have one.

## 4. Turn on real WhatsApp notifications

Uses Meta's WhatsApp Business Cloud API (free tier available):
1. Create a [Meta developer account](https://developers.facebook.com) and a WhatsApp Business
   app.
2. Get a phone number ID and a permanent access token from the app dashboard.
3. Put them in the backend's `.env` as `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`.
4. Replace the `TODO` in `backend/src/utils/notifications.js` → `sendWhatsApp()` with a call to
   `https://graph.facebook.com/v20.0/{phone-number-id}/messages`.

## 5. Turn on real Gmail notifications

1. On the sending Gmail account: Google Account → Security → 2-Step Verification (turn on) →
   App Passwords → generate one for "Mail."
2. Put the Gmail address and app password in the backend's `.env` as `GMAIL_USER` /
   `GMAIL_APP_PASSWORD`.
3. Add `nodemailer` (`npm install nodemailer` in `backend/`) and replace the `TODO` in
   `sendEmail()` in `backend/src/utils/notifications.js` with a Nodemailer Gmail transport call.

## 6. Google Play Store (Android)

1. Create a [Google Play Console](https://play.google.com/console) account — one-time $25 fee.
2. In `android/app/src/main/java/.../network/RetrofitClient.kt`, change `BASE_URL` to your
   deployed backend URL from step 2 (must be `https://`).
3. In Android Studio: Build → Generate Signed Bundle/APK → Android App Bundle. Create a new
   keystore and keep it somewhere safe — you'll need the same one for every future update.
4. In Play Console: create an app, fill in the store listing (description, screenshots, icon,
   privacy policy URL — required even for small apps), upload the `.aab`, submit for review.
   Review typically takes a few hours to a few days.

## 7. Apple App Store (iPhone)

1. Enrol in the [Apple Developer Program](https://developer.apple.com/programs) — $99/year,
   needs a Mac with Xcode.
2. In `ios/BuildingMaintenance/APIService.swift`, change `baseURL` to your deployed backend URL
   (must be `https://`).
3. In Xcode: set your Team under Signing & Capabilities, set a unique Bundle Identifier (e.g.
   `com.yourname.buildingmaintenance`), archive the app (Product → Archive).
4. In [App Store Connect](https://appstoreconnect.apple.com): create the app record, fill in the
   listing (description, screenshots for required device sizes, privacy policy URL), upload the
   archive via Xcode Organizer, submit for review. Apple review typically takes 1–3 days.

## 8. Keep all three in sync going forward

Because the web, Android, and iOS apps all call the same backend API, adding a feature means:
add/change the endpoint in `backend/src/routes/`, then update each frontend's API client
(`web/src/api.js`, `android/.../network/ApiService.kt`, `ios/.../APIService.swift`) to match.

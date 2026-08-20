# 100% free hosting for svhbuilds (demo / client-presentation phase)

Everything below is free, needs no credit card, and gives you public URLs you can send to the
client. When they're happy, the paid AWS setup (`deploy/AWS_FULL_SETUP_GUIDE.md`) is the
upgrade path — no code changes needed, just different hosting.

Three free services, one job each:

| Piece | Service | Why |
|---|---|---|
| Database | **Neon** (free Postgres) | Free servers wipe their disk on restart — the database keeps users/tickets/photos safe |
| Backend API | **Render** (free web service) | Runs the Node backend |
| Web frontend | **Netlify** (free static hosting) | Serves the React app, like the FIFA page |

One honest limitation of the free tier: Render puts the backend to sleep after ~15 minutes of
no traffic, and the first visit after that takes ~50 seconds to wake up. Fine for demos — just
open the site once yourself before presenting so it's already awake.

This also affects the automatic reminders (generator/lift maintenance due in 3 days, rent not
received after the 5th) — they only fire while the server happens to be awake. If you want those
to reliably fire once a day, add a free keep-alive ping:

1. Sign up at https://cron-job.org (free, no card).
2. Create a job that does an HTTP GET to `https://svhbuilds-api.onrender.com/api/health` every
   10 minutes. This keeps Render from sleeping, so the backend's own hourly check keeps running.
3. Optional but not required: admins can also press **"Check due dates now"** on any building
   page in the app to run the checks immediately.

---

## Step 0 — Push the project to GitHub (one time)

Render and Netlify both deploy straight from GitHub.

1. Create a free account at https://github.com if you don't have one.
2. Create a new **private** repository named `svhbuilds`.
3. From `D:\Praveen\MyGateApp` in PowerShell (install Git from https://git-scm.com if needed):

```powershell
git init
git add .
git commit -m "svhbuilds initial version"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/svhbuilds.git
git push -u origin main
```

After future changes: `git add . ; git commit -m "describe change" ; git push` — both Render
and Netlify redeploy automatically on every push.

## Step 1 — Free database on Neon (~5 minutes)

1. Sign up at https://neon.tech (free plan, no card).
2. Create a project: name `svhbuilds`, region **AWS Asia Pacific (Singapore)** (closest free
   region to India).
3. On the project dashboard, copy the **connection string** — it looks like:
   `postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. Keep it handy — it goes into Render in the next step. Treat it like a password.

## Step 2 — Free backend on Render (~10 minutes)

1. Sign up at https://render.com with your GitHub account (free, no card).
2. **New → Web Service** → connect the `svhbuilds` repo.
3. Settings:
   - Name: `svhbuilds-api`
   - Region: **Singapore**
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: **Free**
4. Environment variables (Add Environment Variable):
   - `DATABASE_URL` = the Neon connection string from Step 1
   - `JWT_SECRET` = any long random string (40+ characters)
   - `DEFAULT_USER_PASSWORD` = `Welcome@123` (or your choice)
   - `SEED_IF_EMPTY` = `true` — the first boot loads the demo data (buildings, logins)
     automatically since the database starts empty. It never overwrites existing data, so
     it's safe to leave on.
5. Create Web Service and wait for the first deploy (a few minutes).
6. Note your API URL, e.g. `https://svhbuilds-api.onrender.com` and check
   `https://svhbuilds-api.onrender.com/api/health` shows `{"ok":true}`.

## Step 3 — Free frontend on Netlify (~5 minutes)

1. Sign up at https://netlify.com with GitHub (free, no card).
2. **Add new site → Import an existing project** → pick the `svhbuilds` repo.
3. Settings:
   - Base directory: `web`
   - Build command: `npm run build`
   - Publish directory: `web/dist`
   - Environment variable: `VITE_API_URL` = `https://svhbuilds-api.onrender.com/api`
     (your URL from Step 2)
4. Deploy. Netlify gives you a URL like `https://svhbuilds.netlify.app` (you can pick the
   subdomain under Site settings → Change site name).
5. One extra file is already in the repo for this: `web/public/_redirects` — it makes page
   refreshes work on Netlify for a single-page app.

## Step 4 — Try it

Open your Netlify URL and log in:
- Super admin: `ks2.praveen@gmail.com` / `Admin@123`
- Demo resident: `9000000001` / `User@123`

This is the link you send to the client. Data lives in Neon, so it survives restarts, sleeps,
and redeploys.

## When you upgrade to paid later

- The same code runs on AWS (the earlier guide) — set the same three environment variables.
- Or simply pay Render $7/month for the always-on instance and keep everything else identical.
- The Android/iOS apps just need this same API URL when you're ready for the store phase.

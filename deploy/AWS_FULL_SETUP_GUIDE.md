# AWS setup for svhbuilds — step by step

The dental clinic site was static files only, so S3 alone was enough. svhbuilds has **two
parts**: the web frontend (S3, exactly like the dental site) and the backend API (needs a small
server — S3 cannot run Node.js). This guide covers both. Region: **ap-south-1 (Mumbai)**
throughout.

Total monthly cost: S3 ≈ ₹10–50, Lightsail server $5 (~₹420). Everything is in your own AWS
account.

---

## Part 1 — Frontend on S3 (same as the dental clinic site)

### 1.1 Create the bucket
S3 Console → **Create bucket**
- Name: `svhbuilds`, Region: `ap-south-1`
- Uncheck **Block all public access**, tick the acknowledgement → Create

### 1.2 Enable static website hosting
Bucket → **Properties** → Static website hosting → Enable
- Index document: `index.html`
- Error document: `index.html`  ← must ALSO be index.html (this app is a single-page app;
  the dental site didn't need this, svhbuilds does or page refreshes will 404)

### 1.3 Bucket policy (public read)
Bucket → **Permissions** → Bucket policy → paste `deploy/s3-bucket-policy.json` from this
project → Save.

Your site URL will be: `http://svhbuilds.s3-website.ap-south-1.amazonaws.com`

**Don't upload yet** — first set up the backend (Part 2) so you know the API address to build
the frontend with.

---

## Part 2 — Backend on Lightsail (the part the dental site didn't need)

### 2.1 Create the server
[Lightsail Console](https://lightsail.aws.amazon.com) → **Create instance**
- Region: Mumbai (ap-south-1)
- Platform: **Linux/Unix** → Blueprint: **OS Only → Ubuntu 22.04**
- Plan: **$5/month** (1 GB RAM — plenty for this app)
- Name: `svhbuilds-api` → Create instance

### 2.2 Attach a static IP
Lightsail → Networking → **Create static IP** → attach to `svhbuilds-api`.
Note the IP — call it `YOUR_IP` below. (Without this, the IP changes on restart.)

### 2.3 Open the API port
Instance → Networking tab → **Add rule**: Application `Custom`, Protocol `TCP`, Port `4000`.

### 2.4 Install Node.js on the server
Instance page → **Connect using SSH** (browser terminal opens), then:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v    # should print v20.x
```

### 2.5 Upload the backend code
Easiest path — push this project to GitHub once, then on the server:

```bash
git clone https://github.com/YOUR_USERNAME/svhbuilds.git
cd svhbuilds/backend
npm install
cp .env.example .env
nano .env    # set a long random JWT_SECRET; change DEFAULT_USER_PASSWORD if you like
npm run seed
```

(No GitHub? Zip the project folder, upload it anywhere private, and `wget` + `unzip` it on the
server — but GitHub makes every future update a one-line `git pull`.)

> The `Images` folder must be on the server too (the backend serves building photos from it) —
> it comes automatically with the git clone.

### 2.6 Keep it running with pm2

```bash
sudo npm install -g pm2
pm2 start src/server.js --name svhbuilds-api
pm2 save
pm2 startup    # prints one command — copy/paste and run it
```

Now the API survives reboots. Test from your own PC's browser:
`http://YOUR_IP:4000/api/health` → should show `{"ok":true,...}`

### 2.7 Future backend updates

```bash
cd ~/svhbuilds && git pull && cd backend && npm install && pm2 restart svhbuilds-api
```

---

## Part 3 — Deploy the frontend pointing at the backend

On your Windows PC, from `D:\Praveen\MyGateApp` in PowerShell:

```powershell
.\deploy\deploy-s3.ps1 -ApiUrl "http://YOUR_IP:4000/api"
```

(This needs the AWS CLI configured once: `aws configure` with an access key from IAM, region
`ap-south-1` — same as you did for the dental site.)

Then open `http://svhbuilds.s3-website.ap-south-1.amazonaws.com`, log in as the super admin,
and everything (web now; Android/iOS later, pointed at the same `YOUR_IP`) shares this one
backend — same data everywhere.

Re-run the same one-liner every time the web app changes.

---

## Part 4 — Checklist before real residents use it

- [ ] Changed the super admin password from `Admin@123` (and re-seeded with your own values)
- [ ] `JWT_SECRET` in the server's `.env` is a long random string, not the example one
- [ ] Backend `data/` folder backed up periodically (Lightsail → Snapshots is one click), until
      you move to a managed database (recommended next step — see
      `docs/DEPLOYMENT_AND_APPSTORE_GUIDE.md` step 1)
- [ ] Real WhatsApp/Gmail sending wired up when ready (same doc, steps 4–5)

## Part 5 — Later: custom domain + HTTPS

When you buy a domain for svhbuilds, do these together (HTTPS frontend can't call an HTTP
backend, so both must move at once):
1. Frontend: CloudFront in front of the S3 website endpoint + free ACM certificate
   (us-east-1) + DNS to CloudFront — same as `deploy/S3_SETUP_SVHBUILDS.md` §6.
2. Backend: point a subdomain (e.g. `api.yourdomain.in`) at YOUR_IP, install nginx + a free
   Let's Encrypt certificate on the Lightsail box (`sudo apt install nginx certbot
   python3-certbot-nginx` then `sudo certbot --nginx`), proxying to port 4000.
3. Redeploy the frontend with `-ApiUrl "https://api.yourdomain.in/api"`.

I can walk you through Part 5 in detail when you have the domain.

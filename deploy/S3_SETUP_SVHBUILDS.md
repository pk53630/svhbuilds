# S3 setup for svhbuilds (same pattern as ananddental.co.in)

This hosts the **web frontend** of the maintenance app on S3. Region used below is
**ap-south-1 (Mumbai)** — change it if you used a different region for ananddental.

> Important: S3 serves only static files. The backend API (`backend/` folder) cannot run on
> S3 — for now it stays running on your PC (`npm start` in `backend/`), and later can move to
> Lightsail/EC2/Render per `docs/DEPLOYMENT_AND_APPSTORE_GUIDE.md`. The frontend must be able
> to reach the backend over the network, so when deploying give the deploy script your
> backend's address (see step 4).

## 1. Create the bucket

Console: S3 → Create bucket
- Bucket name: `svhbuilds`
- Region: `ap-south-1`
- **Uncheck** "Block all public access" (acknowledge the warning)

Or CLI:

```
aws s3 mb s3://svhbuilds --region ap-south-1
aws s3api put-public-access-block --bucket svhbuilds --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
```

## 2. Enable static website hosting

Console: bucket → Properties → Static website hosting → Enable
- Index document: `index.html`
- Error document: `index.html`  ← **must also be index.html** (the app is a single-page app;
  this makes URLs like `/buildings/xyz` work on refresh)

Or CLI:

```
aws s3 website s3://svhbuilds --index-document index.html --error-document index.html
```

## 3. Attach the public-read bucket policy

Console: bucket → Permissions → Bucket policy → paste the contents of
`deploy/s3-bucket-policy.json`.

Or CLI (from the project root):

```
aws s3api put-bucket-policy --bucket svhbuilds --policy file://deploy/s3-bucket-policy.json
```

## 4. Build and deploy

From the project root in PowerShell:

```
.\deploy\deploy-s3.ps1 -ApiUrl "http://<your-backend-address>:4000/api"
```

- Backend on your own PC, testing from the same PC: use `http://localhost:4000/api`
- Testing from other devices on your network: use your PC's LAN IP, e.g.
  `http://192.168.1.20:4000/api` (and allow port 4000 through Windows Firewall)
- Anyone outside your network can load the site but **cannot reach a backend running on your
  PC** — that's when you move the backend to a host (step covered in the deployment guide).

Re-run the same script any time you change the web app; it rebuilds and syncs only changes.

## 5. Your website URL

```
http://svhbuilds.s3-website.ap-south-1.amazonaws.com
```

## 6. Optional: custom domain + HTTPS (if ananddental.co.in used CloudFront)

If/when you get a domain for svhbuilds:

1. **Certificate**: ACM (must be in **us-east-1** for CloudFront) → Request certificate for
   your domain → validate via DNS.
2. **CloudFront**: Create distribution → Origin = the S3 *website endpoint* URL from step 5
   (not the bucket ARN) → Alternate domain name = your domain → attach the ACM certificate.
   Under Error pages, map 403 and 404 → `/index.html` with response code 200 (SPA routing).
3. **DNS**: at your domain registrar (or Route 53), point the domain at the CloudFront
   distribution (ALIAS/CNAME).
4. Note: once the site is HTTPS, browsers will block calls to an `http://` backend
   ("mixed content") — so the backend must also be behind HTTPS by then. This is another
   reason the backend's permanent home should be set up around the same time as the domain.

## Checklist

- [ ] Bucket `svhbuilds` created, public access unblocked
- [ ] Static website hosting on, index + error docs = `index.html`
- [ ] Bucket policy attached
- [ ] `deploy-s3.ps1` run with the right `-ApiUrl`
- [ ] Site loads at the S3 website URL and login works

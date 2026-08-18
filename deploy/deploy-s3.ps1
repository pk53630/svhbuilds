# Builds the web app and uploads it to the svhbuilds S3 bucket.
# Prerequisites (one-time): AWS CLI installed + `aws configure` done,
# and the bucket set up per deploy\S3_SETUP_SVHBUILDS.md.
#
# Usage (from the project root D:\Praveen\MyGateApp):
#   .\deploy\deploy-s3.ps1
# Optional parameters:
#   .\deploy\deploy-s3.ps1 -Bucket svhbuilds -ApiUrl "http://YOUR-BACKEND-HOST:4000/api"

param(
    [string]$Bucket = "svhbuilds",
    # URL the deployed frontend uses to reach the backend API.
    # While the backend runs on your own PC, put your PC's public/LAN address here.
    [string]$ApiUrl = ""
)

$ErrorActionPreference = "Stop"
$webDir = Join-Path $PSScriptRoot "..\web"

Write-Host "==> Building web app..." -ForegroundColor Cyan
Push-Location $webDir
try {
    if ($ApiUrl -ne "") {
        # Vite reads .env.production at build time
        Set-Content -Path ".env.production" -Value "VITE_API_URL=$ApiUrl"
        Write-Host "    VITE_API_URL set to $ApiUrl"
    }
    npm install
    npm run build
}
finally {
    Pop-Location
}

Write-Host "==> Uploading to s3://$Bucket ..." -ForegroundColor Cyan
# Long-cached hashed assets
aws s3 sync "$webDir\dist" "s3://$Bucket" --delete --cache-control "public,max-age=31536000" --exclude "index.html"
# index.html must not be cached so new deploys show up immediately
aws s3 cp "$webDir\dist\index.html" "s3://$Bucket/index.html" --cache-control "no-cache"

Write-Host "==> Done." -ForegroundColor Green
Write-Host "Website URL: http://$Bucket.s3-website.ap-south-1.amazonaws.com"
Write-Host "(Adjust region in this script if your bucket is not in ap-south-1 / Mumbai.)"

# CI/CD Setup Guide - Fyntrix Frontend

## 🌿 Branch Strategy

### **main** → Staging Environment
- Automatically deploys to staging S3/CloudFront on every push
- Used for testing and QA
- S3 Bucket: `fyntrix-staging-frontend`
- URL: `https://staging.fyntrix.ai`

### **production** → Production Environment
- Automatically deploys to production S3/CloudFront on every push
- Requires manual approval (configured in GitHub)
- S3 Bucket: `fyntrix-frontend`
- CloudFront ID: `E26V0HY1P4H54K`
- URLs: `https://fyntrix.ai` and `https://www.fyntrix.ai`

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create GitHub Environments

1. Go to your repository: `https://github.com/YOUR_ORG/fyntrix-frontend`
2. Navigate to **Settings → Environments**
3. Click **New environment**

#### Create Staging Environment:
- Name: `staging`
- Click **Configure environment**
- No additional settings needed
- Click **Save protection rules**

#### Create Production Environment:
- Name: `production`
- Click **Configure environment**
- ✅ Enable **Required reviewers**
- Add team members who can approve deployments
- ✅ Enable **Wait timer**: 5 minutes (optional)
- Click **Save protection rules**

---

### Step 2: Add AWS Secrets

#### For Staging Environment:
1. Go to **Settings → Environments → staging**
2. Under **Environment secrets**, click **Add secret**

**AWS Credentials:**
```
Name: AWS_ACCESS_KEY_ID_STAGING
Value: <staging AWS access key>

Name: AWS_SECRET_ACCESS_KEY_STAGING
Value: <staging AWS secret key>
```

**CloudFront Distribution:**
```
Name: CLOUDFRONT_STAGING_DISTRIBUTION_ID
Value: <staging CloudFront distribution ID>
```

**API Configuration:**
```
Name: VITE_API_URL_STAGING
Value: https://staging-api.fyntrix.ai
```

#### For Production Environment:
1. Go to **Settings → Environments → production**
2. Under **Environment secrets**, click **Add secret**

**AWS Credentials (from old account):**
```
Name: AWS_ACCESS_KEY_ID_PRODUCTION
Value: <production AWS access key from old fyntrix account>

Name: AWS_SECRET_ACCESS_KEY_PRODUCTION
Value: <production AWS secret key from old fyntrix account>
```

**API Configuration:**
```
Name: VITE_API_URL_PRODUCTION
Value: https://api.fyntrix.ai
```

---

### Step 3: Create Staging S3 Bucket & CloudFront

Before GitHub Actions can deploy to staging, you need to create the infrastructure:

```bash
# Set AWS profile for new account
export AWS_PROFILE=fyntrix-new

# Create S3 bucket for staging
aws s3 mb s3://fyntrix-staging-frontend --region ap-south-1

# Enable static website hosting
aws s3 website s3://fyntrix-staging-frontend \
  --index-document index.html \
  --error-document index.html

# Disable public access block
aws s3api put-public-access-block \
  --bucket fyntrix-staging-frontend \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Set bucket policy for public read access
cat > /tmp/s3-staging-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::fyntrix-staging-frontend/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket fyntrix-staging-frontend \
  --policy file:///tmp/s3-staging-policy.json
```

**Create CloudFront Distribution for Staging:**
```bash
# Create CloudFront distribution (simplified - adjust as needed)
aws cloudfront create-distribution \
  --origin-domain-name fyntrix-staging-frontend.s3-website.ap-south-1.amazonaws.com \
  --default-root-object index.html

# Note the Distribution ID from the output
```

---

### Step 4: Initial Manual Deployment

For the first deployment, push manually to verify setup:

```bash
cd /Users/adeeb/Documents/Pronttera/Fyntrix/fyntrix-frontend

# Build the frontend
npm run build

# Upload to staging S3
aws s3 sync dist/ s3://fyntrix-staging-frontend --delete --profile fyntrix-new

# Upload to production S3 (old account)
aws s3 sync dist/ s3://fyntrix-frontend --delete --profile fyntrix

# Invalidate production CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E26V0HY1P4H54K \
  --paths "/*" \
  --profile fyntrix
```

---

## 📋 Deployment Workflows

### Workflow 1: Build and Test
**File:** `.github/workflows/build-and-test.yml`
**Triggers:** Pull requests and pushes to `main` and `production` branches
**Purpose:** Build frontend and run tests

**Steps:**
- Install Node.js dependencies
- Run linting (if configured)
- Run type checking (if configured)
- Run tests (if configured)
- Build production bundle
- Verify build output

### Workflow 2: Deploy to Staging
**File:** `.github/workflows/deploy-staging.yml`
**Triggers:** Push to `main` branch
**Purpose:** Deploy to staging S3/CloudFront

**Steps:**
- Build frontend with staging environment variables
- Upload static assets to S3 with long cache headers
- Upload HTML/JSON to S3 with no-cache headers
- Invalidate CloudFront cache
- Wait for invalidation to complete

### Workflow 3: Deploy to Production
**File:** `.github/workflows/deploy-production.yml`
**Triggers:** Push to `production` branch
**Purpose:** Deploy to production S3/CloudFront (requires approval)

**Steps:**
- Build frontend with production environment variables
- Upload static assets to S3 with long cache headers
- Upload HTML/JSON to S3 with no-cache headers
- Invalidate CloudFront cache
- Wait for invalidation to complete
- Send deployment notification

---

## 🔄 Deployment Process

### Deploy to Staging
```bash
# Make changes on feature branch
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Create PR to main
# After PR is merged to main → Automatic deployment to staging
```

### Deploy to Production
```bash
# After testing in staging, merge main to production
git checkout production
git merge main
git push origin production

# GitHub Actions will:
# 1. Wait for manual approval (if configured)
# 2. Build frontend with production env vars
# 3. Upload to S3 with proper cache headers
# 4. Invalidate CloudFront cache
# 5. Wait for invalidation to complete
```

---

## 🎯 Cache Strategy

The workflows implement a smart caching strategy:

### Long Cache (1 year) - Static Assets
- JavaScript files (`.js`)
- CSS files (`.css`)
- Images (`.png`, `.jpg`, `.svg`, etc.)
- Fonts (`.woff`, `.woff2`, etc.)

**Cache-Control:** `public, max-age=31536000`

### No Cache - HTML & Config
- HTML files (`.html`)
- JSON config files (`.json`)

**Cache-Control:** `no-cache, no-store, must-revalidate`

This ensures:
- ✅ Fast loading for static assets
- ✅ Immediate updates for HTML/config
- ✅ Efficient CloudFront caching
- ✅ No stale content issues

---

## 🔍 Monitoring

### View Deployment Status
```bash
# Staging
aws s3 ls s3://fyntrix-staging-frontend/ --recursive --profile fyntrix-new

# Production
aws s3 ls s3://fyntrix-frontend/ --recursive --profile fyntrix
```

### Check CloudFront Status
```bash
# Production
aws cloudfront get-distribution \
  --id E26V0HY1P4H54K \
  --profile fyntrix \
  --query 'Distribution.Status'

# List recent invalidations
aws cloudfront list-invalidations \
  --distribution-id E26V0HY1P4H54K \
  --profile fyntrix
```

### Test Deployment
```bash
# Test staging
curl -I https://staging.fyntrix.ai

# Test production
curl -I https://fyntrix.ai
curl -I https://www.fyntrix.ai

# Check cache headers
curl -I https://fyntrix.ai/assets/index.js
```

---

## 🛠️ Manual Deployment

You can manually trigger deployments from GitHub:

1. Go to **Actions** tab
2. Select workflow (Deploy to Staging or Deploy to Production)
3. Click **Run workflow**
4. Select branch (`main` for staging, `production` for production)
5. Click **Run workflow**

---

## ⚠️ Troubleshooting

### "S3 bucket not found"
**Solution:** Create the S3 bucket using the commands in Step 3

### "CloudFront distribution not found"
**Solution:** Verify the distribution ID in GitHub secrets matches your CloudFront distribution

### "Access denied to S3"
**Solution:** Verify AWS credentials have S3 and CloudFront permissions

### "Old content still showing"
**Solution:** CloudFront invalidation takes 1-5 minutes. Wait and refresh with hard reload (Cmd+Shift+R)

### "Build failed"
**Solution:** Check the GitHub Actions logs for specific error messages

---

## 📊 Workflow Outputs

Each deployment provides:
- ✅ Build size and contents
- ✅ S3 bucket name
- ✅ CloudFront distribution ID
- ✅ Invalidation ID
- ✅ Frontend URL
- ✅ Deployment status

View in: **Actions → Select workflow → View summary**

---

## 🔒 Security Checklist

- ✅ GitHub Environments configured
- ✅ AWS credentials stored as secrets
- ✅ Production requires manual approval
- ✅ Branch protection rules enabled
- ✅ S3 bucket policy restricts to GetObject only
- ✅ CloudFront uses HTTPS only
- ✅ Environment variables separated per environment

---

## 💰 Cost Optimization

### Cache Headers
- Static assets cached for 1 year → Reduces S3 requests
- HTML/JSON not cached → Ensures fresh content

### CloudFront Benefits
- Reduced S3 data transfer costs
- Faster global delivery
- Free SSL certificate
- 1 TB free tier (first 12 months)

### Expected Monthly Costs
- **Staging:** ~$0.50 (low traffic)
- **Production:** ~$1.57 (as documented)

---

## 🎉 You're All Set!

Push to `main` → Deploys to **Staging** 🟢  
Push to `production` → Deploys to **Production** 🔴

### Current Setup

**Staging:**
- S3: `fyntrix-staging-frontend`
- URL: `https://staging.fyntrix.ai`
- Account: New AWS account (fyntrix-new)

**Production:**
- S3: `fyntrix-frontend`
- CloudFront: `E26V0HY1P4H54K`
- URLs: `https://fyntrix.ai`, `https://www.fyntrix.ai`
- Account: Old AWS account (fyntrix)

Happy deploying! 🚀

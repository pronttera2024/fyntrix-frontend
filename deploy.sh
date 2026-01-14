#!/bin/bash
# ARISE Frontend Deployment Script for AWS S3 + CloudFront
set -e

# Configuration (Update these values)
BUCKET_NAME="${AWS_S3_BUCKET:-arise-frontend-prod}"
DISTRIBUTION_ID="${AWS_CLOUDFRONT_ID:-YOUR_CLOUDFRONT_ID}"
REGION="${AWS_REGION:-us-east-1}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ARISE Frontend Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}Step 2: Running build...${NC}"
npm run build

# Verify build output
if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 3: Uploading to S3 bucket: $BUCKET_NAME${NC}"

# Upload assets with long cache
aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.map" \
  --region $REGION

# Upload index.html with short cache
aws s3 cp dist/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "public, max-age=300, must-revalidate" \
  --region $REGION

echo -e "${YELLOW}Step 4: Creating CloudFront invalidation...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo -e "${GREEN}✓ Invalidation created: $INVALIDATION_ID${NC}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Frontend URL: https://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo -e "CloudFront URL: Check your CloudFront distribution"
echo -e ""
echo -e "Note: CloudFront invalidation may take 5-10 minutes to propagate"

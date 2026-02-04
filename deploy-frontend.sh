#!/bin/bash

# Fyntrix Frontend Deployment Script
# Deploys the built frontend to AWS S3 and invalidates CloudFront cache

set -e  # Exit on error

echo "🚀 Fyntrix Frontend Deployment"
echo "================================"
echo ""

# Configuration
S3_BUCKET="fyntrix-frontend"
CLOUDFRONT_DISTRIBUTION_ID="E26V0HY1P4H54K"
AWS_PROFILE="fyntrix"
BUILD_DIR="dist"

# Check if build directory exists
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Error: Build directory '$BUILD_DIR' not found!"
    echo "   Run 'npm run build' first"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI not found!"
    echo "   Install it: brew install awscli"
    exit 1
fi

# Verify AWS profile exists
if ! aws configure list --profile $AWS_PROFILE &> /dev/null; then
    echo "❌ Error: AWS profile '$AWS_PROFILE' not found!"
    echo "   Configure it: aws configure --profile $AWS_PROFILE"
    exit 1
fi

echo "📦 Build directory: $BUILD_DIR"
echo "🪣 S3 Bucket: $S3_BUCKET"
echo "☁️  CloudFront: $CLOUDFRONT_DISTRIBUTION_ID"
echo "👤 AWS Profile: $AWS_PROFILE"
echo ""

# Count files to upload
FILE_COUNT=$(find $BUILD_DIR -type f | wc -l | tr -d ' ')
echo "📊 Files to upload: $FILE_COUNT"
echo ""

# Confirm deployment
read -p "🤔 Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "📤 Uploading to S3..."
echo "-----------------------------------"

# Upload to S3 with proper content types and cache headers
aws s3 sync $BUILD_DIR/ s3://$S3_BUCKET \
    --delete \
    --profile $AWS_PROFILE \
    --cache-control "public, max-age=31536000" \
    --exclude "*.html" \
    --exclude "*.json"

# Upload HTML files with no-cache
aws s3 sync $BUILD_DIR/ s3://$S3_BUCKET \
    --profile $AWS_PROFILE \
    --cache-control "no-cache, no-store, must-revalidate" \
    --exclude "*" \
    --include "*.html" \
    --include "*.json"

echo ""
echo "✅ Upload complete!"
echo ""

echo "🔄 Invalidating CloudFront cache..."
echo "-----------------------------------"

# Create CloudFront invalidation
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --profile $AWS_PROFILE \
    --query 'Invalidation.Id' \
    --output text)

echo "✅ Invalidation created: $INVALIDATION_ID"
echo ""

echo "⏳ Waiting for invalidation to complete..."
aws cloudfront wait invalidation-completed \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --id $INVALIDATION_ID \
    --profile $AWS_PROFILE

echo ""
echo "================================"
echo "✅ Deployment Complete!"
echo "================================"
echo ""
echo "🌐 Frontend URL: https://fyntrix.ai"
echo "📊 CloudFront: https://console.aws.amazon.com/cloudfront/home"
echo "🪣 S3 Bucket: https://s3.console.aws.amazon.com/s3/buckets/$S3_BUCKET"
echo ""
echo "🎉 Your frontend is now live!"

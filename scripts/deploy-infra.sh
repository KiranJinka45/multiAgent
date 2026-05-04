#!/bin/bash
set -e

echo "🚀 Starting Production Infrastructure Deployment..."

cd terraform/environments/prod

echo "📦 Initializing Terraform..."
terraform init

echo "🔍 Validating Configuration..."
terraform validate

echo "📝 Creating Deployment Plan..."
terraform plan -out=tfplan

echo "⚠️ Are you sure you want to apply the plan? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "⚡ Applying Plan..."
    terraform apply tfplan
else
    echo "❌ Deployment Cancelled."
    exit 1
fi

echo "✅ Infrastructure Deployment Complete!"

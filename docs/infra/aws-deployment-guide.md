# AWS Deployment Guide — MultiAgent Platform

## Prerequisites

```bash
# Required CLI tools
aws --version        # AWS CLI v2+
terraform --version  # Terraform 1.5+
kubectl version      # kubectl 1.27+
helm version         # Helm 3+
```

## Step-by-Step Deployment

### Phase 1: Infrastructure Provisioning

```bash
cd terraform/

# Initialize Terraform
terraform init

# Preview changes
terraform plan -out=plan.tfplan

# Apply (creates VPC, EKS, RDS, ElastiCache)
terraform apply plan.tfplan
```

**Expected duration:** ~15-20 minutes

### Phase 2: Connect to EKS

```bash
# Update kubeconfig
aws eks update-kubeconfig --name multiagent-prod --region us-east-1

# Verify connection
kubectl get nodes
```

### Phase 3: Install Cluster Add-ons

```bash
# AWS Load Balancer Controller (for ALB Ingress)
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=multiagent-prod

# KEDA (for queue-based autoscaling)
helm repo add kedacore https://kedacore.github.io/charts
helm install keda kedacore/keda --namespace keda --create-namespace

# Argo Rollouts (for canary deployments)
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

### Phase 4: Create Namespace & Secrets

```bash
kubectl create namespace multiagent

# Create secrets from your .env values
kubectl create secret generic multiagent-gateway-secrets \
  --namespace multiagent \
  --from-literal=DATABASE_URL="postgresql://postgres:PASSWORD@multiagent-db.xxxx.us-east-1.rds.amazonaws.com:5432/multiagent" \
  --from-literal=REDIS_URL="redis://multiagent-redis.xxxx.use1.cache.amazonaws.com:6379" \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=REGION_ID="us-east-1"
```

### Phase 5: Deploy Application

```bash
cd k8s/

# Apply in dependency order
kubectl apply -f gateway-deployment.yaml
kubectl apply -f worker-deployment.yaml
kubectl apply -f aws-ingress.yaml
kubectl apply -f keda-scaledobject.yaml

# Verify pods are running
kubectl get pods -n multiagent
kubectl get ingress -n multiagent
```

### Phase 6: Verify Health

```bash
# Get the ALB DNS name
ALB_URL=$(kubectl get ingress multiagent-ingress -n multiagent -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test health endpoints
curl http://$ALB_URL/health
curl http://$ALB_URL/health/deploy
```

---

## Scaling Verification

```bash
# Watch pods scale with queue depth
kubectl get pods -n multiagent -w

# Simulate load (submit 50 missions)
# Workers should scale from 2 → up to 20 based on KEDA triggers

# Check HPA status
kubectl get hpa -n multiagent
```

---

## Rollback Procedure

```bash
# If deployment fails, Argo Rollouts handles automatic rollback
# Manual rollback:
kubectl argo rollouts undo gateway -n multiagent
kubectl argo rollouts undo worker -n multiagent
```

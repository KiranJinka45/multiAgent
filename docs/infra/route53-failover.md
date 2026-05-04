# Route 53 Multi-Region Failover Strategy

## Overview

This document defines the DNS-level failover strategy using AWS Route 53 for the MultiAgent platform. It bridges the application-level regional failover logic (already implemented in the Gateway proxy layer) with infrastructure-level DNS steering.

---

## Architecture

```
                    ┌─────────────────────┐
                    │   Route 53 (DNS)    │
                    │  Health-Check Based │
                    └─────┬─────────┬─────┘
                          │         │
                 Primary  │         │  Secondary
                          ▼         ▼
              ┌───────────────┐  ┌───────────────┐
              │  Region A     │  │  Region B     │
              │  (us-east-1)  │  │  (us-west-2)  │
              │               │  │               │
              │  ALB → EKS    │  │  ALB → EKS    │
              │  RDS Primary  │  │  RDS Replica  │
              │  Redis Primary│  │  Redis Replica│
              └───────────────┘  └───────────────┘
```

---

## Route 53 Configuration

### 1. Health Checks

Create a Route 53 Health Check against each region's ALB:

```
Health Check (Region A):
  Endpoint: https://us-east-1.multiagent.example.com/health/deploy
  Protocol: HTTPS
  Port: 443
  Path: /health/deploy
  Request Interval: 10 seconds
  Failure Threshold: 3
  
Health Check (Region B):
  Endpoint: https://us-west-2.multiagent.example.com/health/deploy
  Protocol: HTTPS  
  Port: 443
  Path: /health/deploy
  Request Interval: 10 seconds
  Failure Threshold: 3
```

> **Critical Design Decision**: We use `/health/deploy` (not `/health`) as the health check target. This means Route 53 will automatically steer traffic away from a region whose **error budget is exhausted**, not just one that is technically "alive but degraded." This connects the application-level SRE control loop directly into infrastructure routing.

### 2. DNS Records (Failover Policy)

```
Record: api.multiagent.example.com
Type: A (Alias)
Routing Policy: Failover

  Primary Record:
    Value: ALB-Region-A (us-east-1)
    Failover Type: PRIMARY
    Health Check: Region A Health Check
    Evaluate Target Health: Yes

  Secondary Record:
    Value: ALB-Region-B (us-west-2)  
    Failover Type: SECONDARY
    Health Check: Region B Health Check
    Evaluate Target Health: Yes
```

### 3. Geolocation Routing (Optional Enhancement)

For latency-optimized global traffic:

```
Record: api.multiagent.example.com
Routing Policy: Geolocation

  North America → us-east-1 ALB
  Europe        → eu-west-1 ALB (future)
  Asia Pacific  → ap-southeast-1 ALB (future)
  Default       → us-east-1 ALB
```

---

## Failover Sequence

### Automatic (DNS-level)

```
1. Route 53 polls /health/deploy every 10s
2. Region A returns 503 (error budget exhausted OR system in PROTECT/EMERGENCY mode)
3. After 3 consecutive failures (30s), Route 53 marks Region A unhealthy
4. DNS resolves api.multiagent.example.com → Region B ALB
5. TTL propagation: 60 seconds (set low for fast failover)
6. Total failover time: ~90 seconds worst case
```

### Manual Override

```bash
# Force all traffic to Region B (maintenance window)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.multiagent.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "us-west-2-alb.amazonaws.com",
          "EvaluateTargetHealth": false
        },
        "SetIdentifier": "primary-override",
        "Failover": "PRIMARY"
      }
    }]
  }'
```

---

## Write Safety Rules

Route 53 does not understand HTTP semantics. The application layer **must** enforce write safety:

| Request Type | Cross-Region Safe? | Condition |
|---|---|---|
| `GET` (reads) | ✅ Yes | Always safe |
| `POST` (writes) | ⚠️ Conditional | Only if `Idempotency-Key` header is present |
| `POST` (writes) | ❌ No | Without `Idempotency-Key` → reject with 409 |

This is already enforced by the Gateway's `hotPathGuard` middleware and the `executeDbAtomic` transaction wrapper.

---

## Monitoring

### CloudWatch Alarms (Terraform)

```hcl
resource "aws_cloudwatch_metric_alarm" "route53_failover" {
  alarm_name          = "multiagent-region-failover-triggered"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Region A health check failed — failover to Region B active"
  alarm_actions       = [aws_sns_topic.sre_alerts.arn]
  
  dimensions = {
    HealthCheckId = aws_route53_health_check.region_a.id
  }
}
```

---

## Recovery (Failback)

After resolving the primary region issue:

1. Verify `/health/deploy` returns `200` consistently for 5 minutes
2. Route 53 automatically detects recovery and shifts traffic back
3. Monitor for data consistency (check idempotency logs for any duplicate processing)
4. Run `scripts/run-full-chaos.ts` against primary before declaring full recovery

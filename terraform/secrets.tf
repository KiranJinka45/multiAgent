data "aws_caller_identity" "current" {}

resource "aws_secretsmanager_secret" "multiagent" {
  name        = "multiagent/prod"
  description = "Production secrets for MultiAgent platform"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "multiagent_version" {
  secret_id = aws_secretsmanager_secret.multiagent.id

  secret_string = jsonencode({
    DATABASE_URL     = "postgresql://postgres:postgres@rds-prod.cluster-xyz.us-east-1.rds.amazonaws.com:5432/multiagent"
    REDIS_URL        = "redis://elasticache-prod.abc.cache.amazonaws.com:6379"
    JWT_SECRET       = "SUPER_SECRET_PRODUCTION_KEY_DO_NOT_LEAK"
    INTERNAL_API_KEY = "INTERNAL_SRE_CONTROL_PLANE_KEY"
  })
}

# IAM Role for Pods (IRSA)
resource "aws_iam_role" "secrets_role" {
  name = "multiagent-secrets-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${module.eks.oidc_provider}"
      },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {
          "${module.eks.oidc_provider}:sub": "system:serviceaccount:default:multiagent-sa"
        }
      }
    }]
  })
}

resource "aws_iam_policy" "secrets_policy" {
  name        = "multiagent-secrets-policy"
  description = "Allows EKS pods to read production secrets from AWS Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "secretsmanager:GetSecretValue"
      ],
      Resource = aws_secretsmanager_secret.multiagent.arn
    }]
  })
}

resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.secrets_role.name
  policy_arn = aws_iam_policy.secrets_policy.arn
}

output "secrets_role_arn" {
  value = aws_iam_role.secrets_role.arn
}

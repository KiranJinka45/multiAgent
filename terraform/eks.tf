module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.27"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      instance_types = ["t3.medium"]
      min_size     = 2
      max_size     = 10
      desired_size = 2
    }
  }

  # Enable OIDC provider for IRSA
  enable_irsa = true
}

# Example IAM policy for S3 (if workers need it)
resource "aws_iam_policy" "worker_s3_access" {
  name        = "MultiAgentWorkerS3Access"
  description = "Allow workers to access mission artifacts in S3"
  policy      = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["s3:GetObject", "s3:PutObject"]
        Effect   = "Allow"
        Resource = "arn:aws:s3:::multiagent-artifacts/*"
      }
    ]
  })
}

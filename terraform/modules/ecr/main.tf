variable "services" {
  type    = list(string)
  default = ["gateway", "core-api", "orchestrator", "worker", "auth-service", "billing-service"]
}

resource "aws_ecr_repository" "repo" {
  for_each             = toset(var.services)
  name                 = "multiagent-${each.key}"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_lifecycle_policy" "policy" {
  for_each   = toset(var.services)
  repository = aws_ecr_repository.repo[each.key].name
  policy = jsonencode({
    rules = [{
      rulePriority = 1,
      description  = "Keep last 10 images",
      selection = {
        tagStatus     = "any",
        countType     = "imageCountMoreThan",
        countNumber   = 10
      },
      action = { type = "expire" }
    }]
  })
}

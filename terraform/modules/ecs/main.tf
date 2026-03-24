variable "gateway_tg_arn" {}
variable "ecr_repository_urls" { type = map(string) }
variable "database_url" { default = "" }
variable "read_replica_url" { default = "" }

resource "aws_ecs_cluster" "main" {
  name = "multiagent-cluster"
  # Enable CloudWatch Container Insights for better observability
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# IAM Role for ECS Execution (Pulling images, CloudWatch logs)
resource "aws_iam_role" "ecs_execution_role" {
  name = "multiagent-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Task (Permissions for the application code itself)
resource "aws_iam_role" "ecs_task_role" {
  name = "multiagent-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Example: Policy for Task Role to access Secrets Manager
resource "aws_iam_role_policy" "task_secret_access" {
  name = "multiagent-task-secret-access"
  role = aws_iam_role.ecs_task_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = ["*"] # Narrow this down in real production
    }]
  })
}

# Security Group for ECS Services
resource "aws_security_group" "ecs_sg" {
  name   = "multiagent-ecs-sg"
  vpc_id = var.vpc_id
  ingress {
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # Only within VPC
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_cloudwatch_log_group" "logs" {
  for_each = toset(["gateway", "core-api", "orchestrator", "worker"])
  name     = "/ecs/multiagent-${each.key}"
  retention_in_days = 7
}

# Task Definition Helper (simplified for multiple services)
resource "aws_ecs_task_definition" "task" {
  for_each = toset(["gateway", "core-api", "orchestrator", "worker"])
  family                   = "multiagent-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([{
    name  = "multiagent-${each.key}"
    image = "${var.ecr_repository_urls[each.key]}:latest"
    essential = true
    portMappings = [{
      containerPort = (each.key == "gateway" ? 4000 : (each.key == "core-api" ? 3001 : 4001))
      hostPort      = (each.key == "gateway" ? 4000 : (each.key == "core-api" ? 3001 : 4001))
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.logs[each.key].name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = "ecs"
      }
    }
    environment = [
      { name = "REGION", value = data.aws_region.current.name },
      { name = "DATABASE_URL", value = var.database_url },
      { name = "READ_REPLICA_URL", value = var.read_replica_url }
    ]
  }])
}

data "aws_region" "current" {}

# ECS Services
resource "aws_ecs_service" "service" {
  for_each        = toset(["gateway", "core-api", "orchestrator", "worker"])
  name            = "multiagent-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.task[each.key].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ecs_sg.id]
  }

  dynamic "load_balancer" {
    for_each = each.key == "gateway" ? [1] : []
    content {
      target_group_arn = var.gateway_tg_arn
      container_name   = "multiagent-gateway"
      container_port   = 4000
    }
  }
}

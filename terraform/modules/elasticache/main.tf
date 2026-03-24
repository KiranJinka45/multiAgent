variable "vpc_id" {}
variable "private_subnet_ids" { type = list(string) }

resource "aws_elasticache_subnet_group" "redis_group" {
  name       = "multiagent-redis-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "redis_sg" {
  name        = "multiagent-redis-sg"
  vpc_id      = var.vpc_id
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [] # Populate with ECS security group IDs
  }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "multiagent-redis"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis_group.name
  security_group_ids   = [aws_security_group.redis_sg.id]
}

output "redis_endpoint" { value = aws_elasticache_cluster.redis.cache_nodes[0].address }

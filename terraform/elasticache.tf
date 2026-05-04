resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "multiagent-redis"
  replication_group_description = "Redis cluster for MultiAgent queueing"
  node_type                     = "cache.t3.micro"
  num_cache_clusters            = 2 # 1 primary, 1 replica
  port                          = 6379
  parameter_group_name          = "default.redis7"
  automatic_failover_enabled    = true
  multi_az_enabled              = true

  subnet_group_name  = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids = [aws_security_group.redis_sg.id]
}

resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name       = "multiagent-redis-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "redis_sg" {
  name   = "multiagent-redis-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

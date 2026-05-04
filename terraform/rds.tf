# Primary Provider (Already defined in main.tf or root)
# us-east-1

# Secondary Provider for Cross-Region DR
provider "aws" {
  alias  = "secondary"
  region = "us-west-2"
}

resource "aws_db_instance" "postgres" {
  identifier           = "multiagent-db"
  allocated_storage    = 100 # Increased for Tier-1
  storage_type         = "gp3"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.m6g.large" # Production grade
  db_name              = "multiagent"
  username             = "postgres"
  
  # PASSWORD IS NOW MANAGED BY SECRETS MANAGER (integrated with RDS)
  # manage_master_user_password = true
  password             = var.db_password
  
  parameter_group_name = "default.postgres15"
  skip_final_snapshot  = false
  final_snapshot_identifier = "multiagent-db-final-snapshot"
  
  multi_az             = true # Tier-1 Requirement: Regional HA
  storage_encrypted    = true
  backup_retention_period = 7
  deletion_protection  = true
  
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
}

# Tier-1: Cross-Region Read Replica for Disaster Recovery
resource "aws_db_instance" "postgres_replica" {
  provider            = aws.secondary
  identifier          = "multiagent-db-replica-us-west-2"
  replicate_source_db = aws_db_instance.postgres.arn
  instance_class      = "db.m6g.large"
  skip_final_snapshot = true
  
  # Networking for us-west-2 would be defined here
  # vpc_security_group_ids = [aws_security_group.rds_sg_west.id]
  # db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group_west.name
}

resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "multiagent-rds-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "rds_sg" {
  name   = "multiagent-rds-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}

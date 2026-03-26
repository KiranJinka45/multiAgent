variable "vpc_id" {}
variable "private_subnet_ids" { type = list(string) }
variable "db_name" { default = "multiagent" }
variable "db_username" { default = "postgres" }
variable "db_password" {
  sensitive = true
  default   = null
}
variable "replicate_source_db" { default = null }

resource "aws_db_subnet_group" "db_group" {
  name       = "multiagent-db-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "db_sg" {
  name        = "multiagent-db-sg"
  vpc_id      = var.vpc_id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [] # To be populated with ECS security group IDs
  }
}

resource "aws_db_instance" "postgres" {
  allocated_storage      = var.replicate_source_db == null ? 20 : null
  db_name                = var.replicate_source_db == null ? var.db_name : null
  engine                 = var.replicate_source_db == null ? "postgres" : null
  engine_version         = var.replicate_source_db == null ? "15" : null
  instance_class         = "db.t4g.micro"
  username               = var.replicate_source_db == null ? var.db_username : null
  password               = var.replicate_source_db == null ? var.db_password : null
  replicate_source_db    = var.replicate_source_db
  
  db_subnet_group_name   = aws_db_subnet_group.db_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = true
  multi_az               = false
}

output "db_endpoint" { value = aws_db_instance.postgres.endpoint }
output "db_id" { value = aws_db_instance.postgres.id }

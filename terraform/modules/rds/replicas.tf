variable "primary_db_id" {}
variable "regions" { 
  type = list(string)
  default = ["us-east-1", "eu-west-1"]
}

# This assumes we have provider aliases configured in the root
resource "aws_db_instance" "replica" {
  for_each               = toset(var.regions)
  replicate_source_db    = var.primary_db_id
  instance_class         = "db.t4g.micro"
  apply_immediately      = true
  publicly_accessible    = false
  skip_final_snapshot    = true
  parameter_group_name   = "default.postgres15"
  
  # The provider must be passed from the caller using provider aliases
  # This is a bit tricky in submodules, usually handled in the root
}

# Single-Region Replica Module
# The caller is responsible for passing the correct provider and region.
resource "aws_db_instance" "replica" {
  count                  = var.replicate_source_db != null ? 1 : 0
  replicate_source_db    = var.replicate_source_db
  instance_class         = "db.t4g.micro"
  apply_immediately      = true
  publicly_accessible    = false
  skip_final_snapshot    = true
  parameter_group_name   = "default.postgres15"
}

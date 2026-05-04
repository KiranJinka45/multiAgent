module "ecr" {
  source = "../../modules/ecr"
  providers = { aws = aws.primary }
}

# --- PRIMARY REGION (Mumbai) ---
module "vpc_primary" {
  source   = "../../modules/vpc"
  providers = { aws = aws.primary }
}

module "alb_primary" {
  source            = "../../modules/alb"
  vpc_id            = module.vpc_primary.vpc_id
  public_subnet_ids = module.vpc_primary.public_subnet_ids
  providers         = { aws = aws.primary }
}

module "rds_primary" {
  source             = "../../modules/rds"
  vpc_id             = module.vpc_primary.vpc_id
  private_subnet_ids = module.vpc_primary.private_subnet_ids
  db_password        = "change-me-promptly"
  providers          = { aws = aws.primary }
}

module "redis_primary" {
  source             = "../../modules/elasticache"
  vpc_id             = module.vpc_primary.vpc_id
  private_subnet_ids = module.vpc_primary.private_subnet_ids
  providers          = { aws = aws.primary }
}

module "ecs_primary" {
  source              = "../../modules/ecs"
  vpc_id              = module.vpc_primary.vpc_id
  private_subnet_ids  = module.vpc_primary.private_subnet_ids
  gateway_tg_arn      = module.alb_primary.gateway_tg_arn
  ecr_repository_urls = module.ecr.repository_urls
  database_url        = "postgresql://postgres:change-me-promptly@${module.rds_primary.db_endpoint}/multiagent"
  read_replica_url    = "postgresql://postgres:change-me-promptly@${module.rds_primary.db_endpoint}/multiagent"
  providers           = { aws = aws.primary }
}

# --- SECONDARY REGION (Virginia) ---
module "vpc_us" {
  source   = "../../modules/vpc"
  providers = { aws = aws.us }
}

module "alb_us" {
  source            = "../../modules/alb"
  vpc_id            = module.vpc_us.vpc_id
  public_subnet_ids = module.vpc_us.public_subnet_ids
  providers         = { aws = aws.us }
}

module "redis_us" {
  source             = "../../modules/elasticache"
  vpc_id             = module.vpc_us.vpc_id
  private_subnet_ids = module.vpc_us.private_subnet_ids
  providers          = { aws = aws.us }
}

module "rds_replica_us" {
  source              = "../../modules/rds"
  vpc_id              = module.vpc_us.vpc_id
  private_subnet_ids  = module.vpc_us.private_subnet_ids
  replicate_source_db = module.rds_primary.db_id
  providers           = { aws = aws.us }
}

module "ecs_us" {
  source              = "../../modules/ecs"
  vpc_id              = module.vpc_us.vpc_id
  private_subnet_ids  = module.vpc_us.private_subnet_ids
  gateway_tg_arn      = module.alb_us.gateway_tg_arn
  ecr_repository_urls = module.ecr.repository_urls
  database_url        = "postgresql://postgres:change-me-promptly@${module.rds_primary.db_endpoint}/multiagent"
  read_replica_url    = "postgresql://postgres:replica-password@${module.rds_replica_us.db_endpoint}/multiagent"
  providers           = { aws = aws.us }
}

module "route53" {
  source      = "../../modules/route53"
  domain_name = "multiagent-saas.com"
  regional_albs = {
    "ap-south-1" = module.alb_primary.alb_dns_name
    "us-east-1"  = module.alb_us.alb_dns_name
  }
  providers = { aws = aws.primary }
}

output "primary_gateway_url" { value = module.alb_primary.alb_dns_name }
output "us_gateway_url" { value = module.alb_us.alb_dns_name }
module "observability" {
  source       = "../../modules/observability"
  region_names = ["ap-south-1", "us-east-1"]
  providers    = { aws = aws.primary }
}

output "global_url" { value = "app.multiagent-saas.com" }

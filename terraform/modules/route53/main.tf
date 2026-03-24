variable "domain_name" {}
variable "regional_albs" {
  type = map(string) # region => dns_name
}

resource "aws_route53_zone" "main" {
  name = var.domain_name
}

resource "aws_route53_health_check" "alb" {
  for_each          = var.regional_albs
  fqdn              = each.value
  port              = 80
  type              = "HTTP"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"
}

resource "aws_route53_record" "www" {
  for_each = var.regional_albs

  zone_id = aws_route53_zone.main.zone_id
  name    = "app.${var.domain_name}"
  type    = "CNAME"
  ttl     = "60"
  
  set_identifier = each.key
  latency_routing_policy {
    region = each.key
  }
  
  health_check_id = aws_route53_health_check.alb[each.key].id
  records         = [each.value]
}

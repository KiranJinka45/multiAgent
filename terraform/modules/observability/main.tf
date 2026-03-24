variable "region_names" { type = list(string) }

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "MultiAgent-Global-Performance"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            for r in var.region_names : ["AWS/ECS", "CPUUtilization", "ClusterName", "multiagent-cluster", { region = r, label = r }]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          title  = "Global CPU Utilization"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            for r in var.region_names : ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "multiagent-alb", { region = r, label = r }]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "Global Traffic (Request Count)"
        }
      }
    ]
  })
}

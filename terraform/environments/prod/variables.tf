variable "regions" {
  type    = list(string)
  default = ["ap-south-1", "us-east-1", "eu-west-1"]
}
variable "project_name" { default = "multiagent" }
variable "environment" { default = "prod" }

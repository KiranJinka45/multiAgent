provider "aws" {
  region = "ap-south-1"
  alias  = "primary"
}

provider "aws" {
  region = "us-east-1"
  alias  = "us"
}

provider "aws" {
  region = "eu-west-1"
  alias  = "eu"
}

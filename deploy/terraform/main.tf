# ZTAN Institutional Cell Terraform Configuration
# Version: 1.0.0

variable "pilot_id" {
  description = "Unique ID for the institutional pilot"
  type        = string
}

variable "region" {
  description = "Target deployment region (e.g., us-gov-east-1)"
  type        = string
  default     = "us-east-1"
}

provider "ztan" {
  # Mock provider configuration
  endpoint = "https://api.ztan.institution"
}

resource "ztan_witness_node" "primary" {
  pilot_id = var.pilot_id
  region   = var.region
  capacity = "LARGE"
  
  security_policy {
    pqc_enabled       = true
    tpm_attestation   = "STRICT"
    lineage_isolation = "CELL"
  }
}

resource "ztan_identity_plane" "default" {
  pilot_id = var.pilot_id
  region   = var.region
  
  spiffe_trust_domain = "pilot-${var.pilot_id}.ztan.local"
}

output "cell_endpoint" {
  value = ztan_witness_node.primary.endpoint
}

output "merkle_root_anchor" {
  value = ztan_witness_node.primary.merkle_root
}

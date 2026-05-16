terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.36"
    }
  }
}

provider "kubernetes" {
  config_path = "C:/Users/Kiran/.kube/config"
}

resource "kubernetes_namespace" "ztan_validation" {
  metadata {
    name = "ztan-validation"
    labels = {
      environment = "validation"
      project     = "nexus-ztan"
    }
  }
}

resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = kubernetes_namespace.ztan_validation.metadata[0].name
  }

  data = {
    username = "admin"
    password = "super-secret-password"
  }

  type = "Opaque"
}

resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.ztan_validation.metadata[0].name
  }

  data = {
    "APP_ENV"    = "validation"
    "REPLAY_LOG" = "true"
  }
}

output "namespace" {
  value = kubernetes_namespace.ztan_validation.metadata[0].name
}

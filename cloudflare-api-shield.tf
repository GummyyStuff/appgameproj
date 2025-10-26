# Cloudflare API Shield Configuration for Tarkov Casino
# This Terraform configuration sets up API Shield with schema validation

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# Variables
variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for your domain"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

# Configure Cloudflare provider
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# API Shield Schema for Tarkov Casino
resource "cloudflare_api_shield_schema" "tarkov_casino_main" {
  zone_id            = var.cloudflare_zone_id
  kind               = "openapi_v3"
  name               = "Tarkov Casino API - Main Schema"
  validation_enabled = true
  file               = file("${path.module}/openapi-schema.yaml")
}

# Schema Validation Settings
resource "cloudflare_schema_validation_settings" "tarkov_casino" {
  zone_id                              = var.cloudflare_zone_id
  validation_default_mitigation_action = "log"  # Start with 'log' for testing, change to 'block' after validation
  validation_override_mitigation_action = "none"
}

# Rate Limiting Rules (via WAF)
# These rules provide additional protection on top of API Shield
resource "cloudflare_ruleset" "api_rate_limiting" {
  zone_id     = var.cloudflare_zone_id
  name        = "API Rate Limiting"
  description = "Rate limiting for Tarkov Casino API endpoints"
  kind        = "zone"

  rules {
    action = "managed_challenge"  # or "challenge" for stricter
    expression = <<-EOT
      (http.request.uri.path matches "^/api/games/.*/bet$" and 
       rate.counter.ge(30, "1m", ip.src))
    EOT
    action_parameters {
      response {
        status_code = 429
        content_type = "application/json"
        content = jsonencode({
          success = false
          error = {
            code = "RATE_LIMIT_EXCEEDED"
            message = "Too many game requests. Please try again in a minute."
          }
        })
      }
    }
    enabled = true
    description = "Game betting endpoints - 30 requests per minute per IP"
  }

  rules {
    action = "managed_challenge"
    expression = <<-EOT
      (http.request.uri.path matches "^/api/user/.*" and 
       rate.counter.ge(60, "1m", ip.src))
    EOT
    action_parameters {
      response {
        status_code = 429
        content_type = "application/json"
        content = jsonencode({
          success = false
          error = {
            code = "RATE_LIMIT_EXCEEDED"
            message = "Too many requests. Please try again in a minute."
          }
        })
      }
    }
    enabled = true
    description = "User endpoints - 60 requests per minute per IP"
  }

  rules {
    action = "managed_challenge"
    expression = <<-EOT
      (http.request.uri.path matches "^/api/auth/.*" and 
       rate.counter.ge(5, "1m", ip.src))
    EOT
    action_parameters {
      response {
        status_code = 429
        content_type = "application/json"
        content = jsonencode({
          success = false
          error = {
            code = "RATE_LIMIT_EXCEEDED"
            message = "Too many authentication requests. Please try again in a minute."
          }
        })
      }
    }
    enabled = true
    description = "Auth endpoints - 5 requests per minute per IP"
  }
}

# Security headers for all API requests
resource "cloudflare_ruleset" "api_security_headers" {
  zone_id     = var.cloudflare_zone_id
  name        = "API Security Headers"
  description = "Security headers for API responses"
  kind        = "zone"

  rules {
    action = "rewrite"
    expression = <<-EOT
      http.request.uri.path matches "^/api/.*"
    EOT
    action_parameters {
      headers {
        name      = "X-Content-Type-Options"
        operation = "set"
        value     = "nosniff"
      }
      headers {
        name      = "X-Frame-Options"
        operation = "set"
        value     = "DENY"
      }
      headers {
        name      = "X-XSS-Protection"
        operation = "set"
        value     = "1; mode=block"
      }
      headers {
        name      = "Referrer-Policy"
        operation = "set"
        value     = "strict-origin-when-cross-origin"
      }
      headers {
        name      = "Strict-Transport-Security"
        operation = "set"
        value     = "max-age=31536000; includeSubDomains; preload"
      }
    }
    enabled = true
    description = "Add security headers to all API responses"
  }
}

# WAF rule for blocking suspicious patterns
resource "cloudflare_ruleset" "api_waf_protection" {
  zone_id     = var.cloudflare_zone_id
  name        = "API WAF Protection"
  description = "Protect API from common attacks"
  kind        = "zone"

  rules {
    action = "block"
    expression = <<-EOT
      (http.request.uri.path matches "^/api/games/.*" and 
       any(http.request.body.form[*] matches "(?i)<script") or
       any(http.request.body.form[*] matches "(?i)union.*select"))
    EOT
    enabled = false  # Enable after testing
    description = "Block SQL injection and XSS attempts in game endpoints"
  }
}

# Outputs
output "schema_id" {
  description = "ID of the created API Shield schema"
  value       = cloudflare_api_shield_schema.tarkov_casino_main.schema_id
}

output "zone_id" {
  description = "Cloudflare Zone ID"
  value       = var.cloudflare_zone_id
}

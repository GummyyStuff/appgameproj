# Cloudflare API Shield Configuration for Tarkov Casino - FREE PLAN
# Only uses features available on Cloudflare Free plan

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

# ============================================
# FREE PLAN: API Shield Schema
# Free plan limits: 5 schemas, 200 kB total
# ============================================
resource "cloudflare_api_shield_schema" "tarkov_casino_main" {
  zone_id             = var.cloudflare_zone_id
  kind                = "openapi_v3"
  name                = "Tarkov Casino API - Main Schema"
  validation_enabled  = true
  file                = file("${path.module}/openapi-schema.yaml")
}

# ============================================
# FREE PLAN: Schema Validation Settings
# Note: Free plan only supports "block" action
# ============================================
resource "cloudflare_schema_validation_settings" "tarkov_casino" {
  zone_id                               = var.cloudflare_zone_id
  validation_default_mitigation_action  = "block"  # FREE PLAN: Only "block" available
  validation_override_mitigation_action  = "none"
}

# ============================================
# FREE PLAN: Rate Limiting via Page Rules
# (Cloudflare Free plan includes rate limiting)
# ============================================
# Note: For free plan, use Cloudflare Dashboard → Security → WAF
# to configure rate limiting rules manually
# 
# Add rate limiting rules in Cloudflare Dashboard:
# 1. Go to Security → WAF → Rate limiting rules
# 2. Create rule for tarkov.juanis.cool/api/auth/* with 5 req/min
# 3. Create rule for tarkov.juanis.cool/api/games/* with 30 req/min
# 4. Create rule for tarkov.juanis.cool/api/user/* with 60 req/min

# ============================================
# FREE PLAN: Basic WAF Rules
# (Included in Cloudflare Free plan)
# ============================================

# Security headers for all API requests
resource "cloudflare_zone_settings_override" "api_security_settings" {
  zone_id = var.cloudflare_zone_id

  settings {
    # Security Header
    security_header {
      enabled            = true
      include_subdomains = true
      max_age           = 31536000
      nosniff           = true
    }
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

output "free_plan_limits" {
  description = "Free plan limitations"
  value = {
    max_endpoints     = 100
    max_schemas       = 5
    max_schema_size   = "200 kB"
    validation_action  = "block only (no log mode)"
  }
}

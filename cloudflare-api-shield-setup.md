# Cloudflare API Shield Configuration for Tarkov Casino

This guide covers configuring Cloudflare API Shield for your Tarkov Casino game API.

## Overview

Your API has the following endpoint categories:

1. **Authentication** (`/api/auth/*`)
   - `/api/auth/me` - Get current session
   - `/api/auth/logout` - Logout

2. **Games** (`/api/games/*`)
   - Roulette: `/api/games/roulette/bet`
   - Case Opening: `/api/games/cases/open`
   - Stock Market: `/api/games/stock-market/buy`, `/api/games/stock-market/sell`
   - Public endpoints for game info (no auth required)

3. **User** (`/api/user/*`)
   - Profile, balance, history, daily bonus
   - All require authentication

4. **Statistics** (`/api/statistics/*`)
   - Basic, advanced, time-series analytics
   - All require authentication

## Security Strategy

### 1. Schema Validation (API Shield Core)

**Purpose**: Enforce API contracts and block malformed requests

**Configuration**:
```terraform
validation_default_mitigation_action = "log"  # Start with logging
```

**After monitoring for 1-2 weeks**, change to:
```terraform
validation_default_mitigation_action = "block"  # Block invalid requests
```

### 2. Rate Limiting

Configure different rates for endpoint categories:

| Endpoint Type | Rate Limit | Action |
|--------------|------------|---------|
| Auth endpoints | 5 req/min | Challenge |
| Game betting | 30 req/min | Challenge |
| User data | 60 req/min | Challenge |

### 3. Authentication Validation

Your API uses Appwrite sessions. You have two headers:
- `X-Appwrite-Session` - Session secret
- `X-Appwrite-User-Id` - User ID

**Note**: Your backend already validates sessions. Cloudflare API Shield will help by:
- Blocking requests without proper headers
- Rate limiting based on session/user
- Monitoring authentication patterns

## Step-by-Step Setup

### Step 1: Enable API Shield in Cloudflare Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain (the one serving your API)
3. Go to **Security** → **API Shield**
4. Click **Enable API Shield**

### Step 2: Upload OpenAPI Schema

**Option A: Via Cloudflare Dashboard**
1. Go to **Security** → **API Shield** → **Schema Validation**
2. Click **Upload Schema**
3. Select `openapi-schema.yaml`
4. Choose **"Save and Deploy"**

**Option B: Via Terraform** (recommended for production)
```bash
# Set your Cloudflare credentials
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ZONE_ID="your-zone-id"

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

### Step 3: Configure Endpoint Management

Cloudflare will discover your API endpoints. For your game API:

1. Go to **Security** → **API Shield** → **Endpoints**
2. Review discovered endpoints
3. Save important ones:
   - ✅ `POST /api/games/roulette/bet`
   - ✅ `POST /api/games/cases/open`
   - ✅ `POST /api/games/stock-market/buy`
   - ✅ `POST /api/games/stock-market/sell`
   - ✅ `GET /api/user/*` (all user endpoints)
   - ✅ `GET /api/statistics/*` (all statistics)

### Step 4: Monitor and Adjust

**Week 1-2: Monitoring**
- Keep validation in "log" mode
- Review Cloudflare API Shield logs
- Check for false positives

**Week 3+: Production**
- Switch to "block" mode
- Monitor error rates in Sentry
- Adjust rate limits as needed

## API Shield Features for Your Use Case

### 1. Schema Validation

**What it does**: Validates request bodies against your OpenAPI schema

**Example**: If someone sends:
```json
POST /api/games/roulette/bet
{
  "amount": "invalid",  // Should be number
  "betType": "",        // Should be minLength 1
  "betValue": null      // Required
}
```

**Result**: Blocked before reaching your backend

### 2. Sensitive Data Detection (Enterprise)

Since your game involves currency and transactions, enable Sensitive Data Detection:

1. Go to **Security** → **WAF** → **Custom Rules**
2. Enable **"Sensitive Data Detection"**
3. Configure to monitor:
   - `/api/user/balance` - Detect exposed balances
   - `/api/games/*/bet` - Detect bet amounts
   - `/api/user/transactions` - Detect transaction history

**Example Alert**:
```json
{
  "endpoint": "POST /api/games/roulette/bet",
  "sensitive_data_found": ["credit_card", "ssn"],
  "request_id": "abc123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Sequence Analytics

Track user behavior patterns:

**Example Sequences**:
- User → Place bet → Check balance → Place bet (repeated)
  - **Analysis**: Potential compulsive behavior
  - **Action**: Rate limit increase on user

- User → Login → Open 100 cases rapidly
  - **Analysis**: Bot or automated behavior
  - **Action**: Challenge or block

### 4. Auth Posture Checking

Verify authentication on protected endpoints:

```javascript
// Cloudflare automatically checks for auth headers
(http.request.uri.path matches "^/api/games/.*/bet" and 
 http.request.headers["X-Appwrite-Session"] == "")
```

## Advanced Configuration

### Custom Rule: Prevent Bet Manipulation

Add to Terraform file:

```terraform
resource "cloudflare_ruleset" "prevent_bet_manipulation" {
  zone_id     = var.cloudflare_zone_id
  name        = "Prevent Bet Manipulation"
  description = "Block suspicious bet patterns"
  kind        = "zone"

  rules {
    action = "block"
    expression = <<-EOT
      (http.request.uri.path matches "^/api/games/roulette/bet" and 
       http.request.body contains "amount" and
       to_double(http.request.body.form.amount) > 10000)
    EOT
    action_parameters {
      response {
        status_code = 400
        content_type = "application/json"
        content = jsonencode({
          success = false
          error = {
            code = "INVALID_BET"
            message = "Bet amount exceeds maximum allowed"
          }
        })
      }
    }
    enabled = true
    description = "Block bets exceeding $10,000"
  }
}
```

### Custom Rule: Rate Limit Per User

For authenticated endpoints, rate limit by user instead of IP:

```javascript
// In Cloudflare dashboard → WAF → Custom Rules
(http.request.uri.path matches "^/api/games/.*/bet" and 
 rate.counter.ge(30, "1m", 
   coalesce(http.request.headers["X-Appwrite-User-Id"], ip.src)
 ))
```

## Monitoring Your API Shield

### 1. Cloudflare Dashboard

**Metrics to Watch**:
- Requests validated: Should be 100% for configured endpoints
- Validation errors: Monitor for false positives
- Blocked requests: Track when switched to "block" mode
- Latency impact: API Shield adds ~2-5ms per request

**Dashboard Path**:
```
Security → API Shield → Overview → Endpoint Analytics
```

### 2. Integration with Sentry

Your Sentry integration already tracks game errors. API Shield blocks requests before they reach your backend, so you'll see:

1. **Fewer errors in Sentry** - Invalid requests blocked early
2. **Rate limit exceptions** - HTTP 429 errors logged
3. **Schema validation errors** - Invalid request formats

**Add to your monitoring**:
```typescript
// Track API Shield blocks in Sentry
if (error.status === 400 && error.headers?.['cf-api-shield-validation']) {
  Sentry.captureMessage('API Shield validation failed', {
    level: 'warning',
    tags: { source: 'api_shield' },
    extra: { endpoint: req.url }
  });
}
```

### 3. Endpoint Performance

Monitor these per endpoint:

| Endpoint | Expected Latency | Error Rate |
|----------|------------------|------------|
| `/api/games/roulette/bet` | 50-200ms | < 1% |
| `/api/games/cases/open` | 100-300ms | < 1% |
| `/api/user/balance` | 10-50ms | < 0.5% |
| `/api/statistics/advanced` | 100-500ms | < 2% |

## Testing Your Setup

### Test 1: Valid Request
```bash
curl -X POST https://tarkov.juanis.cool/api/games/roulette/bet \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Session: valid-session" \
  -H "X-Appwrite-User-Id: user123" \
  -d '{
    "amount": 100,
    "betType": "straight",
    "betValue": "7"
  }'
```

**Expected**: 200 OK (or 401 if not authenticated)

### Test 2: Invalid Schema (Should Block)
```bash
curl -X POST https://tarkov.juanis.cool/api/games/roulette/bet \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "not-a-number",  # Invalid type
    "betType": ""               # Invalid length
  }'
```

**Expected**: 400 Bad Request (blocked by API Shield before reaching backend)

### Test 3: Rate Limiting
```bash
# Send 35 requests quickly
for i in {1..35}; do
  curl -X POST https://tarkov.juanis.cool/api/games/roulette/bet \
    -H "Content-Type: application/json" \
    -H "X-Appwrite-Session: valid-session" \
    -H "X-Appwrite-User-Id: user123" \
    -d '{"amount": 100, "betType": "straight", "betValue": "7"}' &
done
```

**Expected**: First 30 succeed, next 5 get 429 Rate Limit

## Best Practices for Tarkov Casino

### 1. Game Endpoints

**Protection Level**: High
- All bets involve currency
- Schema validation critical
- Rate limiting essential
- Monitor for unusual patterns

**Configuration**:
```terraform
# High rate limit for authentic users
game_rate_limit = 30  # per minute

# Strict schema validation
validate_request_body = true
validate_response_body = true  # Optional but recommended
```

### 2. User Endpoints

**Protection Level**: High
- Contains sensitive user data
- Rate limiting important
- Monitor for data scraping

**Configuration**:
```terraform
# Moderate rate limit
user_rate_limit = 60  # per minute

# Enable auth posture checking
require_auth_headers = true
```

### 3. Statistics Endpoints

**Protection Level**: Medium
- Resource intensive queries
- Protect from abuse
- Cache responses when possible

**Configuration**:
```terraform
# Lower rate limit for heavy queries
stats_rate_limit = 20  # per minute

# Consider caching
response_cache_ttl = 60  # seconds
```

## Troubleshooting

### Issue: Legitimate requests being blocked

**Symptoms**: Users report "Invalid request" errors

**Solution**:
1. Check API Shield logs in dashboard
2. Review schema for missing fields
3. Temporarily switch to "log" mode
4. Update schema and redeploy

### Issue: High latency

**Symptoms**: Requests take longer than expected

**Solution**:
1. API Shield adds 2-5ms overhead (minimal)
2. Check if rate limiting is too aggressive
3. Verify caching is enabled for read-only endpoints
4. Monitor Cloudflare Analytics for slow queries

### Issue: False rate limit positives

**Symptoms**: Legitimate users getting 429 errors

**Solution**:
1. Increase rate limit thresholds
2. Use per-user rate limiting instead of per-IP
3. Implement rate limit headers:
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset`

## Next Steps

1. **Enable API Shield** (follow Step 1-4 above)
2. **Monitor for 1-2 weeks** in log mode
3. **Review analytics** and adjust configurations
4. **Switch to block mode** after validation
5. **Enable Sensitive Data Detection** (if Enterprise plan)
6. **Set up alerts** for critical events

## Resources

- [Cloudflare API Shield Docs](https://developers.cloudflare.com/api-shield/)
- [OpenAPI Schema Reference](https://spec.openapis.org/oas/v3.0.3)
- [Your API Documentation](../docs/api/README.md)

## Support

If you encounter issues:
1. Check Cloudflare Dashboard logs
2. Review Sentry error logs
3. Test individual endpoints
4. Consult Cloudflare support if needed

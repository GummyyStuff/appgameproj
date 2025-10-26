# Cloudflare API Shield for Tarkov Casino - FREE PLAN Setup

This guide is specifically for **Cloudflare Free Plan** users. Only free tier features are used.

## What's Available on Free Plan ✅

### 1. **Schema Validation** ✅
- Upload OpenAPI schema (max 5 schemas, 200 kB total)
- Validate request bodies
- Block invalid requests
- **Limitation**: Only "block" action (no "log" mode)

### 2. **Endpoint Management** ✅
- Monitor up to 100 endpoints
- Track performance metrics
- View request counts, latency, error rates
- Rate limiting recommendations

### 3. **Basic WAF** ✅
- Security headers
- Rate limiting (basic)
- SSL/TLS encryption

## What's NOT Available on Free Plan ❌

- JWT validation (Enterprise only)
- mTLS authentication (Enterprise only)  
- API Discovery (Enterprise only)
- Sequence Analytics (Enterprise only)
- Sensitive Data Detection (Enterprise only)
- Authentication Posture (Enterprise only)
- "Log" mode for schema validation (only "block" available)

## Free Plan Limits

| Feature | Free Plan Limit |
|---------|----------------|
| Saved endpoints | 100 |
| Uploaded schemas | 5 |
| Total schema size | 200 kB |
| Validation action | Block only |
| API Discovery | ❌ Not available |
| JWT validation | ❌ Not available |
| Rate limiting | ✅ Basic (via WAF) |

## Step-by-Step Setup

### Step 1: Enable Basic Features

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Go to **Security** → **API Shield**
4. Click **Get Started** (if not already enabled)

### Step 2: Upload OpenAPI Schema

**Option A: Via Dashboard (Simplest)**

1. Go to **Security** → **API Shield** → **Schema Validation**
2. Click **Upload Schema**
3. Upload `openapi-schema.yaml`
4. Click **Save and Deploy**

**Important**: Since free plan only supports "block" mode, test your schema carefully!

**Option B: Via Terraform**

```bash
# Set credentials
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ZONE_ID="your-zone-id"

# Deploy
terraform init
terraform plan
terraform apply
```

### Step 3: Configure Rate Limiting (Free Plan)

Free plan has basic rate limiting via WAF:

1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Create rules:

**Rule 1: Auth Endpoints (5 req/min)**
```
Rule name: "Auth Rate Limit"
When: http.request.uri.path contains "/api/auth"
Action: Challenge
Rate: 5 requests per minute
```

**Rule 2: Game Betting (30 req/min)**
```
Rule name: "Game Betting Rate Limit"  
When: http.request.uri.path contains "/api/games" and 
      http.request.method eq "POST"
Action: Challenge
Rate: 30 requests per minute
```

**Rule 3: User Endpoints (60 req/min)**
```
Rule name: "User Data Rate Limit"
When: http.request.uri.path contains "/api/user"
Action: Challenge
Rate: 60 requests per minute
```

### Step 4: Security Headers (Free Plan)

1. Go to **Security** → **WAF** → **Custom Rules**
2. Create a rule for security headers:

```
Rule name: "API Security Headers"
When: http.request.uri.path matches "^/api/*"
Action: Set response headers
```

Add headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Step 5: Monitor Endpoints

1. Go to **Security** → **API Shield** → **Endpoints**
2. Manually add your critical endpoints:

**Critical Endpoints to Add:**
- `POST /api/games/roulette/bet`
- `POST /api/games/cases/open`
- `POST /api/games/stock-market/buy`
- `POST /api/games/stock-market/sell`
- `GET /api/user/balance`
- `GET /api/user/profile`

### Step 6: Test Your Schema

Since free plan only has "block" mode, you MUST test carefully:

**Test Valid Request:**
```bash
curl -X POST https://tarkov.juanis.cool/api/games/roulette/bet \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Session: your-session" \
  -d '{"amount": 100, "betType": "straight", "betValue": "7"}'
```

**Expected**: 200 OK (if authenticated)

**Test Invalid Request (Should Block):**
```bash
curl -X POST https://tarkov.juanis.cool/api/games/roulette/bet \
  -H "Content-Type: application/json" \
  -d '{"amount": "invalid"}'
```

**Expected**: 400 Bad Request (blocked by API Shield)

## Important Limitations

### 1. No "Log" Mode"

**Problem**: Free plan only has "block" mode - invalid requests are immediately blocked

**Solution**: 
1. **Test thoroughly** before deploying schema
2. Upload schema as "draft" first if possible
3. Start with minimal validation (only required fields)
4. Monitor Cloudflare Dashboard for blocked requests

### 2. Schema Size Limit

**Limit**: 200 kB total for all schemas

**Solution**: 
1. Keep schema minimal (we've trimmed yours to essentials)
2. Remove unnecessary descriptions
3. Use references for repeated structures

### 3. No JWT Validation

**Problem**: Free plan can't validate JWT tokens

**Solution**: Your backend already validates Appwrite sessions. API Shield will still:
- Block requests without proper headers
- Rate limit based on IP/session
- Monitor for suspicious patterns

### 4. No API Discovery

**Problem**: Cloudflare won't automatically discover your endpoints

**Solution**: Manually add critical endpoints in Endpoint Management dashboard

## Minimal Working Configuration

Here's the minimal setup that works on free plan:

```terraform
# Only deploy if you have Cloudflare API access
resource "cloudflare_api_shield_schema" "tarkov_casino" {
  zone_id            = var.cloudflare_zone_id
  kind               = "openapi_v3"
  name               = "Tarkov Casino API"
  validation_enabled = true
  file               = file("openapi-schema.yaml")
}

resource "cloudflare_schema_validation_settings" "tarkov_casino" {
  zone_id                               = var.cloudflare_zone_id
  validation_default_mitigation_action  = "block"
  validation_override_mitigation_action  = "none"
}
```

## What You Still Get

Even on free plan, you get significant protection:

✅ **Schema Validation**: Block malformed requests  
✅ **Rate Limiting**: Basic protection against abuse  
✅ **Security Headers**: Protection against common attacks  
✅ **Endpoint Monitoring**: Track performance and errors  
✅ **SSL/TLS**: Free HTTPS certificates  
✅ **DDoS Protection**: Basic DDoS protection  
✅ **CDN**: Global content delivery  
✅ **Analytics**: Basic traffic analytics

## Recommended Workflow

### Week 1: Setup & Testing

1. Upload schema via dashboard
2. Add critical endpoints manually
3. Test all game endpoints
4. Monitor for false positives

### Week 2: Monitoring

1. Check Cloudflare Dashboard daily
2. Review blocked requests
3. Adjust schema if needed
4. Monitor error rates

### Week 3+: Production

1. Keep schema active
2. Monitor endpoint performance
3. Add more endpoints as needed
4. Consider upgrading to Pro for "log" mode

## Troubleshooting

### Issue: Valid requests being blocked

**Symptoms**: Users report "Invalid request" errors

**Solution**:
1. Check Cloudflare API Shield logs in dashboard
2. Review schema - may be too strict
3. Temporarily disable validation for that endpoint
4. Update schema and redeploy

### Issue: Schema file too large

**Error**: "Schema exceeds 200 kB limit"

**Solution**:
1. Remove verbose descriptions
2. Remove optional examples
3. Keep only essential fields
4. Use `$ref` for repeated structures

### Issue: Rate limiting legitimate users

**Symptoms**: Users getting 429 errors frequently

**Solution**:
1. Increase rate limit in WAF rules
2. Use per-user rate limiting (if implementing in backend)
3. Add rate limit headers to help users
4. Consider upgrading to Pro plan

## Free Plan Alternatives

Since free plan doesn't have JWT validation, implement in your backend:

```typescript
// Your backend already has this!
// packages/backend/src/middleware/auth.ts
export const criticalAuthMiddleware = async (c, next) => {
  const sessionId = c.req.header('X-Appwrite-Session')
  const userId = c.req.header('X-Appwrite-User-Id')
  
  // Validate session with Appwrite
  const isValid = await validateSession(sessionId)
  
  if (!isValid) {
    return c.json({ error: 'Invalid session' }, 401)
  }
  
  c.set('user', { id: userId })
  await next()
}
```

## Dashboard Links

- [API Shield Management](https://dash.cloudflare.com/?to=/:account/:zone/security/api_shield)
- [WAF Rules](https://dash.cloudflare.com/?to=/:account/:zone/security/waf)
- [Rate Limiting](https://dash.cloudflare.com/?to=/:account/:zone/security/rate-limit)
- [Analytics](https://dash.cloudflare.com/?to=/:account/:zone/analytics/overview)

## Next Steps

1. ✅ Upload `openapi-schema.yaml` via dashboard
2. ✅ Add critical endpoints manually
3. ✅ Configure rate limiting rules
4. ✅ Monitor for blocked requests
5. ✅ Consider upgrading to Pro for "log" mode + more features

## Cost: $0/month ✅

All these features are included in Cloudflare's generous free plan!

# Cloudflare API Shield - Free Plan Setup Summary

## ✅ What You CAN Do with Cloudflare Free Plan

### 1. Schema Validation ✅
- Upload OpenAPI schema to validate requests
- **Limit**: 5 schemas max, 200 kB total size
- **Action**: "Block" only (no log mode first)

### 2. Endpoint Management ✅
- Monitor up to 100 endpoints
- Track request counts, latency, error rates
- View performance metrics

### 3. Basic WAF & Rate Limiting ✅
- Configure rate limiting rules
- Add security headers
- Basic DDoS protection

## ❌ What's NOT Available on Free Plan

- JWT validation (needs Enterprise)
- mTLS authentication (needs Enterprise)
- API Discovery (needs Enterprise)
- "Log" mode for validation (needs Enterprise - free plan only has "block")
- Sequence Analytics (needs Enterprise)
- Sensitive Data Detection (needs Enterprise)

## Quick Start Guide

### Option 1: Cloudflare Dashboard (No Code)

1. **Upload Schema**
   - Go to: Security → API Shield → Schema Validation
   - Click "Upload Schema"
   - Select `openapi-schema.yaml`
   - Click "Save and Deploy"

2. **Add Endpoints Manually**
   - Go to: Security → API Shield → Endpoints
   - Click "Add endpoints" → "Manually add"
   - Add your critical endpoints:
     - `POST /api/games/roulette/bet`
     - `POST /api/games/cases/open`
     - `POST /api/games/stock-market/buy`
     - `GET /api/user/balance`

3. **Configure Rate Limiting**
   - Go to: Security → WAF → Rate limiting rules
   - Create rules for:
     - Auth endpoints: 5 requests/minute
     - Game betting: 30 requests/minute
     - User data: 60 requests/minute

### Option 2: Terraform (Automated)

```bash
# Set credentials
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ZONE_ID="your-zone-id"

# Initialize and apply
terraform init
terraform apply -var-file="cloudflare-api-shield-free.tf"
```

## Files Created

1. **`openapi-schema.yaml`** - OpenAPI schema for your API
2. **`cloudflare-api-shield-free.tf`** - Terraform config for free plan
3. **`cloudflare-free-plan-setup.md`** - Detailed setup guide
4. **`CLOUDFLARE-FREE-PLAN.md`** - This summary

## Important Notes

### Schema Validation
- **Action**: "Block" only (can't log first, then switch to block)
- **Risk**: Might block legitimate requests if schema is too strict
- **Solution**: Test thoroughly before deploying

### Authentication
- Free plan **cannot** validate JWT tokens
- Your **backend already handles this** via Appwrite sessions
- API Shield will still block requests without proper headers

### Rate Limiting
- Use Cloudflare Dashboard → WAF → Rate limiting rules
- Configure: 5/min auth, 30/min games, 60/min user data

## Monitoring

### View API Shield Activity
1. Go to: Security → API Shield → Endpoints
2. Click on an endpoint to see:
   - Request count
   - Latency
   - Error rate
   - Rate limiting recommendations

### View Blocked Requests
1. Go to: Analytics → Web Traffic
2. Filter by "Blocked" status
3. See which requests were blocked and why

## Testing

Test your schema after deployment:

```bash
# Valid request (should work)
curl -X POST https://tarkov.juanis.cool/api/games/roulette/bet \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Session: your-session" \
  -d '{"amount": 100, "betType": "straight", "betValue": "7"}'

# Invalid request (should be blocked)
curl -X POST https://tarkov.juanis.cool/api/games/roulette/bet \
  -H "Content-Type: application/json" \
  -d '{"amount": "invalid"}'
```

## Limitations Summary

| Feature | Free Plan | Pro Plan | Enterprise |
|---------|-----------|----------|------------|
| Schema validation | ✅ Block only | ✅ Block only | ✅ Log + Block |
| Endpoint monitoring | ✅ 100 endpoints | ✅ 250 endpoints | ✅ 10,000+ endpoints |
| Schema uploads | ✅ 5 schemas | ✅ 5 schemas | ✅ 10+ schemas |
| JWT validation | ❌ | ❌ | ✅ |
| API Discovery | ❌ | ❌ | ✅ |
| mTLS | ❌ | ❌ | ✅ |
| Rate limiting | ✅ Basic WAF | ✅ Basic WAF | ✅ Advanced |

## What You'll Get

Even on free plan, your API will have:

✅ **Schema Validation** - Block malformed requests  
✅ **Rate Limiting** - Protect against abuse  
✅ **Security Headers** - Protection against attacks  
✅ **Endpoint Monitoring** - Track performance  
✅ **SSL/TLS** - Free HTTPS  
✅ **DDoS Protection** - Basic protection  
✅ **CDN** - Global content delivery

**Cost: $0/month** 🎉

## Next Steps

1. Upload `openapi-schema.yaml` via Cloudflare Dashboard
2. Add critical endpoints manually
3. Configure rate limiting rules
4. Test your API
5. Monitor for blocked requests
6. Consider upgrading if you need "log" mode

## Resources

- [Free Plan Setup Guide](cloudflare-free-plan-setup.md)
- [OpenAPI Schema](openapi-schema.yaml)
- [Terraform Config](cloudflare-api-shield-free.tf)
- [Cloudflare Dashboard](https://dash.cloudflare.com)

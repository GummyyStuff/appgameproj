# Domain Configuration Updated

## ✅ Changes Made

All Cloudflare configuration files have been updated with your production domain: **`tarkov.juanis.cool`**

### Files Updated:
1. ✅ `openapi-schema.yaml` - Production server URL
2. ✅ `cloudflare-api-shield-free.tf` - Rate limiting configuration
3. ✅ `CLOUDFLARE-FREE-PLAN.md` - Test examples
4. ✅ `cloudflare-api-shield-setup.md` - All test examples
5. ✅ `cloudflare-free-plan-setup.md` - All test examples

## 📝 What Changed

### Before:
```yaml
servers:
  - url: https://your-domain.com/api
```

### After:
```yaml
servers:
  - url: https://tarkov.juanis.cool/api
```

## 🧪 Test Commands Ready

All test commands in the documentation now use your actual domain:

```bash
# Valid request test
curl -X POST https://tarkov.juanis.cool/api/games/roulette/bet \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Session: your-session" \
  -d '{"amount": 100, "betType": "straight", "betValue": "7"}'

# Invalid request test (should be blocked)
curl -X POST https://tarkov.juanis.cool/api/games/roulette/bet \
  -H "Content-Type: application/json" \
  -d '{"amount": "invalid"}'
```

## 🚀 Next Steps

1. Upload the OpenAPI schema to Cloudflare Dashboard
   - Go to: Security → API Shield → Schema Validation
   - Upload: `openapi-schema.yaml`
   
2. Your domain `tarkov.juanis.cool` is now properly configured

3. Test your API:
   ```bash
   curl https://tarkov.juanis.cool/api/health
   ```

## ✅ Ready to Deploy

All configuration files are now production-ready with your actual domain!

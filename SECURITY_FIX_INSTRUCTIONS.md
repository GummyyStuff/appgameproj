# Security Fix Instructions

## Problem
Supabase Security Advisor is showing "Function Search Path Mutable" warnings for multiple database functions. This is a security vulnerability that allows potential search path manipulation attacks.

## Solution
All database functions need to have `SET search_path = ''` added to their definitions to prevent search path manipulation.

## Functions That Need Fixing
Based on the security warnings, these functions need to be updated:

1. `public.get_game_history`
2. `public.cleanup_old_audit_logs`
3. `public.get_audit_statistics`
4. `public.detect_suspicious_activity`
5. `public.update_updated_at_column`
6. `public.get_user_balance`
7. `public.track_daily_bonus` (renamed to `claim_daily_bonus`)
8. `public.process_game_transaction`
9. `public.audit_trigger_function`
10. `public.get_leaderboard`
11. `public.handle_new_user`
12. `public.get_user_statistics`
13. `public.cleanup_old_case_opening_metrics`
14. `public.get_case_opening_system_health`

## How to Apply the Fix

### Option 1: Manual SQL Execution (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `packages/backend/src/database/migrations/008_fix_function_security.sql`
4. Execute the SQL

### Option 2: Individual Function Fixes
If you prefer to fix functions one by one, here are the key changes needed:

For each function, add `SET search_path = ''` after `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION function_name(...)
RETURNS ... 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''  -- ADD THIS LINE
AS $
-- function body
$;
```

Also ensure all table references use the `public.` schema prefix:
- `user_profiles` → `public.user_profiles`
- `game_history` → `public.game_history`
- `audit_logs` → `public.audit_logs`
- etc.

## Verification
After applying the fixes:

1. Go to Supabase Dashboard → Advisors → Security Advisor
2. Refresh the advisor
3. Verify that "Function Search Path Mutable" warnings are resolved

## Performance Advisor Warnings
The performance advisor warnings you showed indicate potential issues with:
- Multiple derivative policies on tables
- RLS policies that might need optimization

These are separate from the security warnings and may need additional investigation.

## Files Created
- `packages/backend/src/database/migrations/008_fix_function_security.sql` - Complete security fix migration
- `packages/backend/src/scripts/apply-security-fixes.ts` - Automated application script (requires manual SQL execution)

## Next Steps
1. Apply the security fixes using Option 1 above
2. Verify the security warnings are resolved
3. Address any remaining performance advisor warnings if needed
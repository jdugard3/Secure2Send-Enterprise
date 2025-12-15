# Deployment Checklist: Onboarding Progress Feature

## ⚠️ Migration Concerns for Fly.io

Based on your history with Fly.io database migrations, here's a safe deployment plan:

## Pre-Deployment Verification

### 1. Check Current Schema State
```bash
# SSH into Fly.io and check if columns exist
fly ssh console --app secure2send -C "psql \$DATABASE_URL -c \"SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('onboarding_step', 'password_reset_token', 'password_reset_token_expires_at', 'password_reset_requested_at');\""
```

### 2. Verify Schema File is Up-to-Date
✅ **CONFIRMED**: `shared/schema.ts` includes:
- `onboardingStep` field (line 137)
- `passwordResetToken` fields (lines 133-135)
- `onboardingStepEnum` enum (line 89)

## Deployment Strategy

### Option 1: Let `db:push` Handle It (Risky - Based on Past Issues)

**Pros:**
- Automatic during deployment
- No manual intervention needed

**Cons:**
- Can fail silently (as documented in `DATABASE_MIGRATION_ISSUES.md`)
- Enum creation might fail if enum already exists
- No guarantee columns will be added

**Steps:**
1. Merge branch to main
2. Deploy: `fly deploy`
3. **IMMEDIATELY** verify columns exist (see Post-Deployment Verification)

### Option 2: Manual SQL Migration First (Recommended - Safer)

**Pros:**
- Uses `IF NOT EXISTS` checks - safe to run multiple times
- Explicit control over what gets added
- Can verify before code deployment

**Cons:**
- Requires manual step
- Need to SSH into Fly.io

**Steps:**
1. **Before merging/deploying code:**
   ```bash
   # SSH into Fly.io
   fly ssh console --app secure2send
   
   # Connect to database
   psql $DATABASE_URL
   
   # Run migrations manually
   \i /app/migrations/013_add_password_reset.sql
   \i /app/migrations/016_add_onboarding_progress.sql
   
   # Verify
   \d users
   # Should see:
   # - password_reset_token
   # - password_reset_token_expires_at
   # - password_reset_requested_at
   # - onboarding_step
   ```

2. Then merge and deploy code

### Option 3: Hybrid Approach (Safest)

1. **Deploy code first** (with schema changes)
2. **Immediately verify** columns exist
3. **If missing**, run SQL migrations manually as backup

## Post-Deployment Verification

### Critical: Verify Columns Exist

```bash
# SSH into Fly.io
fly ssh console --app secure2send

# Run verification script (create this if it doesn't exist)
psql $DATABASE_URL << EOF
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN (
    'onboarding_step',
    'password_reset_token',
    'password_reset_token_expires_at',
    'password_reset_requested_at'
  )
ORDER BY column_name;
EOF
```

**Expected Output:**
```
      column_name                    | data_type | column_default
-------------------------------------+-----------+---------------
 onboarding_step                    | USER-DEFINED | 'PART1'::onboarding_step
 password_reset_requested_at        | timestamp without time zone |
 password_reset_token                | text |
 password_reset_token_expires_at     | timestamp without time zone |
```

### Verify Enum Exists

```bash
psql $DATABASE_URL -c "SELECT typname FROM pg_type WHERE typname = 'onboarding_step';"
```

**Expected Output:**
```
   typname
---------------
 onboarding_step
```

### Verify Indexes Exist

```bash
psql $DATABASE_URL -c "\d users" | grep -E "(onboarding_step|password_reset)"
```

Should see:
- `idx_users_onboarding_step`
- `idx_users_password_reset_token`

## If Migrations Fail

### Emergency Fix Script

If `db:push` fails silently and columns are missing:

```bash
# SSH into Fly.io
fly ssh console --app secure2send

# Connect to database
psql $DATABASE_URL

# Run SQL migrations manually
\i /app/migrations/013_add_password_reset.sql
\i /app/migrations/016_add_onboarding_progress.sql

# Verify again
\d users
```

## Migration Safety Notes

✅ **Good News:**
- Both SQL migrations use `IF NOT EXISTS` - safe to run multiple times
- Enum creation uses `DO $$ BEGIN ... EXCEPTION` - won't fail if enum exists
- Column additions use `ADD COLUMN IF NOT EXISTS` - won't fail if column exists

⚠️ **Potential Issues:**
- `db:push` might try to create enum before columns, causing conflicts
- Network timeouts during deployment could cause partial migrations
- Enum creation might fail silently if there's a type mismatch

## Recommended Deployment Order

1. ✅ **Pre-deployment**: Check current schema state
2. ✅ **Deploy code**: Merge branch and deploy
3. ✅ **Immediately verify**: Check columns exist (within 5 minutes)
4. ✅ **If missing**: Run SQL migrations manually
5. ✅ **Test feature**: Verify onboarding progress bar works

## Rollback Plan

If something goes wrong:

1. **Code rollback**: Revert to previous commit
2. **Database**: Columns can stay (they won't break old code)
3. **Deploy previous version**: `fly deploy --image <previous-image>`

## Testing Checklist

After deployment, test:
- [ ] New user signup gets `onboarding_step = 'PART1'`
- [ ] Progress bar shows in sidebar
- [ ] Clicking "New Application" resets to PART1
- [ ] Password reset flow works (if using that feature)
- [ ] Multiple applications can be created

---

**Remember**: Based on `DATABASE_MIGRATION_ISSUES.md`, `db:push` has failed silently before. Always verify migrations succeeded!

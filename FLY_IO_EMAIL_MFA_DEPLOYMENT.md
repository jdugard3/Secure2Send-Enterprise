# Fly.io Email MFA Deployment Guide

## 🚀 Deployment Steps

### 1. Deploy to Fly.io

```bash
fly deploy
```

This will automatically:
- Build your application
- Run `npm run db:push` (from `release_command` in fly.toml)
- Apply schema changes from `shared/schema.ts`
- Start the application

### 2. Verify Database Schema

After deployment, SSH into your fly.io instance and run the verification script:

```bash
# SSH into fly.io
fly ssh console

# Navigate to app directory (usually /app)
cd /app

# Run verification script
node dist/scripts/verify-email-mfa-db.js
```

**Expected Output:**
```
🔍 Verifying Email MFA Database Schema...

📋 Checking Email MFA Columns:
  ✅ mfa_email_enabled
  ✅ mfa_email_otp
  ✅ mfa_email_otp_expires_at
  ✅ mfa_email_otp_attempts
  ✅ mfa_email_last_sent_at
  ✅ mfa_email_send_count
  ✅ mfa_email_rate_limit_reset_at

📊 Checking Email MFA Indexes:
  ✅ idx_users_mfa_email_enabled
  ✅ idx_users_mfa_email_last_sent
  ✅ idx_users_mfa_email_otp
  ✅ idx_users_mfa_email_otp_expires
  ✅ idx_users_mfa_status

✨ Email MFA Schema Verification Complete!
🎉 All required email MFA columns exist!
```

### 3. Manual Migration (If Needed)

If the verification script shows missing columns or indexes, run migrations manually:

```bash
# SSH into fly.io
fly ssh console

# Connect to PostgreSQL
fly postgres connect -a <your-postgres-app-name>

# Or use the connection string
psql $DATABASE_URL

# Run migrations
\i /app/migrations/009_add_email_mfa.sql
\i /app/migrations/009_add_email_mfa_indexes.sql

# Verify
\d users
```

### 4. Check Application Logs

```bash
# View logs
fly logs

# Look for:
# - ✅ "Database connected successfully"
# - ✅ "Server started on port 3000"
# - ❌ Any database errors
```

### 5. Test Email MFA

1. **Visit your app**: `https://secure2send.fly.dev` (or your domain)
2. **Create new account** - Should default to Email MFA
3. **Check email** - You should receive OTP code
4. **Verify MFA works** - Enter code and complete setup
5. **Check admin dashboard** - Verify MFA badges show correctly

## 🔧 Troubleshooting

### Problem: Columns Missing

**Solution:**
```bash
fly ssh console
cd /app
cat migrations/009_add_email_mfa.sql | psql $DATABASE_URL
```

### Problem: Indexes Missing

**Solution:**
```bash
fly ssh console
cd /app
cat migrations/009_add_email_mfa_indexes.sql | psql $DATABASE_URL
```

### Problem: Email OTP Not Sending

**Check:**
1. Mailgun secrets are set: `fly secrets list`
2. Should see: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`
3. Check logs: `fly logs | grep -i mailgun`

**Set secrets if missing:**
```bash
fly secrets set MAILGUN_API_KEY="your-key"
fly secrets set MAILGUN_DOMAIN="your-domain"
fly secrets set MAILGUN_FROM_EMAIL="noreply@your-domain.com"
```

### Problem: Database Connection Error

**Check connection:**
```bash
# Get database connection info
fly postgres connect -a <postgres-app-name>

# Or check secrets
fly secrets list | grep DATABASE_URL
```

## 📊 Health Checks

### Quick Database Check
```bash
# From local machine
fly ssh console -C "psql \$DATABASE_URL -c \"SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE 'mfa_email%';\""
```

### Quick App Health Check
```bash
curl https://secure2send.fly.dev/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📝 Post-Deployment Checklist

- [ ] App deployed successfully
- [ ] Database schema verified (all columns exist)
- [ ] Indexes created (performance optimization)
- [ ] Email OTP sending works
- [ ] New user can setup email MFA
- [ ] Login with email MFA works
- [ ] Admin dashboard shows MFA badges
- [ ] Settings page shows correct MFA status

## 🎯 Quick Verification Command

Run this single command to verify everything:

```bash
fly ssh console -C "cd /app && tsx scripts/verify-email-mfa-db.ts"
```

## 📞 Need Help?

If verification fails:
1. Check logs: `fly logs`
2. SSH in: `fly ssh console`
3. Check database: `psql $DATABASE_URL`
4. Run migrations manually (see above)

---

**Note:** The `release_command` in `fly.toml` automatically runs `npm run db:push` on every deployment, so schema changes should be applied automatically. Manual migration is only needed if drizzle-kit doesn't pick up the changes.


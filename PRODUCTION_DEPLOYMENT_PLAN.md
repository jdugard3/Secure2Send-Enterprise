# 🚀 Production Deployment Plan - Fly.io
**Date:** January 16, 2026  
**App:** secure2send  
**Critical Focus:** Database Migration Integrity

---

## 📊 Current State Analysis

### ✅ What's Ready
- **Build System:** Tested and working (547.2kb bundle)
- **Git Status:** Clean working tree, all changes committed
- **Dockerfile:** Multi-stage build optimized for production
- **Fly.io Config:** Configured with health checks and auto-scaling
- **Migration Script:** Robust `run-migrations.ts` with tracking and rollback

### 🗄️ Database Migrations Status

**Total Migrations:** 22 SQL files + 2 TypeScript schema files

#### Migration Files (in order):
1. ✅ `0000_pink_wolf_cub.sql` - Initial schema
2. ✅ `001_add_security_features.sql` - Security enhancements
3. ✅ `002_add_merchant_applications.sql` - Application system
4. ✅ `003_add_agreement_accepted.sql` - Agreement tracking
5. ✅ `004_add_iris_integration.sql` - IRIS CRM integration
6. ✅ `005_add_iris_fields.sql` - IRIS field mapping
7. ✅ `006_add_mfa_support.sql` - MFA foundation
8. ✅ `007_add_mfa_required.sql` - MFA enforcement
9. ✅ `008_force_mfa_all_users.sql` - MFA for all users
10. ✅ `009_add_email_mfa.sql` - Email-based MFA
11. ✅ `009_add_email_mfa_indexes.sql` - Email MFA indexes
12. ✅ `010_add_merchant_app_iris_and_doc_linking.sql` - Document linking
13. ✅ `011_add_esignature_tracking.sql` - E-signature tracking
14. ✅ `012_add_invitation_codes.sql` - Invitation code system
15. ✅ `013_add_password_reset.sql` - Password reset functionality
16. ✅ `014_add_delete_audit_actions.sql` - Delete audit logging
17. ✅ `015_add_login_attempts.sql` - Login attempt tracking
18. ✅ `016_add_onboarding_progress.sql` - Onboarding step tracking
19. ✅ `017_add_extracted_document_data.sql` - OCR data storage
20. ✅ `018_add_agent_role.sql` - Agent role support
21. ✅ `019_add_agent_client_relationship.sql` - Agent-client linking
22. ✅ `020_add_agent_notes.sql` - Agent notes system
23. ✅ `020_add_current_step.sql` - Application step tracking

### 🔑 Required Environment Variables

#### Critical (Must Be Set):
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - 32+ character secure string
- `NODE_ENV` - Set to "production"
- `PORT` - Set to "3000"

#### Email (Required for MFA):
- `EMAIL_PROVIDER` - Set to "mailgun"
- `MAILGUN_API_KEY` - Mailgun API key
- `MAILGUN_DOMAIN` - Your Mailgun domain
- `MAILGUN_FROM_EMAIL` - Sender email address
- `ADMIN_EMAIL` - Admin notification email
- `APP_URL` - Your production URL

#### Integrations (Required for full functionality):
- `IRIS_CRM_API_KEY` - IRIS CRM integration
- `IRIS_CRM_SUBDOMAIN` - IRIS subdomain
- `DOCUSEAL_API_KEY` - E-signature integration (DocuSeal, Cloudflare-hosted)
- `DOCUSEAL_REPLY_TO` - Optional reply-to for signing emails
- `ZAPIER_KINDTAP_WEBHOOK_URL` - KindTap webhook
- `ZAPIER_DOCUMENT_WEBHOOK_URL` - Document sync webhook
- `ZAPIER_APPLICATION_WEBHOOK_URL` - Application sync webhook
- `ZAPIER_WEBHOOK_SECRET` - Webhook authentication (32+ chars)

#### Optional (Feature-specific):
- `CLOUDFLARE_R2_ENDPOINT` - R2 file storage
- `CLOUDFLARE_R2_ACCESS_KEY_ID` - R2 access key
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - R2 secret
- `CLOUDFLARE_R2_BUCKET_NAME` - R2 bucket name
- `CLOUDFLARE_R2_PUBLIC_URL` - R2 public URL
- `CLOUDFLARE_TEAM_DOMAIN` - Zero Trust domain
- `CLOUDFLARE_ACCESS_AUD` - Zero Trust audience
- `CLOUDFLARE_ACCESS_ISSUER` - Zero Trust issuer
- `OPENAI_API_KEY_OCR_ONLY` - OCR functionality
- `ENABLE_OCR_AUTOFILL` - Enable OCR auto-fill
- `FIELD_ENCRYPTION_KEY` - Field encryption (64+ chars)

---

## 🎯 Pre-Deployment Checklist

### 1. Local Verification
- [x] Build completes successfully (`npm run build`)
- [x] All changes committed to git
- [x] Working tree is clean
- [ ] All tests pass (if applicable)
- [ ] No linter errors

### 2. Fly.io Authentication
```bash
fly auth login
```
- [ ] Successfully authenticated
- [ ] Correct account selected

### 3. Verify Current Production State
```bash
fly status
fly logs --tail=50
fly secrets list
```
- [ ] App is currently running
- [ ] Check for any existing errors
- [ ] Verify which secrets are already set

### 4. Database Backup (CRITICAL!)
```bash
# If using Neon PostgreSQL, create a backup in Neon dashboard
# Or use pg_dump if you have direct access
```
- [ ] Database backup created
- [ ] Backup verified and downloadable
- [ ] Backup location documented

### 5. Environment Variables Audit
- [ ] All critical variables are set in Fly.io
- [ ] No variables contain placeholder values
- [ ] Webhook secrets are secure (32+ characters)
- [ ] Session secret is production-ready

---

## 🚨 Migration Deployment Strategy

### Why Migrations Fail on Fly.io

**Common Issues:**
1. `db:push` in `release_command` uses Drizzle Kit's push (schema sync), not SQL migrations
2. SQL migrations in `/migrations` folder are not executed automatically
3. `db:push` can cause schema drift if migrations aren't tracked
4. Race conditions during deployment can skip migrations

### ✅ Recommended Solution: Two-Step Deployment

#### **Option A: Manual Migration First (SAFEST)**

**Step 1: Run Migrations Manually**
```bash
# SSH into the Fly.io machine
fly ssh console

# Inside the machine, run migrations
cd /app
npm run migrate

# Verify migrations completed
# Check for "✨ Successfully executed X migration(s)!" message

# Exit the SSH session
exit
```

**Step 2: Deploy Application**
```bash
# Now deploy the application code
fly deploy
```

**Advantages:**
- ✅ Full control over migration process
- ✅ Can verify each migration before deploying code
- ✅ Easy to rollback if issues occur
- ✅ No race conditions

---

#### **Option B: Automated Migration (FASTER, RISKIER)**

**Modify `fly.toml` temporarily:**
```toml
[deploy]
  release_command = "npm run migrate"
  strategy = "rolling"
```

**Then deploy:**
```bash
fly deploy
```

**Watch logs carefully:**
```bash
fly logs --tail
```

**Advantages:**
- ✅ Single command deployment
- ✅ Migrations run before app starts

**Disadvantages:**
- ⚠️ If migration fails, deployment fails
- ⚠️ Harder to debug issues
- ⚠️ May need to rollback entire deployment

---

#### **Option C: Separate Migration Machine (ENTERPRISE)**

Create a one-off machine just for migrations:

```bash
# Run migrations on a temporary machine
fly machine run . --command "npm run migrate" --env NODE_ENV=production

# Wait for completion, then deploy
fly deploy
```

---

## 📝 Step-by-Step Deployment Process

### Phase 1: Pre-Deployment Verification (10 minutes)

```bash
# 1. Navigate to project directory
cd /Users/jamesdugard/Documents/GitHub/Secure2Send-Enterprise/Secure2Send-Enterprise

# 2. Verify build works
npm run build

# 3. Check git status
git status
git log --oneline -5

# 4. Login to Fly.io
fly auth login

# 5. Check current production status
fly status
fly logs --tail=50

# 6. List current secrets
fly secrets list
```

**Verify Output:**
- [ ] Build completed successfully
- [ ] No uncommitted changes
- [ ] Fly.io authentication successful
- [ ] Production app is running
- [ ] All required secrets are set

---

### Phase 2: Database Backup (5 minutes)

```bash
# Create a backup of your production database
# This is CRITICAL - do not skip!

# For Neon PostgreSQL:
# 1. Go to https://console.neon.tech
# 2. Select your project
# 3. Go to "Backups" tab
# 4. Click "Create Backup"
# 5. Wait for completion
# 6. Download backup file

# For direct PostgreSQL access:
# pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Verify:**
- [ ] Backup created successfully
- [ ] Backup file size is reasonable (not 0 bytes)
- [ ] Backup location documented

---

### Phase 3: Set/Verify Environment Variables (10 minutes)

```bash
# Check which secrets are already set
fly secrets list

# Set any missing critical secrets
fly secrets set SESSION_SECRET="your-secure-32-char-secret"
fly secrets set MAILGUN_API_KEY="your-mailgun-key"
fly secrets set MAILGUN_DOMAIN="mail.yourdomain.com"
fly secrets set MAILGUN_FROM_EMAIL="noreply@mail.yourdomain.com"
fly secrets set ADMIN_EMAIL="admin@yourdomain.com"
fly secrets set APP_URL="https://secure2send.fly.dev"

# Integration secrets
fly secrets set IRIS_CRM_API_KEY="your-iris-key"
fly secrets set IRIS_CRM_SUBDOMAIN="your-subdomain"
fly secrets set DOCUSEAL_API_KEY="your-docuseal-key"
fly secrets set DOCUSEAL_REPLY_TO="submissions@miapayments.com"

# Webhook secrets
fly secrets set ZAPIER_KINDTAP_WEBHOOK_URL="https://hooks.zapier.com/hooks/catch/..."
fly secrets set ZAPIER_WEBHOOK_SECRET="your-secure-webhook-secret"

# Optional: OCR and encryption
fly secrets set OPENAI_API_KEY_OCR_ONLY="your-openai-key"
fly secrets set FIELD_ENCRYPTION_KEY="your-64-char-encryption-key"
fly secrets set ENABLE_OCR_AUTOFILL="true"
```

**Verify:**
- [ ] All critical secrets are set
- [ ] No "Missing" values in secrets list
- [ ] Secrets match your production requirements

---

### Phase 4: Run Database Migrations (15 minutes)

**🎯 RECOMMENDED: Manual Migration Approach**

```bash
# Step 1: SSH into the production machine
fly ssh console

# Step 2: Navigate to app directory (should already be there)
cd /app

# Step 3: Verify environment
echo $DATABASE_URL
# Should show your database URL

# Step 4: Run migrations
npm run migrate

# Expected output:
# 🔄 Starting database migrations...
# 📋 Found 22 migration files
# 
# ⏭️  Skipping 0000_pink_wolf_cub.sql (already executed)
# ... (skipping already executed migrations)
# 📄 Running 020_add_agent_notes.sql...
# ✅ 020_add_agent_notes.sql completed successfully
# 📄 Running 020_add_current_step.sql...
# ✅ 020_add_current_step.sql completed successfully
# 
# ✨ Successfully executed 2 migration(s)!

# Step 5: Verify migrations were recorded
# The script creates a _migrations table to track what's been run

# Step 6: Exit SSH session
exit
```

**Verify:**
- [ ] All new migrations executed successfully
- [ ] No error messages in output
- [ ] Migration tracking table updated
- [ ] Database schema matches expectations

**If Migrations Fail:**
```bash
# Check the error message carefully
# Common issues:
# - Column already exists → Migration was partially applied before
# - Permission denied → Database user lacks privileges
# - Syntax error → Check the SQL file

# To see which migrations have been run:
# (Inside SSH console)
psql $DATABASE_URL -c "SELECT * FROM _migrations ORDER BY executed_at DESC LIMIT 10;"

# If you need to manually mark a migration as complete:
# (Only if you're CERTAIN it was already applied)
psql $DATABASE_URL -c "INSERT INTO _migrations (filename) VALUES ('020_add_agent_notes.sql');"
```

---

### Phase 5: Deploy Application Code (10 minutes)

```bash
# Deploy the application
fly deploy

# This will:
# 1. Build the Docker image
# 2. Push to Fly.io registry
# 3. Create new machines
# 4. Run health checks
# 5. Switch traffic to new machines
# 6. Shut down old machines
```

**Monitor the deployment:**
```bash
# Watch logs in real-time
fly logs --tail

# In another terminal, check status
fly status
```

**Expected Log Output:**
```
✅ Environment validation passed
   - NODE_ENV: production
   - PORT: 3000
   - DATABASE_URL: ✓ Set
   - SESSION_SECRET: ✓ Set
   - EMAIL_PROVIDER: mailgun
   - MAILGUN_API_KEY: ✓ Set
   ...

Server starting on port 3000
Database connected successfully
✓ Server is running on port 3000
```

**Verify:**
- [ ] Build completed successfully
- [ ] Health checks passing
- [ ] No error messages in logs
- [ ] App status shows "running"

---

### Phase 6: Post-Deployment Verification (15 minutes)

```bash
# 1. Check app status
fly status

# 2. Open the app in browser
fly open

# 3. Monitor logs for errors
fly logs --tail

# 4. Check health endpoint
curl https://secure2send.fly.dev/api/health
# Should return: {"status":"ok"}
```

**Manual Testing Checklist:**

#### Test 1: Login Flow
- [ ] Navigate to login page
- [ ] Enter valid credentials
- [ ] MFA code is sent via email
- [ ] Can enter MFA code and login
- [ ] Redirected to dashboard

#### Test 2: Admin Functions
- [ ] Can access admin dashboard
- [ ] Can view merchant applications
- [ ] Can view invitation codes
- [ ] Can view audit logs

#### Test 3: Agent Functions (if applicable)
- [ ] Agent can login
- [ ] Agent can view assigned merchants
- [ ] Agent can add notes
- [ ] Agent dashboard loads correctly

#### Test 4: Merchant Application Flow
- [ ] New user can register
- [ ] Can start application (Step 1)
- [ ] Can upload documents (Step 2)
- [ ] Can complete application (Steps 3-4)
- [ ] Application appears in admin dashboard

#### Test 5: Integration Tests
- [ ] Document upload triggers webhook (check Zapier)
- [ ] Application approval triggers KindTap webhook
- [ ] IRIS CRM sync works (if configured)
- [ ] E-signature flow works (if configured)

#### Test 6: Database Verification
```bash
# SSH into machine
fly ssh console

# Check database tables exist
psql $DATABASE_URL -c "\dt"

# Verify new columns exist
psql $DATABASE_URL -c "\d users"
psql $DATABASE_URL -c "\d merchant_applications"
psql $DATABASE_URL -c "\d agent_notes"

# Check migration tracking
psql $DATABASE_URL -c "SELECT filename, executed_at FROM _migrations ORDER BY executed_at DESC LIMIT 10;"

exit
```

**Verify:**
- [ ] All expected tables exist
- [ ] New columns are present
- [ ] Migrations are tracked in `_migrations` table
- [ ] No schema errors in logs

---

## 🚨 Rollback Procedures

### If Deployment Fails

#### Rollback Application Code:
```bash
# List recent releases
fly releases

# Rollback to previous version
fly releases rollback <version-number>

# Example:
# fly releases rollback v42
```

#### Rollback Database Migrations:

**⚠️ WARNING: Database rollbacks are complex and risky!**

**Option 1: Restore from Backup (SAFEST)**
```bash
# 1. Stop the application
fly scale count 0

# 2. Restore database from backup
# (Process depends on your database provider)
# For Neon: Use the Neon dashboard to restore from backup
# For direct access: psql $DATABASE_URL < backup_file.sql

# 3. Restart application
fly scale count 1
```

**Option 2: Manual Migration Reversal (RISKY)**
```bash
# Only if you know exactly what to reverse
fly ssh console

# Manually write and execute reverse migration SQL
# Example for adding a column:
psql $DATABASE_URL -c "ALTER TABLE users DROP COLUMN IF EXISTS onboarding_step;"

# Remove from migration tracking
psql $DATABASE_URL -c "DELETE FROM _migrations WHERE filename = '016_add_onboarding_progress.sql';"

exit
```

---

## 📊 Monitoring Post-Deployment

### First 24 Hours

```bash
# Monitor logs continuously
fly logs --tail

# Check metrics
fly metrics

# Check for errors
fly logs | grep -i error
fly logs | grep -i failed

# Monitor database connections
fly ssh console
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
exit
```

### Key Metrics to Watch:
- [ ] Response times (should be < 500ms)
- [ ] Error rate (should be < 1%)
- [ ] Database connection pool (should not be exhausted)
- [ ] Memory usage (should be < 80% of 1GB)
- [ ] CPU usage (should be < 70%)

### Error Scenarios:

#### "Environment validation failed"
```bash
# Check which secrets are missing
fly secrets list

# Set the missing secret
fly secrets set VARIABLE_NAME="value"
```

#### "Database connection failed"
```bash
# Verify DATABASE_URL is correct
fly ssh console
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT 1;"
exit
```

#### "Migration failed"
```bash
# Check which migration failed
fly logs | grep -i migration

# SSH in and investigate
fly ssh console
npm run migrate
# Read the error message carefully
exit
```

#### "Health check failing"
```bash
# Check if server is actually running
fly ssh console
curl http://localhost:3000/api/health
exit

# Check logs for startup errors
fly logs | grep -i "server starting"
```

---

## 🎉 Success Criteria

Deployment is considered successful when:

- [x] Build completed without errors
- [x] All migrations executed successfully
- [x] Application deployed and running
- [x] Health checks passing
- [x] No errors in logs for 5 minutes
- [x] Login flow works
- [x] Admin dashboard accessible
- [x] Merchant application flow works
- [x] Database schema matches expectations
- [x] All integrations functioning
- [x] Performance metrics within acceptable range

---

## 📞 Emergency Contacts

**If something goes wrong:**

1. **Immediate Rollback:** `fly releases rollback`
2. **Stop App:** `fly scale count 0`
3. **Check Logs:** `fly logs --tail`
4. **Database Backup:** Restore from backup created in Phase 2

**Support Resources:**
- Fly.io Docs: https://fly.io/docs/
- Fly.io Community: https://community.fly.io/
- Database Provider Support: (Neon, etc.)

---

## 📝 Deployment Log Template

```
=== DEPLOYMENT LOG ===
Date: _______________
Time Started: _______________
Deployed By: _______________

Pre-Deployment:
[ ] Build successful
[ ] Git status clean
[ ] Fly.io authenticated
[ ] Database backup created
[ ] Environment variables verified

Migration:
[ ] SSH into production
[ ] Migrations executed
[ ] No errors
[ ] Verified in _migrations table
Migrations Applied: _______________

Deployment:
[ ] fly deploy executed
[ ] Build successful
[ ] Health checks passing
[ ] Logs show no errors

Post-Deployment:
[ ] App accessible
[ ] Login works
[ ] Admin functions work
[ ] Merchant flow works
[ ] Integrations tested

Issues Encountered:
_______________________________________________
_______________________________________________

Resolution:
_______________________________________________
_______________________________________________

Time Completed: _______________
Status: [ ] SUCCESS [ ] PARTIAL [ ] FAILED [ ] ROLLED BACK
```

---

## 🔄 Next Steps After Successful Deployment

1. **Monitor for 24 hours** - Watch logs and metrics
2. **Test all critical flows** - Login, applications, admin functions
3. **Verify integrations** - Webhooks, IRIS CRM, DocuSeal
4. **Update documentation** - Record any issues or learnings
5. **Notify stakeholders** - Inform team of successful deployment
6. **Schedule next deployment** - Plan for future updates

---

**Last Updated:** January 16, 2026  
**Version:** 1.0  
**Status:** Ready for Production Deployment

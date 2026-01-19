# 🚀 Quick Start Deployment Guide

**For experienced deployers who know what they're doing.**

See `PRODUCTION_DEPLOYMENT_PLAN.md` for detailed instructions.

---

## ⚡ 5-Minute Deployment (Recommended Approach)

### Prerequisites
- [ ] Fly.io CLI installed
- [ ] Authenticated: `fly auth login`
- [ ] Database backup created

### Step 1: Verify Build (30 seconds)
```bash
cd /Users/jamesdugard/Documents/GitHub/Secure2Send-Enterprise/Secure2Send-Enterprise
npm run build
```

### Step 2: Check Production Status (30 seconds)
```bash
fly status
fly secrets list
```

### Step 3: Run Migrations Manually (2 minutes)
```bash
fly ssh console
npm run migrate
# Wait for "✨ Successfully executed X migration(s)!"
exit
```

### Step 4: Deploy (2 minutes)
```bash
fly deploy
```

### Step 5: Verify (1 minute)
```bash
fly open
fly logs --tail
```

---

## 🎯 What Gets Deployed

### New Features Since Last Deploy:
1. **Agent Portal (Phases 2-4)**
   - Agent notes system
   - Agent analytics
   - Agent-merchant relationships
   - Search and filtering

2. **Global Application Switcher**
   - Context-aware application selection
   - Persistent state management

3. **4-Step Application Flow**
   - Improved UX with step tracking
   - Current step persistence
   - Better validation

4. **OCR Improvements**
   - Auto-fill extracted data
   - Removed confidence threshold
   - Better field mapping

### Database Changes:
- `agent_notes` table (agent notes)
- `agent_id` column in `clients` table (agent-client relationship)
- `current_step` column in `merchant_applications` (step tracking)
- `onboarding_step` column in `users` (onboarding progress)
- `extracted_document_data` table (OCR data)
- `login_attempts` table (security)
- `invitation_codes` table (invitation system)
- New ENUM values for `user_role` (AGENT)
- New audit action types

---

## 🚨 Critical Environment Variables

### Must Be Set:
```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set SESSION_SECRET="32-char-minimum"
fly secrets set MAILGUN_API_KEY="key-..."
fly secrets set MAILGUN_DOMAIN="mail.yourdomain.com"
fly secrets set APP_URL="https://secure2send.fly.dev"
```

### Recommended:
```bash
fly secrets set IRIS_CRM_API_KEY="..."
fly secrets set SIGNNOW_API_KEY="..."
fly secrets set ZAPIER_KINDTAP_WEBHOOK_URL="https://hooks.zapier.com/..."
fly secrets set ZAPIER_WEBHOOK_SECRET="32-char-minimum"
```

---

## 🔍 Quick Verification Commands

```bash
# Check app status
fly status

# View recent logs
fly logs --tail=50

# Check health endpoint
curl https://secure2send.fly.dev/api/health

# Verify migrations
fly ssh console
psql $DATABASE_URL -c "SELECT filename FROM _migrations ORDER BY executed_at DESC LIMIT 5;"
exit
```

---

## 🆘 Quick Troubleshooting

### Deployment Failed
```bash
fly releases rollback
```

### Migrations Failed
```bash
fly ssh console
npm run migrate
# Read error message
exit
```

### App Won't Start
```bash
fly logs | grep -i error
fly secrets list  # Check for missing secrets
```

### Health Check Failing
```bash
fly ssh console
curl http://localhost:3000/api/health
exit
```

---

## ✅ Success Checklist

- [ ] Build completed
- [ ] Migrations executed (no errors)
- [ ] Deployment successful
- [ ] Health checks passing
- [ ] Can login to app
- [ ] Admin dashboard works
- [ ] No errors in logs

---

## 📊 Monitoring (First Hour)

```bash
# Watch logs
fly logs --tail

# Check metrics
fly metrics

# Look for errors
fly logs | grep -i "error\|failed"
```

---

**Need Help?** See `PRODUCTION_DEPLOYMENT_PLAN.md` for detailed instructions.

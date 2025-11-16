# Fly.io Deployment Guide - Pricing Feature Update

## 🚀 Quick Deployment (No Database Changes Required)

This deployment adds the pricing terms feature and webhook security. 
**Good news:** No database migrations needed - we're using existing JSONB fields!

---

## Step 1: Generate Production Webhook Secret

```bash
# Generate a secure token
openssl rand -hex 32
```

**Copy the output** - you'll need it in Step 2.

Example output:
```
a7f3e9c2b8d4f1a6e5c9d7b3f8a2e6c4d9f1a7e3b5c8d2f6a9e4c7b1f3d8a5e2
```

---

## Step 2: Set Environment Variables on Fly.io

```bash
# Login to Fly.io (if not already logged in)
fly auth login

# Make sure you're in the right app directory
cd /Users/jamesdugard/Documents/GitHub/Secure2Send-Enterprise/Secure2Send-Enterprise

# Check your app name
fly status

# Set the KindTap webhook URL
fly secrets set ZAPIER_KINDTAP_WEBHOOK_URL="https://hooks.zapier.com/hooks/catch/24656561/u8ijsc1/"

# Set your generated webhook secret (replace with YOUR token from Step 1)
fly secrets set ZAPIER_WEBHOOK_SECRET="a7f3e9c2b8d4f1a6e5c9d7b3f8a2e6c4d9f1a7e3b5c8d2f6a9e4c7b1f3d8a5e2"
```

**Note:** Replace the token in the second command with YOUR generated token from Step 1!

---

## Step 3: Push Your Code to Git (if not already)

```bash
# Check git status
git status

# Push all commits to your repository
git push origin main
```

---

## Step 4: Deploy to Fly.io

```bash
# Deploy the application
fly deploy
```

This will:
- Build your application
- Deploy new code
- Restart with new environment variables
- **No database changes needed!**

---

## Step 5: Verify Deployment

```bash
# Check deployment status
fly status

# Check logs to see if app started successfully
fly logs

# Open the app in browser
fly open
```

Look for these log messages:
- ✅ `Environment validation passed`
- ✅ `ZAPIER_KINDTAP_WEBHOOK_URL: ✓ Set`
- ✅ `ZAPIER_WEBHOOK_SECRET: (hidden)`
- ✅ Server started successfully

---

## Step 6: Update Zapier Filter with Production Token

**Important:** Now update your Zapier Filter to use the same token!

1. Go to: https://zapier.com/app/zaps
2. Find your **KindTap Zap**
3. Edit the **Filter by Zapier** step
4. Change the value to your **production token** (same one from Step 2)
5. **Save** and **Turn ON** the Zap

---

## Step 7: Test the Complete Flow

1. Log into your **production app** (on Fly.io)
2. Navigate to **Admin → Merchant Applications**
3. Find a **SUBMITTED** application (or create a test one)
4. Click **"Approve"**
5. Fill in the **Pricing Terms** modal:
   - Other Services: Qualification, Disc Fee %, Per Item $
   - Surcharge: Consumer, Disc Fee %, Per Item $, Min Fee
   - Fees: Qualification, Disc Fee %, Per Item $
6. Check **"Send to KindTap"**
7. Click **"Approve Application"**

### ✅ Expected Results:
- Application status changes to APPROVED
- Pricing data saved to database
- Webhook sent to Zapier
- Zapier Filter passes (correct token)
- Documents uploaded to Box.com
- PDF includes pricing on page 3

### 🔍 Verify in Zapier:
- Go to: https://zapier.com/app/history
- Look for your latest webhook
- Should show: ✅ "Successful" (not filtered out)
- Check Box.com for uploaded files

---

## 🆘 Troubleshooting

### **Issue: "Environment validation failed"**

```bash
# Check which secrets are set
fly secrets list

# Make sure these are set:
# - DATABASE_URL
# - SESSION_SECRET
# - ZAPIER_KINDTAP_WEBHOOK_URL
# - ZAPIER_WEBHOOK_SECRET
```

### **Issue: "Webhook not working"**

```bash
# Check logs for webhook errors
fly logs --app your-app-name | grep -i "webhook\|kindtap"

# Verify the secret is set correctly
fly secrets list | grep ZAPIER
```

### **Issue: Zapier Filter blocking requests**

1. Check Zapier History: https://zapier.com/app/history
2. Look at the filtered request
3. Check the `auth_token` value in the webhook data
4. Make sure it matches your Filter value exactly
5. Check for extra spaces or line breaks

### **Issue: Pricing not showing in PDF**

```bash
# Check logs when PDF is generated
fly logs | grep -i "pricing\|pdf"

# Look for:
# - "Filling PDF for application"
# - "Pricing terms filled successfully"
```

---

## 📋 What Was Deployed

### **New Features:**
- ✅ Pricing Terms Modal (appears on approval)
- ✅ Pricing data stored in `fee_schedule_data` JSONB field
- ✅ PDF generation includes pricing (page 3)
- ✅ KindTap webhook includes pricing
- ✅ Webhook security with token authentication

### **Files Changed:**
- `client/src/components/admin/PricingTermsModal.tsx` (new)
- `client/src/components/admin/merchant-applications-list.tsx`
- `client/src/lib/merchantApplicationSchemas.ts`
- `server/routes.ts`
- `server/services/pdfFillService.ts`
- `server/services/irisCrmService.ts`
- `server/env.ts`

### **Database Changes:**
- ❌ None! Using existing `fee_schedule_data` JSONB column

### **Environment Variables Added:**
- `ZAPIER_KINDTAP_WEBHOOK_URL`
- `ZAPIER_WEBHOOK_SECRET`

---

## 🔐 Security Notes

- **Webhook URL** moved from code to environment variable
- **Secret token** validates all webhook requests
- **GitGuardian alert** resolved (webhook URL no longer in code)
- **Token rotation**: Recommended every 90 days

---

## 📞 Need Help?

If you encounter any issues during deployment:

1. Check Fly.io logs: `fly logs`
2. Check Fly.io status: `fly status`
3. Verify secrets: `fly secrets list`
4. Check database connection: `fly postgres connect`
5. Monitor real-time logs: `fly logs --tail`

---

## ✅ Post-Deployment Checklist

- [ ] Fly.io deployment successful
- [ ] App is running (`fly status`)
- [ ] Environment variables set
- [ ] Zapier Filter updated with production token
- [ ] Zapier Zap is ON
- [ ] Tested approval flow
- [ ] Verified pricing in generated PDF
- [ ] Confirmed webhook reaches Box.com
- [ ] No errors in Fly.io logs

---

**Deployment Date:** 2025-11-16  
**Commits Included:** 39bc86d, 55d3405, 1fe3638, 7960112, 099b827, ae65f9a  
**Database Migrations:** None required ✅


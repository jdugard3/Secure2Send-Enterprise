# 🚀 DEPLOY NOW - Step by Step

## ✅ COMPLETED
- [x] Code committed and pushed to GitHub
- [x] All changes are in the repository

---

## 📝 NEXT STEPS (Follow in order)

### **Step 1: Login to Fly.io**
```bash
fly auth login
```
This opens a browser window. Login and return to terminal.

---

### **Step 2: Check Current Production Status**
```bash
cd /Users/jamesdugard/Documents/GitHub/Secure2Send-Enterprise/Secure2Send-Enterprise
fly status
```
This shows if your app is currently running.

---

### **Step 3: View Current Secrets**
```bash
fly secrets list
```
Verify all required secrets are set. Critical ones:
- DATABASE_URL
- SESSION_SECRET
- MAILGUN_API_KEY
- MAILGUN_DOMAIN
- APP_URL

---

### **Step 4: 🔥 CRITICAL - Run Database Migrations First!**

**This is the step Fly.io often skips!** We do it manually:

```bash
# SSH into the production machine
fly ssh console

# Once inside the machine, run migrations
npm run migrate

# You should see output like:
# 🔄 Starting database migrations...
# 📋 Found 22 migration files
# ⏭️  Skipping XXX.sql (already executed)
# 📄 Running YYY.sql...
# ✅ YYY.sql completed successfully
# ✨ Successfully executed X migration(s)!

# Exit the SSH session
exit
```

**⚠️ DO NOT PROCEED TO STEP 5 UNTIL MIGRATIONS COMPLETE SUCCESSFULLY!**

---

### **Step 5: Deploy the Application**
```bash
fly deploy
```

This will:
- Build your Docker image
- Deploy to Fly.io
- Run health checks
- Switch traffic to new version

**Watch the output carefully!** Look for:
- ✅ "Build complete"
- ✅ "Health checks passing"
- ✅ "Deployment successful"

---

### **Step 6: Verify Deployment**

```bash
# Check app status
fly status

# View logs (watch for errors)
fly logs --tail

# Test health endpoint
curl https://secure2send.fly.dev/api/health
# Should return: {"status":"ok"}

# Open in browser
fly open
```

---

### **Step 7: Test Critical Functions**

In your browser:
1. **Login** - Try logging in with your admin account
2. **MFA** - Verify MFA code is sent and works
3. **Admin Dashboard** - Check it loads properly
4. **Merchant Applications** - Try viewing/creating an application
5. **Agent Portal** - If you have agents, test agent login

---

## 🆘 If Something Goes Wrong

### Deployment Failed?
```bash
fly releases rollback
```

### App Won't Start?
```bash
fly logs | grep -i error
```

### Migration Failed?
```bash
fly ssh console
npm run migrate
# Read the error message
exit
```

### Need to Check Database?
```bash
fly ssh console
psql $DATABASE_URL -c "SELECT filename FROM _migrations ORDER BY executed_at DESC LIMIT 10;"
exit
```

---

## 📊 Expected Migration Output

When you run `npm run migrate`, you should see migrations 012-020 being applied (if not already applied):

```
📄 Running 012_add_invitation_codes.sql...
✅ 012_add_invitation_codes.sql completed successfully

📄 Running 013_add_password_reset.sql...
✅ 013_add_password_reset.sql completed successfully

📄 Running 014_add_delete_audit_actions.sql...
✅ 014_add_delete_audit_actions.sql completed successfully

📄 Running 015_add_login_attempts.sql...
✅ 015_add_login_attempts.sql completed successfully

📄 Running 016_add_onboarding_progress.sql...
✅ 016_add_onboarding_progress.sql completed successfully

📄 Running 017_add_extracted_document_data.sql...
✅ 017_add_extracted_document_data.sql completed successfully

📄 Running 018_add_agent_role.sql...
✅ 018_add_agent_role.sql completed successfully

📄 Running 019_add_agent_client_relationship.sql...
✅ 019_add_agent_client_relationship.sql completed successfully

📄 Running 020_add_agent_notes.sql...
✅ 020_add_agent_notes.sql completed successfully

📄 Running 020_add_current_step.sql...
✅ 020_add_current_step.sql completed successfully

✨ Successfully executed 9 migration(s)!
```

*Note: Exact number depends on what's already been applied.*

---

## ✅ Success Checklist

After deployment:
- [ ] `fly status` shows "running"
- [ ] `fly logs` shows no errors
- [ ] Can login to the app
- [ ] Admin dashboard loads
- [ ] No JavaScript errors in browser console
- [ ] Webhooks are working (check Zapier if applicable)

---

## 🎉 When You're Done

If everything works:
1. Monitor logs for the first hour: `fly logs --tail`
2. Test with real users
3. Check for any errors in production
4. Celebrate! 🎊

---

**CURRENT STEP:** Step 1 - Login to Fly.io

Run: `fly auth login`

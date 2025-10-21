# Cloudflare Zero Trust - Click-by-Click Guide
## No Code Required - Just Follow the Screenshots/Instructions

## 🎯 Important: This is ALL done in your web browser!

You don't need to edit any YAML files. Everything is done by clicking buttons and filling out forms in the Cloudflare dashboard.

---

## Step 1: Open Cloudflare Zero Trust Dashboard

1. **Open your web browser**
2. **Navigate to**: https://one.dash.cloudflare.com/
3. **Log in** with your Cloudflare account (or create one)

---

## Step 2: Create Zero Trust Team (First Time Only)

If this is your first time:

1. You'll see a button: **"Get started with Zero Trust"** or **"Create a team"**
2. Click it
3. **Enter a team name**: 
   ```
   Example: secure2send-team
   (This becomes: secure2send-team.cloudflareaccess.com)
   ```
4. **Select plan**: Free (supports up to 50 users)
5. Click: **Continue** or **Complete Setup**

**SAVE YOUR TEAM NAME!** You'll need it later.

---

## Step 3: Add Identity Provider

### What you'll see:

The left sidebar has menu items. Look for **Settings**.

### What to click:

1. **Click**: `Settings` (in left sidebar)
2. **Click**: `Authentication` tab
3. Under "Login methods", **click**: `Add new` button

### You'll see a list of options:

```
○ Google
○ Azure AD
○ GitHub
○ One-time PIN
○ (and many more...)
```

### Recommended: Choose Google

4. **Click**: `Google` (the radio button)
5. **Name**: Leave as "Google" or type: "Google Login"
6. **Click**: `Save` button at the bottom

✅ Done! Google is now your identity provider.

---

## Step 4: Create Access Application

### What to click:

1. **Click**: `Access` (in left sidebar)
2. **Click**: `Applications` tab
3. **Click**: `Add an application` button (blue button, top right)

### You'll see options:

```
○ Self-hosted
○ SaaS
○ Bookmark
```

4. **Click**: `Self-hosted` (the first option)
5. **Click**: `Next` or `Select`

---

## Step 5: Configure Application (Form to Fill Out)

Now you'll see a form with several fields. Here's what to enter:

### Section: Application configuration

**Field: Application name**
```
Type: Secure2Send Enterprise
```

**Field: Session Duration**
```
Select from dropdown: 24 hours
```

**Field: Application domain**
```
Type: secure2send.fly.dev
⚠️ Important: 
- No "https://"
- No "www"
- Just: secure2send.fly.dev
```

**Checkbox: Accept all available identity providers**
```
☑ Check this box
```

### What it looks like:

```
┌────────────────────────────────────────────┐
│ Application name                           │
│ [Secure2Send Enterprise              ]    │
│                                            │
│ Session Duration                           │
│ [24 hours                        ▼]        │
│                                            │
│ Application domain                         │
│ [secure2send.fly.dev             ]         │
│                                            │
│ ☑ Accept all available identity providers │
│                                            │
│                    [Cancel] [Next]         │
└────────────────────────────────────────────┘
```

6. **Click**: `Next` button at the bottom

---

## Step 6: Add Policy (Who Can Access)

Now you need to create a policy that says who can access your app.

### You'll see:

```
Policy name: [                    ]
Action: [Allow ▼]
```

### What to fill in:

**Field: Policy name**
```
Type: Authenticated Users
```

**Field: Action**
```
Select: Allow (should already be selected)
```

### Configure rules section:

You'll see an "Include" section.

**Click**: The dropdown under "Include"

You'll see options like:
```
- Emails
- Emails ending in
- Everyone
- IP ranges
- Country
- etc.
```

**Choose ONE of these options:**

#### Option A: Allow specific emails (Recommended for testing)

7. **Select**: `Emails` from dropdown
8. **Type your email**: `your-email@domain.com`
9. **Click**: `+ Add include` to add more emails if needed

#### Option B: Allow entire domain

7. **Select**: `Emails ending in` from dropdown
8. **Type**: `@yourdomain.com`

### Important: Leave "Require" section EMPTY!

**Do NOT add anything to the "Require" section.**  
This is where you would add MFA, but you're not doing that.

```
Include:
✅ Emails: your-email@domain.com

Require:
⬜ (Leave this empty!)
```

10. **Click**: `Next` button

---

## Step 7: Review and Create

You'll see a summary of your application.

11. **Review** everything looks correct
12. **Click**: `Add application` button

✅ Your application is now created!

---

## Step 8: Get Your Credentials

After creating the application, you'll see your application in the list.

### What to click:

1. **Find your application** in the list: "Secure2Send Enterprise"
2. **Click** on it to open details
3. **Click**: `Overview` tab

### What to copy:

You'll see a section called **"Application Audience (AUD) Tag"**

It will show a long string like:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**COPY THIS!** You'll need it in the next step.

### Write down these 3 values:

```
Team Domain: [your-team-name].cloudflareaccess.com
(You chose this in Step 2)

Audience (AUD): a1b2c3d4e5f6g7h8...
(The long string you just copied)

Issuer: https://[your-team-name].cloudflareaccess.com
(Same as team domain but with https://)
```

---

## Step 9: Add to Fly.io (Terminal Commands)

Now open your terminal and run these commands:

```bash
# Navigate to your project
cd /Users/jamesdugard/Documents/GitHub/Secure2Send-Enterprise/Secure2Send-Enterprise/Secure2SendPrototype

# Set Fly.io secrets (replace with YOUR actual values!)
fly secrets set \
  CLOUDFLARE_TEAM_DOMAIN=your-team-name.cloudflareaccess.com \
  CLOUDFLARE_ACCESS_AUD=a1b2c3d4e5f6g7h8... \
  CLOUDFLARE_ACCESS_ISSUER=https://your-team-name.cloudflareaccess.com \
  NODE_ENV=production \
  -a secure2send

# Deploy
fly deploy -a secure2send
```

---

## Step 10: Test It!

1. **Open incognito/private browser window**
2. **Go to**: https://secure2send.fly.dev
3. **Expected**: You should be redirected to Cloudflare Access login page
4. **Login** with your email/Google account
5. **Then**: You'll see your Secure2Send app
6. **Then**: Your app will ask for MFA (your existing MFA)
7. **Success!** ✓

---

## 🎯 Visual Flow Summary

```
Browser → https://one.dash.cloudflare.com/
   ↓
Settings → Authentication → Add new → Google → Save
   ↓
Access → Applications → Add application → Self-hosted
   ↓
Fill form:
  - Name: Secure2Send Enterprise
  - Domain: secure2send.fly.dev
  - Session: 24 hours
  - Click: Next
   ↓
Add Policy:
  - Name: Authenticated Users
  - Include: Your email
  - Require: (leave empty!)
  - Click: Next
   ↓
Review → Add application
   ↓
Click your app → Overview → Copy AUD value
   ↓
Terminal → fly secrets set ... → fly deploy
   ↓
Test → https://secure2send.fly.dev
```

---

## ❓ FAQ

### Q: Where is the YAML file?
**A**: There is no YAML file to edit! Everything is done in the web dashboard by clicking buttons.

### Q: I can't find the "Add new" button
**A**: Make sure you're in Settings → Authentication → Login methods

### Q: I don't see "Application Audience (AUD) Tag"
**A**: Click on your application name from the list, then click the "Overview" tab

### Q: What if I make a mistake?
**A**: You can always edit or delete the application and start over. No harm done!

### Q: Do I need to restart anything?
**A**: Just deploy to Fly.io with `fly deploy -a secure2send`. That's it!

---

## 🆘 Troubleshooting

### Issue: "Team name already taken"
**Solution**: Try a different team name, like: `secure2send-team-123`

### Issue: Can't find my application after creating it
**Solution**: Click `Access` (left sidebar) → `Applications` tab

### Issue: "Access denied" after deploying
**Solution**: 
1. Check your email is in the policy's "Include" list
2. Make sure you copied the AUD value correctly
3. Verify NODE_ENV=production is set

---

## ✅ Checklist

Use this to track your progress:

- [ ] Created Zero Trust account
- [ ] Chose team name
- [ ] Added Google identity provider
- [ ] Created self-hosted application
- [ ] Set domain to: secure2send.fly.dev
- [ ] Added policy with your email
- [ ] Left "Require" section empty (no MFA)
- [ ] Copied Team Domain
- [ ] Copied AUD value
- [ ] Copied Issuer URL
- [ ] Ran `fly secrets set ...`
- [ ] Ran `fly deploy -a secure2send`
- [ ] Tested in incognito browser
- [ ] Successfully logged in through Cloudflare
- [ ] App prompted for MFA (your existing one)
- [ ] Success! ✓

---

**Remember**: This is all done by clicking in your web browser. No code editing required!



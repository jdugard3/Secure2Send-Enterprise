# Cloudflare Zero Trust Setup with Fly.io Domain (secure2send.fly.dev)

## ✅ Yes, This Works Perfectly!

You can absolutely use Cloudflare Zero Trust with your Fly.io domain `secure2send.fly.dev`. You don't need a custom domain!

## 🎯 How It Works

```
User requests https://secure2send.fly.dev
         ↓
Request goes to Fly.io (normal routing)
         ↓
Your Express app on Fly.io checks for Cloudflare Access JWT
         ↓
No JWT or invalid JWT? → Return 401 Unauthorized
         ↓
Browser automatically redirects to Cloudflare Access login
         ↓
User authenticates (Google, Email, etc.)
         ↓
Cloudflare issues JWT token and redirects back
         ↓
Request with valid JWT → Your app allows access ✓
```

**No DNS changes needed!** Your Fly.io domain stays the same.

---

## 📋 Cloudflare Dashboard Configuration

### Step 1: Create Access Application

In Cloudflare Zero Trust Dashboard:

```
Access → Applications → Add an application → Self-hosted
```

**Fill in these fields:**

```yaml
┌─────────────────────────────────────────────────────────┐
│ Application name                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Secure2Send Enterprise                              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Session Duration                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 24 hours                                            │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Application domain                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ secure2send.fly.dev                                 │ │ ← Your Fly.io domain!
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [✓] Accept all available identity providers             │
│                                                          │
│ [ Next ]                                                 │
└─────────────────────────────────────────────────────────┘
```

**Important Notes:**
- ✅ Use `secure2send.fly.dev` (no https://, no www)
- ✅ Do NOT add a subdomain
- ✅ Do NOT add paths (unless you want to protect specific routes only)

### Step 2: Create Access Policy

```yaml
┌─────────────────────────────────────────────────────────┐
│ Policy name                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Authenticated Users                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Action: Allow                                            │
│                                                          │
│ Configure rules:                                         │
│                                                          │
│ Include                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Selector: [Emails                     ▼]            │ │
│ │ Value: your-email@domain.com                        │ │
│ └─────────────────────────────────────────────────────┘ │
│ [+ Add include]                                          │
│                                                          │
│ Require (optional)                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ (Leave empty for now)                               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [ Next ]                                                 │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Get Your Credentials

After creating the application, you'll see:

```yaml
┌─────────────────────────────────────────────────────────┐
│ Application Overview                                    │
│                                                          │
│ Application Audience (AUD) Tag                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0           │ │ ← Copy this!
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Your team domain: yourteam.cloudflareaccess.com         │
│                                                          │
│ Application URL: https://secure2send.fly.dev            │
└─────────────────────────────────────────────────────────┘
```

**Save these three values:**
```
Team Domain: yourteam.cloudflareaccess.com
Audience (AUD): a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
Issuer: https://yourteam.cloudflareaccess.com
```

---

## 🚀 Deploy to Fly.io

Now set these values in Fly.io:

```bash
# Navigate to your project
cd /Users/jamesdugard/Documents/GitHub/Secure2Send-Enterprise/Secure2Send-Enterprise/Secure2SendPrototype

# Set Fly.io secrets (replace with YOUR actual values)
fly secrets set \
  CLOUDFLARE_TEAM_DOMAIN=yourteam.cloudflareaccess.com \
  CLOUDFLARE_ACCESS_AUD=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 \
  CLOUDFLARE_ACCESS_ISSUER=https://yourteam.cloudflareaccess.com \
  NODE_ENV=production \
  -a secure2send

# Deploy
fly deploy -a secure2send
```

---

## 🧪 Test Your Setup

### Test 1: Access Protection

```bash
# Open incognito/private browser
# Navigate to: https://secure2send.fly.dev

# Expected: You should see Cloudflare Access login page
# (Not your app's login page!)
```

### Test 2: Check JWT Token

```bash
# After logging in, check your request headers
# Open browser DevTools → Network tab
# Look for "cf-access-jwt-assertion" header
```

### Test 3: API Health Check

```bash
# In terminal:
curl -I https://secure2send.fly.dev/api/health

# Expected: 401 Unauthorized (without JWT token)
```

---

## 🎯 What Gets Protected

With this setup, **ALL routes** are protected by default:

```
✅ https://secure2send.fly.dev/
✅ https://secure2send.fly.dev/login
✅ https://secure2send.fly.dev/admin
✅ https://secure2send.fly.dev/api/*
✅ https://secure2send.fly.dev/documents
```

**User experience:**
1. User visits any URL
2. Cloudflare checks authentication
3. Not authenticated? → Redirect to Cloudflare Access login
4. Login with Google/Email
5. Cloudflare redirects back to original URL
6. Your app's MFA kicks in (second layer)
7. Access granted!

---

## 🔧 Optional: Protect Only Specific Routes

If you want to protect only certain routes (e.g., only admin):

### In Cloudflare Dashboard:

```yaml
Application domain: secure2send.fly.dev

Paths:
┌─────────────────────────────────────────┐
│ /admin/*                                │
│ /api/admin/*                            │
└─────────────────────────────────────────┘
```

This way:
- ✅ `/admin/*` routes require Cloudflare authentication
- ✅ `/api/admin/*` routes require Cloudflare authentication
- ⚪ Other routes only need your app's authentication

---

## ❓ FAQ

### Q: Do I need to own the domain?
**A: No!** Fly.io owns `fly.dev`, but Cloudflare Access works with any publicly accessible domain, including Fly.io-provided domains.

### Q: Will this break my existing authentication?
**A: No!** Your existing login/MFA system stays intact. Cloudflare Access is an additional layer that runs **before** users reach your app.

### Q: Can users still access secure2send.fly.dev directly?
**A: Yes, technically.** But your Express middleware will check for the Cloudflare JWT token. Without it, requests return 401 Unauthorized.

### Q: What about API calls from external services?
**A: Good question!** You have two options:
1. **Service Tokens**: Create Cloudflare service tokens for APIs
2. **Bypass specific paths**: Exclude `/api/webhook/*` from Cloudflare Access

### Q: Does this cost money?
**A: No!** Cloudflare Zero Trust free tier supports:
- ✅ Up to 50 users
- ✅ Unlimited applications
- ✅ Basic identity providers (Google, GitHub, etc.)
- ✅ All features you need

### Q: What if I want a custom domain later?
**A: Easy!** You can:
1. Keep using Fly.io with your custom domain
2. OR switch to Cloudflare Tunnel (more complex setup)

---

## 🎉 Summary

**Yes, you can use Cloudflare Zero Trust with `secure2send.fly.dev`!**

Your setup will be:
```
Fly.io hosting (secure2send.fly.dev)
  ↓
Your Express app with Cloudflare Access middleware
  ↓
Cloudflare Access authentication layer
  ↓
Your existing MFA (second layer)
  ↓
Full access to Secure2Send ✓
```

**Benefits:**
- ✅ No custom domain needed
- ✅ No DNS changes required
- ✅ Works with Fly.io's domain
- ✅ Enterprise-grade security
- ✅ Compliance-ready (SOC 2, HIPAA)
- ✅ Easy to set up (20 minutes)

**Next step:** Follow the Cloudflare dashboard steps above and you're done!

---

## 🆘 Need Help?

If you run into issues:

1. **Check Fly.io secrets are set:**
   ```bash
   fly secrets list -a secure2send
   ```

2. **Check Fly.io logs:**
   ```bash
   fly logs -a secure2send
   ```

3. **Verify app is in production mode:**
   - NODE_ENV must be "production"
   - CLOUDFLARE_ACCESS_AUD must be set

4. **Test without authentication:**
   ```bash
   curl -I https://secure2send.fly.dev/api/health
   # Should return 401 if Zero Trust is working
   ```

Your Fly.io domain works perfectly with Cloudflare Zero Trust! 🔒



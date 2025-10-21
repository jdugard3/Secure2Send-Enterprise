# Cloudflare Zero Trust Setup for Fly.io Deployment

## 🎯 Overview

Your Secure2Send app is deployed at: **https://secure2send.fly.dev/**

This guide will help you add Cloudflare Zero Trust protection to your Fly.io deployment.

## 📋 Prerequisites

- ✅ Fly.io deployment running at `secure2send.fly.dev`
- ✅ Cloudflare account (free tier works)
- ✅ `cloudflared` installed locally (already installed via Homebrew)

## 🚀 Setup Options

### **Option 1: Cloudflare Access Only (Recommended - No Custom Domain Needed)**

This adds authentication to your existing Fly.io URL without needing a custom domain.

#### Step 1: Create a Cloudflare Access Application

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Access → Applications → Add an application**
3. Choose **Self-hosted**
4. Configure:
   - **Application name**: Secure2Send Enterprise
   - **Application domain**: `secure2send.fly.dev`
   - **Session duration**: 24 hours (or your preference)

#### Step 2: Set Up Identity Provider

1. In Zero Trust Dashboard → **Settings → Authentication**
2. Add an identity provider:
   - **Google** (easiest for testing)
   - **Azure AD** (for enterprise)
   - **GitHub** (for developers)
   - **One-time PIN** (for simple email-based auth)

#### Step 3: Create Access Policies

Create policies for different access levels:

**Policy 1: General Access**
- Name: `Secure2Send - Authenticated Users`
- Action: `Allow`
- Include: `Emails ending in @yourdomain.com` (or specific emails)
- Session duration: `24 hours`

**Policy 2: Admin Access**
- Name: `Secure2Send - Admin Only`
- Action: `Allow`
- Include: `Emails` → Add admin emails
- Path: `/admin/*` and `/api/admin/*`
- Require: `MFA` (optional but recommended)

#### Step 4: Update Your Application

Update your `.env` file with Cloudflare Access credentials:

```bash
# Get these from Cloudflare Zero Trust Dashboard
# Access → Applications → Your App → Overview
CLOUDFLARE_TEAM_DOMAIN=yourteam.cloudflareaccess.com
CLOUDFLARE_ACCESS_AUD=your-application-audience-id
CLOUDFLARE_ACCESS_ISSUER=https://yourteam.cloudflareaccess.com
```

#### Step 5: Deploy to Fly.io

```bash
# Set secrets in Fly.io
fly secrets set CLOUDFLARE_TEAM_DOMAIN=yourteam.cloudflareaccess.com
fly secrets set CLOUDFLARE_ACCESS_AUD=your-application-audience-id
fly secrets set CLOUDFLARE_ACCESS_ISSUER=https://yourteam.cloudflareaccess.com

# Deploy
fly deploy
```

---

### **Option 2: Custom Domain with Cloudflare Tunnel (Full Zero Trust)**

This option uses a custom domain (e.g., `secure2send.yourdomain.com`) with Cloudflare Tunnel.

#### Prerequisites
- A domain registered and added to Cloudflare
- Cloudflare DNS management enabled

#### Step 1: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser to authenticate.

#### Step 2: Create a Tunnel

```bash
cd /Users/jamesdugard/Documents/GitHub/Secure2Send-Enterprise/Secure2Send-Enterprise/Secure2SendPrototype

# Create tunnel
cloudflared tunnel create secure2send-tunnel

# Note the tunnel ID that's displayed
```

#### Step 3: Configure the Tunnel

Update `tunnel-config.yml` with your tunnel ID and domain:

```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: /Users/jamesdugard/.cloudflared/YOUR_TUNNEL_ID_HERE.json

ingress:
  - hostname: secure2send.yourdomain.com
    service: https://secure2send.fly.dev
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
  
  - hostname: admin.secure2send.yourdomain.com
    service: https://secure2send.fly.dev
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
  
  - service: http_status:404
```

#### Step 4: Create DNS Records

```bash
# Replace yourdomain.com with your actual domain
cloudflared tunnel route dns secure2send-tunnel secure2send.yourdomain.com
cloudflared tunnel route dns secure2send-tunnel admin.secure2send.yourdomain.com
```

#### Step 5: Run the Tunnel

```bash
# Test the tunnel
cloudflared tunnel --config tunnel-config.yml run

# Or run in background
cloudflared tunnel --config tunnel-config.yml run &
```

#### Step 6: Set Up Access Policies

Follow the same steps as Option 1, but use your custom domain URLs.

---

## 🧪 Testing Your Setup

### Test 1: Check Access Protection

```bash
# Without authentication (should redirect to login)
curl -I https://secure2send.fly.dev

# Should see a 302 redirect to Cloudflare Access login
```

### Test 2: Check Admin Protection

```bash
# Try accessing admin endpoint
curl -I https://secure2send.fly.dev/admin

# Should require additional authentication
```

### Test 3: Check API Health

```bash
# Health endpoint should be protected
curl https://secure2send.fly.dev/api/health

# Should require authentication
```

---

## 🔧 Current Fly.io Configuration

Your app is currently running on Fly.io with:
- ✅ HTTPS enabled
- ✅ Port 8080 configured
- ✅ Database connected
- ✅ Environment variables set

### Fly.io Settings to Update

Update your `fly.toml` to work with Cloudflare:

```toml
# Add these environment variables
[env]
  NODE_ENV = "production"
  PORT = "8080"
  
# If using Option 1 (Access Only), keep existing HTTP service
[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80
    force_https = true

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

---

## 📊 Comparison: Option 1 vs Option 2

| Feature | Option 1: Access Only | Option 2: Custom Domain + Tunnel |
|---------|----------------------|-----------------------------------|
| **Setup Time** | 15 minutes | 30-45 minutes |
| **Custom Domain** | Not required | Required |
| **Cost** | Free (Zero Trust free tier) | Free + domain cost |
| **URL** | secure2send.fly.dev | secure2send.yourdomain.com |
| **Fly.io Required** | Yes | No (tunnel replaces it) |
| **Best For** | Quick testing, MVP | Production, branding |

---

## 🎯 Recommended Approach for You

**Start with Option 1** because:
1. ✅ Your Fly.io deployment is already working
2. ✅ No custom domain needed
3. ✅ Faster to set up and test
4. ✅ Can upgrade to Option 2 later
5. ✅ Keeps Fly.io's infrastructure benefits

---

## 🚀 Quick Start (Option 1)

1. **Go to Cloudflare Zero Trust Dashboard**
   ```
   https://one.dash.cloudflare.com/
   ```

2. **Create an Access Application**
   - Application domain: `secure2send.fly.dev`
   - Add your email for testing

3. **Get your credentials**
   - Team Domain: `yourteam.cloudflareaccess.com`
   - Audience ID: Found in Application Overview
   - Issuer: `https://yourteam.cloudflareaccess.com`

4. **Update Fly.io secrets**
   ```bash
   fly secrets set CLOUDFLARE_TEAM_DOMAIN=yourteam.cloudflareaccess.com
   fly secrets set CLOUDFLARE_ACCESS_AUD=your-aud-id
   fly secrets set CLOUDFLARE_ACCESS_ISSUER=https://yourteam.cloudflareaccess.com
   fly secrets set NODE_ENV=production
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

6. **Test**
   ```bash
   curl -I https://secure2send.fly.dev
   # Should redirect to Cloudflare Access login
   ```

---

## 🆘 Troubleshooting

### "Site can't be reached" Error

This usually means:
- ❌ Tunnel is not running
- ❌ DNS records not created
- ❌ Wrong domain in configuration

**Solution**: Use Option 1 (Access Only) to avoid tunnel complexity

### Access Denied After Login

Check:
- Access policy includes your email
- Application domain matches exactly
- Cookies are enabled in browser

### Fly.io App Not Responding

```bash
# Check Fly.io status
fly status

# Check logs
fly logs

# Restart app
fly restart
```

---

## 📞 Next Steps

1. Choose your option (recommend Option 1)
2. Follow the quick start guide above
3. Test with your email
4. Add team members to access policies
5. Configure admin-only routes

Your Zero Trust implementation is ready to go! 🔒

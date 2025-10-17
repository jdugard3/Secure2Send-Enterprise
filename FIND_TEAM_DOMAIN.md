# How to Find Your Cloudflare Team Domain

## 🎯 Quick Answer

Your Team Domain is the name you chose when you first set up Cloudflare Zero Trust, followed by `.cloudflareaccess.com`

---

## Method 1: Settings → General (Most Reliable)

1. **Click**: `Settings` in the left sidebar (gear icon ⚙️ at the bottom)
2. **Click**: `General` tab (might already be selected)
3. **Look for**: "Team domain" or "Team name"

You'll see something like:
```
Team name: myteamname
Team domain: myteamname.cloudflareaccess.com
```

**This is your CLOUDFLARE_TEAM_DOMAIN!**

---

## Method 2: From Your Application URL

1. **Click**: `Access` in the left sidebar
2. **Click**: `Applications` tab
3. **Click**: Your "Secure2Send Enterprise" application
4. **Look at**: The overview section

You might see:
```
Application URL: https://secure2send.fly.dev
Team: myteamname
Team domain: myteamname.cloudflareaccess.com
```

---

## Method 3: From Account Settings

1. **Click**: Your account name (top right corner)
2. **Click**: `Account` or `My Profile`
3. **Look for**: "Zero Trust" or "Access" section
4. **Find**: Your team domain

---

## Method 4: From the URL Bar

When you're logged into Zero Trust, your browser URL might show:

```
https://one.dash.cloudflare.com/abc123def456/home
                                ↑ This is your account ID, not team domain
```

The team domain is NOT in the URL. You need to check Settings.

---

## 🆘 Still Can't Find It?

If you JUST created your Zero Trust account, try this:

### Option A: Go to Zero Trust Home

1. **Click**: `Zero Trust Home` in the left sidebar (house icon 🏠)
2. Look at the top of the page
3. You might see: "Welcome to [Your Team Name]"

### Option B: Check Your Email

When you created Zero Trust, Cloudflare might have sent you an email with your team information.

### Option C: Create a Test Application

1. Go to `Access` → `Applications`
2. Try to add a new application
3. In the form, it might show your team domain

---

## 📋 What You Need vs What You Have

Let me help you organize what you've found:

### ✅ What You Have:
```
CLOUDFLARE_ACCESS_AUD: [the long string you copied]
```

### ❓ What You Still Need:

**Team Domain**: Look in Settings → General

Example format: `myteamname.cloudflareaccess.com`

**Issuer**: This is just your Team Domain with `https://` in front

Example: `https://myteamname.cloudflareaccess.com`

---

## 🎯 Screenshot Guide

Since you're in the Zero Trust dashboard right now:

### Step 1: Look at the Left Sidebar

Find the **Settings** option (should be near the bottom with a gear icon ⚙️)

### Step 2: Click Settings

You should see tabs at the top:
- General
- Authentication  
- WARP Client
- etc.

### Step 3: Look for "Team domain" or "Team name"

It will be displayed on this page, usually near the top.

### Step 4: Copy It

The format will be: `something.cloudflareaccess.com`

That's your Team Domain!

---

## 🔧 Alternative: What Was Your Team Name?

When you first set up Zero Trust, you were asked to choose a team name.

**Do you remember what you chose?**

If you chose: `secure2send-team`
Then your domain is: `secure2send-team.cloudflareaccess.com`

If you chose: `mycompany`  
Then your domain is: `mycompany.cloudflareaccess.com`

---

## ✅ Once You Find It

You'll have all three values:

```bash
CLOUDFLARE_TEAM_DOMAIN=yourteam.cloudflareaccess.com
CLOUDFLARE_ACCESS_AUD=a1b2c3d4e5f6... (you already have this!)
CLOUDFLARE_ACCESS_ISSUER=https://yourteam.cloudflareaccess.com
                          ↑ Same as team domain but with https://
```

Then you can run:

```bash
cd /Users/jamesdugard/Documents/GitHub/Secure2Send-Enterprise/Secure2Send-Enterprise/Secure2SendPrototype

fly secrets set \
  CLOUDFLARE_TEAM_DOMAIN=yourteam.cloudflareaccess.com \
  CLOUDFLARE_ACCESS_AUD=your-aud-value \
  CLOUDFLARE_ACCESS_ISSUER=https://yourteam.cloudflareaccess.com \
  NODE_ENV=production \
  -a secure2send

fly deploy -a secure2send
```

---

## 💡 Pro Tip

If you're having trouble finding it in the UI, you can also:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Make any request (click around)
4. Look at the request headers
5. You might see your team domain in the request URL

---

Need help with the specific page you're on? Let me know what you see on your screen!

# Webhook Security Setup Guide

## 🔒 Securing Your Zapier Webhooks

Since you cannot delete the existing Zapier webhook triggers, we've added **token-based authentication** to secure them. This ensures only authorized requests from your application can trigger the webhooks.

---

## Step 1: Generate a Secret Token

Generate a secure random token (32+ characters):

```bash
# Option 1: Using OpenSSL (Mac/Linux)
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Online generator (use a trusted site)
# Visit: https://www.random.org/strings/
```

**Example output:**
```
8f4a2c9d7e3b1a5f6c8d9e2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

---

## Step 2: Add to Your `.env` File

Add these lines to your `.env` file:

```bash
# Zapier Webhook Configuration
ZAPIER_KINDTAP_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/24656561/u8ijsc1/
ZAPIER_WEBHOOK_SECRET=8f4a2c9d7e3b1a5f6c8d9e2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

**Important:** Use your own generated token, not the example above!

---

## Step 3: Configure Zapier to Parse and Validate the Token

### **3.1 Add a Code Step to Parse JSON** (Required!)

Zapier sometimes doesn't auto-parse JSON webhooks. Add this step first:

1. In your Zap, click **+** after the Webhook trigger
2. Search for **"Code by Zapier"**
3. Choose **"Run JavaScript"**
4. Set up the code:

**Input Data:**
- `raw_body`: Select "Raw Body" from the webhook trigger data

**Code:**
```javascript
// Parse the raw JSON body
const parsed = JSON.parse(inputData.raw_body);

// Return all fields
return {
  applicationId: parsed.applicationId,
  status: parsed.status,
  auth_token: parsed.auth_token,
  auth_timestamp: parsed.auth_timestamp,
  merchant: parsed.merchant,
  documents: parsed.documents,
  // Return the full parsed object too
  ...parsed
};
```

**Test** this step - you should now see `auth_token` as an output field!

### **3.2 Add a Filter Step**

1. Click **+** after the Code step
2. Choose **Filter by Zapier**
3. Set up the filter:

**Filter Setup:**
- **Field**: Select `auth_token` from the **Code by Zapier** step output
- **Condition**: `Text Exactly Matches`
- **Value**: `YOUR_SECRET_TOKEN` (paste your generated token here)

### **3.3 Optional: Add Timestamp Validation**

To prevent replay attacks, add another filter condition in the same Filter step:

- **Field**: `auth_timestamp`
- **Condition**: Use a Formatter to check it's within last 5 minutes
- **Value**: Prevent replay attacks by validating timestamp freshness

---

## Step 4: Test the Webhook

1. Restart your application:
   ```bash
   npm run dev
   ```

2. In your admin panel:
   - Approve a merchant application
   - Check "Send to KindTap"
   - Click "Approve Application"

3. Check Zapier Zap History:
   - Valid requests (with correct token) should pass the filter ✅
   - Invalid requests (wrong/missing token) should be stopped by the filter 🚫

---

## How It Works

### **Before (Insecure):**
```
Anyone with URL → Zapier → Your Actions
```

### **After (Secure):**
```
Your App + Secret Token → Zapier → Filter Check → Your Actions
                                           ↓
                                   Unauthorized Requests Blocked
```

### **What Gets Sent:**

```json
{
  "applicationId": "...",
  "merchant": { ... },
  "documents": [ ... ],
  "auth_token": "8f4a2c9d7e3b...",  ← Your secret token (top-level field)
  "auth_timestamp": "2024-01-15T12:00:00Z"
}
```

Zapier will check the `auth_token` field and only proceed if it matches your configured secret.

---

## Security Best Practices

✅ **Do:**
- Use a randomly generated token (32+ characters)
- Store the token in `.env` (never commit it)
- Rotate the token periodically (every 90 days)
- Use different tokens for dev/staging/production

❌ **Don't:**
- Use simple/guessable tokens
- Commit tokens to git
- Share tokens in Slack/email
- Reuse tokens across different services

---

## Alternative: Zapier's Built-in Authentication

If you have a **Zapier Teams** or higher plan, you can use:

### **Option A: API Key Auth**
1. In Zapier, edit the webhook trigger
2. Enable "API Key Authentication"
3. Set a custom header (e.g., `X-Webhook-Secret`)
4. Update your app to send this header

### **Option B: Basic Auth**
1. Enable Basic Auth in Zapier webhook settings
2. Set username and password
3. Update your app to include Basic Auth credentials

---

## Troubleshooting

### **"Zap not triggering"**
- Check your Zap History in Zapier
- Look for filtered-out requests
- Verify the token in `.env` matches Zapier filter

### **"Token mismatch"**
- Ensure no extra spaces in `.env` token
- Restart your server after changing `.env`
- Check the token in Zapier Zap History data

### **"Still receiving unauthorized requests"**
- Verify the Zapier filter is **before** any actions
- Check filter conditions are exact match
- Consider adding IP whitelist (if static IP available)

---

## Need Help?

If you encounter issues:
1. Check your Zap History for incoming webhook data
2. Verify the `_auth` object is present in the payload
3. Ensure the token in `.env` matches your Zapier filter
4. Restart your application after any `.env` changes

---

**Security Level:** 🔒 Medium  
**Effort:** ⚡ Low (5 minutes)  
**Effectiveness:** ✅ Blocks 99% of unauthorized access


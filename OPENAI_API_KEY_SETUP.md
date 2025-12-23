# How to Get an OpenAI API Key

## Quick Steps

1. **Sign up or log in** to OpenAI: https://platform.openai.com/
2. **Navigate to API Keys**: https://platform.openai.com/api-keys
3. **Create a new secret key**
4. **Copy the key** (you can only see it once!)
5. **Add it to your `.env` file**

---

## Detailed Instructions

### Step 1: Create OpenAI Account

1. Go to https://platform.openai.com/
2. Click **"Sign up"** (or **"Log in"** if you already have an account)
3. Complete the registration process
4. Verify your email if required

### Step 2: Add Payment Method

⚠️ **Important**: OpenAI requires a payment method to use the API (even for free credits).

1. Go to https://platform.openai.com/account/billing
2. Click **"Add payment method"**
3. Add a credit card or use a prepaid card if preferred
4. Note: You get $5 free credits to start (as of 2024)

**Pricing for GPT-4 Vision:**
- Input: ~$0.01 per image/page
- Output: ~$0.03 per 1K tokens
- Typical OCR extraction: **~$0.01-0.02 per document**

### Step 3: Create API Key

1. Go to **API Keys** page: https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Give it a name (e.g., "Secure2Send OCR")
4. Click **"Create secret key"**
5. **⚠️ COPY THE KEY IMMEDIATELY** - you can only see it once!
   - It will look like: `sk-proj-abc123...`
   - Save it somewhere secure temporarily

### Step 4: Add to Your Project

#### Local Development (.env file)

1. Open your `.env` file in the project root
2. Add the API key:

```bash
# OpenAI OCR Configuration
OPENAI_API_KEY_OCR_ONLY=sk-proj-your-actual-key-here
ENABLE_OCR_AUTOFILL=true

# Optional: Your OpenAI organization ID (if you have one)
OPENAI_ORG_ID=org-...
```

3. **Never commit this file to Git!** (It should be in `.gitignore`)

#### Production (Fly.io)

Use Fly.io secrets to store the API key securely:

```bash
fly secrets set OPENAI_API_KEY_OCR_ONLY="sk-proj-your-actual-key-here"
fly secrets set ENABLE_OCR_AUTOFILL="true"
```

View secrets:
```bash
fly secrets list
```

### Step 5: Verify It Works

Test your API key with the test script:

```bash
npm run test:ocr ./path/to/test-document.pdf W9
```

---

## Security Best Practices

### ✅ DO:
- ✅ Use separate API keys for different services
- ✅ Store keys in environment variables (never in code)
- ✅ Use Fly.io secrets for production
- ✅ Rotate keys periodically
- ✅ Set usage limits in OpenAI dashboard
- ✅ Monitor usage and costs

### ❌ DON'T:
- ❌ Commit API keys to Git
- ❌ Share keys publicly
- ❌ Use the same key for multiple projects
- ❌ Leave keys in code comments
- ❌ Share keys via email/Slack

---

## Setting Usage Limits (Recommended)

To prevent unexpected charges:

1. Go to https://platform.openai.com/account/limits
2. Set **Hard limit** (hard stop when reached):
   - Suggested: $50-100/month for production
3. Set **Soft limit** (email warning):
   - Suggested: $25-50/month

This protects you from:
- Runaway costs
- API abuse
- Unexpected usage spikes

---

## Getting Organization ID (Optional)

If you're part of an OpenAI organization:

1. Go to https://platform.openai.com/account/org-settings
2. Find your **Organization ID**
3. It looks like: `org-abc123...`
4. Add to `.env`:

```bash
OPENAI_ORG_ID=org-abc123...
```

This is optional but helps with:
- Billing organization
- Team management
- Usage tracking

---

## Troubleshooting

### Error: "Invalid API key"

- ✅ Check that you copied the full key (starts with `sk-proj-` or `sk-`)
- ✅ Make sure there are no extra spaces
- ✅ Verify the key hasn't been revoked in OpenAI dashboard
- ✅ Try creating a new key

### Error: "Insufficient quota"

- ✅ Add payment method if you haven't
- ✅ Check your billing page for available credits
- ✅ Verify usage limits haven't been hit

### Error: "Rate limit exceeded"

- ✅ You're making too many requests too quickly
- ✅ Wait a few minutes and try again
- ✅ Check your rate limits in OpenAI dashboard
- ✅ Consider implementing request queuing

### Error: "Model not found" or "gpt-4o not available"

- ✅ Verify you have access to GPT-4 models
- ✅ Check your OpenAI account tier
- ✅ Some accounts need to request access to GPT-4

---

## Cost Estimation

For OCR processing on Secure2Send:

**Per Document:**
- 1 document extraction: ~$0.01-0.02
- Processing time: 10-30 seconds

**Monthly Estimate** (example):
- 100 documents/month: ~$1-2
- 1,000 documents/month: ~$10-20
- 10,000 documents/month: ~$100-200

**Cost Control:**
- Set usage limits in OpenAI dashboard
- Monitor usage regularly
- Consider caching duplicate documents (hash-based)

---

## Next Steps

Once you have your API key:

1. ✅ Add it to `.env` file
2. ✅ Test with: `npm run test:ocr`
3. ✅ Set usage limits in OpenAI dashboard
4. ✅ Proceed with Phase 1 testing!

---

## Need Help?

- **OpenAI Support**: https://help.openai.com/
- **API Documentation**: https://platform.openai.com/docs
- **Community Forum**: https://community.openai.com/


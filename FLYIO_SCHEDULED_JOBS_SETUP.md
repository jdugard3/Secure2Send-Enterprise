# Fly.io Scheduled Jobs Setup

## Overview

For cleanup jobs on Fly.io, we'll use **Fly.io Scheduled Jobs** (recommended) which run independently of your main app.

## Setup Instructions

### Option 1: Fly.io Scheduled Jobs (Recommended)

Fly.io scheduled jobs run as separate one-off tasks that can be scheduled.

#### 1. Add to fly.toml

Add this to your `fly.toml`:

```toml
# Scheduled jobs configuration
[[services]]
  internal_port = 3000
  protocol = "tcp"
  
  [[services.tcp_checks]]
    interval = "15s"
    timeout = "2s"
    grace_period = "1s"

# Scheduled cleanup job (runs daily at 2 AM UTC)
# Note: This requires Fly.io Machines API (available in flyctl 0.1.90+)
# We'll use a different approach - see below
```

**Note**: Fly.io scheduled jobs are actually managed via the Machines API, not directly in fly.toml. See below for the actual setup.

#### 2. Create Cleanup Script

We've created `scripts/cleanup-extracted-data.ts` which can be run as a scheduled job.

#### 3. Set Up Scheduled Job on Fly.io

Once deployed, you'll create a scheduled job using Fly.io's Machines API or a cron service:

**Option A: Using Fly.io Machines (Recommended)**
```bash
# Create a machine with a schedule
fly machines create \
  --name cleanup-extracted-data \
  --config fly.cleanup.toml \
  --schedule "0 2 * * *"  # Daily at 2 AM UTC
```

**Option B: Using External Cron Service (Simple)**
- Use a service like EasyCron, Cronitor, or GitHub Actions
- Have it call: `fly ssh console -C "npm run cleanup:extracted-data"`

**Option C: Manual Execution (For Testing)**
```bash
# Run cleanup manually
fly ssh console -C "npm run cleanup:extracted-data"
```

### Option 2: Supercronic (Alternative)

If you want cron jobs running within your app (less isolated but simpler):

1. **Install Supercronic in Dockerfile**:
```dockerfile
RUN apt-get update && apt-get install -y curl && \
    curl -L https://github.com/aptible/supercronic/releases/download/v0.2.26/supercronic-linux-amd64 \
    -o /usr/local/bin/supercronic && \
    chmod +x /usr/local/bin/supercronic
```

2. **Create crontab file**:
```
# Cleanup extracted data daily at 2 AM UTC
0 2 * * * cd /app && npm run cleanup:extracted-data
```

3. **Add to fly.toml processes**:
```toml
[processes]
  app = "npm start"
  cron = "supercronic /app/crontab"
```

4. **Scale cron to 1 instance**:
```bash
fly scale count cron=1
```

### Recommended Approach: Manual Script + External Trigger

For now, **the simplest approach** is to:

1. Keep the cleanup script as-is (`scripts/cleanup-extracted-data.ts`)
2. Run it manually or via external cron service that calls:
   ```bash
   fly ssh console -C "npm run cleanup:extracted-data"
   ```

This works because:
- ✅ No additional Fly.io configuration needed
- ✅ Works immediately after Phase 3 deployment
- ✅ Can easily migrate to Fly.io Machines later
- ✅ Easy to test manually

## Implementation Timeline

### Phase 3 (Now)
- Create cleanup script ✅
- Document how to run it ✅

### After Phase 3 Deployment
- Set up external cron service (EasyCron, etc.)
- OR configure Fly.io Machines scheduled job
- OR use Supercronic approach

### Future Enhancement
- Migrate to Fly.io's native scheduled jobs when they're more mature
- Or use a dedicated cleanup service

## Testing Locally

```bash
# Test cleanup script locally
npm run cleanup:extracted-data
```

## Environment Variables Needed

The cleanup script uses:
- `DATABASE_URL` - PostgreSQL connection
- `EXTRACTED_DATA_EXPIRY_DAYS` - How many days before cleanup (default: 30)

Both are already in your `.env` / Fly.io secrets.


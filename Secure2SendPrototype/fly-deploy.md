# Fly.io Deployment Guide for Secure2Send

## Prerequisites

1. Install the Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Create a Fly.io account: https://fly.io/app/sign-up
3. Set up your database (Neon PostgreSQL recommended)

## Deployment Steps

### 1. Login to Fly.io
```bash
fly auth login
```

### 2. Create the App
```bash
fly apps create secure2send
```

### 3. Create Persistent Volume for File Uploads
```bash
fly volumes create secure2send_uploads --region dfw --size 10
```

### 4. Set Environment Variables
```bash
# Required secrets
fly secrets set DATABASE_URL="your-neon-database-url"
fly secrets set SESSION_SECRET="your-secure-32-char-secret"

# Optional: if migrating from Replit
fly secrets set REPL_ID="your-repl-id"
fly secrets set REPLIT_DOMAINS="your-domain.com"
```

### 5. Deploy
```bash
fly deploy
```

### 6. Scale and Monitor
```bash
# Check status
fly status

# View logs
fly logs

# Scale if needed
fly scale memory 1024

# Open in browser
fly open
```

## Environment Variables Required

### Production (Required)
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secure random string (min 32 characters)
- `NODE_ENV`: Set to "production" (automatically set)
- `PORT`: Set to "3000" (automatically set)

### Optional (for Replit migration)
- `REPL_ID`: Your Replit app ID
- `REPLIT_DOMAINS`: Comma-separated domains
- `ISSUER_URL`: OIDC issuer URL

## File Storage

The app uses a persistent volume mounted at `/app/uploads` for file storage. This ensures uploaded documents persist across deployments.

## Database Setup

Make sure your Neon PostgreSQL database is set up with the correct schema:

```bash
# Run migrations (done automatically on deploy)
npm run db:push
```

## Security Notes

- HTTPS is enforced automatically
- Rate limiting is configured for production
- File uploads are validated and secure
- Sessions use secure cookies in production
- CORS is configured for your domain

## Monitoring

- Health check endpoint: `/api/health`
- Automatic health checks configured
- View metrics: `fly metrics`

## Troubleshooting

### Common Issues

1. **Database connection issues**: Verify DATABASE_URL is correct
2. **File upload issues**: Check volume is mounted correctly
3. **Session issues**: Verify SESSION_SECRET is set

### Useful Commands

```bash
# SSH into the machine
fly ssh console

# Check environment variables
fly secrets list

# View recent deployments
fly releases

# Scale down/up
fly scale count 1
```

## Production Checklist

- [ ] Database URL configured
- [ ] Session secret set (32+ characters)
- [ ] Volume created for file storage
- [ ] HTTPS certificate provisioned
- [ ] Health checks passing
- [ ] Rate limiting configured
- [ ] File validation enabled
- [ ] Error monitoring set up (optional: Sentry)

## Cost Optimization

- Use `auto_stop_machines = true` to stop when idle
- Set `min_machines_running = 0` for development
- Monitor usage with `fly metrics`

For more details, see: https://fly.io/docs/

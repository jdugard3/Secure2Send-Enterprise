# Cloudflare Zero Trust Setup for Secure2Send Enterprise

## Overview
This guide will help you set up Cloudflare Zero Trust to provide secure access to your Secure2Send application with advanced security policies, tunnels, and access controls.

## Prerequisites
- Cloudflare account with your domain
- Secure2Send application running (current setup: Replit/Fly.io)
- Administrative access to your deployment environment

## Step 1: Enable Cloudflare Zero Trust

1. **Access Zero Trust Dashboard**
   ```bash
   # Navigate to: https://one.dash.cloudflare.com/
   # Or from main dashboard: Zero Trust → Overview
   ```

2. **Choose Your Plan**
   - **Free Plan**: Up to 50 users, basic features
   - **Teams Standard**: $7/user/month, advanced policies
   - **Teams Enterprise**: Custom pricing, full compliance features

## Step 2: Install Cloudflared (Tunnel Client)

### For Linux/macOS:
```bash
# Download cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Or using Homebrew (macOS)
brew install cloudflared
```

### For Docker (recommended for Secure2Send):
```dockerfile
# Add to your existing Dockerfile
FROM node:18-alpine
# ... existing content ...

# Install cloudflared
RUN wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared

# ... rest of your Dockerfile
```

## Step 3: Create and Configure Tunnel

### 3.1 Authenticate cloudflared
```bash
cloudflared tunnel login
```
This opens a browser to authenticate with Cloudflare.

### 3.2 Create a Tunnel
```bash
# Create tunnel for Secure2Send
cloudflared tunnel create secure2send-tunnel

# This will create a tunnel and output a UUID - save this!
# Example output: Created tunnel secure2send-tunnel with id: 12345678-1234-1234-1234-123456789abc
```

### 3.3 Create Tunnel Configuration
Create `tunnel-config.yml`:

```yaml
# tunnel-config.yml
tunnel: 12345678-1234-1234-1234-123456789abc  # Replace with your tunnel ID
credentials-file: /root/.cloudflared/12345678-1234-1234-1234-123456789abc.json

# Ingress rules for Secure2Send
ingress:
  # Main application
  - hostname: secure2send.yourdomain.com
    service: http://localhost:5000
    originRequest:
      noTLSVerify: true
      httpHostHeader: secure2send.yourdomain.com
  
  # Admin panel (with stricter access)
  - hostname: admin.secure2send.yourdomain.com
    service: http://localhost:5000
    originRequest:
      noTLSVerify: true
      httpHostHeader: admin.secure2send.yourdomain.com
  
  # API endpoints
  - hostname: api.secure2send.yourdomain.com
    service: http://localhost:5000
    originRequest:
      noTLSVerify: true
      httpHostHeader: api.secure2send.yourdomain.com
  
  # Catch-all rule (required)
  - service: http_status:404
```

### 3.4 Create DNS Records
```bash
# Create DNS records pointing to the tunnel
cloudflared tunnel route dns secure2send-tunnel secure2send.yourdomain.com
cloudflared tunnel route dns secure2send-tunnel admin.secure2send.yourdomain.com
cloudflared tunnel route dns secure2send-tunnel api.secure2send.yourdomain.com
```

### 3.5 Run the Tunnel
```bash
# Test the tunnel
cloudflared tunnel --config tunnel-config.yml run

# For production, create a service
cloudflared service install tunnel-config.yml
```

## Step 4: Configure Access Policies

### 4.1 Create Identity Providers

In the Zero Trust dashboard:

1. **Navigate to Settings → Authentication**
2. **Add Identity Providers:**

```yaml
# Example configurations:

# Google Workspace
Provider: Google Workspace
Config:
  - Client ID: your-google-client-id
  - Client Secret: your-google-client-secret
  - Domain: yourdomain.com

# Azure AD
Provider: Azure AD
Config:
  - Application ID: your-azure-app-id
  - Client Secret: your-azure-secret
  - Directory ID: your-tenant-id

# GitHub (for developers)
Provider: GitHub
Config:
  - Client ID: your-github-client-id
  - Client Secret: your-github-secret
  - Organization: your-github-org
```

### 4.2 Create Access Policies

#### Policy 1: Main Application Access
```yaml
Name: Secure2Send Main Access
Application: secure2send.yourdomain.com
Policy Rules:
  - Rule Name: Authenticated Users
    Action: Allow
    Include:
      - Email domain: yourdomain.com
      - Group: secure2send-users
    Exclude:
      - Email: suspended-user@yourdomain.com
    Require:
      - Email domain verification
      - Country: United States (if applicable)
```

#### Policy 2: Admin Panel Access
```yaml
Name: Secure2Send Admin Access
Application: admin.secure2send.yourdomain.com
Policy Rules:
  - Rule Name: Administrators Only
    Action: Allow
    Include:
      - Group: secure2send-admins
      - Email: admin@yourdomain.com
    Require:
      - Email domain verification
      - MFA (Multi-factor Authentication)
      - Device Posture Check
    Session Duration: 8 hours
```

#### Policy 3: API Access
```yaml
Name: Secure2Send API Access
Application: api.secure2send.yourdomain.com
Policy Rules:
  - Rule Name: Service Accounts & Apps
    Action: Allow
    Include:
      - Service Token: api-service-token
      - IP Range: your-office-ip/32
    Require:
      - Valid service token
```

## Step 5: Device Posture Checks (Optional but Recommended)

### 5.1 Install WARP Client
Distribute WARP client to your team:

```bash
# Download links for team members:
# Windows: https://1.1.1.1/windows
# macOS: https://1.1.1.1/macos
# iOS: https://apps.apple.com/app/id1423538627
# Android: https://play.google.com/store/apps/details?id=com.cloudflare.onedotonedotonedotone
```

### 5.2 Configure Device Posture
In Zero Trust Dashboard → Settings → WARP Client:

```yaml
Device Posture Rules:
  - Name: Corporate Device
    Conditions:
      - OS Version: Windows 10+ or macOS 10.15+
      - Antivirus: Running and updated
      - Firewall: Enabled
      - Domain Joined: Required (optional)
  
  - Name: Security Software
    Conditions:
      - CrowdStrike: Running (if applicable)
      - Carbon Black: Running (if applicable)
      - Windows Defender: Enabled
```

## Step 6: Integration with Existing Secure2Send

### 6.1 Update Environment Variables
Add to your `.env` file:

```bash
# Cloudflare Zero Trust
CLOUDFLARE_TEAM_DOMAIN=yourteam.cloudflareaccess.com
CLOUDFLARE_ACCESS_AUD=your-application-audience-id
CLOUDFLARE_ACCESS_ISSUER=https://yourteam.cloudflareaccess.com

# Update APP_URL to use Zero Trust domain
APP_URL=https://secure2send.yourdomain.com
```

### 6.2 Add Access Verification Middleware

Create `server/middleware/cloudflareAccess.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `${process.env.CLOUDFLARE_ACCESS_ISSUER}/cdn-cgi/access/certs`
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export const verifyCloudflareAccess = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['cf-access-jwt-assertion'] as string;
  
  if (!token) {
    return res.status(401).json({ error: 'No access token provided' });
  }

  jwt.verify(token, getKey, {
    audience: process.env.CLOUDFLARE_ACCESS_AUD,
    issuer: process.env.CLOUDFLARE_ACCESS_ISSUER
  }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid access token' });
    }
    
    // Add user info from Cloudflare Access to request
    req.user = {
      ...req.user,
      cloudflareAccess: decoded
    };
    
    next();
  });
};
```

### 6.3 Update Server Configuration

Update `server/index.ts`:

```typescript
import { verifyCloudflareAccess } from './middleware/cloudflareAccess';

// Apply Cloudflare Access verification to protected routes
if (process.env.NODE_ENV === 'production' && process.env.CLOUDFLARE_ACCESS_AUD) {
  app.use('/api', verifyCloudflareAccess);
  app.use('/admin', verifyCloudflareAccess);
}
```

## Step 7: Testing and Validation

### 7.1 Test Access Policies
1. Access `https://secure2send.yourdomain.com`
2. Verify authentication prompt appears
3. Test with different user types (admin vs regular user)
4. Verify admin panel restrictions work

### 7.2 Test Device Posture (if configured)
1. Connect with WARP client
2. Verify posture checks are enforced
3. Test access from non-compliant device

### 7.3 Monitor Access Logs
In Zero Trust Dashboard → Logs → Access:
- Review authentication attempts
- Monitor policy violations
- Check for unusual access patterns

## Step 8: Production Deployment

### 8.1 For Fly.io Deployment
Update `fly.toml`:

```toml
[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

# Add tunnel service
[[services]]
  internal_port = 3000
  protocol = "tcp"

# Remove external ports since traffic comes through tunnel
```

### 8.2 Update Dockerfile
```dockerfile
# Add cloudflared to your production image
FROM node:18-alpine
# ... existing content ...

# Install cloudflared
RUN wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared

# Copy tunnel configuration
COPY tunnel-config.yml /app/
COPY .cloudflared/ /root/.cloudflared/

# Start both app and tunnel
CMD ["sh", "-c", "cloudflared tunnel --config tunnel-config.yml run & npm start"]
```

## Security Best Practices

### 1. Regular Security Reviews
- Review access logs weekly
- Update policies monthly
- Audit user access quarterly

### 2. Principle of Least Privilege
- Grant minimum required access
- Use time-based sessions
- Implement just-in-time access for admin functions

### 3. Monitor and Alert
Set up alerts for:
- Failed authentication attempts
- Policy violations
- Unusual access patterns
- New device registrations

### 4. Backup Access
- Configure emergency access procedures
- Maintain backup authentication methods
- Document recovery processes

## Troubleshooting

### Common Issues
1. **Tunnel Connection Failed**
   ```bash
   # Check tunnel status
   cloudflared tunnel info secure2send-tunnel
   
   # Test connectivity
   cloudflared tunnel --config tunnel-config.yml run --debug
   ```

2. **Access Denied**
   - Verify DNS records are correct
   - Check policy configurations
   - Review user group memberships

3. **Performance Issues**
   - Check tunnel health
   - Review ingress rules
   - Monitor bandwidth usage

### Support Resources
- [Cloudflare Zero Trust Documentation](https://developers.cloudflare.com/cloudflare-one/)
- [Cloudflare Community](https://community.cloudflare.com/)
- [Zero Trust Learning Center](https://www.cloudflare.com/learning/access-management/what-is-zero-trust/)

## Next Steps

After completing this setup:
1. Configure additional security policies as needed
2. Set up Gateway policies for content filtering
3. Implement Browser Isolation for high-risk activities
4. Consider Cloudflare for SaaS for third-party app protection

## Compliance Notes

This Zero Trust setup helps with:
- **SOC 2 Type II**: Access controls and monitoring
- **HIPAA**: Secure access to sensitive documents
- **Cannabis Compliance**: Audit trails and access controls
- **PCI DSS**: Network segmentation and access controls

Remember to document all configurations and maintain an audit trail of changes for compliance purposes.









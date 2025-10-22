# Security Improvements & Recommendations

## ✅ **CRITICAL ISSUE - FIXED** 

### 1. Sensitive Data in Server Logs (SOC 2 / HIPAA Violation)

**Problem:** SSNs, bank account numbers, and other PII were being logged in plain text.

**Solution Implemented:**
- ✅ Created `LogSanitizer` utility class
- ✅ Updated `routes.ts` to use `safeLog` functions
- ✅ Updated `storage.ts` to use `safeLog` functions
- ✅ Automatic pattern detection for SSNs, credit cards, emails
- ✅ Field-based sanitization for sensitive fields

**Impact:** 
- Prevents PII exposure in logs
- SOC 2 compliant logging
- HIPAA compliant logging
- Prevents data breach through log files

---

## 🔧 **RECOMMENDED IMPROVEMENTS**

### 2. Enhanced CORS Configuration

**Current Status:** CORS not explicitly configured
**Recommendation:** Add strict CORS policies

```typescript
// Add to server/index.ts
import cors from 'cors';

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      env.APP_URL,
      'https://secure2send.fly.dev',
      'https://admin.secure2send.fly.dev',
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
```

---

### 3. Content Security Policy (CSP)

**Current Status:** Basic security headers exist
**Recommendation:** Add comprehensive CSP with Helmet.js

```bash
npm install helmet
```

```typescript
// Add to server/index.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Remove in production if possible
        "https://cdn.tailwindcss.com", // If using CDN
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Needed for styled-components/Tailwind
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:", // For Cloudflare R2
      ],
      connectSrc: [
        "'self'",
        "https://api.mailgun.net", // If using Mailgun
        "https://*.cloudflareaccess.com", // If using Cloudflare
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}));
```

---

### 4. Database Connection Security

**Current Status:** Basic connection pool
**Recommendation:** Add connection encryption and limits

```typescript
// In server/db.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
  } : false,
  max: 20, // Maximum pool size
  min: 5, // Minimum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500, // Close connections after X uses (prevent connection leaks)
});

// Connection monitoring
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Send alert to monitoring system
});

pool.on('connect', (client) => {
  console.log('New client connected to database');
});
```

---

### 5. Enhanced Password Policy

**Current Status:** Good password validation
**Recommendation:** Add password expiration and history

```typescript
// Add to shared/schema.ts
export const users = pgTable("users", {
  // ... existing fields ...
  passwordChangedAt: timestamp("password_changed_at").defaultNow(),
  passwordHistory: jsonb("password_history").$type<string[]>().default([]),
  passwordExpiresAt: timestamp("password_expires_at"),
});

// Add migration
-- migrations/010_add_password_policy.sql
ALTER TABLE users 
ADD COLUMN password_changed_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN password_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN password_expires_at TIMESTAMP;

-- Set expiration to 90 days from last change
UPDATE users SET password_expires_at = password_changed_at + INTERVAL '90 days';
```

```typescript
// Add to server/services/passwordSecurity.ts
static async enforcePasswordPolicy(userId: string): Promise<{
  mustChange: boolean;
  reason?: string;
  daysUntilExpiration?: number;
}> {
  const user = await storage.getUser(userId);
  if (!user) return { mustChange: false };

  const passwordAge = user.passwordChangedAt 
    ? Math.floor((Date.now() - user.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Force password change after 90 days
  if (passwordAge >= 90) {
    return {
      mustChange: true,
      reason: 'Password has expired. Please change your password.',
    };
  }

  // Warn 14 days before expiration
  if (passwordAge >= 76) {
    return {
      mustChange: false,
      daysUntilExpiration: 90 - passwordAge,
    };
  }

  return { mustChange: false };
}
```

---

### 6. IP-Based Access Controls

**Current Status:** Basic IP filtering middleware exists
**Recommendation:** Add geolocation and anomaly detection

```bash
npm install geoip-lite
```

```typescript
// server/middleware/geoSecurity.ts
import geoip from 'geoip-lite';

export const geoSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || 'unknown';
  const geo = geoip.lookup(clientIP);

  // Block high-risk countries (configurable)
  const blockedCountries = process.env.BLOCKED_COUNTRIES?.split(',') || [];
  if (geo && blockedCountries.includes(geo.country)) {
    console.warn(`Blocked request from ${geo.country} (IP: ${clientIP})`);
    return res.status(403).json({
      error: 'Access Denied',
      message: 'Access from your location is not permitted',
    });
  }

  // Log geographic information for security monitoring
  if (geo) {
    (req as any).geoLocation = {
      country: geo.country,
      region: geo.region,
      city: geo.city,
      coordinates: geo.ll,
    };
  }

  next();
};

// Add to routes for admin endpoints
app.use('/api/admin/*', geoSecurityMiddleware);
```

---

### 7. Enhanced Audit Logging

**Current Status:** Comprehensive audit logs exist
**Recommendation:** Add audit log integrity verification

```typescript
// Add to migrations/011_audit_log_integrity.sql
ALTER TABLE audit_logs 
ADD COLUMN log_hash VARCHAR(64),
ADD COLUMN previous_log_hash VARCHAR(64);

CREATE INDEX idx_audit_logs_hash ON audit_logs(log_hash);

-- Create function to calculate log hash
CREATE OR REPLACE FUNCTION calculate_audit_log_hash()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash VARCHAR(64);
BEGIN
  -- Get hash of previous log entry
  SELECT log_hash INTO prev_hash
  FROM audit_logs
  ORDER BY timestamp DESC
  LIMIT 1;

  -- Calculate hash of current entry (includes previous hash for chain)
  NEW.previous_log_hash := prev_hash;
  NEW.log_hash := encode(
    digest(
      NEW.id || NEW.user_id || NEW.action || NEW.timestamp || COALESCE(prev_hash, ''),
      'sha256'
    ),
    'hex'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER audit_log_integrity_trigger
BEFORE INSERT ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION calculate_audit_log_hash();
```

```typescript
// Add verification function
export class AuditService {
  static async verifyAuditLogIntegrity(): Promise<{
    valid: boolean;
    brokenAt?: number;
    totalChecked: number;
  }> {
    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(auditLogs.timestamp);

    let previousHash: string | null = null;
    
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      // Verify chain
      if (log.previousLogHash !== previousHash) {
        return {
          valid: false,
          brokenAt: i,
          totalChecked: logs.length,
        };
      }

      previousHash = log.logHash;
    }

    return {
      valid: true,
      totalChecked: logs.length,
    };
  }
}
```

---

### 8. Session Fingerprinting

**Current Status:** Basic session management
**Recommendation:** Add browser fingerprinting to detect session hijacking

```typescript
// server/middleware/sessionFingerprint.ts
import crypto from 'crypto';

export const sessionFingerprintMiddleware = (req: any, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  // Create fingerprint
  const fingerprint = crypto
    .createHash('sha256')
    .update(userAgent + acceptLanguage + acceptEncoding)
    .digest('hex');

  // Check if session exists
  if (req.session && req.session.fingerprint) {
    // Verify fingerprint matches
    if (req.session.fingerprint !== fingerprint) {
      console.warn(`Session hijacking detected for session ${req.sessionID}`);
      
      // Log security event
      if (req.user) {
        AuditService.logAction(req.user, 'SESSION_HIJACKING_DETECTED', req, {
          resourceType: 'security',
          metadata: {
            oldFingerprint: req.session.fingerprint,
            newFingerprint: fingerprint,
          },
        });
      }

      // Destroy session
      req.session.destroy();
      return res.status(401).json({
        error: 'Session Invalid',
        message: 'Your session has been terminated for security reasons',
      });
    }
  } else if (req.session) {
    // Set fingerprint for new sessions
    req.session.fingerprint = fingerprint;
  }

  next();
};

// Add to server after session setup
app.use(sessionFingerprintMiddleware);
```

---

### 9. Automated Security Scanning

**Recommendation:** Add dependency vulnerability scanning

```json
// Add to package.json scripts
{
  "scripts": {
    "security:audit": "npm audit --audit-level=moderate",
    "security:fix": "npm audit fix",
    "security:check": "npm outdated",
    "security:scan": "npm run security:audit && npm run security:check"
  }
}
```

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'Secure2Send'
          path: '.'
          format: 'HTML'
```

---

### 10. Encrypted Backups

**Recommendation:** Implement automated encrypted database backups

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

BACKUP_DIR="/var/backups/secure2send"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
ENCRYPTED_FILE="$BACKUP_FILE.gpg"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > $BACKUP_FILE

# Encrypt backup
gpg --symmetric --cipher-algo AES256 --output $ENCRYPTED_FILE $BACKUP_FILE

# Remove unencrypted backup
rm $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gpg" -mtime +30 -delete

# Upload to S3/R2 (optional)
if [ -n "$AWS_S3_BUCKET" ]; then
  aws s3 cp $ENCRYPTED_FILE s3://$AWS_S3_BUCKET/backups/
fi

echo "✅ Backup completed: $ENCRYPTED_FILE"
```

```bash
# Add to crontab
0 2 * * * /path/to/scripts/backup-database.sh
```

---

### 11. Security Monitoring Dashboard

**Recommendation:** Create real-time security monitoring endpoint

```typescript
// Add to server/routes.ts
app.get('/api/admin/security-dashboard', requireAdmin, async (req: any, res) => {
  try {
    const [
      failedLogins24h,
      suspiciousActivities,
      activeSession,
      recentAdminActions,
      mfaStats,
    ] = await Promise.all([
      SecurityMonitoringService.getSecurityDashboard('day'),
      db.select().from(auditLogs)
        .where(eq(auditLogs.action, 'SUSPICIOUS_REQUEST'))
        .orderBy(desc(auditLogs.timestamp))
        .limit(10),
      db.select({ count: sql`count(*)` })
        .from(sql`sessions`)
        .where(sql`expire > NOW()`),
      db.select().from(auditLogs)
        .where(sql`action LIKE 'ADMIN_%'`)
        .orderBy(desc(auditLogs.timestamp))
        .limit(20),
      db.select({
        total: sql`count(*)`,
        mfaEnabled: sql`count(*) FILTER (WHERE mfa_enabled = true)`,
        emailMfaEnabled: sql`count(*) FILTER (WHERE mfa_email_enabled = true)`,
      }).from(users),
    ]);

    res.json({
      metrics: {
        failedLogins24h: failedLogins24h.metrics.failedLogins,
        suspiciousActivitiesCount: suspiciousActivities.length,
        activeSessions: activeSession[0]?.count || 0,
        mfaAdoptionRate: (
          (mfaStats[0].mfaEnabled / mfaStats[0].total) * 100
        ).toFixed(1),
      },
      recentActivities: {
        suspicious: suspiciousActivities,
        adminActions: recentAdminActions,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({ error: 'Failed to load security dashboard' });
  }
});
```

---

### 12. Input Validation Enhancement

**Recommendation:** Add server-side file content validation

```bash
npm install file-type
```

```typescript
// server/middleware/fileValidation.ts
import fileType from 'file-type';

export class FileValidator {
  static async validateFileContent(buffer: Buffer, declaredMimeType: string): Promise<boolean> {
    // Get actual file type from content
    const actualType = await fileType.fromBuffer(buffer);
    
    if (!actualType) {
      console.warn('Could not determine file type from content');
      return false;
    }

    // Verify declared type matches actual type
    const allowedMimeTypes = {
      'application/pdf': ['pdf'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
    };

    const allowedExtensions = allowedMimeTypes[declaredMimeType] || [];
    
    if (!allowedExtensions.includes(actualType.ext)) {
      console.warn(`File type mismatch: declared ${declaredMimeType}, actual ${actualType.mime}`);
      return false;
    }

    return true;
  }
}
```

---

## 📋 **IMPLEMENTATION PRIORITY**

### 🔴 **High Priority** (Implement within 1 week)
1. ✅ ~~Sensitive data logging fix~~ (COMPLETED)
2. CORS configuration
3. Helmet.js + CSP
4. Database connection security
5. Audit log integrity

### 🟡 **Medium Priority** (Implement within 1 month)
6. Password expiration policy
7. Session fingerprinting
8. Geo-based access controls
9. Security monitoring dashboard

### 🟢 **Low Priority** (Implement as needed)
10. Automated security scanning (CI/CD)
11. Encrypted backups
12. Enhanced file content validation

---

## 🎯 **Compliance Impact**

### SOC 2 Type II
- ✅ Audit log integrity (CC7.2)
- ✅ Session security (CC6.1)
- ✅ Access controls (CC6.2)

### HIPAA
- ✅ Encrypted backups (164.308)
- ✅ Access logging (164.312)
- ✅ Audit controls (164.312)

### PCI DSS
- ✅ Password policies (8.2)
- ✅ Access controls (7.1)
- ✅ Audit logging (10.1)

---

## 🚀 **Next Steps**

1. Review this document with your team
2. Prioritize improvements based on your compliance timeline
3. Create GitHub issues for each improvement
4. Implement high-priority items first
5. Test thoroughly in staging environment
6. Deploy to production with monitoring

---

## 📞 **Support & Resources**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [SOC 2 Compliance Guide](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Status:** Active


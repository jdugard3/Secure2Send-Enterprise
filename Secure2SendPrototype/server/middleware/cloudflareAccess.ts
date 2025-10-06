import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '../env';

// Extend Request interface to include Cloudflare Access user info
declare global {
  namespace Express {
    interface Request {
      cloudflareUser?: {
        email: string;
        name?: string;
        groups?: string[];
        country?: string;
        iat: number;
        exp: number;
      };
    }
  }
}

// JWKS client for Cloudflare Access certificate verification
const client = jwksClient({
  jwksUri: `${env.CLOUDFLARE_ACCESS_ISSUER}/cdn-cgi/access/certs`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Middleware to verify Cloudflare Access JWT tokens
 * This middleware validates that requests come through Cloudflare Access
 * and extracts user information from the JWT token
 */
export const verifyCloudflareAccess = (req: Request, res: Response, next: NextFunction) => {
  // Skip verification in development mode or if not configured
  if (env.NODE_ENV === 'development' || !env.CLOUDFLARE_ACCESS_AUD) {
    return next();
  }

  const token = req.headers['cf-access-jwt-assertion'] as string;
  
  if (!token) {
    console.warn('Cloudflare Access token missing from request', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(401).json({ 
      error: 'Access denied: No authentication token provided',
      code: 'CF_ACCESS_TOKEN_MISSING'
    });
  }

  jwt.verify(token, getKey, {
    audience: env.CLOUDFLARE_ACCESS_AUD,
    issuer: env.CLOUDFLARE_ACCESS_ISSUER,
    algorithms: ['RS256']
  }, (err, decoded: any) => {
    if (err) {
      console.warn('Cloudflare Access token verification failed', {
        error: err.message,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({ 
        error: 'Access denied: Invalid authentication token',
        code: 'CF_ACCESS_TOKEN_INVALID'
      });
    }
    
    // Extract user information from the Cloudflare Access token
    req.cloudflareUser = {
      email: decoded.email,
      name: decoded.name || decoded.given_name + ' ' + decoded.family_name,
      groups: decoded.groups || [],
      country: decoded.country,
      iat: decoded.iat,
      exp: decoded.exp
    };
    
    // Log successful authentication for audit purposes
    console.info('Cloudflare Access authentication successful', {
      email: req.cloudflareUser.email,
      groups: req.cloudflareUser.groups,
      ip: req.ip,
      path: req.path
    });
    
    next();
  });
};

/**
 * Middleware to require specific groups for admin access
 * Use this for admin-only routes
 */
export const requireAdminAccess = (requiredGroups: string[] = ['secure2send-admins']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.cloudflareUser) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userGroups = req.cloudflareUser.groups || [];
    const hasRequiredGroup = requiredGroups.some(group => userGroups.includes(group));

    if (!hasRequiredGroup) {
      console.warn('Admin access denied - insufficient permissions', {
        email: req.cloudflareUser.email,
        userGroups,
        requiredGroups,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Access denied: Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Middleware to require specific email domains
 * Useful for restricting access to company email domains
 */
export const requireEmailDomain = (allowedDomains: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.cloudflareUser) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const emailDomain = req.cloudflareUser.email.split('@')[1];
    if (!allowedDomains.includes(emailDomain)) {
      console.warn('Access denied - invalid email domain', {
        email: req.cloudflareUser.email,
        emailDomain,
        allowedDomains,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Access denied: Invalid email domain',
        code: 'INVALID_EMAIL_DOMAIN'
      });
    }

    next();
  };
};

/**
 * Middleware to check session validity and token expiration
 */
export const checkTokenExpiration = (req: Request, res: Response, next: NextFunction) => {
  if (!req.cloudflareUser) {
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  const bufferTime = 300; // 5 minutes before expiration

  if (req.cloudflareUser.exp - bufferTime <= now) {
    console.warn('Cloudflare Access token nearing expiration', {
      email: req.cloudflareUser.email,
      expiresAt: new Date(req.cloudflareUser.exp * 1000),
      ip: req.ip
    });
    
    // Set header to warn client about token expiration
    res.set('X-Token-Expiring', 'true');
  }

  next();
};

/**
 * Get user info from Cloudflare Access token
 * Utility function for use in route handlers
 */
export const getCloudflareUser = (req: Request) => {
  return req.cloudflareUser;
};





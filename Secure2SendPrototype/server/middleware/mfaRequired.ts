import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user needs to complete MFA setup
 * Blocks access to ALL protected routes until MFA is configured
 */
export const requireMfaSetup = (req: any, res: Response, next: NextFunction) => {
  // Skip MFA requirement check for public routes and MFA-related routes
  const exemptRoutes = [
    // Authentication routes
    '/api/login',
    '/api/register',
    '/api/logout',
    '/api/auth/user',
    '/api/login/mfa',
    
    // MFA setup routes
    '/api/mfa/status',
    '/api/mfa/setup/generate', 
    '/api/mfa/setup/verify',
    '/api/mfa/verify',
    
    // Health check (for Fly.io monitoring)
    '/api/health',
    
    // Email preview routes (development)
    '/api/emails/preview'
  ];
  
  // Allow all exempt routes
  if (exemptRoutes.some(route => req.path === route || req.path.startsWith(route))) {
    return next();
  }

  // Allow non-API routes (static files, etc.)
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  // Check if user is authenticated
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Check if user needs to set up MFA
  if (req.user.mfaRequired && !req.user.mfaEnabled) {
    console.log('🚫 MFA Setup Required - Blocking access to:', req.path, 'for user:', req.user.email);
    return res.status(403).json({ 
      message: 'MFA setup required before accessing this resource',
      mfaSetupRequired: true,
      redirectTo: '/mfa-setup'
    });
  }

  // User has MFA enabled or doesn't require it, allow access
  next();
};

/**
 * Routes that should be accessible even without MFA setup
 */
export const mfaExemptRoutes = [
  '/api/login',
  '/api/register', 
  '/api/logout',
  '/api/auth/user',
  '/api/login/mfa',
  '/api/mfa/status',
  '/api/mfa/setup/generate',
  '/api/mfa/setup/verify',
  '/api/mfa/verify',
  '/api/health',
  '/api/emails/preview'
];

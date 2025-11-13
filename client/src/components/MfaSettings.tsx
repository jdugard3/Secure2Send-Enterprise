import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, ShieldCheck, ShieldX, Key, AlertTriangle, RefreshCw, Calendar, Clock, Mail, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MfaSetup } from './MfaSetup';
import { BackupCodes } from './BackupCodes';

interface MfaStatus {
  totp: {
    enabled: boolean;
    setupAt?: string;
    lastUsed?: string;
    backupCodesRemaining: number;
  };
  email: {
    enabled: boolean;
    setupAt?: string;
    lastUsed?: string;
  };
  anyEnabled: boolean;
}

export function MfaSettings() {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  
  // TOTP actions
  const [disableTotpPassword, setDisableTotpPassword] = useState('');
  
  // Email MFA actions
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  const [emailSetupPassword, setEmailSetupPassword] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [emailSetupStep, setEmailSetupStep] = useState<'password' | 'verify'>('password');
  const [disableEmailPassword, setDisableEmailPassword] = useState('');
  
  // Backup codes
  const [regeneratePassword, setRegeneratePassword] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMfaStatus();
  }, []);

  const fetchMfaStatus = async () => {
    try {
      const response = await fetch('/api/mfa/status', {
        credentials: 'include',
      });

      if (response.ok) {
        const status = await response.json();
        setMfaStatus(status);
      } else {
        throw new Error('Failed to fetch MFA status');
      }
    } catch (error) {
      console.error('Failed to fetch MFA status:', error);
      toast({
        title: "Error",
        description: "Failed to load MFA settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = (backupCodes: string[]) => {
    setNewBackupCodes(backupCodes);
    setShowBackupCodes(true);
    setShowSetup(false);
    fetchMfaStatus();
  };

  const handleBackupCodesClose = () => {
    setShowBackupCodes(false);
    setNewBackupCodes([]);
  };

  // ============================================
  // TOTP (Authenticator App) Functions
  // ============================================
  
  const disableTotpMfa = async () => {
    if (!disableTotpPassword.trim()) {
      setError('Please enter your current password');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: disableTotpPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Authenticator App Disabled",
          description: "TOTP authentication has been disabled for your account.",
        });
        setDisableTotpPassword('');
        fetchMfaStatus();
      } else {
        setError(data.error || 'Failed to disable authenticator app');
      }
    } catch (error) {
      setError('Failed to disable authenticator app. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // Email MFA Functions
  // ============================================
  
  const startEmailMfaSetup = async () => {
    if (!emailSetupPassword.trim()) {
      setError('Please enter your current password');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/email/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: emailSetupPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmailSetupStep('verify');
        toast({
          title: "Verification Code Sent",
          description: "Check your email for the 6-digit verification code.",
        });
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const verifyAndActivateEmailMfa = async () => {
    if (!emailVerificationCode.trim() || emailVerificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/email/verify-and-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: emailVerificationCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Email MFA Enabled",
          description: "Email verification is now enabled as a backup MFA method.",
        });
        setShowEmailSetup(false);
        setEmailSetupPassword('');
        setEmailVerificationCode('');
        setEmailSetupStep('password');
        fetchMfaStatus();
      } else {
        setError(data.error || 'Failed to enable email MFA');
      }
    } catch (error) {
      setError('Failed to enable email MFA. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const disableEmailMfa = async () => {
    if (!disableEmailPassword.trim()) {
      setError('Please enter your current password');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/email/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: disableEmailPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Email MFA Disabled",
          description: "Email verification has been disabled.",
        });
        setDisableEmailPassword('');
        fetchMfaStatus();
      } else {
        setError(data.error || 'Failed to disable email MFA');
      }
    } catch (error) {
      setError('Failed to disable email MFA. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // Backup Codes Functions
  // ============================================
  
  const regenerateBackupCodes = async () => {
    if (!regeneratePassword.trim()) {
      setError('Please enter your current password');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/backup-codes/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: regeneratePassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNewBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setRegeneratePassword('');
        fetchMfaStatus();
        toast({
          title: "Backup Codes Regenerated",
          description: "New backup codes have been generated. Your old codes are no longer valid.",
        });
      } else {
        setError(data.error || 'Failed to regenerate backup codes');
      }
    } catch (error) {
      setError('Failed to regenerate backup codes. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (showSetup) {
    return (
      <MfaSetup
        onSetupComplete={handleSetupComplete}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  if (showBackupCodes) {
    return (
      <BackupCodes
        codes={newBackupCodes}
        onClose={handleBackupCodesClose}
      />
    );
  }

  const hasAnyMfa = mfaStatus?.anyEnabled || false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {hasAnyMfa ? (
            <ShieldCheck className="h-6 w-6 text-green-600" />
          ) : (
            <ShieldX className="h-6 w-6 text-gray-400" />
          )}
          <div>
            <CardTitle>Multi-Factor Authentication</CardTitle>
            <CardDescription>
              Manage your MFA methods for enhanced account security
            </CardDescription>
          </div>
          <div className="ml-auto">
            <Badge variant={hasAnyMfa ? "default" : "secondary"}>
              {hasAnyMfa ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ============================================ */}
        {/* Authenticator App (TOTP) Section */}
        {/* ============================================ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Authenticator App</h3>
                <p className="text-sm text-muted-foreground">
                  Use TOTP codes from your authenticator app
                </p>
              </div>
            </div>
            {mfaStatus?.totp?.enabled ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Disabled
              </Badge>
            )}
          </div>

          {mfaStatus?.totp?.enabled ? (
            <div className="ml-8 space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm space-y-1">
                {mfaStatus.totp.setupAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Enabled:</span>
                    <span>{new Date(mfaStatus.totp.setupAt).toLocaleDateString()}</span>
                  </div>
                )}
                {mfaStatus.totp.lastUsed && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last used:</span>
                    <span>{new Date(mfaStatus.totp.lastUsed).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="disable-totp-password">Password to Disable</Label>
                <Input
                  id="disable-totp-password"
                  type="password"
                  placeholder="Enter your current password"
                  value={disableTotpPassword}
                  onChange={(e) => setDisableTotpPassword(e.target.value)}
                />
              </div>

              <Button
                onClick={disableTotpMfa}
                disabled={actionLoading || !disableTotpPassword.trim()}
                variant="destructive"
                size="sm"
              >
                {actionLoading ? 'Disabling...' : 'Disable Authenticator App'}
              </Button>
            </div>
          ) : (
            <div className="ml-8">
              <Button onClick={() => setShowSetup(true)} size="sm">
                <Smartphone className="w-4 h-4 mr-2" />
                Enable Authenticator App
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* ============================================ */}
        {/* Email MFA Section */}
        {/* ============================================ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Email Verification</h3>
                <p className="text-sm text-muted-foreground">
                  Receive verification codes via email
                </p>
              </div>
            </div>
            {mfaStatus?.email?.enabled ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Disabled
              </Badge>
            )}
          </div>

          {mfaStatus?.email?.enabled ? (
            <div className="ml-8 space-y-3 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                You can receive verification codes via email as a backup authentication method.
              </p>

              <div className="space-y-2">
                <Label htmlFor="disable-email-password">Password to Disable</Label>
                <Input
                  id="disable-email-password"
                  type="password"
                  placeholder="Enter your current password"
                  value={disableEmailPassword}
                  onChange={(e) => setDisableEmailPassword(e.target.value)}
                />
              </div>

              <Button
                onClick={disableEmailMfa}
                disabled={actionLoading || !disableEmailPassword.trim()}
                variant="destructive"
                size="sm"
              >
                {actionLoading ? 'Disabling...' : 'Disable Email Verification'}
              </Button>
            </div>
          ) : (
            <div className="ml-8">
              <Button onClick={() => setShowEmailSetup(true)} size="sm" variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Enable Email Verification
              </Button>
            </div>
          )}
        </div>

        {/* Email Setup Dialog */}
        <Dialog open={showEmailSetup} onOpenChange={setShowEmailSetup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enable Email Verification</DialogTitle>
              <DialogDescription>
                {emailSetupStep === 'password' 
                  ? 'Enter your password to send a verification code to your email'
                  : 'Enter the 6-digit code sent to your email'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {emailSetupStep === 'password' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email-setup-password">Current Password</Label>
                    <Input
                      id="email-setup-password"
                      type="password"
                      placeholder="Enter your current password"
                      value={emailSetupPassword}
                      onChange={(e) => setEmailSetupPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && startEmailMfaSetup()}
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowEmailSetup(false);
                        setEmailSetupPassword('');
                        setError(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={startEmailMfaSetup}
                      disabled={actionLoading || !emailSetupPassword.trim()}
                      className="flex-1"
                    >
                      {actionLoading ? 'Sending...' : 'Send Verification Code'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      A 6-digit verification code has been sent to your email. Enter it below to complete setup.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="email-verification-code">Verification Code</Label>
                    <Input
                      id="email-verification-code"
                      placeholder="000000"
                      value={emailVerificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setEmailVerificationCode(value);
                      }}
                      className="text-center text-lg tracking-widest font-mono"
                      maxLength={6}
                      onKeyPress={(e) => e.key === 'Enter' && verifyAndActivateEmailMfa()}
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setEmailSetupStep('password');
                        setEmailVerificationCode('');
                        setError(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={verifyAndActivateEmailMfa}
                      disabled={actionLoading || emailVerificationCode.length !== 6}
                      className="flex-1"
                    >
                      {actionLoading ? 'Verifying...' : 'Enable Email MFA'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {hasAnyMfa && (
          <>
            <Separator />

            {/* ============================================ */}
            {/* Backup Codes Section */}
            {/* ============================================ */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Backup Codes</h3>
                  <p className="text-sm text-muted-foreground">
                    Emergency access codes - {mfaStatus?.totp?.backupCodesRemaining || 0} remaining
                  </p>
                </div>
              </div>

              <div className="ml-8 space-y-3 p-4 bg-muted/50 rounded-lg">
                {(mfaStatus?.totp?.backupCodesRemaining || 0) < 3 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      You have {mfaStatus?.totp?.backupCodesRemaining || 0} backup codes remaining. Consider regenerating new ones.
                    </AlertDescription>
                  </Alert>
                )}

                <p className="text-sm text-muted-foreground">
                  Backup codes can be used to access your account if you lose access to your other MFA methods.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="regenerate-password">Password to Regenerate</Label>
                  <Input
                    id="regenerate-password"
                    type="password"
                    placeholder="Enter your current password"
                    value={regeneratePassword}
                    onChange={(e) => setRegeneratePassword(e.target.value)}
                  />
                </div>

                <Button
                  onClick={regenerateBackupCodes}
                  disabled={actionLoading || !regeneratePassword.trim()}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {actionLoading ? 'Regenerating...' : 'Regenerate Backup Codes'}
                </Button>
              </div>
            </div>
          </>
        )}

        {!hasAnyMfa && (
          <>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Enable at least one MFA method to add an extra layer of security to your account.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Benefits of MFA:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Protects against unauthorized access</li>
                <li>• Multiple verification methods available</li>
                <li>• Includes backup codes for emergency recovery</li>
                <li>• Required for accessing sensitive business data</li>
              </ul>
            </div>
          </>
        )}

        {error && !showEmailSetup && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

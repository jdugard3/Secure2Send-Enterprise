import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, Key, Smartphone, Mail, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MfaVerificationDualProps {
  userId: string;
  email: string;
  onVerificationSuccess: (userData: any) => void;
  onCancel: () => void;
  mfaTotp?: boolean;  // Whether user has TOTP enabled
  mfaEmail?: boolean; // Whether user has Email MFA enabled
}

export function MfaVerificationDual({ userId, email, onVerificationSuccess, onCancel, mfaTotp = false, mfaEmail = false }: MfaVerificationDualProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMethod, setActiveMethod] = useState<'totp' | 'email' | 'backup'>(mfaTotp ? 'totp' : 'email');
  const [useBackupCode, setUseBackupCode] = useState(false);
  
  // Email OTP state
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpExpiresAt, setEmailOtpExpiresAt] = useState<Date | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // User's available MFA methods (passed from login response)
  const availableMethods = {
    totp: mfaTotp,
    email: mfaEmail,
  };
  
  const { toast } = useToast();

  // Countdown timer for email OTP expiration
  useEffect(() => {
    if (!emailOtpExpiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = emailOtpExpiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining(0);
        setEmailOtpSent(false);
        clearInterval(interval);
      } else {
        setTimeRemaining(Math.floor(diff / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [emailOtpExpiresAt]);

  const sendEmailOtp = async () => {
    setSendingEmail(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/email/send-login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setEmailOtpSent(true);
      // Set expiry to 5 minutes from now (OTP duration)
      setEmailOtpExpiresAt(new Date(Date.now() + 5 * 60 * 1000));
      toast({
        title: "Verification Code Sent",
        description: "Check your email for the 6-digit verification code.",
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send verification code');
    } finally {
      setSendingEmail(false);
    }
  };

  const verifyMfa = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter a verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let endpoint = '/api/login/mfa'; // Default for TOTP and backup codes
      let body: any = { userId, code: verificationCode.trim() };

      // Use specific endpoint for email MFA
      if (activeMethod === 'email' && !useBackupCode) {
        endpoint = '/api/mfa/email/verify-login-otp';
        body = { userId, otp: verificationCode.trim() };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Invalid verification code');
      }

      if (data.isBackupCode || data.usedBackupCode) {
        toast({
          title: "Backup Code Used",
          description: "You've successfully logged in using a backup code. Consider regenerating your backup codes.",
        });
      }

      onVerificationSuccess(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && verificationCode.trim()) {
      verifyMfa();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (useBackupCode) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Key className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Use Backup Code</CardTitle>
          <CardDescription>
            Enter one of your backup codes for {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-code">Backup Code</Label>
            <Input
              id="backup-code"
              placeholder="XXXX-XXXX"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                if (value.length <= 9) {
                  setVerificationCode(value);
                }
              }}
              className="text-center text-lg font-mono"
              maxLength={9}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter one of your backup codes (format: XXXX-XXXX)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button 
              onClick={verifyMfa} 
              disabled={loading || !verificationCode.trim()}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify and Sign In'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUseBackupCode(false);
                setVerificationCode('');
                setError(null);
              }}
              className="w-full"
            >
              Back to MFA methods
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Choose a verification method for {email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeMethod} onValueChange={(v) => {
          setActiveMethod(v as 'totp' | 'email');
          setVerificationCode('');
          setError(null);
        }}>
          <TabsList className="grid w-full grid-cols-2">
            {availableMethods.totp && (
              <TabsTrigger value="totp" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Authenticator
              </TabsTrigger>
            )}
            {availableMethods.email && (
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
            )}
          </TabsList>

          {/* TOTP Tab */}
          {availableMethods.totp && (
            <TabsContent value="totp" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totp-code">Verification Code</Label>
                <Input
                  id="totp-code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
                  className="text-center text-lg tracking-widest font-mono"
                  maxLength={6}
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={verifyMfa} 
                disabled={loading || verificationCode.length !== 6}
                className="w-full"
              >
                {loading ? 'Verifying...' : 'Verify and Sign In'}
              </Button>
            </TabsContent>
          )}

          {/* Email Tab */}
          {availableMethods.email && (
            <TabsContent value="email" className="space-y-4">
              {!emailOtpSent ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    Click the button below to receive a verification code via email
                  </p>
                  <Button 
                    onClick={sendEmailOtp} 
                    disabled={sendingEmail}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {sendingEmail ? 'Sending...' : 'Send Code to Email'}
                  </Button>
                </div>
              ) : (
                <>
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      A verification code has been sent to your email.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-code">Verification Code</Label>
                      {timeRemaining > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires in {formatTime(timeRemaining)}
                        </span>
                      )}
                    </div>
                    <Input
                      id="email-code"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(value);
                      }}
                      className="text-center text-lg tracking-widest font-mono"
                      maxLength={6}
                      onKeyPress={handleKeyPress}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Enter the 6-digit code from your email
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Button 
                      onClick={verifyMfa} 
                      disabled={loading || verificationCode.length !== 6}
                      className="w-full"
                    >
                      {loading ? 'Verifying...' : 'Verify and Sign In'}
                    </Button>

                    <Button
                      onClick={sendEmailOtp}
                      disabled={sendingEmail}
                      variant="ghost"
                      size="sm"
                      className="w-full"
                    >
                      {sendingEmail ? 'Sending...' : 'Resend Code'}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>

        <Separator />

        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUseBackupCode(true);
              setVerificationCode('');
              setError(null);
            }}
            className="w-full text-sm"
          >
            <Key className="w-4 h-4 mr-2" />
            Use backup code instead
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="w-full text-sm text-muted-foreground"
          >
            Back to login
          </Button>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            If you've lost access to all your MFA methods, contact support for assistance.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}


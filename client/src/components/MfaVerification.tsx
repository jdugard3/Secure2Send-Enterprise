import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Shield, AlertTriangle, Key, Mail, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MfaVerificationProps {
  userId: string;
  email: string;
  mfaTotp: boolean; // Whether TOTP is available
  mfaEmail: boolean; // Whether Email is available
  onVerificationSuccess: (userData: any) => void;
  onCancel: () => void;
}

type MfaMethod = 'email' | 'totp' | 'backup';

export function MfaVerification({ 
  userId, 
  email, 
  mfaTotp,
  mfaEmail,
  onVerificationSuccess, 
  onCancel 
}: MfaVerificationProps) {
  // Determine default method - prefer email if available
  const getDefaultMethod = (): MfaMethod => {
    if (mfaEmail) return 'email';
    if (mfaTotp) return 'totp';
    return 'backup';
  };

  const [selectedMethod, setSelectedMethod] = useState<MfaMethod>(getDefaultMethod());
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const { toast } = useToast();

  // Auto-send email OTP if email MFA is available and selected
  useEffect(() => {
    if (selectedMethod === 'email' && !emailOtpSent) {
      sendEmailOtp();
    }
  }, [selectedMethod]);

  const sendEmailOtp = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/email/send-login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.resetAt) {
          const countdown = Math.ceil((new Date(data.resetAt).getTime() - Date.now()) / 1000);
          setResendCountdown(countdown);
          startCountdown();
        }
        throw new Error(data.error || 'Failed to send OTP');
      }

      setEmailOtpSent(true);
      toast({
        title: "Code Sent",
        description: `A 6-digit code has been sent to ${email}`,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    const interval = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const verifyMfa = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter a verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      
      if (selectedMethod === 'email') {
        // Email MFA verification
        response = await fetch('/api/mfa/email/verify-login-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            userId,
            otp: verificationCode.trim(),
          }),
        });
      } else {
        // TOTP or backup code verification (existing endpoint)
        response = await fetch('/api/login/mfa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            userId,
            code: verificationCode.trim(),
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid verification code');
      }

      if (data.usedBackupCode) {
        toast({
          title: "Backup Code Used",
          description: "You've successfully logged in using a backup code. Consider regenerating your backup codes.",
          variant: "default",
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

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method as MfaMethod);
    setVerificationCode('');
    setError(null);
    
    // Auto-send email OTP when switching to email
    if (method === 'email' && !emailOtpSent) {
      sendEmailOtp();
    }
  };

  const renderEmailVerification = () => (
    <div className="space-y-4">
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          We sent a 6-digit code to <strong>{email}</strong>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="email-code">Email Verification Code</Label>
        <Input
          id="email-code"
          placeholder="000000"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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

      <Button 
        onClick={verifyMfa} 
        disabled={loading || verificationCode.length !== 6}
        className="w-full"
      >
        {loading ? 'Verifying...' : 'Verify and Sign In'}
      </Button>

      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={sendEmailOtp}
          disabled={loading || resendCountdown > 0}
          className="text-sm"
        >
          {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code'}
        </Button>
      </div>
    </div>
  );

  const renderTotpVerification = () => (
    <div className="space-y-4">
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          Open your authenticator app and enter the 6-digit code
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="totp-code">Authenticator Code</Label>
        <Input
          id="totp-code"
          placeholder="000000"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
    </div>
  );

  const renderBackupCodeVerification = () => (
    <div className="space-y-4">
      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          Enter one of your backup codes (format: XXXX-XXXX)
        </AlertDescription>
      </Alert>

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
          className="text-center text-lg tracking-wider font-mono"
          maxLength={9}
          onKeyPress={handleKeyPress}
          autoFocus
        />
        <p className="text-xs text-muted-foreground text-center">
          This code can only be used once
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
        disabled={loading || !verificationCode.trim()}
        className="w-full"
      >
        {loading ? 'Verifying...' : 'Verify and Sign In'}
      </Button>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Lost all your backup codes? Please contact support to regain access to your account.
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Verify your identity for {email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show tabs only if multiple methods are available */}
        {(mfaEmail || mfaTotp) && (
          <Tabs value={selectedMethod} onValueChange={handleMethodChange}>
            <TabsList className="grid w-full grid-cols-3">
              {mfaEmail && (
                <TabsTrigger value="email" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Email</span>
                </TabsTrigger>
              )}
              {mfaTotp && (
                <TabsTrigger value="totp" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">App</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="backup" className="flex items-center gap-1 text-xs sm:text-sm">
                <Key className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Backup</span>
              </TabsTrigger>
            </TabsList>

            {mfaEmail && (
              <TabsContent value="email" className="mt-6">
                {renderEmailVerification()}
              </TabsContent>
            )}

            {mfaTotp && (
              <TabsContent value="totp" className="mt-6">
                {renderTotpVerification()}
              </TabsContent>
            )}

            <TabsContent value="backup" className="mt-6">
              {renderBackupCodeVerification()}
            </TabsContent>
          </Tabs>
        )}

        {/* If only one method available, show it directly without tabs */}
        {!mfaEmail && !mfaTotp && renderBackupCodeVerification()}

        <Separator />

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-sm text-muted-foreground"
          >
            Back to login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

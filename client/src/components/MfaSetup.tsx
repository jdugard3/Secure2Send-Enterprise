import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Shield, Smartphone, AlertTriangle, Mail, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface MfaSetupProps {
  onSetupComplete: (backupCodes?: string[]) => void;
  onCancel: () => void;
  isRequired?: boolean;
}

type MfaMethod = 'email' | 'totp';
type EmailStep = 'intro' | 'verify';
type TotpStep = 'generate' | 'verify';

export function MfaSetup({ onSetupComplete, onCancel, isRequired = false }: MfaSetupProps) {
  const [selectedMethod, setSelectedMethod] = useState<MfaMethod>('email'); // Default to email
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Email MFA state
  const [emailStep, setEmailStep] = useState<EmailStep>('intro');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [rateLimitResetAt, setRateLimitResetAt] = useState<Date | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  
  // TOTP MFA state
  const [totpStep, setTotpStep] = useState<TotpStep>('generate');
  const [totpSetupData, setTotpSetupData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    manualEntryKey: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // ========== Email MFA Functions ==========
  
  const sendEmailOtp = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/email/send-setup-otp', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.resetAt) {
          setRateLimitResetAt(new Date(data.resetAt));
          const countdown = Math.ceil((new Date(data.resetAt).getTime() - Date.now()) / 1000);
          setResendCountdown(countdown);
          startCountdown();
        }
        throw new Error(data.error || 'Failed to send OTP');
      }

      setEmailStep('verify');
      toast({
        title: "Code Sent",
        description: `A 6-digit code has been sent to ${user?.email}`,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (!emailOtp.trim() || !emailPassword.trim()) {
      setError('Please enter both the OTP code and your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/email/verify-setup-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          otp: emailOtp.trim(),
          password: emailPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      if (data.success) {
        toast({
          title: "Email MFA Enabled",
          description: "Your account is now protected with email-based MFA.",
        });
        // Email MFA doesn't use backup codes, redirect directly
        onSetupComplete();
      } else {
        setError(data.error || 'Failed to enable email MFA');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify OTP');
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

  // ========== TOTP MFA Functions ==========
  
  const generateTotpSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/setup/generate', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate MFA setup');
      }

      const data = await response.json();
      setTotpSetupData(data);
      setTotpStep('verify');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnableTotp = async () => {
    if (!totpSetupData || !totpCode.trim()) {
      setError('Please enter the verification code from your authenticator app');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/setup/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          secret: totpSetupData.secret,
          token: totpCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify MFA setup');
      }

      if (data.success) {
        toast({
          title: "Authenticator App MFA Enabled",
          description: "Your account is now protected with authenticator app MFA.",
        });
        // Pass backup codes to show them
        onSetupComplete(data.backupCodes);
      } else {
        setError(data.error || 'Failed to enable MFA');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const copyManualKey = async () => {
    if (totpSetupData?.manualEntryKey) {
      await navigator.clipboard.writeText(totpSetupData.manualEntryKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Manual entry key copied to clipboard",
      });
    }
  };

  // ========== Render Functions ==========

  const renderEmailMfaIntro = () => (
    <div className="space-y-4">
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          We'll send a 6-digit code to <strong>{user?.email}</strong> whenever you log in.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <h4 className="font-medium">How it works:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Receive a code via email when you log in</li>
          <li>• Enter the code to complete your login</li>
          <li>• Codes expire after 5 minutes</li>
          <li>• No app installation required</li>
        </ul>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        onClick={sendEmailOtp} 
        disabled={loading || resendCountdown > 0} 
        className="w-full"
      >
        {loading ? 'Sending...' : resendCountdown > 0 ? `Wait ${resendCountdown}s` : 'Send Verification Code'}
      </Button>
    </div>
  );

  const renderEmailMfaVerify = () => (
    <div className="space-y-4">
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          We sent a 6-digit code to <strong>{user?.email}</strong>. Check your inbox and enter the code below.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="email-otp">Verification Code</Label>
        <Input
          id="email-otp"
          placeholder="000000"
          value={emailOtp}
          onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="text-center text-lg tracking-widest font-mono"
          maxLength={6}
        />
        <p className="text-xs text-muted-foreground text-center">
          Enter the 6-digit code from your email
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email-password">Confirm Your Password</Label>
        <Input
          id="email-password"
          type="password"
          placeholder="Enter your password"
          value={emailPassword}
          onChange={(e) => setEmailPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          For security, confirm your password to enable email MFA
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={() => {
            setEmailStep('intro');
            setEmailOtp('');
            setEmailPassword('');
            setError(null);
          }}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          onClick={verifyEmailOtp} 
          disabled={loading || emailOtp.length !== 6 || !emailPassword}
          className="flex-1"
        >
          {loading ? 'Verifying...' : 'Enable Email MFA'}
        </Button>
      </div>

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

  const renderTotpMfaGenerate = () => (
    <div className="space-y-4">
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          You'll need an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <h4 className="font-medium">What you'll get:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Enhanced account security</li>
          <li>• Works offline</li>
          <li>• New code every 30 seconds</li>
          <li>• Backup codes for account recovery</li>
        </ul>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={generateTotpSetup} disabled={loading} className="w-full">
        {loading ? 'Setting up...' : 'Continue'}
      </Button>
    </div>
  );

  const renderTotpMfaVerify = () => (
    <div className="space-y-6">
      {totpSetupData && (
        <>
          {/* QR Code */}
          <div className="text-center">
            <div className="inline-block p-4 bg-white rounded-lg border">
              <img 
                src={totpSetupData.qrCodeDataUrl} 
                alt="MFA QR Code" 
                className="w-48 h-48"
              />
            </div>
          </div>

          <Separator />

          {/* Manual Entry */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Manual Entry Key</Label>
            <div className="flex gap-2">
              <Input 
                value={totpSetupData.manualEntryKey} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyManualKey}
                className="px-3"
              >
                {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If you can't scan the QR code, enter this key manually in your authenticator app
            </p>
          </div>

          <Separator />

          {/* Verification */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp-code">Enter Verification Code</Label>
              <Input
                id="totp-code"
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-widest font-mono"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
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
              onClick={verifyAndEnableTotp} 
              disabled={loading || totpCode.length !== 6}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Enable Authenticator MFA'}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle>Enable Multi-Factor Authentication</CardTitle>
        <CardDescription>
          Choose your preferred authentication method
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as MfaMethod)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Code
            </TabsTrigger>
            <TabsTrigger value="totp" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Authenticator App
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-6">
            {emailStep === 'intro' ? renderEmailMfaIntro() : renderEmailMfaVerify()}
          </TabsContent>

          <TabsContent value="totp" className="mt-6">
            {totpStep === 'generate' ? renderTotpMfaGenerate() : renderTotpMfaVerify()}
          </TabsContent>
        </Tabs>

        {!isRequired && (
          <>
            <Separator />
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Skip for now
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

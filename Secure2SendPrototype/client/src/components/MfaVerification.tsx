import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Shield, AlertTriangle, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MfaVerificationProps {
  userId: string;
  email: string;
  onVerificationSuccess: (userData: any) => void;
  onCancel: () => void;
}

export function MfaVerification({ userId, email, onVerificationSuccess, onCancel }: MfaVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [checkingMfaStatus, setCheckingMfaStatus] = useState(true);
  const { toast } = useToast();

  // Check if user actually has MFA enabled
  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        const response = await fetch('/api/mfa/status', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (!data.enabled) {
            // User doesn't have MFA enabled, redirect to setup
            console.log('🔄 User needs MFA setup, redirecting...');
            window.location.href = '/mfa-setup';
            return;
          }
        }
      } catch (error) {
        console.error('Error checking MFA status:', error);
      } finally {
        setCheckingMfaStatus(false);
      }
    };

    checkMfaStatus();
  }, []);

  const verifyMfa = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter a verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/login/mfa', {
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

  // Show loading while checking MFA status
  if (checkingMfaStatus) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Checking Security Status</CardTitle>
          <CardDescription className="text-center">
            Verifying your account security settings...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          Enter the verification code from your authenticator app for {email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-code">
            {useBackupCode ? 'Backup Code' : 'Verification Code'}
          </Label>
          <Input
            id="mfa-code"
            placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
            value={verificationCode}
            onChange={(e) => {
              if (useBackupCode) {
                // Allow backup code format (XXXX-XXXX)
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                if (value.length <= 9) { // 4 chars + dash + 4 chars
                  setVerificationCode(value);
                }
              } else {
                // Only allow digits for TOTP codes
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
              }
            }}
            className={`text-center text-lg tracking-widest font-mono ${
              useBackupCode ? '' : 'tracking-widest'
            }`}
            maxLength={useBackupCode ? 9 : 6}
            onKeyPress={handleKeyPress}
            autoFocus
          />
          <p className="text-xs text-muted-foreground text-center">
            {useBackupCode 
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'
            }
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button 
            onClick={verifyMfa} 
            disabled={loading || !verificationCode.trim()}
            className="w-full"
          >
            {loading ? 'Verifying...' : 'Verify and Sign In'}
          </Button>

          <Separator />

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setVerificationCode('');
                setError(null);
              }}
              className="text-sm"
            >
              <Key className="w-4 h-4 mr-2" />
              {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
            </Button>
          </div>

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
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            If you've lost access to your authenticator app, use one of your backup codes or contact support.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

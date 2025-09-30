import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Shield, Smartphone, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MfaSetupProps {
  onSetupComplete: (backupCodes: string[]) => void;
  onCancel: () => void;
  isRequired?: boolean; // Whether MFA setup is mandatory
}

export function MfaSetup({ onSetupComplete, onCancel, isRequired = false }: MfaSetupProps) {
  const [step, setStep] = useState<'generate' | 'verify'>('generate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    manualEntryKey: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const { toast } = useToast();

  const generateMfaSetup = async () => {
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
      setSetupData(data);
      setStep('verify');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!setupData || !verificationCode.trim()) {
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
          secret: setupData.secret,
          token: verificationCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify MFA setup');
      }

      if (data.success) {
        toast({
          title: "MFA Enabled Successfully",
          description: "Your account is now protected with multi-factor authentication.",
        });
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
    if (setupData?.manualEntryKey) {
      await navigator.clipboard.writeText(setupData.manualEntryKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Manual entry key copied to clipboard",
      });
    }
  };

  if (step === 'generate') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Enable Multi-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with MFA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              You'll need an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to continue.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">What you'll get:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Enhanced account security</li>
              <li>• Protection against unauthorized access</li>
              <li>• Backup codes for account recovery</li>
            </ul>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {!isRequired && (
              <Button onClick={onCancel} variant="outline" className="flex-1">
                Cancel
              </Button>
            )}
            <Button onClick={generateMfaSetup} disabled={loading} className={isRequired ? "w-full" : "flex-1"}>
              {loading ? 'Setting up...' : 'Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Set Up Your Authenticator</CardTitle>
        <CardDescription>
          Scan the QR code or enter the manual key in your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {setupData && (
          <>
            {/* QR Code */}
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-lg border">
                <img 
                  src={setupData.qrCodeDataUrl} 
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
                  value={setupData.manualEntryKey} 
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
                <Label htmlFor="verification-code">Enter Verification Code</Label>
                <Input
                  id="verification-code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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

              <div className="flex gap-2">
                {!isRequired && (
                  <Button onClick={onCancel} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                )}
                <Button 
                  onClick={verifyAndEnable} 
                  disabled={loading || verificationCode.length !== 6}
                  className={isRequired ? "w-full" : "flex-1"}
                >
                  {loading ? 'Verifying...' : 'Enable MFA'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

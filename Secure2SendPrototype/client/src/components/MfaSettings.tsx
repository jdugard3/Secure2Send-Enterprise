import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, ShieldCheck, ShieldX, Key, AlertTriangle, RefreshCw, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MfaSetup } from './MfaSetup';
import { BackupCodes } from './BackupCodes';

interface MfaStatus {
  enabled: boolean;
  setupAt?: string;
  lastUsed?: string;
  backupCodesRemaining: number;
}

export function MfaSettings() {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
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
    fetchMfaStatus(); // Refresh status
  };

  const handleBackupCodesClose = () => {
    setShowBackupCodes(false);
    setNewBackupCodes([]);
  };

  const disableMfa = async () => {
    if (!disablePassword.trim()) {
      setError('Please enter your current password');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          password: disablePassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "MFA Disabled",
          description: "Multi-factor authentication has been disabled for your account.",
        });
        setDisablePassword('');
        fetchMfaStatus();
      } else {
        setError(data.error || 'Failed to disable MFA');
      }
    } catch (error) {
      setError('Failed to disable MFA. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

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
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          password: regeneratePassword,
        }),
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {mfaStatus?.enabled ? (
            <ShieldCheck className="h-6 w-6 text-green-600" />
          ) : (
            <ShieldX className="h-6 w-6 text-gray-400" />
          )}
          <div>
            <CardTitle>Multi-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </div>
          <div className="ml-auto">
            <Badge variant={mfaStatus?.enabled ? "default" : "secondary"}>
              {mfaStatus?.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {mfaStatus?.enabled ? (
          <>
            {/* MFA Status Info */}
            <div className="space-y-4">
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  Your account is protected with multi-factor authentication. You'll need your authenticator app to sign in.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {mfaStatus.setupAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Enabled:</span>
                    <span>{new Date(mfaStatus.setupAt).toLocaleDateString()}</span>
                  </div>
                )}
                {mfaStatus.lastUsed && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last used:</span>
                    <span>{new Date(mfaStatus.lastUsed).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Backup codes:</span>
                  <span>{mfaStatus.backupCodesRemaining} remaining</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Backup Codes Management */}
            <div className="space-y-4">
              <h4 className="font-medium">Backup Codes</h4>
              <p className="text-sm text-muted-foreground">
                Backup codes can be used to access your account if you lose your authenticator device.
                {mfaStatus.backupCodesRemaining < 3 && (
                  <span className="text-orange-600 font-medium">
                    {" "}You have {mfaStatus.backupCodesRemaining} codes remaining. Consider regenerating new ones.
                  </span>
                )}
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="regenerate-password">Current Password</Label>
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
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {actionLoading ? 'Regenerating...' : 'Regenerate Backup Codes'}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Disable MFA */}
            <div className="space-y-4">
              <h4 className="font-medium text-red-700">Disable MFA</h4>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Disabling MFA will make your account less secure. Only do this if you no longer have access to your authenticator app.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="disable-password">Current Password</Label>
                  <Input
                    id="disable-password"
                    type="password"
                    placeholder="Enter your current password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                  />
                </div>

                <Button
                  onClick={disableMfa}
                  disabled={actionLoading || !disablePassword.trim()}
                  variant="destructive"
                  className="w-full"
                >
                  {actionLoading ? 'Disabling...' : 'Disable MFA'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Enable MFA */}
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Enable multi-factor authentication to add an extra layer of security to your account.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium">Benefits of MFA:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Protects against unauthorized access</li>
                  <li>• Works with popular authenticator apps</li>
                  <li>• Includes backup codes for account recovery</li>
                  <li>• Required for accessing sensitive business data</li>
                </ul>
              </div>

              <Button onClick={() => setShowSetup(true)} className="w-full">
                <Shield className="w-4 h-4 mr-2" />
                Enable Multi-Factor Authentication
              </Button>
            </div>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

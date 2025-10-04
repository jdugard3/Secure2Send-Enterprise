import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Check, AlertTriangle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BackupCodesProps {
  codes: string[];
  onClose: () => void;
}

export function BackupCodes({ codes, onClose }: BackupCodesProps) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const { toast } = useToast();

  const copyAllCodes = async () => {
    const codesText = codes.join('\n');
    await navigator.clipboard.writeText(codesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied to clipboard",
      description: "All backup codes copied to clipboard",
    });
  };

  const downloadCodes = () => {
    const codesText = `Secure2Send Enterprise - MFA Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Keep these codes safe and secure!
Each code can only be used once.

Backup Codes:
${codes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Instructions:
- Use these codes if you lose access to your authenticator app
- Each code can only be used once
- Store them in a secure location
- Generate new codes if you suspect they've been compromised`;

    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secure2send-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setDownloaded(true);
    toast({
      title: "Backup codes downloaded",
      description: "Your backup codes have been saved to your downloads folder",
    });
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-green-600" />
        </div>
        <CardTitle className="text-green-700">MFA Enabled Successfully!</CardTitle>
        <CardDescription>
          Save these backup codes in a secure location. You'll need them if you lose access to your authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Each backup code can only be used once. Store them securely and don't share them with anyone.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Your Backup Codes</h4>
            <Badge variant="secondary">{codes.length} codes</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg border">
            {codes.map((code, index) => (
              <div key={index} className="font-mono text-sm text-center p-2 bg-white rounded border">
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={copyAllCodes}
              className="flex-1"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy All'}
            </Button>
            <Button
              variant="outline"
              onClick={downloadCodes}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Next steps:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Save these codes in a password manager or secure location</li>
                <li>• Don't store them on your phone or computer unencrypted</li>
                <li>• You can regenerate new codes anytime from your security settings</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button 
            onClick={onClose} 
            className="w-full"
            disabled={!copied && !downloaded}
          >
            {!copied && !downloaded 
              ? 'Save your codes first' 
              : 'Continue to Dashboard'
            }
          </Button>
          
          {!copied && !downloaded && (
            <p className="text-xs text-center text-muted-foreground">
              Please copy or download your backup codes before continuing
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

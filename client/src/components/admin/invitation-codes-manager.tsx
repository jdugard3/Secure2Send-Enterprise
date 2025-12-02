import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, CheckCircle2, Clock, XCircle, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InvitationCode {
  id: string;
  code: string;
  label: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  createdBy: string;
  usedBy?: string;
  createdAt: string;
  usedAt?: string;
}

export function InvitationCodesManager() {
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCodeLabel, setNewCodeLabel] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitationCodes();
  }, []);

  const fetchInvitationCodes = async () => {
    try {
      const response = await fetch('/api/admin/invitation-codes', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCodes(data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch invitation codes",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch invitation codes",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!newCodeLabel.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter who this code is for",
      });
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/admin/invitation-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ label: newCodeLabel.trim() }),
      });

      if (response.ok) {
        const newCode = await response.json();
        setCodes([newCode, ...codes]);
        setNewCodeLabel("");
        setDialogOpen(false);
        
        // Auto-copy code to clipboard
        await navigator.clipboard.writeText(newCode.code);
        
        toast({
          title: "Success",
          description: `Invitation code ${newCode.code} generated and copied to clipboard!`,
        });
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to generate invitation code",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate invitation code",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Copied!",
        description: `Code ${code} copied to clipboard`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy to clipboard",
      });
    }
  };

  const handleDeleteCode = async (codeId: string, codeValue: string) => {
    try {
      const response = await fetch(`/api/admin/invitation-codes/${codeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setCodes(codes.filter(code => code.id !== codeId));
        toast({
          title: "Code Deleted",
          description: `Invitation code ${codeValue} has been deleted`,
        });
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to delete invitation code",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete invitation code",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
      case 'USED':
        return <Badge className="bg-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Used</Badge>;
      case 'EXPIRED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation Codes</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Merchant Invitation Codes</CardTitle>
            <CardDescription>
              Generate and manage invitation codes for merchant onboarding
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Generate Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Invitation Code</DialogTitle>
                <DialogDescription>
                  Create a new invitation code for a specific merchant. The code will be automatically generated.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Who is this code for?</Label>
                  <Input
                    id="label"
                    placeholder="e.g., Joe's Pizza Shop, ABC Corporation"
                    value={newCodeLabel}
                    onChange={(e) => setNewCodeLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !generating) {
                        handleGenerateCode();
                      }
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    This helps you track who each code is intended for
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={generating}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateCode} disabled={generating}>
                  {generating ? "Generating..." : "Generate Code"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No invitation codes yet.</p>
            <p className="text-sm mt-2">Generate your first code to start onboarding merchants.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-semibold">
                      {code.code}
                    </TableCell>
                    <TableCell>{code.label}</TableCell>
                    <TableCell>{getStatusBadge(code.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(code.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(code.usedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                          disabled={code.status !== 'ACTIVE'}
                          title="Copy code"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete code"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Invitation Code</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this invitation code? This action cannot be undone.
                              </AlertDialogDescription>
                              <div className="mt-2 space-y-1">
                                <div className="font-medium">Code: {code.code}</div>
                                <div className="font-medium">For: {code.label}</div>
                                <div className="font-medium">Status: {code.status}</div>
                              </div>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCode(code.id, code.code)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


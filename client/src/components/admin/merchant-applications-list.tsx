import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building,
  Calendar,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface MerchantApplication {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  legalBusinessName?: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  eSignatureStatus?: 'NOT_SENT' | 'PENDING' | 'SIGNED' | 'DECLINED' | 'EXPIRED';
  eSignatureApplicationId?: string;
  eSignatureSentAt?: string;
  eSignatureCompletedAt?: string;
  client: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      companyName: string;
    };
  };
}

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
} as const;

const ESIGNATURE_STATUS_COLORS = {
  NOT_SENT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-blue-100 text-blue-800 animate-pulse',
  SIGNED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
} as const;

export default function MerchantApplicationsList() {
  const [selectedApplication, setSelectedApplication] = useState<MerchantApplication | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast} = useToast();
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['/api/merchant-applications'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/merchant-applications');
      return response.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ applicationId, status, reason }: { 
      applicationId: string; 
      status: string; 
      reason?: string;
    }) => {
      const response = await apiRequest('PUT', `/api/merchant-applications/${applicationId}/status`, {
        status,
        rejectionReason: reason,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Updated",
        description: `Application has been ${reviewAction?.toLowerCase()}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant-applications'] });
      setSelectedApplication(null);
      setReviewAction(null);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete draft application mutation
  const deleteMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await apiRequest("DELETE", `/api/merchant-applications/${applicationId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Deleted",
        description: "The draft application has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant-applications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // E-Signature mutation
  const sendForSignatureMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await apiRequest('POST', `/api/merchant-applications/${applicationId}/send-for-signature`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "E-Signature Request Sent",
        description: "The merchant will receive an email to sign the application.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant-applications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReview = (action: 'APPROVED' | 'REJECTED') => {
    if (!selectedApplication) return;

    if (action === 'REJECTED' && !rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    reviewMutation.mutate({
      applicationId: selectedApplication.id,
      status: action,
      reason: action === 'REJECTED' ? rejectionReason : undefined,
    });
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'UNDER_REVIEW':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'SUBMITTED':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Merchant Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Merchant Applications ({applications.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No merchant applications submitted yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application: MerchantApplication) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {application.legalBusinessName || application.client.user.companyName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {application.client.user.companyName}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {application.contactName || 
                         `${application.client.user.firstName} ${application.client.user.lastName}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {application.contactEmail || application.client.user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={STATUS_COLORS[application.status] || STATUS_COLORS.DRAFT}
                    >
                      <div className="flex items-center gap-1">
                        {getStatusIcon(application.status)}
                        {application.status?.replace('_', ' ') || 'DRAFT'}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {application.submittedAt 
                        ? formatDistanceToNow(new Date(application.submittedAt), { addSuffix: true })
                        : 'Not submitted'
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog key={`dialog-${application.id}`}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedApplication(application)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Merchant Application Review</DialogTitle>
                          <DialogDescription>
                            Review and approve or reject this merchant application.
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedApplication && (
                          <div className="space-y-6">
                            {/* Application Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Business Name</Label>
                                <p className="text-sm">
                                  {selectedApplication.legalBusinessName || 'Not provided'}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Contact</Label>
                                <p className="text-sm">
                                  {selectedApplication.contactName || 'Not provided'}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Email</Label>
                                <p className="text-sm">
                                  {selectedApplication.contactEmail || 'Not provided'}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Current Status</Label>
                                <Badge 
                                  variant="secondary" 
                                  className={STATUS_COLORS[selectedApplication.status] || STATUS_COLORS.DRAFT}
                                >
                                  {selectedApplication.status?.replace('_', ' ') || 'DRAFT'}
                                </Badge>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">E-Signature Status</Label>
                                <Badge 
                                  variant="secondary" 
                                  className={ESIGNATURE_STATUS_COLORS[selectedApplication.eSignatureStatus || 'NOT_SENT']}
                                >
                                  {selectedApplication.eSignatureStatus?.replace('_', ' ') || 'NOT SENT'}
                                </Badge>
                              </div>
                            </div>

                            {/* Send for E-Signature Button (for approved applications) */}
                            {selectedApplication.status === 'APPROVED' && 
                             (!selectedApplication.eSignatureStatus || selectedApplication.eSignatureStatus === 'NOT_SENT') && (
                              <div className="border-t pt-4">
                                <Button
                                  onClick={() => sendForSignatureMutation.mutate(selectedApplication.id)}
                                  disabled={sendForSignatureMutation.isPending}
                                  className="w-full"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {sendForSignatureMutation.isPending ? 'Sending...' : 'Send for E-Signature'}
                                </Button>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Send this approved application to the merchant for electronic signature.
                                </p>
                              </div>
                            )}

                            {/* E-Signature Status Info */}
                            {selectedApplication.eSignatureStatus === 'PENDING' && (
                              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                                <p className="text-sm font-medium text-blue-900">
                                  Awaiting Signature
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                  Sent {selectedApplication.eSignatureSentAt && formatDistanceToNow(new Date(selectedApplication.eSignatureSentAt), { addSuffix: true })}
                                </p>
                              </div>
                            )}

                            {selectedApplication.eSignatureStatus === 'SIGNED' && (
                              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                                <p className="text-sm font-medium text-green-900">
                                  ✓ Document Signed
                                </p>
                                <p className="text-xs text-green-700 mt-1">
                                  Signed {selectedApplication.eSignatureCompletedAt && formatDistanceToNow(new Date(selectedApplication.eSignatureCompletedAt), { addSuffix: true })}
                                </p>
                              </div>
                            )}

                            {/* Rejection Reason (if rejected) */}
                            {selectedApplication.status === 'REJECTED' && selectedApplication.rejectionReason && (
                              <div>
                                <Label className="text-sm font-medium">Rejection Reason</Label>
                                <p className="text-sm bg-red-50 p-3 rounded-md border border-red-200">
                                  {selectedApplication.rejectionReason}
                                </p>
                              </div>
                            )}

                            {/* Review Actions */}
                            {selectedApplication.status === 'SUBMITTED' && (
                              <div className="space-y-4 border-t pt-4">
                                <h4 className="font-medium">Review Application</h4>
                                
                                {reviewAction === 'REJECTED' && (
                                  <div className="space-y-2">
                                    <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                                    <Textarea
                                      id="rejection-reason"
                                      placeholder="Provide a detailed reason for rejection..."
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      className="min-h-[80px]"
                                    />
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setReviewAction('APPROVED');
                                      handleReview('APPROVED');
                                    }}
                                    disabled={reviewMutation.isPending}
                                    className="flex-1"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                  
                                  {reviewAction !== 'REJECTED' ? (
                                    <Button
                                      variant="outline"
                                      onClick={() => setReviewAction('REJECTED')}
                                      className="flex-1"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleReview('REJECTED')}
                                      disabled={reviewMutation.isPending || !rejectionReason.trim()}
                                      className="flex-1"
                                    >
                                      {reviewMutation.isPending ? 'Processing...' : 'Confirm Rejection'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    {/* Delete button for draft applications */}
                    {application.status === 'DRAFT' && (
                      <AlertDialog key={`delete-dialog-${application.id}`}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Draft Application</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this draft application? This action cannot be undone.
                            </AlertDialogDescription>
                            {application.legalBusinessName && (
                              <div className="mt-2 font-medium">
                                Application: {application.legalBusinessName}
                              </div>
                            )}
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(application.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

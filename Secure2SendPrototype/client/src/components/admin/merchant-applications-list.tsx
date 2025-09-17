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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building,
  Calendar
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

export default function MerchantApplicationsList() {
  const [selectedApplication, setSelectedApplication] = useState<MerchantApplication | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'UNDER_REVIEW':
        return <Clock className="h-4 w-4 text-yellow-600" />;
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
                      className={STATUS_COLORS[application.status]}
                    >
                      <div className="flex items-center gap-1">
                        {getStatusIcon(application.status)}
                        {application.status.replace('_', ' ')}
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
                    <Dialog>
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
                                  className={STATUS_COLORS[selectedApplication.status]}
                                >
                                  {selectedApplication.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>

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

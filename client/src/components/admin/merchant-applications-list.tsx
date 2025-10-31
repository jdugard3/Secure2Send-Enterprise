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

// Component to display full application details
function ApplicationDetailsView({ application }: { application: any }) {
  const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-b pb-4">
      <h3 className="font-semibold text-lg mb-3">{title}</h3>
      {children}
    </div>
  );

  const DetailField = ({ label, value }: { label: string; value: any }) => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm">{value || 'Not provided'}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Business Information */}
      <DetailSection title="Business Information">
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Legal Business Name" value={application.legalBusinessName} />
          <DetailField label="DBA Business Name" value={application.dbaBusinessName} />
          <DetailField label="Business Phone" value={application.businessPhone} />
          <DetailField label="Federal Tax ID" value={application.federalTaxIdNumber} />
          <DetailField label="Location Address" value={application.locationAddress} />
          <DetailField label="Billing Address" value={application.billingAddress} />
          <DetailField label="City" value={application.city} />
          <DetailField label="State" value={application.state} />
          <DetailField label="ZIP" value={application.zip} />
          <DetailField label="Website" value={application.dbaWebsite || application.websiteAddress} />
          <DetailField label="Ownership Type" value={application.ownershipType} />
          <DetailField label="Incorporation State" value={application.incorporationState} />
          <DetailField label="Entity Start Date" value={application.entityStartDate} />
        </div>
      </DetailSection>

      {/* Contact Information */}
      <DetailSection title="Contact Information">
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Contact Name" value={application.legalContactName || application.contactName} />
          <DetailField label="Contact Email" value={application.legalEmail || application.contactEmail} />
          <DetailField label="Contact Phone" value={application.legalPhone || application.businessPhone} />
        </div>
      </DetailSection>

      {/* Principal Officers */}
      {application.principalOfficers && application.principalOfficers.length > 0 && (
        <DetailSection title="Principal Officers">
          {application.principalOfficers.map((officer: any, index: number) => (
            <div key={index} className="mb-4 p-3 bg-gray-50 rounded-md">
              <h4 className="font-medium mb-2">Officer #{index + 1}</h4>
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Name" value={officer.name} />
                <DetailField label="Title" value={officer.title} />
                <DetailField label="Email" value={officer.email} />
                <DetailField label="Phone" value={officer.phoneNumber} />
                <DetailField label="Date of Birth" value={officer.dob} />
                <DetailField label="SSN" value={officer.ssn ? '***-**-' + officer.ssn.slice(-4) : 'Not provided'} />
                <DetailField label="Ownership %" value={officer.equityPercentage ? `${officer.equityPercentage}%` : ''} />
                <DetailField label="Residential Address" value={officer.residentialAddress} />
                <DetailField label="City" value={officer.city} />
                <DetailField label="State" value={officer.state} />
                <DetailField label="ZIP" value={officer.zip} />
              </div>
            </div>
          ))}
        </DetailSection>
      )}

      {/* Beneficial Owners */}
      {application.beneficialOwners && application.beneficialOwners.length > 0 && (
        <DetailSection title="Beneficial Owners">
          {application.beneficialOwners.map((owner: any, index: number) => (
            <div key={index} className="mb-4 p-3 bg-gray-50 rounded-md">
              <h4 className="font-medium mb-2">Owner #{index + 1}</h4>
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Name" value={owner.name} />
                <DetailField label="Title" value={owner.title} />
                <DetailField label="Email" value={owner.email} />
                <DetailField label="Phone" value={owner.phoneNumber} />
                <DetailField label="Ownership %" value={owner.ownershipPercentage ? `${owner.ownershipPercentage}%` : ''} />
                <DetailField label="Control Person" value={owner.controlPerson ? 'Yes' : 'No'} />
              </div>
            </div>
          ))}
        </DetailSection>
      )}

      {/* Banking Information */}
      <DetailSection title="Banking Information">
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Bank Name" value={application.bankName} />
          <DetailField label="ABA Routing Number" value={application.abaRoutingNumber} />
          <DetailField label="Account Name" value={application.nameOnBankAccount || application.accountName} />
          <DetailField label="DDA Number" value={application.ddaNumber} />
          <DetailField label="Bank Officer Name" value={application.bankOfficerName} />
          <DetailField label="Bank Officer Phone" value={application.bankOfficerPhone} />
          <DetailField label="Bank Officer Email" value={application.bankOfficerEmail} />
        </div>
      </DetailSection>

      {/* Volume Information */}
      <DetailSection title="Transaction Volume">
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Average Ticket" value={application.averageTicket ? `$${application.averageTicket}` : ''} />
          <DetailField label="High Ticket" value={application.highTicket ? `$${application.highTicket}` : ''} />
          <DetailField label="Monthly Sales Volume" value={application.monthlySalesVolume ? `$${application.monthlySalesVolume}` : ''} />
          <DetailField label="Annual Volume" value={application.annualVolume ? `$${application.annualVolume}` : ''} />
          <DetailField label="Monthly Transactions" value={application.monthlyTransactions} />
          <DetailField label="Annual Transactions" value={application.annualTransactions} />
        </div>
      </DetailSection>

      {/* Processing Information */}
      <DetailSection title="Processing Information">
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="POS System" value={application.posSystem} />
          <DetailField label="Business Type" value={application.businessType} />
          <DetailField label="Processing Categories" value={
            application.processingCategories ? 
              Array.isArray(application.processingCategories) ? 
                application.processingCategories.join(', ') : 
                application.processingCategories 
              : 'Not provided'
          } />
        </div>
      </DetailSection>
    </div>
  );
}

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
                            {/* Application Status Header */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                              <div>
                                <Label className="text-sm font-medium">Current Status</Label>
                                <Badge 
                                  variant="secondary" 
                                  className={`${STATUS_COLORS[selectedApplication.status] || STATUS_COLORS.DRAFT} mt-1`}
                                >
                                  {selectedApplication.status?.replace('_', ' ') || 'DRAFT'}
                                </Badge>
                              </div>
                            </div>

                            {/* View Full Application Button */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Full Application Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Complete Merchant Application</DialogTitle>
                                  <DialogDescription>
                                    Full details of the submitted merchant application
                                  </DialogDescription>
                                </DialogHeader>
                                <ApplicationDetailsView application={selectedApplication} />
                              </DialogContent>
                            </Dialog>

                            {/* Quick Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
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
                                <Label className="text-sm font-medium">Submitted</Label>
                                <p className="text-sm">
                                  {selectedApplication.submittedAt 
                                    ? formatDistanceToNow(new Date(selectedApplication.submittedAt), { addSuffix: true })
                                    : 'Not submitted'}
                                </p>
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

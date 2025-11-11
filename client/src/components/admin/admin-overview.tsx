import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Building2, 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Plus,
  Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AddClientForm from "./add-client-form";
import MerchantApplicationsList from "./merchant-applications-list";
import { InvitationCodesManager } from "./invitation-codes-manager";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CompanyOverview {
  id: string;
  companyName: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    createdAt: Date | null;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INCOMPLETE';
  createdAt: Date | null;
  documents: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    pendingList: Array<{
      id: string;
      documentType: string;
      filename: string;
      uploadedAt: Date;
    }>;
  };
}

export default function AdminOverview() {
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: companies = [], isLoading } = useQuery<CompanyOverview[]>({
    queryKey: ["/api/admin/overview"],
    queryFn: async () => {
      const response = await fetch("/api/admin/overview", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "The user has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName && !lastName) return "?";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'INCOMPLETE':
        return <Badge className="bg-orange-100 text-orange-800">Incomplete</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const formatDocumentType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invitation Codes Section */}
      <InvitationCodesManager />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Company Overview</h2>
          <p className="text-sm text-gray-500 mt-1">All registered companies and their document status</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 font-medium">
            {companies.length} {companies.length === 1 ? 'company' : 'companies'}
          </div>
          <Button 
            onClick={() => setShowAddClientForm(true)} 
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {companies.map((company) => (
          <Card key={company.id} className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB]">
                      <Building2 className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">
                      {company.companyName || 'No Company Name'}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(company.user.firstName, company.user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">
                        {company.user.firstName} {company.user.lastName}
                      </span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{company.user.email}</span>
                      <span className="text-sm text-gray-400">•</span>
                      <Badge variant={company.user.role === 'ADMIN' ? 'destructive' : 'secondary'} className="text-xs">
                        {company.user.role || 'CLIENT'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(company.status)}
                    <AlertDialog>
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
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this user? This action cannot be undone and will permanently remove:
                          </AlertDialogDescription>
                          <div className="mt-2 space-y-1">
                            <div className="font-medium">• User: {company.user.firstName} {company.user.lastName} ({company.user.email})</div>
                            <div className="font-medium">• Role: {company.user.role || 'CLIENT'}</div>
                            <div className="font-medium">• Company: {company.companyName || 'No Company Name'}</div>
                            <div className="font-medium">• All associated documents and data</div>
                          </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUserMutation.mutate(company.user.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete User
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <span className="text-xs text-gray-500">
                    {company.createdAt 
                      ? `Joined ${formatDistanceToNow(new Date(company.createdAt), { addSuffix: true })}`
                      : 'Join date unknown'
                    }
                  </span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Document Summary */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Document Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-2xl font-semibold text-gray-900">{company.documents.total}</div>
                      <div className="text-xs text-gray-600 font-medium mt-1">Total</div>
                    </div>
                    <div className="text-center p-4 bg-[#F59E0B]/5 rounded-lg border border-[#F59E0B]/20">
                      <div className="text-2xl font-semibold text-[#F59E0B]">{company.documents.pending}</div>
                      <div className="text-xs text-gray-600 font-medium mt-1">Pending</div>
                    </div>
                    <div className="text-center p-4 bg-[#10B981]/5 rounded-lg border border-[#10B981]/20">
                      <div className="text-2xl font-semibold text-[#10B981]">{company.documents.approved}</div>
                      <div className="text-xs text-gray-600 font-medium mt-1">Approved</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
                      <div className="text-2xl font-semibold text-red-600">{company.documents.rejected}</div>
                      <div className="text-xs text-gray-600 font-medium mt-1">Rejected</div>
                    </div>
                  </div>
                </div>

                {/* Pending Documents */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Pending Documents ({company.documents.pending})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {company.documents.pendingList.length > 0 ? (
                      company.documents.pendingList.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-[#F59E0B]/5 rounded-lg border border-[#F59E0B]/20 text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {formatDocumentType(doc.documentType)}
                            </div>
                            <div className="text-xs text-gray-500 truncate mt-1">
                              {doc.filename}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 ml-2 font-medium">
                            {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        No pending documents
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action needed indicator */}
              {company.documents.pending > 0 && (
                <div className="mt-4 p-3 bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-[#F59E0B] mr-2" />
                    <span className="text-sm font-medium text-gray-700">
                      Action needed: {company.documents.pending} document{company.documents.pending !== 1 ? 's' : ''} waiting for review
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {companies.length === 0 && (
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">No companies found</h3>
              <p className="text-sm text-gray-500">No companies have registered yet.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Merchant Applications Section */}
      <div className="mt-8">
        <MerchantApplicationsList />
      </div>

      <AddClientForm 
        open={showAddClientForm} 
        onOpenChange={setShowAddClientForm} 
      />
    </div>
  );
}

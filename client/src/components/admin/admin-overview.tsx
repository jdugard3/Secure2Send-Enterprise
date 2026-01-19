import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Mail,
  Smartphone,
  ShieldOff,
  Filter,
  ChevronRight
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
    role?: string;
    mfaEnabled?: boolean;
    mfaEmailEnabled?: boolean;
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
  const [, navigate] = useLocation();
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name' | 'status' | 'pending'>('recent');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'INCOMPLETE'>('all');
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

  // Filter and sort companies
  const filteredAndSortedCompanies = useMemo(() => {
    let filtered = companies;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(company => company.status === statusFilter);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          // Most recently created (newest first)
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'oldest':
          // Oldest first
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'name':
          // Alphabetical by company name
          const nameA = (a.companyName || '').toLowerCase();
          const nameB = (b.companyName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        case 'status':
          // Sort by status: PENDING, INCOMPLETE, APPROVED, REJECTED
          const statusOrder = { 'PENDING': 0, 'INCOMPLETE': 1, 'APPROVED': 2, 'REJECTED': 3 };
          return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        case 'pending':
          // Sort by number of pending documents (most first)
          return (b.documents.pending || 0) - (a.documents.pending || 0);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [companies, sortBy, statusFilter]);

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
      // Invalidate both overview and merchant applications queries
      // because deleting a user also deletes their applications
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant-applications"] });
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Company Overview</h2>
            <p className="text-sm text-gray-500 mt-1">All registered companies and their document status</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 font-medium">
              {filteredAndSortedCompanies.length} of {companies.length} {companies.length === 1 ? 'company' : 'companies'}
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

        {/* Filters */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Status:</label>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sort by:</label>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recently Created</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Company Name (A-Z)</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="pending">Most Pending Docs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredAndSortedCompanies.map((company) => (
          <Card 
            key={company.id} 
            className="bg-white border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => navigate(`/admin/company/${company.id}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* Left: Company Info */}
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-14 w-14 border-2 border-gray-100">
                    <AvatarFallback className="bg-blue-50 text-blue-600 text-lg font-semibold">
                      {company.companyName?.substring(0, 2).toUpperCase() || 
                       getInitials(company.user.firstName, company.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {company.companyName || 'No Company Name'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600 truncate">
                        {company.user.firstName} {company.user.lastName}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-500 truncate">{company.user.email}</span>
                    </div>
                  </div>
                </div>

                {/* Center: Document Stats */}
                <div className="hidden md:flex items-center gap-6 px-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{company.documents.total}</div>
                    <div className="text-xs text-gray-500">Total Docs</div>
                  </div>
                  
                  {company.documents.pending > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{company.documents.pending}</div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                  )}
                  
                  {company.documents.approved > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{company.documents.approved}</div>
                      <div className="text-xs text-gray-500">Approved</div>
                    </div>
                  )}
                </div>

                {/* Right: Status & Action */}
                <div className="flex items-center gap-4">
                  {getStatusBadge(company.status)}
                  
                  {company.documents.pending > 0 && (
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700">Needs Review</span>
                    </div>
                  )}
                  
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAndSortedCompanies.length === 0 && companies.length > 0 && (
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Filter className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">No companies match your filters</h3>
              <p className="text-sm text-gray-500">Try adjusting your filter criteria.</p>
            </CardContent>
          </Card>
        )}

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

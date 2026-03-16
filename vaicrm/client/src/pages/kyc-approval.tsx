import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Eye,
  Download,
  User,
  Building,
  AlertTriangle,
  Shield,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function KYCApproval() {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  const { data: agents, isLoading } = useQuery({
    queryKey: ["/api/agents"],
  });

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Filter agents by KYC status
  const agentsData: any[] = (agents && typeof agents === 'object' && 'data' in agents) ? agents.data : (Array.isArray(agents) ? agents : []);
  const pendingAgents = agentsData.filter((agent: any) => 
    agent.status === "draft" || agent.status === "kyc_review"
  );

  const approvedAgents = agentsData.filter((agent: any) => 
    agent.status === "approved" || agent.status === "active"
  );

  const rejectedAgents = agentsData.filter((agent: any) => 
    agent.status === "rejected"
  );

  // Filter customers by KYC status
  const customersData: any[] = Array.isArray(customers) ? customers : [];
  const pendingCustomers = customersData.filter((customer: any) => 
    customer.status === "draft" || customer.status === "kyc_review"
  );

  const approvedCustomers = customersData.filter((customer: any) => 
    customer.status === "approved" || customer.status === "active"
  );

  const rejectedCustomers = customersData.filter((customer: any) => 
    customer.status === "rejected"
  );

  // Search and filter function
  const filterData = (data: any[], type: string) => {
    return data.filter(item => {
      const matchesSearch = searchTerm === "" || 
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone?.includes(searchTerm) ||
        item.agentCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerCode?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "all" || filterType === type;
      
      return matchesSearch && matchesType;
    });
  };

  // Apply filters to current tab data
  const getFilteredData = () => {
    let agents: any[] = [];
    let customers: any[] = [];
    
    switch (activeTab) {
      case "pending":
        agents = filterData(pendingAgents, "agent");
        customers = filterData(pendingCustomers, "customer");
        break;
      case "approved":
        agents = filterData(approvedAgents, "agent");
        customers = filterData(approvedCustomers, "customer");
        break;
      case "rejected":
        agents = filterData(rejectedAgents, "agent");
        customers = filterData(rejectedCustomers, "customer");
        break;
      default:
        break;
    }
    
    return { agents, customers };
  };

  const filteredData = getFilteredData();

  const approveKYCMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = data.type === "agent" ? `/api/agents/${data.id}/kyc-approval` : `/api/customers/${data.id}/kyc-approval`;
      return apiRequest(endpoint, "POST", {
        action: data.action,
        remarks: data.remarks
      });
    },
    onSuccess: () => {
      toast({ title: "KYC approval updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setApprovalAction(null);
      setRemarks("");
      setSelectedDocument(null);
    },
    onError: () => {
      toast({ title: "Failed to update KYC approval", variant: "destructive" });
    }
  });

  const handleApproval = (item: any, type: "agent" | "customer", action: "approve" | "reject") => {
    setSelectedDocument({ ...item, type });
    setApprovalAction(action);
    if (action === "approve") {
      // Auto-approve without remarks for approval
      approveKYCMutation.mutate({
        id: item.id,
        type,
        action,
        remarks: "KYC documents approved"
      });
    }
  };

  const handleRejectWithRemarks = () => {
    if (!selectedDocument || !remarks.trim()) {
      toast({ title: "Please provide rejection remarks", variant: "destructive" });
      return;
    }
    
    approveKYCMutation.mutate({
      id: selectedDocument.id,
      type: selectedDocument.type,
      action: "reject",
      remarks: remarks.trim()
    });
  };

  const renderDocumentPreview = (item: any) => (
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            KYC Document Preview - {item.firstName} {item.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Document Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Document ID</Label>
              <div className="p-2 bg-gray-50 rounded">{item.kycDocId || "Not provided"}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Document Number</Label>
              <div className="p-2 bg-gray-50 rounded">{item.kycDocNo || "Not provided"}</div>
            </div>
          </div>

          {/* Document Preview Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Document Preview</p>
            <p className="text-sm text-gray-500">
              {item.kycDocuments ? "Documents available for review" : "No documents uploaded"}
            </p>
            {item.kycDocuments && (
              <div className="mt-4 space-y-2">
                <Button variant="outline" size="sm" className="mr-2">
                  <Eye className="h-4 w-4 mr-2" />
                  View POI
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View POA
                </Button>
              </div>
            )}
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="font-medium">Personal Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Name</Label>
                <div className="p-2 bg-gray-50 rounded">{item.firstName} {item.lastName}</div>
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <div className="p-2 bg-gray-50 rounded">{item.email}</div>
              </div>
              <div>
                <Label className="text-sm">Phone</Label>
                <div className="p-2 bg-gray-50 rounded">{item.phone || item.mobile}</div>
              </div>
              <div>
                <Label className="text-sm">Type</Label>
                <div className="p-2 bg-gray-50 rounded">{item.type || item.customerType}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setPreviewOpen(false);
                handleApproval(item, selectedDocument?.type || "agent", "approve");
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => {
                setPreviewOpen(false);
                setApprovalAction("reject");
              }}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderKYCCard = (item: any, type: "agent" | "customer") => (
    <Card key={item.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {type === "agent" ? (
              <Building className="h-8 w-8 text-azam-blue" />
            ) : (
              <User className="h-8 w-8 text-azam-blue" />
            )}
            <div>
              <h4 className="font-medium">{item.firstName} {item.lastName}</h4>
              <p className="text-sm text-gray-600">{item.email}</p>
              <Badge variant="outline" className="mt-1">
                {type === "agent" ? "Agent" : "Customer"}
              </Badge>
            </div>
          </div>
          <Badge 
            variant={item.status === "approved" ? "default" : 
                    item.status === "rejected" ? "destructive" : 
                    "secondary"}
          >
            {item.status}
          </Badge>
        </div>

        {/* Complete Onboarding Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Phone:</span>
              <span className="font-medium">{item.phone || item.mobile || "Not provided"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{item.email || "Not provided"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Address:</span>
              <span className="font-medium">{item.address || item.location || "Not provided"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Date Created:</span>
              <span className="font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Not available"}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {type === "agent" && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Agent Code:</span>
                  <span className="font-medium">{item.agentCode || "Not assigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TIN Number:</span>
                  <span className="font-medium">{item.tin || "Not provided"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">VRN Number:</span>
                  <span className="font-medium">{item.vrn || "Not provided"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Business Type:</span>
                  <span className="font-medium">{item.businessType || "Not specified"}</span>
                </div>
              </>
            )}
            
            {type === "customer" && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer Code:</span>
                  <span className="font-medium">{item.customerCode || "Not assigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer Type:</span>
                  <span className="font-medium">{item.customerType || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Type:</span>
                  <span className="font-medium">{item.serviceType || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Class:</span>
                  <span className="font-medium">{item.accountClass || "Not specified"}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-600">KYC Document ID:</span>
              <span className="font-medium">{item.kycDocId || "Not provided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Document Number:</span>
              <span className="font-medium">{item.kycDocNo || "Not provided"}</span>
            </div>
          </div>
        </div>
        
        {/* Rejection Remarks (if any) */}
        {item.status === "rejected" && item.rejectionRemarks && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                <p className="text-sm text-red-700 mt-1">{item.rejectionRemarks}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedDocument({ ...item, type });
              setPreviewOpen(true);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          {(item.status === "draft" || item.status === "kyc_review") && (
            <>
              <Button
                size="sm"
                onClick={() => handleApproval(item, type, "approve")}
                className="bg-green-600 hover:bg-green-700"
                disabled={approveKYCMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setSelectedDocument({ ...item, type });
                  setApprovalAction("reject");
                }}
                disabled={approveKYCMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading || customersLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azam-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading KYC documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 md:p-6 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">KYC Approval Center</h1>
            <p className="text-blue-100 mt-1 text-sm md:text-base">Unified review and approval center for all agent and customer KYC documents</p>
          </div>
          <div className="flex space-x-2">
            <Badge variant="secondary" className="bg-white/20 text-white text-xs md:text-sm">
              <Shield className="w-3 h-3 md:w-4 md:h-4 mr-1" />
              Unified KYC Center
            </Badge>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingAgents.length + pendingCustomers.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedAgents.length + approvedCustomers.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedAgents.length + rejectedCustomers.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-azam-blue">{agentsData.length + customersData.length}</p>
              </div>
              <FileText className="w-8 h-8 text-azam-blue" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-azam-blue" />
            KYC Document Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, phone, or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="agent">Agents Only</SelectItem>
                    <SelectItem value="customer">Customers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Search Results Summary */}
            {(searchTerm || filterType !== "all") && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Showing {filteredData.agents.length + filteredData.customers.length} results
                  {searchTerm && ` for "${searchTerm}"`}
                  {filterType !== "all" && ` • ${filterType}s only`}
                </span>
                {(searchTerm || filterType !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterType("all");
                    }}
                    className="h-6 px-2"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending Review</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <div className="space-y-4">
                {filteredData.agents.length === 0 && filteredData.customers.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm || filterType !== "all" ? "No matching results found" : "No pending KYC documents"}
                    </p>
                    {(searchTerm || filterType !== "all") && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setFilterType("all");
                        }}
                        className="mt-2"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredData.agents.map((agent: any) => renderKYCCard(agent, "agent"))}
                    {filteredData.customers.map((customer: any) => renderKYCCard(customer, "customer"))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              <div className="space-y-4">
                {filteredData.agents.length === 0 && filteredData.customers.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm || filterType !== "all" ? "No matching results found" : "No approved KYC documents"}
                    </p>
                    {(searchTerm || filterType !== "all") && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setFilterType("all");
                        }}
                        className="mt-2"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredData.agents.map((agent: any) => renderKYCCard(agent, "agent"))}
                    {filteredData.customers.map((customer: any) => renderKYCCard(customer, "customer"))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <div className="space-y-4">
                {filteredData.agents.length === 0 && filteredData.customers.length === 0 ? (
                  <div className="text-center py-12">
                    <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm || filterType !== "all" ? "No matching results found" : "No rejected KYC documents"}
                    </p>
                    {(searchTerm || filterType !== "all") && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setFilterType("all");
                        }}
                        className="mt-2"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredData.agents.map((agent: any) => renderKYCCard(agent, "agent"))}
                    {filteredData.customers.map((customer: any) => renderKYCCard(customer, "customer"))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Document Preview Modal */}
      {selectedDocument && renderDocumentPreview(selectedDocument)}

      {/* Rejection Remarks Modal */}
      <Dialog open={approvalAction === "reject"} onOpenChange={() => setApprovalAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject KYC Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please provide a reason for rejecting this KYC document:
            </p>
            <div className="space-y-2">
              <Label htmlFor="remarks">Rejection Remarks *</Label>
              <Textarea
                id="remarks"
                placeholder="Enter detailed reason for rejection..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setApprovalAction(null);
                  setRemarks("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectWithRemarks}
                disabled={!remarks.trim() || approveKYCMutation.isPending}
              >
                {approveKYCMutation.isPending ? "Processing..." : "Reject Document"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Search, X, Pause, Play, AlertTriangle, CheckCircle2, XCircle, Users, Calendar, Clock, Shield } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  sapBpId: string;
  sapCaId: string;
  sapContractId: string;
  smartCardNo: string;
  currentPlan: {
    id: string;
    name: string;
    type: string;
    amount: number;
    startDate: string;
    endDate: string;
    status: string;
  };
  suspensionStatus: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  lastSuspensionDate?: string;
  suspensionReason?: string;
}

interface SuspensionReason {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface SuspensionRequest {
  customerId: string;
  reasonId: string;
  notes?: string;
  suspensionType: 'TEMPORARY' | 'PERMANENT';
  actionType: 'SUSPENSION';
  actionSubtype: string;
}

const CustomerSuspension: React.FC = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [suspensionNotes, setSuspensionNotes] = useState<string>('');
  const [suspensionType, setSuspensionType] = useState<'TEMPORARY' | 'PERMANENT'>('TEMPORARY');
  const [activeTab, setActiveTab] = useState('suspension');
  const queryClient = useQueryClient();

  // Fetch customer search results
  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/customer-search', customerSearch],
    enabled: customerSearch.length >= 2,
  });

  // Fetch suspension reasons
  const { data: suspensionReasons = [] } = useQuery<SuspensionReason[]>({
    queryKey: ['/api/suspension-reasons'],
    enabled: true,
  });

  // Fetch customer details
  const { data: customerData } = useQuery<CustomerData>({
    queryKey: ['/api/customer-details', selectedCustomer],
    enabled: !!selectedCustomer,
  });

  // Fetch suspension history
  const { data: suspensionHistory = [] } = useQuery({
    queryKey: ['/api/suspension-history'],
    enabled: activeTab === 'history',
  });

  // Fetch active suspensions
  const { data: activeSuspensions = [] } = useQuery({
    queryKey: ['/api/active-suspensions'],
    enabled: activeTab === 'active',
  });

  // Create suspension mutation
  const suspensionMutation = useMutation({
    mutationFn: (data: SuspensionRequest) => apiRequest('/api/customer-suspension', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer suspension request submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/suspension-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/active-suspensions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-details'] });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit suspension request",
        variant: "destructive",
      });
    },
  });

  // Reactivate customer mutation
  const reactivateMutation = useMutation({
    mutationFn: (customerId: string) => apiRequest(`/api/customer-reactivation/${customerId}`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer reactivated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/active-suspensions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suspension-history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate customer",
        variant: "destructive",
      });
    },
  });

  // Handle customer selection
  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer.id);
    setCustomerSearch(`${customer.name} - ${customer.phone}`);
    setShowCustomerResults(false);
  };

  // Clear customer selection
  const clearCustomerSelection = () => {
    setSelectedCustomer('');
    setCustomerSearch('');
    setShowCustomerResults(false);
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setCustomerSearch('');
    setShowCustomerResults(false);
    setSelectedReason('');
    setSuspensionNotes('');
    setSuspensionType('TEMPORARY');
  };

  const handleSubmitSuspension = () => {
    if (!selectedCustomer || !selectedReason) {
      toast({
        title: "Error",
        description: "Please select a customer and suspension reason",
        variant: "destructive",
      });
      return;
    }

    const reasonData = suspensionReasons.find(r => r.id === selectedReason);
    if (!reasonData) return;

    const requestData: SuspensionRequest = {
      customerId: selectedCustomer,
      reasonId: selectedReason,
      notes: suspensionNotes,
      suspensionType,
      actionType: 'SUSPENSION',
      actionSubtype: reasonData.category,
    };

    suspensionMutation.mutate(requestData);
  };

  const selectedReasonData = suspensionReasons.find(r => r.id === selectedReason);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Pause className="h-5 w-5 text-azam-blue" />
          <h1 className="text-2xl font-bold text-gray-900">Customer Suspension</h1>
        </div>
        <p className="text-gray-600">
          Manage customer service suspensions with automated SAP CM, SOM, and Nagra integration
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suspension">New Suspension</TabsTrigger>
          <TabsTrigger value="active">Active Suspensions</TabsTrigger>
          <TabsTrigger value="history">Suspension History</TabsTrigger>
        </TabsList>

        {/* New Suspension Tab */}
        <TabsContent value="suspension" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Search Customer</Label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by name, phone, email, SAP BP ID, or Smart Card..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerResults(e.target.value.length >= 2);
                        }}
                        className="pl-10 pr-10"
                      />
                      {selectedCustomer && (
                        <button
                          onClick={clearCustomerSelection}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Search Results Dropdown */}
                    {showCustomerResults && customerSearch.length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                        {searchResults.length > 0 ? (
                          searchResults.map((customer: any) => (
                            <div
                              key={customer.id}
                              onClick={() => handleCustomerSelect(customer)}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.phone}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {customer.email} • {customer.sapBpId} • {customer.smartCardNo}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-gray-500 text-center">
                            No customers found matching "{customerSearch}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {customerSearch.length > 0 && customerSearch.length < 2 && (
                    <p className="text-sm text-gray-500">
                      Type at least 2 characters to search for customers
                    </p>
                  )}
                </div>

                {customerData && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Current Plan:</span>
                      <Badge variant="outline">{customerData.currentPlan.name}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Plan Status:</span>
                      <Badge variant={customerData.suspensionStatus === 'ACTIVE' ? 'default' : 
                                   customerData.suspensionStatus === 'SUSPENDED' ? 'destructive' : 'secondary'}>
                        {customerData.suspensionStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Plan End Date:</span>
                      <span>{new Date(customerData.currentPlan.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">SAP Contract ID:</span>
                      <span className="text-sm font-mono">{customerData.sapContractId}</span>
                    </div>
                    
                    {customerData.suspensionStatus === 'SUSPENDED' && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Customer is currently suspended. Reactivation required before new suspension.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suspension Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Suspension Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Suspension Reason</Label>
                  <Select value={selectedReason} onValueChange={setSelectedReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select suspension reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {suspensionReasons.map((reason) => (
                        <SelectItem key={reason.id} value={reason.id}>
                          {reason.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedReasonData && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 mb-1">
                      {selectedReasonData.name}
                    </div>
                    <div className="text-sm text-blue-700">
                      {selectedReasonData.description}
                    </div>
                    <div className="text-xs text-blue-600 mt-2">
                      Category: {selectedReasonData.category}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="type">Suspension Type</Label>
                  <Select value={suspensionType} onValueChange={(value: 'TEMPORARY' | 'PERMANENT') => setSuspensionType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEMPORARY">Temporary</SelectItem>
                      <SelectItem value="PERMANENT">Permanent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter any additional details about the suspension..."
                    value={suspensionNotes}
                    onChange={(e) => setSuspensionNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {customerData?.suspensionStatus === 'ACTIVE' && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">Suspension Impact</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• Service will be immediately suspended in Nagra system</div>
                      <div>• Billing will be stopped in SAP CC</div>
                      <div>• SOM will update subscription status</div>
                      <div>• Customer will receive suspension notification</div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSubmitSuspension}
                    disabled={!selectedCustomer || !selectedReason || customerData?.suspensionStatus === 'SUSPENDED' || suspensionMutation.isPending}
                    className="bg-azam-blue hover:bg-azam-blue/90"
                  >
                    {suspensionMutation.isPending ? 'Processing...' : 'Submit Suspension'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Active Suspensions Tab */}
        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pause className="h-5 w-5" />
                Active Suspensions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSuspensions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No active suspensions found
                  </div>
                ) : (
                  activeSuspensions.map((suspension: any) => (
                    <div key={suspension.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{suspension.customerName}</div>
                        <div className="text-sm text-gray-600">
                          {suspension.planName} • {suspension.reason}
                        </div>
                        <div className="text-sm text-gray-500">
                          Suspended: {new Date(suspension.suspensionDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {suspension.sapBpId} • {suspension.smartCardNo}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">SUSPENDED</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reactivateMutation.mutate(suspension.customerId)}
                          disabled={reactivateMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Reactivate
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Suspension History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suspensionHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No suspension history found
                  </div>
                ) : (
                  suspensionHistory.map((record: any) => (
                    <div key={record.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{record.customerName}</div>
                        <Badge 
                          variant={record.status === 'COMPLETED' ? 'default' : 
                                 record.status === 'FAILED' ? 'destructive' : 'secondary'}
                        >
                          {record.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Action:</span>
                          <div className="font-medium">{record.action}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Reason:</span>
                          <div className="font-medium">{record.reason}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <div className="font-medium">{record.type}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Date:</span>
                          <div className="font-medium">{new Date(record.actionDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                      {record.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {record.notes}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        Request ID: {record.requestId} • CM Status: {record.cmStatus}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerSuspension;
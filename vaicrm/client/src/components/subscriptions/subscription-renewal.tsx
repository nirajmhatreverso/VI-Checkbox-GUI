import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  RotateCcw, 
  Search, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Wallet,
  Package,
  CreditCard,
  Settings,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Timer,
  CirclePlay,
  CirclePause
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schemas for different renewal types
const manualRenewalSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  smartCardNumber: z.string().min(1, "Smart card number is required"),
  planId: z.string().min(1, "Plan selection is required"),
  renewalCount: z.number().min(1, "Renewal count must be at least 1").max(12, "Maximum 12 months renewal"),
  paymentMethod: z.enum(["wallet", "online", "agent"]),
});

const autoRenewalConfigSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  enableAutoRenewal: z.boolean(),
  preferredPlan: z.string().optional(),
  maxRetryAttempts: z.number().min(1).max(5),
  notificationPreference: z.enum(["sms", "email", "both"]),
});

type ManualRenewalData = z.infer<typeof manualRenewalSchema>;
type AutoRenewalConfigData = z.infer<typeof autoRenewalConfigSchema>;

// Mock data for subscription plans
const subscriptionPlans = [
  { id: "AZAM_LITE_1M", name: "Azam Lite 1 Month", price: 13000, duration: "1 month", channels: 40 },
  { id: "AZAM_PLAY_1M", name: "Azam Play 1 Month", price: 19000, duration: "1 month", channels: 80 },
  { id: "AZAM_PREM_1M", name: "Azam Premium 1 Month", price: 35000, duration: "1 month", channels: 150 },
  { id: "AZAM_LITE_3M", name: "Azam Lite 3 Month", price: 34000, duration: "3 months", channels: 40 },
  { id: "AZAM_PLAY_3M", name: "Azam Play 3 Month", price: 54000, duration: "3 months", channels: 80 },
];

// Mock customer subscription data
const mockSubscriptions = [
  {
    id: 1,
    customerId: "CUST001",
    smartCardNumber: "SC123456789",
    currentPlan: "Azam Lite 1 Month",
    planStartDate: "2025-04-24 14:00:00",
    planEndDate: "2025-05-23 23:59:59",
    status: "Active",
    walletBalance: 17000,
    autoRenewalEnabled: true,
    lastRenewalDate: "2025-04-27 11:02:00",
    renewalHistory: [
      { date: "2025-04-27 11:02:00", type: "Manual Renewal", plan: "Azam Lite 1 Month * 4", amount: -48000, balance: 17000 },
      { date: "2025-04-24 14:00:00", type: "Plan Purchase", plan: "Azam Lite 1 Month", amount: -12000, balance: 0 },
    ]
  },
  {
    id: 2,
    customerId: "CUST002", 
    smartCardNumber: "SC987654321",
    currentPlan: "Azam Play 1 Month",
    planStartDate: "2025-05-24 00:00:00",
    planEndDate: "2025-06-23 23:59:59",
    status: "Active",
    walletBalance: 5000,
    autoRenewalEnabled: true,
    lastRenewalDate: "2025-05-23 22:00:00",
    renewalHistory: [
      { date: "2025-05-23 22:00:00", type: "Advance Auto Renewal", plan: "Azam Play 1 Month", amount: -19000, balance: 0 },
    ]
  }
];

export default function SubscriptionRenewal() {
  const [activeTab, setActiveTab] = useState("manual");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [renewalStatus, setRenewalStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [processingStep, setProcessingStep] = useState<string>('');
  const [autoRenewalJobs, setAutoRenewalJobs] = useState<any[]>([]);
  const { toast } = useToast();

  // Manual renewal form
  const manualForm = useForm<ManualRenewalData>({
    resolver: zodResolver(manualRenewalSchema),
    defaultValues: {
      customerId: "",
      smartCardNumber: "",
      planId: "",
      renewalCount: 1,
      paymentMethod: "wallet",
    },
  });

  // Auto renewal configuration form
  const autoRenewalForm = useForm<AutoRenewalConfigData>({
    resolver: zodResolver(autoRenewalConfigSchema),
    defaultValues: {
      customerId: "",
      enableAutoRenewal: true,
      preferredPlan: "",
      maxRetryAttempts: 3,
      notificationPreference: "both",
    },
  });

  // Search customer subscription
  const searchCustomer = (customerId: string) => {
    const customer = mockSubscriptions.find(sub => sub.customerId === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      manualForm.setValue("smartCardNumber", customer.smartCardNumber);
      toast({
        title: "Customer Found",
        description: `Found subscription for ${customer.customerId}`,
      });
    } else {
      setSelectedCustomer(null);
      toast({
        title: "Customer Not Found",
        description: "No active subscription found for this customer ID",
        variant: "destructive",
      });
    }
  };

  // Process manual renewal based on Portal workflow
  const processManualRenewal = useMutation({
    mutationFn: async (data: ManualRenewalData) => {
      setRenewalStatus('processing');
      
      const steps = [
        "1. Portal - Customer initiates renewal via Portal",
        "2. Portal - Popup displays current plan and renewal count",
        "3. Portal - Amount calculation (Plan amount × Count)", 
        "4. SAP CM - Wallet balance check and deduction",
        "5. SAP CM - Forward plan renewal request to SAP CC",
        "6. SAP CC - Process renewal and return updated plan end date",
        "7. SAP CM - Update current subscription table",
        "8. SAP CM - Initiate activate provisioning request to Nagra",
        "9. Nagra - Provisioning response confirmation",
        "10. SAP CC - Bit generation and send to SAP CI",
        "11. SAP CI - Billing and invoice generation",
        "12. SAP FICA - Financial posting and accounting entries",
        "13. SAP CM/CI - Invoice posting to TCRA regulatory systems"
      ];

      for (let i = 0; i < steps.length; i++) {
        setProcessingStep(steps[i]);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      return { success: true, renewalId: `REN${Date.now()}` };
    },
    onSuccess: (result) => {
      setRenewalStatus('completed');
      toast({
        title: "Renewal Successful",
        description: `Subscription renewed successfully. Renewal ID: ${result.renewalId}`,
      });
      
      // Update customer data
      if (selectedCustomer) {
        const plan = subscriptionPlans.find(p => p.id === manualForm.getValues("planId"));
        const renewalCount = manualForm.getValues("renewalCount");
        const totalAmount = plan ? plan.price * renewalCount : 0;
        
        setSelectedCustomer({
          ...selectedCustomer,
          walletBalance: selectedCustomer.walletBalance - totalAmount,
          renewalHistory: [
            {
              date: new Date().toISOString(),
              type: "Manual Renewal",
              plan: `${plan?.name} * ${renewalCount}`,
              amount: -totalAmount,
              balance: selectedCustomer.walletBalance - totalAmount
            },
            ...selectedCustomer.renewalHistory
          ]
        });
      }
    },
    onError: (error) => {
      setRenewalStatus('failed');
      toast({
        title: "Renewal Failed",
        description: "Failed to process subscription renewal. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Simulate auto renewal jobs monitoring
  const { data: autoRenewalJobsData } = useQuery({
    queryKey: ['/api/auto-renewal-jobs'],
    enabled: activeTab === "auto-renewal",
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Mock auto renewal job data
  const mockAutoRenewalJobs = [
    {
      id: 1,
      scheduleTime: "17:00 PM",
      customersProcessed: 1250,
      successfulRenewals: 1180,
      failedRenewals: 70,
      status: "Completed",
      nextRun: "Today 19:00 PM"
    },
    {
      id: 2,
      scheduleTime: "19:00 PM", 
      customersProcessed: 70,
      successfulRenewals: 45,
      failedRenewals: 25,
      status: "Completed",
      nextRun: "Today 22:00 PM"
    },
    {
      id: 3,
      scheduleTime: "22:00 PM",
      customersProcessed: 25,
      successfulRenewals: 20,
      failedRenewals: 5,
      status: "Running",
      nextRun: "Tomorrow 17:00 PM"
    }
  ];

  const onManualRenewalSubmit = (data: ManualRenewalData) => {
    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please search and select a customer first",
        variant: "destructive",
      });
      return;
    }

    const plan = subscriptionPlans.find(p => p.id === data.planId);
    const totalAmount = plan ? plan.price * data.renewalCount : 0;
    
    if (selectedCustomer.walletBalance < totalAmount) {
      toast({
        title: "Insufficient Balance",
        description: `Customer wallet balance (${selectedCustomer.walletBalance.toLocaleString()}) is insufficient for renewal amount (${totalAmount.toLocaleString()})`,
        variant: "destructive",
      });
      return;
    }

    processManualRenewal.mutate(data);
  };

  const calculatePlanEndDate = (startDate: string, duration: string) => {
    const start = new Date(startDate);
    const months = duration.includes("3") ? 3 : 1;
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59);
    return endDate.toISOString().replace('T', ' ').slice(0, 19);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-azam-blue-light rounded-lg">
            <RotateCcw className="h-6 w-6 text-azam-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Renewal</h1>
            <p className="text-gray-600">Manage manual and automatic subscription renewals</p>
          </div>
        </div>
        <Badge variant="outline" className="text-azam-blue border-azam-blue">
          AZAM TV Portal
        </Badge>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Manual Renewal</span>
          </TabsTrigger>
          <TabsTrigger value="auto-renewal" className="flex items-center space-x-2">
            <Timer className="h-4 w-4" />
            <span>Auto Renewal Jobs</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Renewal History</span>
          </TabsTrigger>
        </TabsList>

        {/* Manual Renewal Tab */}
        <TabsContent value="manual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Search & Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter Customer ID (e.g., CUST001)"
                    value={manualForm.watch("customerId")}
                    onChange={(e) => manualForm.setValue("customerId", e.target.value)}
                  />
                  <Button 
                    onClick={() => searchCustomer(manualForm.getValues("customerId"))}
                    variant="outline"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {selectedCustomer && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-600">Customer ID</Label>
                        <p className="font-medium">{selectedCustomer.customerId}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Smart Card</Label>
                        <p className="font-medium">{selectedCustomer.smartCardNumber}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Current Plan</Label>
                        <p className="font-medium">{selectedCustomer.currentPlan}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Status</Label>
                        <Badge variant={selectedCustomer.status === 'Active' ? 'default' : 'secondary'}>
                          {selectedCustomer.status}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-gray-600">Plan End Date</Label>
                        <p className="font-medium text-sm">{selectedCustomer.planEndDate}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Wallet Balance</Label>
                        <p className="font-medium text-green-600">
                          {selectedCustomer.walletBalance.toLocaleString()} TZS
                        </p>
                      </div>
                    </div>

                    {selectedCustomer.autoRenewalEnabled && (
                      <Alert>
                        <CirclePlay className="h-4 w-4" />
                        <AlertDescription>
                          Auto-renewal is enabled for this customer
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Renewal Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5" />
                  <span>Renewal Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...manualForm}>
                  <form onSubmit={manualForm.handleSubmit(onManualRenewalSubmit)} className="space-y-4">
                    <FormField
                      control={manualForm.control}
                      name="planId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Plan</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose subscription plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subscriptionPlans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.name} - {plan.price.toLocaleString()} TZS
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={manualForm.control}
                      name="renewalCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Renewal Count (Months)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="12"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={manualForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="wallet">Wallet Deduction</SelectItem>
                              <SelectItem value="online">Online Payment</SelectItem>
                              <SelectItem value="agent">Agent Payment</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {manualForm.watch("planId") && manualForm.watch("renewalCount") && (
                      <div className="p-3 bg-azam-blue-light rounded-lg">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Plan:</span>
                            <span className="font-medium">
                              {subscriptionPlans.find(p => p.id === manualForm.watch("planId"))?.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Count:</span>
                            <span className="font-medium">{manualForm.watch("renewalCount")} months</span>
                          </div>
                          <div className="flex justify-between text-azam-blue font-semibold">
                            <span>Total Amount:</span>
                            <span>
                              {(
                                (subscriptionPlans.find(p => p.id === manualForm.watch("planId"))?.price || 0) * 
                                manualForm.watch("renewalCount")
                              ).toLocaleString()} TZS
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={!selectedCustomer || renewalStatus === 'processing'}
                    >
                      {renewalStatus === 'processing' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing Renewal...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Process Renewal
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Processing Status */}
          {renewalStatus === 'processing' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 animate-spin" />
                  <span>Processing Renewal</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">{processingStep}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-azam-blue h-2 rounded-full transition-all duration-300" style={{ width: `${(processingStep.indexOf('.') > 0 ? parseInt(processingStep.split('.')[0]) : 1) * 7.7}%` }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {renewalStatus === 'completed' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Subscription renewal completed successfully. Customer will receive confirmation notification.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Auto Renewal Jobs Tab */}
        <TabsContent value="auto-renewal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Auto Renewal Schedule Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Timer className="h-5 w-5" />
                  <span>Auto Renewal Schedule</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Auto renewal runs daily at 17:00, 19:00, and 22:00 for customers due for renewal (1 day prior to plan end date)
                  </AlertDescription>
                </Alert>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Schedule Time</TableHead>
                      <TableHead>Customers Processed</TableHead>
                      <TableHead>Successful</TableHead>
                      <TableHead>Failed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Run</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockAutoRenewalJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.scheduleTime}</TableCell>
                        <TableCell>{job.customersProcessed}</TableCell>
                        <TableCell className="text-green-600">{job.successfulRenewals}</TableCell>
                        <TableCell className="text-red-600">{job.failedRenewals}</TableCell>
                        <TableCell>
                          <Badge variant={job.status === 'Running' ? 'default' : 'secondary'}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{job.nextRun}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Auto Renewal Logic */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Auto Renewal Logic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>1. Payment History Match</strong>
                    <p className="text-gray-600">Check last 15 days payments</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>2. Wallet Balance Match</strong>
                    <p className="text-gray-600">Exact plan cost match</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>3. Nearest Plan</strong>
                    <p className="text-gray-600">Within acceptable range</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>4. Current Package</strong>
                    <p className="text-gray-600">1-month variant renewal</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>5. Alternative Package</strong>
                    <p className="text-gray-600">Other 1-month plans</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Renewal History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Renewal Transaction History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomer && selectedCustomer.renewalHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Plan Details</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Wallet Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCustomer.renewalHistory.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{record.date}</TableCell>
                        <TableCell>
                          <Badge variant={record.type.includes('Auto') ? 'default' : 'secondary'}>
                            {record.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.plan}</TableCell>
                        <TableCell className={record.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                          {record.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{record.balance.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No renewal history available. Search for a customer to view their renewal transactions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
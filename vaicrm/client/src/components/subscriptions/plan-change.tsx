import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, CalendarDays, ArrowUpDown, Clock, CheckCircle, XCircle, AlertCircle, User, CreditCard, Package, Wallet, TrendingUp, RefreshCw, Ban } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Plan Change Form Schema
const planChangeSchema = z.object({
  smartCardNumber: z.string().min(1, "Smart card number is required"),
  newPlanId: z.string().min(1, "Please select a new plan"),
  changeType: z.enum(["immediate", "scheduled"]),
  scheduledDate: z.date().optional(),
  paymentMode: z.enum(["wallet", "online", "agent"]).optional(),
});

type PlanChangeData = z.infer<typeof planChangeSchema>;

// Mock data for available plans
const availablePlans = [
  { id: "AZ001", name: "Azam Lite 1 Month", price: 12000, duration: "1 month", channels: 40, type: "Basic" },
  { id: "AZ002", name: "Azam Play 1 Month", price: 19000, duration: "1 month", channels: 80, type: "Standard" },
  { id: "AZ003", name: "Azam Premium 1 Month", price: 35000, duration: "1 month", channels: 150, type: "Premium" },
  { id: "AZ004", name: "Azam Plus 1 Month", price: 28000, duration: "1 month", channels: 120, type: "Plus" },
  { id: "AZ005", name: "Azam Pure 1 Month", price: 22000, duration: "1 month", channels: 100, type: "Pure" },
  { id: "AZ011", name: "Azam Lite 3 Month", price: 34000, duration: "3 months", channels: 40, type: "Basic" },
  { id: "AZ012", name: "Azam Play 3 Month", price: 54000, duration: "3 months", channels: 80, type: "Standard" },
];

// Mock customer subscription data
const mockCustomerData = {
  customerId: "CUST001",
  smartCardNumber: "SC123456789",
  sapBpId: "BP12345",
  sapCaId: "CA67890",
  sapContractId: "CON123456789",
  currentPlan: {
    id: "AZ001",
    name: "Azam Lite 1 Month",
    price: 12000,
    startDate: "2025-04-24 14:00:00",
    endDate: "2025-05-23 23:59:59",
    status: "Active"
  },
  walletBalance: 15000,
  bufferPeriodDays: 2, // User role based buffer period
  lastPlanChangeDate: "2025-04-24 14:00:00",
  autoRenewalEnabled: true,
};

// Mock plan change history
const mockPlanChangeHistory = [
  {
    id: 1,
    customerId: "CUST001",
    smartCardNumber: "SC123456789",
    eventDate: new Date("2025-05-25 10:12:00"),
    eventName: "Plan change - Immediate",
    planName: "Azam Plus 1 Month",
    planStartDate: new Date("2025-05-25 10:12:00"),
    planEndDate: new Date("2025-06-24 23:59:59"),
    amount: -28000,
    walletBalance: 0,
    changeType: "immediate" as const,
    status: "success" as const,
  },
  {
    id: 2,
    customerId: "CUST001",
    smartCardNumber: "SC123456789",
    eventDate: new Date("2025-05-25 10:12:00"),
    eventName: "Previous Invoice Cancellation",
    planName: "",
    amount: 12000,
    walletBalance: 19500,
    changeType: "cancellation" as const,
    status: "success" as const,
  },
  {
    id: 3,
    customerId: "CUST001",
    smartCardNumber: "SC123456789",
    eventDate: new Date("2025-05-24 00:00:00"),
    eventName: "Plan change effective",
    planName: "Azam Pure 1 Month",
    planStartDate: new Date("2025-05-24 00:00:00"),
    planEndDate: new Date("2025-06-23 23:59:59"),
    amount: -19000,
    walletBalance: 500,
    changeType: "immediate" as const,
    status: "success" as const,
  },
];

// Workflow steps for plan change processing
const workflowSteps = [
  { id: 1, name: "Customer Validation", description: "Verify customer details and current subscription", status: "completed" },
  { id: 2, name: "Buffer Period Check", description: "Validate if change is within buffer period", status: "completed" },
  { id: 3, name: "Balance Calculation", description: "Calculate required payments and refunds", status: "completed" },
  { id: 4, name: "Invoice Processing", description: "Cancel previous invoice if within buffer period", status: "processing" },
  { id: 5, name: "Wallet Transaction", description: "Process wallet deduction/credit", status: "pending" },
  { id: 6, name: "SOM Change Order", description: "Submit change order to SAP SOM", status: "pending" },
  { id: 7, name: "NAGRA Provisioning", description: "Disconnect old plan and activate new plan", status: "pending" },
  { id: 8, name: "Contract Replication", description: "Update contract in SAP CC", status: "pending" },
  { id: 9, name: "Billing Generation", description: "Generate billing and invoices in SAP CI", status: "pending" },
  { id: 10, name: "Financial Posting", description: "Post invoice in SAP FICA", status: "pending" },
];

export default function PlanChange() {
  const [selectedTab, setSelectedTab] = useState("immediate");
  const [selectedCustomer, setSelectedCustomer] = useState<typeof mockCustomerData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [scheduledChanges, setScheduledChanges] = useState<any[]>([]);
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(true);
  const { toast } = useToast();

  const form = useForm<PlanChangeData>({
    resolver: zodResolver(planChangeSchema),
    defaultValues: {
      smartCardNumber: "",
      newPlanId: "",
      changeType: "immediate",
      paymentMode: "wallet",
    },
  });

  // Calculate buffer period status (User Role based for manual changes)
  const isWithinBufferPeriod = useMemo(() => {
    if (!selectedCustomer) return false;
    const lastChangeDate = new Date(selectedCustomer.lastPlanChangeDate);
    const currentDate = new Date();
    const diffDays = Math.floor((currentDate.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= selectedCustomer.bufferPeriodDays;
  }, [selectedCustomer]);

  // Calculate system buffer period (fixed 2 days for automatic payment detection)
  const isWithinSystemBufferPeriod = useMemo(() => {
    if (!selectedCustomer) return false;
    const lastChangeDate = new Date(selectedCustomer.lastPlanChangeDate);
    const currentDate = new Date();
    const diffDays = Math.floor((currentDate.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2; // Fixed 2-day system buffer
  }, [selectedCustomer]);

  // Check for automatic plan change detection based on payment amount
  const checkAutomaticPlanChange = (paymentAmount: number) => {
    if (!selectedCustomer || !isWithinSystemBufferPeriod) return null;
    
    const previousInvoiceAmount = selectedCustomer.currentPlan.price;
    const totalAmount = previousInvoiceAmount + paymentAmount;
    
    // Find matching plan based on exact amount
    const matchingPlan = availablePlans.find(plan => plan.price === totalAmount);
    
    if (matchingPlan) {
      return {
        matched: true,
        plan: matchingPlan,
        previousInvoiceAmount,
        paymentAmount,
        totalAmount,
        message: `Automatic plan change detected: ${matchingPlan.name}`
      };
    }
    
    return {
      matched: false,
      previousInvoiceAmount,
      paymentAmount,
      totalAmount,
      message: `No matching plan found for total amount TSH ${totalAmount.toLocaleString()}`
    };
  };

  // Calculate payment requirements
  const paymentCalculation = useMemo(() => {
    if (!selectedCustomer || !selectedPlan) return null;

    const newPlan = availablePlans.find(p => p.id === selectedPlan);
    if (!newPlan) return null;

    const oldPlanAmount = selectedCustomer.currentPlan.price;
    const newPlanAmount = newPlan.price;
    const walletBalance = selectedCustomer.walletBalance;

    let refundAmount = 0;
    let totalRequired = newPlanAmount;
    let paymentRequired = 0;

    if (isWithinBufferPeriod && selectedTab === "immediate") {
      // Within buffer period - cancel old plan and refund
      refundAmount = oldPlanAmount;
      const availableBalance = walletBalance + refundAmount;
      paymentRequired = Math.max(0, newPlanAmount - availableBalance);
    } else {
      // After buffer period or scheduled - no refund
      paymentRequired = Math.max(0, newPlanAmount - walletBalance);
    }

    return {
      oldPlanAmount,
      newPlanAmount,
      refundAmount,
      paymentRequired,
      totalRequired,
      availableAfterRefund: walletBalance + refundAmount,
    };
  }, [selectedCustomer, selectedPlan, isWithinBufferPeriod, selectedTab]);

  // Search customer by smart card
  const handleCustomerSearch = async () => {
    const smartCardNumber = form.getValues("smartCardNumber");
    if (!smartCardNumber) return;

    // Simulate customer search
    if (smartCardNumber === "SC123456789") {
      setSelectedCustomer(mockCustomerData);
      toast({
        title: "Customer Found",
        description: `Customer ${mockCustomerData.customerId} with active ${mockCustomerData.currentPlan.name} subscription.`,
      });
    } else {
      toast({
        title: "Customer Not Found",
        description: "No active subscription found for this smart card number.",
        variant: "destructive",
      });
    }
  };

  // Handle plan change submission
  const handlePlanChange = async (data: PlanChangeData) => {
    if (!selectedCustomer || !paymentCalculation) return;

    setIsProcessing(true);
    setCurrentStep(0);

    // Simulate workflow steps
    for (let i = 0; i < workflowSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentStep(i + 1);
    }

    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep(0);
      toast({
        title: "Plan Change Successful",
        description: `Plan changed to ${availablePlans.find(p => p.id === selectedPlan)?.name} successfully.`,
      });
      
      // Reset form
      form.reset();
      setSelectedCustomer(null);
      setSelectedPlan("");
    }, 1000);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan Change Management</h1>
          <p className="text-gray-600">Manage immediate and scheduled subscription plan changes</p>
        </div>
        <div className="flex items-center space-x-2">
          <ArrowUpDown className="h-5 w-5 text-azam-blue" />
          <span className="text-sm font-medium text-azam-blue">Plan Changes Available</span>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="immediate" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Immediate Change
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduled Change
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Change History
          </TabsTrigger>
        </TabsList>

        {/* Immediate Plan Change */}
        <TabsContent value="immediate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-azam-blue" />
                Immediate Plan Change
              </CardTitle>
              <CardDescription>
                Process immediate plan changes with real-time provisioning. Changes within {mockCustomerData.bufferPeriodDays} days include full refund.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePlanChange)} className="space-y-6">
                  {/* Customer Search */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name="smartCardNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Smart Card Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter smart card number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" onClick={handleCustomerSearch} className="w-full">
                        <User className="h-4 w-4 mr-2" />
                        Search Customer
                      </Button>
                    </div>
                  </div>

                  {/* Customer Information */}
                  {selectedCustomer && (
                    <Card className="bg-blue-50 border-azam-blue">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Customer Details</Label>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm"><span className="font-medium">ID:</span> {selectedCustomer.customerId}</p>
                              <p className="text-sm"><span className="font-medium">Smart Card:</span> {selectedCustomer.smartCardNumber}</p>
                              <p className="text-sm"><span className="font-medium">SAP BP ID:</span> {selectedCustomer.sapBpId}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Current Subscription</Label>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm"><span className="font-medium">Plan:</span> {selectedCustomer.currentPlan.name}</p>
                              <p className="text-sm"><span className="font-medium">Amount:</span> TSH {selectedCustomer.currentPlan.price.toLocaleString()}</p>
                              <p className="text-sm"><span className="font-medium">Status:</span> 
                                <Badge className="ml-1" variant="default">{selectedCustomer.currentPlan.status}</Badge>
                              </p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Account Status</Label>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm"><span className="font-medium">Wallet:</span> TSH {selectedCustomer.walletBalance.toLocaleString()}</p>
                              <p className="text-sm"><span className="font-medium">Buffer Period:</span> 
                                <Badge className="ml-1" variant={isWithinBufferPeriod ? "default" : "secondary"}>
                                  {isWithinBufferPeriod ? "Within Buffer" : "After Buffer"}
                                </Badge>
                              </p>
                              <p className="text-sm"><span className="font-medium">Auto Renewal:</span> 
                                <Badge className="ml-1" variant={selectedCustomer.autoRenewalEnabled ? "default" : "secondary"}>
                                  {selectedCustomer.autoRenewalEnabled ? "Enabled" : "Disabled"}
                                </Badge>
                              </p>
                            </div>
                          </div>
                        </div>

                        {isWithinBufferPeriod && (
                          <Alert className="mt-4 border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                              This change is within the {selectedCustomer.bufferPeriodDays}-day buffer period. Full refund of previous plan will be processed.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Automatic Plan Change Detection */}
                        {isWithinSystemBufferPeriod && autoDetectionEnabled && (
                          <Alert className="mt-4 border-orange-200 bg-orange-50">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-800">
                              <strong>Automatic Plan Detection Active:</strong> Within system buffer period (2 days). Any payment will be checked for automatic plan change if payment + previous invoice amount (TSH {selectedCustomer.currentPlan.price.toLocaleString()}) matches an available plan.
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Automatic Payment Detection Demo */}
                  {selectedCustomer && isWithinSystemBufferPeriod && (
                    <Card className="bg-orange-50 border-orange-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <TrendingUp className="h-5 w-5 text-orange-600" />
                          Automatic Plan Change Detection
                        </CardTitle>
                        <CardDescription>
                          Test automatic plan change detection based on payment amount within system buffer period
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Test Payment Amount</Label>
                            <Input 
                              type="number" 
                              placeholder="Enter payment amount"
                              onChange={(e) => {
                                const paymentAmount = parseInt(e.target.value) || 0;
                                const result = checkAutomaticPlanChange(paymentAmount);
                                if (result) {
                                }
                              }}
                            />
                            <p className="text-xs text-gray-600 mt-1">
                              Previous invoice: TSH {selectedCustomer.currentPlan.price.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <Label>Detection Examples</Label>
                            <div className="space-y-1 text-xs">
                              <p className="text-green-600">• TSH 7,000 payment = TSH 19,000 total → Azam Play</p>
                              <p className="text-green-600">• TSH 16,000 payment = TSH 28,000 total → Azam Plus</p>
                              <p className="text-red-600">• TSH 5,000 payment = TSH 17,000 total → No match</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Plan Selection */}
                  {selectedCustomer && (
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Select New Plan</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availablePlans.filter(plan => plan.id !== selectedCustomer.currentPlan.id).map((plan) => (
                          <Card 
                            key={plan.id}
                            className={`cursor-pointer transition-all ${
                              selectedPlan === plan.id 
                                ? "border-2 border-azam-blue bg-blue-50" 
                                : "border border-gray-300 hover:border-azam-blue hover:shadow-md"
                            }`}
                            onClick={() => {
                              setSelectedPlan(plan.id);
                              form.setValue("newPlanId", plan.id);
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-azam-dark">{plan.name}</h4>
                                  <Badge variant="outline">{plan.type}</Badge>
                                </div>
                                <p className="text-2xl font-bold text-azam-blue">TSH {plan.price.toLocaleString()}</p>
                                <p className="text-sm text-gray-600">{plan.channels} channels • {plan.duration}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Calculation */}
                  {paymentCalculation && selectedPlan && (
                    <Card className="bg-gray-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <CreditCard className="h-5 w-5 text-azam-blue" />
                          Payment Calculation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Current Plan Amount:</span>
                              <span className="font-medium">TSH {paymentCalculation.oldPlanAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">New Plan Amount:</span>
                              <span className="font-medium">TSH {paymentCalculation.newPlanAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Current Wallet Balance:</span>
                              <span className="font-medium">TSH {selectedCustomer.walletBalance.toLocaleString()}</span>
                            </div>
                            {paymentCalculation.refundAmount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span className="text-sm">Refund Amount:</span>
                                <span className="font-medium">+TSH {paymentCalculation.refundAmount.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                              <span>Payment Required:</span>
                              <span className={paymentCalculation.paymentRequired > 0 ? "text-red-600" : "text-green-600"}>
                                {paymentCalculation.paymentRequired > 0 
                                  ? `TSH ${paymentCalculation.paymentRequired.toLocaleString()}`
                                  : "No Payment Required"
                                }
                              </span>
                            </div>
                            {paymentCalculation.paymentRequired > 0 && (
                              <FormField
                                control={form.control}
                                name="paymentMode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Payment Method</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select payment method" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="wallet">Wallet Top-up</SelectItem>
                                        <SelectItem value="online">Online Payment</SelectItem>
                                        <SelectItem value="agent">Agent Payment</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Submit Button */}
                  {selectedCustomer && selectedPlan && (
                    <div className="flex justify-end space-x-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedCustomer(null);
                          setSelectedPlan("");
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isProcessing || (paymentCalculation?.paymentRequired > 0 && !form.getValues("paymentMode"))}
                        className="min-w-[150px]"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            Change Plan Now
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Processing Workflow */}
          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-azam-blue" />
                  Plan Change Processing
                </CardTitle>
                <CardDescription>
                  Following SAP BRIM workflow: Portal → CM → FICA → CC → SOM → NAGRA → CI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflowSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center space-x-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        index < currentStep ? "bg-green-500 text-white" :
                        index === currentStep ? "bg-azam-blue text-white" :
                        "bg-gray-200 text-gray-500"
                      }`}>
                        {index < currentStep ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : index === currentStep ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <span className="text-xs font-bold">{step.id}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{step.name}</p>
                        <p className="text-xs text-gray-500">{step.description}</p>
                      </div>
                      <div>
                        {index < currentStep && <Badge variant="default">Completed</Badge>}
                        {index === currentStep && <Badge variant="default">Processing</Badge>}
                        {index > currentStep && <Badge variant="secondary">Pending</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scheduled Plan Change */}
        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-azam-blue" />
                Scheduled Plan Change
              </CardTitle>
              <CardDescription>
                Schedule plan changes to take effect at the end of current plan lifecycle. Requires sufficient wallet balance at execution time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Scheduled plan changes require sufficient wallet balance at the time of execution. If insufficient balance is available, auto-renewal logic will be triggered.
                </AlertDescription>
              </Alert>

              {/* Customer Search for Scheduled Changes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Smart Card Number</Label>
                  <Input placeholder="Enter smart card number for scheduled change" />
                </div>
                <div className="flex items-end">
                  <Button className="w-full">
                    <User className="h-4 w-4 mr-2" />
                    Search Customer
                  </Button>
                </div>
              </div>

              {/* Scheduled Change Form */}
              {selectedCustomer && (
                <div className="space-y-6">
                  <Card className="bg-blue-50 border-azam-blue">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Current Plan</Label>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm"><span className="font-medium">Plan:</span> {selectedCustomer.currentPlan.name}</p>
                            <p className="text-sm"><span className="font-medium">End Date:</span> {selectedCustomer.currentPlan.endDate}</p>
                            <p className="text-sm"><span className="font-medium">Amount:</span> TSH {selectedCustomer.currentPlan.price.toLocaleString()}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Account Details</Label>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm"><span className="font-medium">Customer ID:</span> {selectedCustomer.customerId}</p>
                            <p className="text-sm"><span className="font-medium">Wallet Balance:</span> TSH {selectedCustomer.walletBalance.toLocaleString()}</p>
                            <p className="text-sm"><span className="font-medium">Smart Card:</span> {selectedCustomer.smartCardNumber}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Plan Selection for Scheduled Change */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Select Plan for Scheduled Change</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availablePlans.filter(plan => plan.id !== selectedCustomer.currentPlan.id).map((plan) => (
                        <Card 
                          key={plan.id}
                          className={`cursor-pointer transition-all ${
                            selectedPlan === plan.id 
                              ? "border-2 border-azam-blue bg-blue-50" 
                              : "border border-gray-300 hover:border-azam-blue hover:shadow-md"
                          }`}
                          onClick={() => setSelectedPlan(plan.id)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-azam-dark">{plan.name}</h4>
                                <Badge variant="outline">{plan.type}</Badge>
                              </div>
                              <p className="text-2xl font-bold text-azam-blue">TSH {plan.price.toLocaleString()}</p>
                              <p className="text-sm text-gray-600">{plan.channels} channels • {plan.duration}</p>
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">Will activate on: {selectedCustomer.currentPlan.endDate}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Schedule Confirmation */}
                  {selectedPlan && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-green-900">Scheduled Plan Change Summary</h4>
                            <div className="mt-2 space-y-1 text-sm text-green-800">
                              <p><span className="font-medium">New Plan:</span> {availablePlans.find(p => p.id === selectedPlan)?.name}</p>
                              <p><span className="font-medium">Activation Date:</span> {selectedCustomer.currentPlan.endDate}</p>
                              <p><span className="font-medium">Required Amount:</span> TSH {availablePlans.find(p => p.id === selectedPlan)?.price.toLocaleString()}</p>
                              <p><span className="font-medium">Current Wallet:</span> TSH {selectedCustomer.walletBalance.toLocaleString()}</p>
                            </div>
                            {selectedCustomer.walletBalance < (availablePlans.find(p => p.id === selectedPlan)?.price || 0) && (
                              <Alert className="mt-3 border-orange-200 bg-orange-50">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <AlertDescription className="text-orange-800">
                                  Insufficient wallet balance. Please ensure sufficient funds before activation date or auto-renewal will be triggered.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end space-x-4">
                          <Button variant="outline" onClick={() => setSelectedPlan("")}>
                            Cancel
                          </Button>
                          <Button>
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule Plan Change
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Active Scheduled Changes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Scheduled Changes</CardTitle>
                  <CardDescription>
                    View and manage existing scheduled plan changes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scheduledChanges.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No scheduled plan changes found</p>
                        <p className="text-sm">Schedule a plan change to see it here</p>
                      </div>
                    ) : (
                      scheduledChanges.map((change, index) => (
                        <Card key={index} className="border-l-4 border-l-orange-500">
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <Label className="text-xs text-gray-500">Customer</Label>
                                <p className="text-sm font-medium">{change.customerId}</p>
                                <p className="text-xs text-gray-600">{change.smartCardNumber}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Scheduled Plan</Label>
                                <p className="text-sm font-medium">{change.planName}</p>
                                <p className="text-xs text-gray-600">TSH {change.amount.toLocaleString()}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Activation Date</Label>
                                <p className="text-sm font-medium">{change.scheduledDate}</p>
                                <Badge variant="secondary" className="mt-1">Pending</Badge>
                              </div>
                              <div className="flex items-center justify-end">
                                <Button variant="outline" size="sm">
                                  <Ban className="h-4 w-4 mr-2" />
                                  Cancel Schedule
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Change History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-azam-blue" />
                Plan Change History
              </CardTitle>
              <CardDescription>
                View complete history of plan changes, cancellations, and transaction details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPlanChangeHistory.map((transaction) => (
                  <Card key={transaction.id} className="border-l-4 border-l-azam-blue">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500">Date & Time</Label>
                          <p className="text-sm font-medium">
                            {transaction.eventDate.toLocaleDateString()} {transaction.eventDate.toLocaleTimeString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Event Type</Label>
                          <p className="text-sm font-medium">{transaction.eventName}</p>
                          {transaction.planName && <p className="text-xs text-gray-600">{transaction.planName}</p>}
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Amount</Label>
                          <p className={`text-sm font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.amount >= 0 ? '+' : ''}TSH {Math.abs(transaction.amount).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Wallet Balance</Label>
                          <p className="text-sm font-medium">TSH {transaction.walletBalance.toLocaleString()}</p>
                          <Badge variant={transaction.status === 'success' ? 'default' : 'destructive'} className="mt-1">
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
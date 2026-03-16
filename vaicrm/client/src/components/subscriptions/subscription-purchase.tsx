import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  CreditCard, 
  Package, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Receipt,
  Tv,
  Home,
  Building,
  Search,
  Eye,
  FileText,
  Loader2
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schemas
const prepaidSubscriptionSchema = z.object({
  smartCardNumber: z.string().min(1, "Smart card number is required"),
  planId: z.string().min(1, "Plan selection is required"),
  paymentMethod: z.enum(["online", "agent", "otc"]),
  paymentAmount: z.number().min(0, "Payment amount must be positive"),
  exciseDutyApplicable: z.boolean(),
});

const postpaidSubscriptionSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  serviceType: z.enum(["hotel", "commercial"]),
  numberOfRooms: z.number().min(1, "Number of rooms is required"),
  planId: z.string().min(1, "Plan selection is required"),
  billingCycle: z.enum(["monthly", "quarterly", "annual"]),
  autoRenewal: z.boolean(),
});

type PrepaidSubscriptionData = z.infer<typeof prepaidSubscriptionSchema>;
type PostpaidSubscriptionData = z.infer<typeof postpaidSubscriptionSchema>;

// Mock data for demonstration
const mockPlans = [
  { id: "BASIC001", name: "Basic TV Package", price: 25000, type: "basic", channels: 50 },
  { id: "PREM001", name: "Premium TV Package", price: 45000, type: "premium", channels: 120 },
  { id: "SPORT001", name: "Sports Package", price: 35000, type: "sports", channels: 80 },
  { id: "MOVIE001", name: "Movie Package", price: 40000, type: "movie", channels: 100 },
];

const ftaPacks = [
  { id: "FTA001", name: "FTA Pack 1", channels: 15, required: true },
  { id: "FTA002", name: "FTA Pack 2", channels: 20, required: true },
];

export default function SubscriptionPurchase() {
  const [activeTab, setActiveTab] = useState("prepaid");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [processingStep, setProcessingStep] = useState<string>('');
  const { toast } = useToast();

  // Prepaid form
  const prepaidForm = useForm<PrepaidSubscriptionData>({
    resolver: zodResolver(prepaidSubscriptionSchema),
    defaultValues: {
      smartCardNumber: "",
      planId: "",
      paymentMethod: "online",
      paymentAmount: 0,
      exciseDutyApplicable: true,
    },
  });

  // Postpaid form
  const postpaidForm = useForm<PostpaidSubscriptionData>({
    resolver: zodResolver(postpaidSubscriptionSchema),
    defaultValues: {
      customerId: "",
      serviceType: "hotel",
      numberOfRooms: 1,
      planId: "",
      billingCycle: "monthly",
      autoRenewal: true,
    },
  });

  // Simulate subscription purchase process based on SAP BRIM workflow
  const processPrepaidSubscription = useMutation({
    mutationFn: async (data: PrepaidSubscriptionData) => {
      // Simulate the exact SAP BRIM workflow steps for prepaid
      const steps = [
        "1. Payment verification and amount check",
        "2. Plan fetch and selection with FTA packs",
        "3. Creating subscription order in SOM",
        "4. Pricing calculation and validation",
        "5. Adding FTA packs (regulatory requirement)",
        "6. Creating subscription contract (PRVC)",
        "7. ODI execution - CC/FICA replication",
        "8. ODI execution - Activating charging contract",
        "9. ODI execution - Subscription master creation",
        "10. ODI execution - NAGRA provisioning",
        "11. CI BITS creation for billing",
        "12. Invoice generation with excise duty",
        "13. FICA document posting to sub-ledger"
      ];

      for (let i = 0; i < steps.length; i++) {
        setProcessingStep(steps[i]);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      return { success: true, contractId: "PRVC" + Date.now(), orderId: "PRVO" + Date.now() };
    },
    onSuccess: (data) => {
      setSubscriptionStatus('completed');
      toast({
        title: "Subscription Created Successfully",
        description: `Contract ID: ${data.contractId}`,
      });
    },
    onError: () => {
      setSubscriptionStatus('failed');
      toast({
        title: "Subscription Failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    },
  });

  const processPostpaidSubscription = useMutation({
    mutationFn: async (data: PostpaidSubscriptionData) => {
      // Simulate the exact SAP BRIM workflow steps for postpaid
      const steps = [
        "1. Customer validation and service type check",
        "2. Room configuration and capacity validation",
        "3. Plan selection for postpaid service type",
        "4. Creating multiple subscription orders (per STB)",
        "5. Pricing calculation (rooms × package rate)",
        "6. Adding FTA packs (regulatory requirement)",
        "7. Creating subscription contracts (PRVC)",
        "8. ODI execution - CC/FICA replication",
        "9. ODI execution - Activating charging contracts",
        "10. ODI execution - Subscription master creation",
        "11. ODI execution - NAGRA provisioning",
        "12. TRA posting request initiation",
        "13. Contract activation and billing setup"
      ];

      for (let i = 0; i < steps.length; i++) {
        setProcessingStep(steps[i]);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      return { success: true, contractId: "PRVC" + Date.now(), orderId: "PRVO" + Date.now() };
    },
    onSuccess: (data) => {
      setSubscriptionStatus('completed');
      toast({
        title: "Subscription Created Successfully",
        description: `Contract ID: ${data.contractId}`,
      });
    },
    onError: () => {
      setSubscriptionStatus('failed');
      toast({
        title: "Subscription Failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    },
  });

  const handlePrepaidSubmit = (data: PrepaidSubscriptionData) => {
    setSubscriptionStatus('processing');
    processPrepaidSubscription.mutate(data);
  };

  const handlePostpaidSubmit = (data: PostpaidSubscriptionData) => {
    setSubscriptionStatus('processing');
    processPostpaidSubscription.mutate(data);
  };

  const calculateTotal = (planPrice: number, rooms: number = 1, exciseDuty: boolean = false) => {
    const baseAmount = planPrice * rooms;
    const vatAmount = baseAmount * 0.18; // 18% VAT
    const exciseDutyAmount = exciseDuty ? baseAmount * 0.05 : 0; // 5% excise duty if applicable
    return {
      baseAmount,
      vatAmount,
      exciseDutyAmount,
      total: baseAmount + vatAmount + exciseDutyAmount
    };
  };

  const ProcessingStatus = () => {
    const totalSteps = activeTab === 'prepaid' ? 13 : 13;
    const currentStepNumber = processingStep ? parseInt(processingStep.split('.')[0]) : 0;
    const progress = (currentStepNumber / totalSteps) * 100;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-azam-blue" />
          <span className="text-sm font-medium">Processing {activeTab === 'prepaid' ? 'Prepaid' : 'Postpaid'} Subscription...</span>
        </div>
        <div className="text-sm text-gray-600">
          <strong>Current step:</strong> {processingStep}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-azam-blue h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 text-center">
          Step {currentStepNumber} of {totalSteps}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-6 w-6 text-azam-blue" />
          <h1 className="text-2xl font-bold text-gray-900">Subscription Purchase</h1>
        </div>
        <p className="text-gray-600">Process new subscription purchases for prepaid and postpaid customers</p>
      </div>

      {subscriptionStatus === 'processing' && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <ProcessingStatus />
          </CardContent>
        </Card>
      )}

      {subscriptionStatus === 'completed' && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Subscription has been successfully created and activated. Customer can now view content.
          </AlertDescription>
        </Alert>
      )}

      {subscriptionStatus === 'failed' && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Subscription creation failed. Please check the details and try again.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prepaid" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Prepaid Subscription
          </TabsTrigger>
          <TabsTrigger value="postpaid" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Postpaid Subscription
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prepaid" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Prepaid Subscription Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...prepaidForm}>
                  <form onSubmit={prepaidForm.handleSubmit(handlePrepaidSubmit)} className="space-y-4">
                    <FormField
                      control={prepaidForm.control}
                      name="smartCardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Smart Card Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter smart card number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={prepaidForm.control}
                      name="planId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Plan</FormLabel>
                          <Select 
                            value={field.value} 
                            onValueChange={(value) => {
                              field.onChange(value);
                              const plan = mockPlans.find(p => p.id === value);
                              setSelectedPlan(plan);
                              prepaidForm.setValue('paymentAmount', plan?.price || 0);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mockPlans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.name} - TZS {plan.price.toLocaleString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={prepaidForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="online">Online Payment</SelectItem>
                              <SelectItem value="agent">Agent Payment</SelectItem>
                              <SelectItem value="otc">Over the Counter</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={prepaidForm.control}
                      name="paymentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Amount (TZS)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={subscriptionStatus === 'processing'}
                    >
                      {subscriptionStatus === 'processing' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Create Prepaid Subscription'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPlan && (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Plan: {selectedPlan.name}</span>
                      <span>TZS {selectedPlan.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Channels: {selectedPlan.channels}</span>
                      <Badge>{selectedPlan.type}</Badge>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Base Amount</span>
                        <span>TZS {selectedPlan.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT (18%)</span>
                        <span>TZS {(selectedPlan.price * 0.18).toLocaleString()}</span>
                      </div>
                      {prepaidForm.watch('exciseDutyApplicable') && (
                        <div className="flex justify-between">
                          <span>Excise Duty (5%)</span>
                          <span>TZS {(selectedPlan.price * 0.05).toLocaleString()}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total Amount</span>
                        <span>TZS {calculateTotal(selectedPlan.price, 1, prepaidForm.watch('exciseDutyApplicable')).total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <h4 className="font-medium mb-2">Included FTA Packs (Regulatory):</h4>
                  <div className="space-y-2">
                    {ftaPacks.map((pack) => (
                      <div key={pack.id} className="flex items-center justify-between text-sm">
                        <span>{pack.name}</span>
                        <Badge variant="outline">{pack.channels} channels</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="postpaid" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Postpaid Subscription Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...postpaidForm}>
                  <form onSubmit={postpaidForm.handleSubmit(handlePostpaidSubmit)} className="space-y-4">
                    <FormField
                      control={postpaidForm.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter customer ID" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={postpaidForm.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hotel">Hotel</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={postpaidForm.control}
                      name="numberOfRooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Rooms</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              min="1"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={postpaidForm.control}
                      name="planId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Plan</FormLabel>
                          <Select 
                            value={field.value} 
                            onValueChange={(value) => {
                              field.onChange(value);
                              const plan = mockPlans.find(p => p.id === value);
                              setSelectedPlan(plan);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mockPlans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.name} - TZS {plan.price.toLocaleString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={postpaidForm.control}
                      name="billingCycle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Cycle</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly (25th of each month)</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={subscriptionStatus === 'processing'}
                    >
                      {subscriptionStatus === 'processing' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Create Postpaid Subscription'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Postpaid Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPlan && (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Plan: {selectedPlan.name}</span>
                      <span>TZS {selectedPlan.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Number of Rooms</span>
                      <span>{postpaidForm.watch('numberOfRooms')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Type</span>
                      <Badge>{postpaidForm.watch('serviceType')}</Badge>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Base Amount (per room)</span>
                        <span>TZS {selectedPlan.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Base Amount</span>
                        <span>TZS {(selectedPlan.price * postpaidForm.watch('numberOfRooms')).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT (18%)</span>
                        <span>TZS {(selectedPlan.price * postpaidForm.watch('numberOfRooms') * 0.18).toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Monthly Total</span>
                        <span>TZS {calculateTotal(selectedPlan.price, postpaidForm.watch('numberOfRooms')).total.toLocaleString()}</span>
                      </div>
                    </div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Postpaid billing is processed on the 25th of every month. TRA posting will be done on subscription invoices.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Workflow Process Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Subscription Process Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Prepaid Process Steps:</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="bg-azam-blue text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                  Payment verification and plan matching
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-azam-blue text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  Subscription order creation in BRIM SOM
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-azam-blue text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                  Contract creation with STB/Smart Card ID
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-azam-blue text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                  ODI execution (CC replication, charging activation)
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-azam-blue text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">5</span>
                  NAGRA CAS provisioning
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-azam-blue text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">6</span>
                  Immediate billing and invoicing
                </li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-3">Postpaid Process Steps:</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                  Customer and room validation
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  Multiple subscription orders (per STB)
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                  Contract creation with technical identifiers
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                  ODI execution and charging activation
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">5</span>
                  NAGRA CAS provisioning
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">6</span>
                  TRA posting and monthly billing setup
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FTA Packs and Regulatory Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tv className="h-5 w-5" />
              FTA Packs (Free-To-Air)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                As per regulatory requirements, FTA packs are automatically included with all subscriptions:
              </p>
              {ftaPacks.map((pack, index) => (
                <div key={pack.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{pack.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{pack.channels} channels</Badge>
                    <Badge className="bg-green-100 text-green-800">Required</Badge>
                  </div>
                </div>
              ))}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  FTA packs are mandatory for regulatory compliance and will be automatically added to all subscriptions.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              System Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800">Portal</Badge>
                <span className="text-sm">User interface and order management</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-800">CM</Badge>
                <span className="text-sm">Customer management and workflow</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">SOM</Badge>
                <span className="text-sm">SAP BRIM Subscription Order Management</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-100 text-yellow-800">CC</Badge>
                <span className="text-sm">SAP Convergent Charging</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-800">NAGRA</Badge>
                <span className="text-sm">CAS system provisioning</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-100 text-indigo-800">CI</Badge>
                <span className="text-sm">SAP Convergent Invoicing</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-100 text-orange-800">TCRA</Badge>
                <span className="text-sm">Regulatory compliance posting</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Prepaid Customers:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Payment required before subscription activation</li>
                <li>• Immediate provisioning after successful payment</li>
                <li>• Invoice generated with excise duty details</li>
                <li>• Content viewable immediately after provisioning</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Postpaid Customers:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Hardware installation completed before subscription</li>
                <li>• Charges based on package and number of rooms</li>
                <li>• Monthly billing on 25th of each month</li>
                <li>• TRA posting done on subscription invoices</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
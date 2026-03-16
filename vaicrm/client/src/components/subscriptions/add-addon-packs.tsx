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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  CalendarDays, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  RefreshCw, 
  Search,
  Info,
  ArrowRight,
  Play,
  Zap,
  Tv,
  Settings,
  DollarSign
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Add-On Purchase Form Schema
const addOnPurchaseSchema = z.object({
  smartCardNumber: z.string().min(1, "Smart card number is required"),
  addOnPackId: z.string().min(1, "Please select an add-on pack"),
  paymentMode: z.enum(["wallet", "online", "agent"]),
  autoRenewal: z.boolean().default(true),
});

type AddOnPurchaseData = z.infer<typeof addOnPurchaseSchema>;

// Mock data for available add-on packs
const availableAddOns = [
  {
    id: "SPORT001",
    name: "Sports Ultimate Pack",
    type: "Sports",
    description: "Premium sports channels including international leagues",
    amount: 8000,
    vatAmount: 1440,
    totalAmount: 9440,
    duration: 30,
    channels: 15,
    features: ["Live Sports", "Highlights", "Analysis"],
    category: "Sports",
    isActive: true
  },
  {
    id: "MOVIE001", 
    name: "Movie Premium Pack",
    type: "Entertainment",
    description: "Latest movies and series from Hollywood and Bollywood",
    amount: 12000,
    vatAmount: 2160,
    totalAmount: 14160,
    duration: 30,
    channels: 20,
    features: ["Latest Movies", "Series", "Box Office Hits"],
    category: "Movies",
    isActive: true
  },
  {
    id: "KIDS001",
    name: "Kids & Family Pack",
    type: "Kids",
    description: "Educational and entertaining content for children",
    amount: 5000,
    vatAmount: 900,
    totalAmount: 5900,
    duration: 30,
    channels: 10,
    features: ["Educational Content", "Cartoons", "Family Shows"],
    category: "Kids",
    isActive: true
  },
  {
    id: "NEWS001",
    name: "International News Pack",
    type: "News",
    description: "Global news channels and current affairs",
    amount: 6000,
    vatAmount: 1080,
    totalAmount: 7080,
    duration: 30,
    channels: 12,
    features: ["Live News", "Analysis", "Global Coverage"],
    category: "News",
    isActive: true
  }
];

// Mock customer data with base plan
const mockCustomerData = {
  customerId: "CUST001",
  smartCardNumber: "SC123456789",
  sapBpId: "BP12345",
  sapCaId: "CA67890", 
  sapContractId: "CON123456789",
  firstName: "John",
  lastName: "Doe",
  basePlan: {
    id: "AZ002",
    name: "Azam Play 1 Month",
    amount: 19000,
    startDate: "2025-04-24 14:00:00",
    endDate: "2025-05-23 23:59:59",
    status: "Active"
  },
  walletBalance: 25000,
  activeAddOns: [
    {
      id: "SPORT001",
      name: "Sports Ultimate Pack", 
      startDate: "2025-04-24 14:00:00",
      endDate: "2025-05-23 23:59:59",
      status: "Active",
      autoRenewal: true
    }
  ],
  customerType: "Prepaid"
};

// Process workflow steps for Add-On purchase
const addOnWorkflowSteps = [
  { id: 1, name: "Customer Eligibility Check", description: "Portal checks if the customer is active", system: "Portal", status: "pending" },
  { id: 2, name: "Wallet Balance Check & Amount Calc", description: "Portal verifies wallet balance and calculates Add-On amount", system: "Portal", status: "pending" },
  { id: 3, name: "Submit Request to CM", description: "Portal sends JSON request to SAP Convergent Mediation", system: "Portal, CM", status: "pending" },
  { id: 4, name: "Wallet Deduction", description: "CM deducts applicable amount from customer's wallet", system: "CM", status: "pending" },
  { id: 5, name: "Initiate Change Order in SOM", description: "CM sends request to SOM for change order process", system: "CM, SAP SOM", status: "pending" },
  { id: 6, name: "Create Change Order in SOM", description: "SOM processes the change order", system: "SAP SOM", status: "pending" },
  { id: 7, name: "Update Subscription Record", description: "SOM creates new entry with end date aligned to base plan", system: "SAP SOM", status: "pending" },
  { id: 8, name: "Replicate to Convergent Charging", description: "SOM replicates updated subscription to SAP CC", system: "SOM, SAP CC", status: "pending" },
  { id: 9, name: "Provisioning Request to Nagra", description: "CM sends request to Nagra for Add-On provisioning", system: "SAP CM, Nagra", status: "pending" },
  { id: 10, name: "Prorated Charging in CC", description: "CC calculates prorated charge and generates BITs", system: "SAP CC", status: "pending" },
  { id: 11, name: "Billing & Invoicing in CI", description: "BITs pushed to CI for billing and invoice generation", system: "SAP CI", status: "pending" },
  { id: 12, name: "Posting to FICA", description: "Financial posting completed in SAP FICA", system: "SAP FICA", status: "pending" },
  { id: 13, name: "Invoice Posting to TCRA", description: "Final invoice posted to TCRA regulatory systems", system: "SAP CM, SAP CI, TCRA", status: "pending" },
  { id: 14, name: "No TRA Posting", description: "Prepaid subscription invoice not posted to TRA", system: "TRA", status: "pending" }
];

export default function AddAddonPacks() {
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedAddOn, setSelectedAddOn] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("search");
  const [workflowProgress, setWorkflowProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);
  const [prorationAmount, setProrationAmount] = useState(0);
  const { toast } = useToast();

  const form = useForm<AddOnPurchaseData>({
    resolver: zodResolver(addOnPurchaseSchema),
    defaultValues: {
      smartCardNumber: "",
      addOnPackId: "",
      paymentMode: "wallet",
      autoRenewal: true,
    },
  });

  // Calculate proration amount based on base plan end date
  const calculateProration = (addOnPack: any) => {
    if (!selectedCustomer || !addOnPack) return 0;
    
    const today = new Date();
    const basePlanEndDate = new Date(selectedCustomer.basePlan.endDate);
    const daysRemaining = Math.ceil((basePlanEndDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const dailyRate = addOnPack.totalAmount / 30; // Assuming 30-day packs
    return Math.round(dailyRate * daysRemaining);
  };

  // Handle customer search
  const handleCustomerSearch = () => {
    if (customerSearch === "SC123456789" || customerSearch === "CUST001") {
      setSelectedCustomer(mockCustomerData);
      form.setValue("smartCardNumber", mockCustomerData.smartCardNumber);
      setActiveTab("addon-selection");
      toast({
        title: "Customer Found",
        description: `Customer ${mockCustomerData.firstName} ${mockCustomerData.lastName} loaded successfully.`,
      });
    } else {
      toast({
        title: "Customer Not Found", 
        description: "Please check the smart card number and try again.",
        variant: "destructive",
      });
    }
  };

  // Handle add-on selection
  const handleAddOnSelect = (addOn: any) => {
    setSelectedAddOn(addOn);
    form.setValue("addOnPackId", addOn.id);
    const prorated = calculateProration(addOn);
    setProrationAmount(prorated);
    setActiveTab("confirmation");
  };

  // Simulate workflow progression
  const simulateWorkflowStep = (stepIndex: number) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setCurrentStep(stepIndex + 1);
        setWorkflowProgress(((stepIndex + 1) / addOnWorkflowSteps.length) * 100);
        resolve(true);
      }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
    });
  };

  // Handle form submission
  const onSubmit = async (data: AddOnPurchaseData) => {
    if (!selectedCustomer || !selectedAddOn) return;

    setIsProcessing(true);
    setActiveTab("workflow");
    
    try {
      // Simulate each workflow step
      for (let i = 0; i < addOnWorkflowSteps.length; i++) {
        await simulateWorkflowStep(i);
      }
      
      setProcessComplete(true);
      toast({
        title: "Add-On Purchase Successful",
        description: `${selectedAddOn.name} has been successfully added to the customer's subscription.`,
      });
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "There was an error processing the add-on purchase.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Add-ON Packs</h1>
          <p className="text-gray-600 mt-1">Purchase additional channel packages for customer subscriptions</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Package className="h-4 w-4 mr-2" />
          Subscription Add-Ons
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Customer Search</TabsTrigger>
          <TabsTrigger value="addon-selection" disabled={!selectedCustomer}>Add-On Selection</TabsTrigger>
          <TabsTrigger value="confirmation" disabled={!selectedAddOn}>Confirmation</TabsTrigger>
          <TabsTrigger value="workflow" disabled={!isProcessing && !processComplete}>Process Status</TabsTrigger>
        </TabsList>

        {/* Customer Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Customer
              </CardTitle>
              <CardDescription>
                Enter customer smart card number or customer ID to begin add-on purchase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="customer-search">Smart Card Number / Customer ID</Label>
                  <Input
                    id="customer-search"
                    placeholder="Enter smart card number or customer ID"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
                <Button onClick={handleCustomerSearch} className="mt-6">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              {selectedCustomer && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Customer Name</Label>
                        <p className="text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Smart Card</Label>
                        <p className="text-sm font-mono">{selectedCustomer.smartCardNumber}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Base Plan</Label>
                        <p className="text-sm">{selectedCustomer.basePlan.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Wallet Balance</Label>
                        <p className="text-sm font-medium text-green-600">
                          TZS {selectedCustomer.walletBalance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add-On Selection Tab */}
        <TabsContent value="addon-selection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Available Add-On Packs
              </CardTitle>
              <CardDescription>
                Select from available add-on packages. Pricing will be prorated based on your base plan end date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableAddOns.map((addOn) => {
                  const prorated = calculateProration(addOn);
                  return (
                    <Card 
                      key={addOn.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedAddOn?.id === addOn.id ? 'ring-2 ring-azam-blue' : ''
                      }`}
                      onClick={() => handleAddOnSelect(addOn)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{addOn.name}</h3>
                            <Badge variant="secondary" className="mt-1">{addOn.category}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500 line-through">TZS {addOn.totalAmount.toLocaleString()}</p>
                            <p className="font-bold text-azam-blue">TZS {prorated.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Prorated</p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{addOn.description}</p>
                        
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <Tv className="h-4 w-4" />
                            <span>{addOn.channels} channels</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{addOn.duration} days</span>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Features:</p>
                          <div className="flex flex-wrap gap-1">
                            {addOn.features.map((feature, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confirmation Tab */}
        <TabsContent value="confirmation" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Purchase Confirmation
                  </CardTitle>
                  <CardDescription>
                    Review the details before processing the add-on purchase
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Customer Summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                    <div>
                      <Label className="text-sm font-medium">Customer</Label>
                      <p className="text-sm">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Smart Card</Label>
                      <p className="text-sm font-mono">{selectedCustomer?.smartCardNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Base Plan</Label>
                      <p className="text-sm">{selectedCustomer?.basePlan?.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Plan End Date</Label>
                      <p className="text-sm">{selectedCustomer?.basePlan?.endDate}</p>
                    </div>
                  </div>

                  {/* Add-On Summary */}
                  {selectedAddOn && (
                    <div className="p-4 border rounded-lg bg-blue-50">
                      <h3 className="font-semibold mb-3">Selected Add-On Package</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Package Name</Label>
                          <p className="text-sm">{selectedAddOn.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Category</Label>
                          <p className="text-sm">{selectedAddOn.category}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Original Price</Label>
                          <p className="text-sm">TZS {selectedAddOn.totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Prorated Amount</Label>
                          <p className="text-sm font-bold text-azam-blue">TZS {prorationAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment and Options */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="paymentMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Mode</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="wallet">Wallet Balance</SelectItem>
                              <SelectItem value="online">Online Payment</SelectItem>
                              <SelectItem value="agent">Agent Payment</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="autoRenewal"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto-Renewal</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Automatically renew this add-on when the base plan is renewed
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Balance Check */}
                  {form.watch("paymentMode") === "wallet" && (
                    <Alert className={selectedCustomer?.walletBalance >= prorationAmount ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                      <Wallet className="h-4 w-4" />
                      <AlertDescription>
                        {selectedCustomer?.walletBalance >= prorationAmount ? (
                          <span className="text-green-700">
                            ✓ Sufficient wallet balance (TZS {selectedCustomer?.walletBalance.toLocaleString()})
                          </span>
                        ) : (
                          <span className="text-red-700">
                            ✗ Insufficient wallet balance. Required: TZS {prorationAmount.toLocaleString()}, Available: TZS {selectedCustomer?.walletBalance.toLocaleString()}
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={form.watch("paymentMode") === "wallet" && selectedCustomer?.walletBalance < prorationAmount}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Process Add-On Purchase
                  </Button>
                </CardContent>
              </Card>
            </form>
          </Form>
        </TabsContent>

        {/* Workflow Status Tab */}
        <TabsContent value="workflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className={`h-5 w-5 ${isProcessing ? 'animate-spin' : ''}`} />
                Processing Status
              </CardTitle>
              <CardDescription>
                Tracking the 14-step add-on purchase workflow across all systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(workflowProgress)}%</span>
                </div>
                <Progress value={workflowProgress} className="w-full" />
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {addOnWorkflowSteps.map((step, index) => (
                  <div 
                    key={step.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      index < currentStep ? 'bg-green-50 border-green-200' :
                      index === currentStep ? 'bg-blue-50 border-blue-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      index < currentStep ? 'bg-green-500 text-white' :
                      index === currentStep ? 'bg-blue-500 text-white' :
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {index < currentStep ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : index === currentStep ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">{step.id}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{step.name}</h4>
                      <p className="text-xs text-gray-600">{step.description}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{step.system}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              {processComplete && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <strong>Add-On Purchase Completed Successfully!</strong>
                    <br />
                    The {selectedAddOn?.name} has been activated and will remain active until {selectedCustomer?.basePlan?.endDate}.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
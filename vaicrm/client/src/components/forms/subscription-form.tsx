import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubscriptionSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { z } from "zod";
import { useAuthContext } from "@/context/AuthProvider";

type SubscriptionFormData = z.infer<typeof insertSubscriptionSchema>;

interface SubscriptionFormProps {
  customers: any[];
  onSubmit: (data: SubscriptionFormData) => void;
  isLoading?: boolean;
}

const subscriptionPlans = [
  {
    id: "basic",
    name: "Basic Package",
    description: "50+ channels, HD quality",
    price: 25000,
  },
  {
    id: "premium",
    name: "Premium Package", 
    description: "100+ channels, 4K quality, Sports",
    price: 45000,
  },
  {
    id: "family",
    name: "Family Package",
    description: "150+ channels, Kids, Movies",
    price: 65000,
  },
];

export default function SubscriptionForm({ customers, onSubmit, isLoading }: SubscriptionFormProps) {
  const [selectedPlan, setSelectedPlan] = useState("premium");
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(insertSubscriptionSchema),
    defaultValues: {
      activationType: "immediate",
      status: "active",
    },
  });

  const watchedValues = watch();
  const selectedCustomer = customers.find(c => c.id === watchedValues.customerId);
  const plan = subscriptionPlans.find(p => p.id === selectedPlan);
const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;
  // Set amount when plan changes
  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    const selectedPlanData = subscriptionPlans.find(p => p.id === planId);
    if (selectedPlanData) {
      setValue("plan", selectedPlanData.name);
      setValue("amount", selectedPlanData.price);
    }
  };

  const handleFormSubmit = (data: SubscriptionFormData) => {
    // Set start date to today if not provided
    if (!data.startDate) {
      data.startDate = new Date();
    }
    
    // Set end date to one month from start date if not provided
    if (!data.endDate) {
      const endDate = new Date(data.startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      data.endDate = endDate;
    }
    
    onSubmit(data);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Subscription Form */}
      <div className="space-y-4">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="customerId">Customer</Label>
            <Select onValueChange={(value) => setValue("customerId", parseInt(value))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name} - {customer.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customerId && (
              <p className="text-sm text-red-500 mt-1">{errors.customerId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="smartCardNumber">Smart Card Number</Label>
            <Input
              id="smartCardNumber"
              {...register("smartCardNumber")}
              placeholder="Enter smart card number"
              className="mt-1"
            />
            {errors.smartCardNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.smartCardNumber.message}</p>
            )}
          </div>

          <div>
            <Label>Subscription Plan</Label>
            <div className="space-y-3 mt-2">
              {subscriptionPlans.map((planOption) => (
                <Card 
                  key={planOption.id}
                  className={`cursor-pointer transition-colors ${
                    selectedPlan === planOption.id 
                      ? "border-2 border-azam-blue bg-blue-50" 
                      : "border border-gray-300 hover:border-azam-blue"
                  }`}
                  onClick={() => handlePlanChange(planOption.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-azam-dark">{planOption.name}</h5>
                        <p className="text-sm text-gray-600">{planOption.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-azam-dark">{currentSalesOrg || ""}  {planOption.price.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">/month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate", { valueAsDate: true })}
                className="mt-1"
              />
              {errors.startDate && (
                <p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...register("endDate", { valueAsDate: true })}
                className="mt-1"
              />
              {errors.endDate && (
                <p className="text-sm text-red-500 mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Activation Type</Label>
            <RadioGroup 
              defaultValue="immediate" 
              onValueChange={(value) => setValue("activationType", value)}
              className="flex space-x-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediate" id="immediate" />
                <Label htmlFor="immediate" className="text-sm">Immediate</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <Label htmlFor="scheduled" className="text-sm">Scheduled</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1 btn-primary" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Subscription"}
            </Button>
            <Button type="button" variant="outline">
              Save Draft
            </Button>
          </div>
        </form>
      </div>

      {/* Subscription Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-azam-dark mb-4">Subscription Summary</h4>
        <Card className="border">
          <CardContent className="p-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{selectedCustomer?.name || "Select customer"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Smart Card:</span>
                <span className="font-medium">{watchedValues.smartCardNumber || "Enter smart card number"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">{plan?.name || "Select plan"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">1 Month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Start Date:</span>
                <span className="font-medium">
                  {watchedValues.startDate ? new Date(watchedValues.startDate).toLocaleDateString() : "Select date"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">End Date:</span>
                <span className="font-medium">
                  {watchedValues.endDate ? new Date(watchedValues.endDate).toLocaleDateString() : "Select date"}
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount:</span>
                <span className="text-azam-blue">
                  {currentSalesOrg || ""} {plan ? plan.price.toLocaleString() : "0"}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-azam-green rounded-full mr-2"></div>
                <span className="text-sm text-green-800">Ready for activation</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CloudUpload } from "lucide-react";
import type { z } from "zod";

type CustomerFormData = z.infer<typeof insertCustomerSchema>;

interface CustomerFormProps {
  onSubmit: (data: CustomerFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<CustomerFormData>;
}

export default function CustomerForm({ onSubmit, isLoading, defaultValues }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues,
  });

  const serviceType = watch("serviceType");
  const accountClass = watch("accountClass");
  const connectionType = watch("connectionType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="serviceType">Service Type</Label>
            <Select value={serviceType} onValueChange={(value) => setValue("serviceType", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
            {errors.serviceType && (
              <p className="text-sm text-red-500 mt-1">{errors.serviceType.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="accountClass">Account Class</Label>
            <Select value={accountClass} onValueChange={(value) => setValue("accountClass", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Account Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
            {errors.accountClass && (
              <p className="text-sm text-red-500 mt-1">{errors.accountClass.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="connectionType">Connection Type</Label>
            <Select value={connectionType} onValueChange={(value) => setValue("connectionType", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Connection Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="New Installation">New Installation</SelectItem>
                <SelectItem value="Reconnection">Reconnection</SelectItem>
                <SelectItem value="Upgrade">Upgrade</SelectItem>
              </SelectContent>
            </Select>
            {errors.connectionType && (
              <p className="text-sm text-red-500 mt-1">{errors.connectionType.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="name">Customer Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Enter customer name"
              className="mt-1"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              {...register("phone")}
              placeholder="xxxx xxx xxx xxx"
              className="mt-1"
            />
            {errors.phone && (
              <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="customer@example.com"
              className="mt-1"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Address</Label>
            <Input
              {...register("address")}
              placeholder="Street address"
              className="mt-1"
            />
            <Input
              {...register("city")}
              placeholder="City"
            />
            <Input
              {...register("region")}
              placeholder="Region"
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address.message}</p>
            )}
            {errors.city && (
              <p className="text-sm text-red-500">{errors.city.message}</p>
            )}
            {errors.region && (
              <p className="text-sm text-red-500">{errors.region.message}</p>
            )}
          </div>

          <div>
            <Label>Parent Customer</Label>
            <Select onValueChange={(value) => setValue("parentCustomerId", parseInt(value))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="No Parent Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Parent Customer</SelectItem>
                <SelectItem value="1">ABC Company Ltd</SelectItem>
                <SelectItem value="2">XYZ Corporation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>KYC Documents</Label>
            <Card className="mt-1 border-2 border-dashed border-gray-300 hover:border-azam-blue transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <CloudUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Upload customer documents</p>
                <p className="text-xs text-gray-500 mt-1">ID, Passport, License - PDF, JPG, PNG up to 10MB</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? "Registering..." : "Register Customer"}
        </Button>
      </div>
    </form>
  );
}

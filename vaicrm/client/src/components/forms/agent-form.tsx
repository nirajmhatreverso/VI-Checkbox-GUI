import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAgentSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CloudUpload } from "lucide-react";
import type { z } from "zod";

type AgentFormData = z.infer<typeof insertAgentSchema>;

interface AgentFormProps {
  onSubmit: (data: AgentFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<AgentFormData>;
}

export default function AgentForm({ onSubmit, isLoading, defaultValues }: AgentFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AgentFormData>({
    resolver: zodResolver(insertAgentSchema),
    defaultValues: {
      status: "draft",
      ...defaultValues,
    },
  });

  const roleValue = watch("role");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              {...register("firstName")}
              placeholder="Enter first name"
              className="mt-1"
            />
            {errors.firstName && (
              <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              {...register("lastName")}
              placeholder="Enter last name"
              className="mt-1"
            />
            {errors.lastName && (
              <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="agent@example.com"
              className="mt-1"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
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
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="tinNumber">TIN Number</Label>
            <Input
              id="tinNumber"
              {...register("tinNumber")}
              placeholder="Enter TIN number"
              className="mt-1"
            />
            {errors.tinNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.tinNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="vrnNumber">VRN Number</Label>
            <Input
              id="vrnNumber"
              {...register("vrnNumber")}
              placeholder="Enter VRN number"
              className="mt-1"
            />
            {errors.vrnNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.vrnNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={roleValue} onValueChange={(value) => setValue("role", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sales Agent">Sales Agent</SelectItem>
                <SelectItem value="Technical Support">Technical Support</SelectItem>
                <SelectItem value="Field Agent">Field Agent</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
            )}
          </div>

          <div>
            <Label>KYC Documents</Label>
            <Card className="mt-1 border-2 border-dashed border-gray-300 hover:border-azam-blue transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <CloudUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Drop files here or click to upload</p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline">
          Save as Draft
        </Button>
        <div className="space-x-3">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Agent"}
          </Button>
        </div>
      </div>
    </form>
  );
}

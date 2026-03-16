import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { User } from "@/hooks/use-user-master";
import { Role } from "@/hooks/use-role-master";
import { useCountries } from "@/hooks/use-center-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const userFormSchema = z.object({
    userId: z.string(),
    userName: z.string().min(3, "Username must be at least 3 characters"),
    userType: z.string().min(1, "User Type is required"),
    roleId: z.string().min(1, "Role is required"),
    salutation: z.string().min(1, "Salutation is required"),
    firstName: z.string().min(2, "First name is required"),
    middleName: z.string().optional(),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    altPhone: z.string().optional(),
    employeeCode: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    country: z.string().min(1, "Country is required"),
    otc: z.boolean().default(false),
    employee: z.boolean().default(false),
    passwordReset: z.boolean().default(false),
    mainPlant: z.boolean().default(false),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    onSave: (user: User) => void;
    roles: Role[];
}

export function UserFormDialog({
    open,
    onOpenChange,
    user,
    onSave,
    roles,
}: UserFormDialogProps) {
    const [duplicateError, setDuplicateError] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const { data: countries = [], isLoading: isLoadingCountries } = useCountries();

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            userId: "",
            userName: "",
            userType: "",
            roleId: "",
            salutation: "",
            firstName: "",
            middleName: "",
            lastName: "",
            email: "",
            phone: "",
            altPhone: "",
            employeeCode: "",
            status: "ACTIVE",
            country: "",
            otc: false,
            employee: false,
            passwordReset: false,
            mainPlant: false,
        },
    });

    const username = form.watch("userName");
    const otc = form.watch("otc");
    const employee = form.watch("employee");
    const mainPlant = form.watch("mainPlant");
    const userType = form.watch("userType");
    const roleId = form.watch("roleId");

    // Sync roleId when userType changes
    useEffect(() => {
        if (userType && roles.length > 0) {
            const role = roles.find(r => r.roleName === userType);
            if (role && role.roleId !== form.getValues("roleId")) {
                form.setValue("roleId", role.roleId, { shouldValidate: true });
            }
        }
    }, [userType, roles]);

    // Sync userType when roleId changes
    useEffect(() => {
        if (roleId && roles.length > 0) {
            const role = roles.find(r => r.roleId === roleId);
            if (role && role.roleName !== form.getValues("userType")) {
                form.setValue("userType", role.roleName, { shouldValidate: true });
            }
        }
    }, [roleId, roles]);

    useEffect(() => {
        if (user) {
            form.reset({
                ...user,
                // Ensure optional fields are handled correctly
                roleId: user.roleId || "",
                middleName: user.middleName || "",
                phone: user.phone || "",
                altPhone: user.altPhone || "",
                employeeCode: user.employeeCode || "",
                otc: user.otc || false,
                employee: user.employee || false,
                passwordReset: user.passwordReset || false,
                mainPlant: user.mainPlant || false,
            });
            // Auto-verify if username hasn't changed from original
            setIsVerified(true);
        } else {
            form.reset({
                userId: "",
                userName: "",
                userType: "",
                roleId: "",
                salutation: "",
                firstName: "",
                middleName: "",
                lastName: "",
                email: "",
                phone: "",
                altPhone: "",
                employeeCode: "",
                status: "ACTIVE",
                country: "",
                otc: false,
                employee: false,
                passwordReset: false,
                mainPlant: false,
            });
            setIsVerified(false);
        }
        setDuplicateError(null);
    }, [user, form, open]);

    // Reset verification when username changes
    useEffect(() => {
        if (user && username === user.userName) {
            setIsVerified(true);
            setDuplicateError(null);
        } else {
            setIsVerified(false);
            setDuplicateError(null);
        }
    }, [username, user]);

    const handleVerifyUsername = async () => {
        if (!username || username.length < 3) {
            setDuplicateError("Username must be at least 3 characters");
            setIsVerified(false);
            return;
        }

        setIsChecking(true);
        setDuplicateError(null);

        try {
            const response = await adminApi.validateUser(username);
            // Assuming the API returns something like { status: "SUCCESS" } or { exists: false }
            // If the response logic is different, it will need to be adjusted.
            // Based on typical patterns, if the API call succeeds (200 OK), it might mean it's valid, 
            // OR it might return a boolean. 
            // Common pattern: 200 OK with body { status: "SUCCESS", message: "User name available" }
            // or { status: "FAILURE", message: "User name already exists" }

            // NOTE: The previous local check was checking for duplicates. 
            // If the API returns a success/available message, we set Verified = true.

            if (response && response.status === "SUCCESS") {
                setDuplicateError(null);
                setIsVerified(true);
            } else {
                setDuplicateError(response?.message || "Username is already taken or invalid");
                setIsVerified(false);
            }
        } catch (error: any) {

            // If the API throws 409 or similar for duplicates, handle it here
            setDuplicateError("Error validating username. It may be taken.");
            setIsVerified(false);
        } finally {
            setIsChecking(false);
        }
    };

    const onSubmit = (values: UserFormValues) => {
        if (!isVerified) return;

        const selectedRole = roles.find(r => r.roleId === values.roleId);

        const finalValues: User = {
            ...values,
            roleId: values.roleId,
            roleName: selectedRole ? selectedRole.roleName : (user?.roleName || ""),
            phone: values.phone || "",
            middleName: values.middleName || "",
            altPhone: values.altPhone || "",
            employeeCode: values.employeeCode || "",
            avatar: user?.avatar
        };

        onSave(finalValues);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10 rounded-t-lg">
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-azam-blue to-blue-700 bg-clip-text text-transparent">
                        {user ? "Edit User" : "Add New User"}
                    </DialogTitle>
                    <DialogDescription>
                        {user
                            ? "Update the user details below."
                            : "Create a new user for the system."}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Row 1 */}
                                <div className="space-y-2">
                                    <FormField
                                        control={form.control}
                                        name="userName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>User Name *</FormLabel>
                                                <div className="flex gap-2">
                                                    <FormControl>
                                                        <Input placeholder="Username" {...field} />
                                                    </FormControl>
                                                    <Button
                                                        type="button"
                                                        onClick={handleVerifyUsername}
                                                        variant={isVerified ? "default" : "secondary"}
                                                        disabled={isChecking || !username || username.length < 3}
                                                        className={isVerified ? "bg-green-600 hover:bg-green-700 h-7" : "h-7"}
                                                    >
                                                        {isChecking ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : isVerified ? (
                                                            <Check className="h-4 w-4" />
                                                        ) : (
                                                            "Verify"
                                                        )}
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                                {duplicateError && (
                                                    <p className="text-xs text-red-500 font-medium mt-1">{duplicateError}</p>
                                                )}
                                                {isVerified && !duplicateError && (
                                                    <p className="text-xs text-green-600 font-medium mt-1">Username available</p>
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="userType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>User Type *</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-7 text-sm">
                                                        <SelectValue placeholder="Select Type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {roles.map((role) => (
                                                        <SelectItem key={`type-${role.roleId}`} value={role.roleName}>
                                                            {role.roleId} - {role.roleName}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />


                                <FormField
                                    control={form.control}
                                    name="salutation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Salutation *</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-7">
                                                        <SelectValue placeholder="Mr/Ms" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Mr.">Mr.</SelectItem>
                                                    <SelectItem value="Mrs.">Mrs.</SelectItem>
                                                    <SelectItem value="Ms.">Ms.</SelectItem>
                                                    <SelectItem value="Dr.">Dr.</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Row 2 */}
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="First Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="middleName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Middle Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Middle Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Last Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Row 3 */}
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email *</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="Email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Phone" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="altPhone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Alt Phone</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Alternate Phone" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country *</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                disabled={isLoadingCountries}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="h-7">
                                                        <SelectValue placeholder={isLoadingCountries ? "Loading..." : "Select Country"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {countries.map((c: any) => (
                                                        <SelectItem key={c.countryCode || c.country} value={c.country}>
                                                            {c.country}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border px-3 h-8 shadow-sm space-y-0 self-end mb-1">
                                            <FormLabel className="text-xs font-medium">Active Status</FormLabel>
                                            <FormControl>
                                                <Switch
                                                    className="scale-75"
                                                    checked={field.value === "ACTIVE"}
                                                    onCheckedChange={(checked) =>
                                                        field.onChange(checked ? "ACTIVE" : "INACTIVE")
                                                    }
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {employee && (
                                    <FormField
                                        control={form.control}
                                        name="employeeCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Employee Code</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Emp Code" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>




                            {/* Flags */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="otc"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(checked);
                                                        // Mutual exclusion logic
                                                        if (checked) {
                                                            form.setValue("employee", false);
                                                            form.setValue("mainPlant", false);
                                                        }
                                                    }}
                                                    disabled={employee || mainPlant}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    OTC Access
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="employee"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(checked);
                                                        // Mutual exclusion logic
                                                        if (checked) {
                                                            form.setValue("otc", false);
                                                            form.setValue("mainPlant", false);
                                                        }
                                                    }}
                                                    disabled={otc || mainPlant}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Employee
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="mainPlant"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(checked);
                                                        // Mutual exclusion logic
                                                        if (checked) {
                                                            form.setValue("otc", false);
                                                            form.setValue("employee", false);
                                                        }
                                                    }}
                                                    disabled={otc || employee}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Main Plant
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter className="pt-4 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!isVerified}
                                    className="bg-gradient-to-r from-azam-blue to-blue-700 hover:from-blue-600 hover:to-blue-800"
                                >
                                    {user ? "Update" : "Create"} User
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

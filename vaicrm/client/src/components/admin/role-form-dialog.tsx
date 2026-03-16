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
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { Role } from "@/hooks/use-role-master";

const roleFormSchema = z.object({
    roleId: z.string(),
    roleName: z.string().min(2, "Role name must be at least 2 characters"),
    roleDescription: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    // General Access
    checkerAccess: z.boolean().default(false),
    allAccess: z.boolean().default(false),
    autoApproveAccess: z.boolean().default(false),
    externalApiAccess: z.boolean().default(false),
    // Data Permissions
    viewAccess: z.boolean().default(false),
    addAccess: z.boolean().default(false),
    editAccess: z.boolean().default(false),
    exportAccess: z.boolean().default(false),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: Role | null;
    onSave: (role: Role) => void;
    existingRoles: Role[];
}

export function RoleFormDialog({
    open,
    onOpenChange,
    role,
    onSave,
    existingRoles,
}: RoleFormDialogProps) {
    const [duplicateError, setDuplicateError] = useState<string | null>(null);

    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleFormSchema),
        defaultValues: {
            roleId: "",
            roleName: "",
            roleDescription: "",
            status: "ACTIVE",
            checkerAccess: false,
            allAccess: false,
            autoApproveAccess: false,
            externalApiAccess: false,
            viewAccess: false,
            addAccess: false,
            editAccess: false,
            exportAccess: false,
        },
    });

    const roleName = form.watch("roleName");

    useEffect(() => {
        if (role) {
            form.reset({
                ...role,
                roleDescription: role.roleDescription || "",
            });
        } else {
            // Use crypto.randomUUID() for stronger unique ID generation
            const uniqueId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
            form.reset({
                roleId: uniqueId,
                roleName: "",
                roleDescription: "",
                status: "ACTIVE",
                checkerAccess: false,
                allAccess: false,
                autoApproveAccess: false,
                externalApiAccess: false,
                viewAccess: false,
                addAccess: false,
                editAccess: false,
                exportAccess: false,
            });
        }
        setDuplicateError(null);
    }, [role, form, open]);

    // Real-time duplicate check
    useEffect(() => {
        if (roleName) {
            const isDuplicate = existingRoles.some(
                (r) =>
                    r.roleName.toLowerCase() === roleName.toLowerCase() &&
                    r.roleId !== form.getValues("roleId")
            );
            setDuplicateError(
                isDuplicate ? "A role with this name already exists" : null
            );
        } else {
            setDuplicateError(null);
        }
    }, [roleName, existingRoles, form]);

    const onSubmit = (values: RoleFormValues) => {
        // Synchronous duplicate check to prevent race conditions
        const isDuplicate = existingRoles.some(
            (r) =>
                r.roleName.toLowerCase() === values.roleName.toLowerCase() &&
                r.roleId !== values.roleId
        );

        if (isDuplicate) {
            setDuplicateError("A role with this name already exists");
            return;
        }

        if (duplicateError) return;

        // Ensure roleDescription is a string
        const finalValues: Role = {
            ...(role || {}),
            ...values,
            roleDescription: values.roleDescription || "",
        };

        onSave(finalValues);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-azam-blue to-blue-700 bg-clip-text text-transparent">
                        {role ? "Edit Role" : "Add New Role"}
                    </DialogTitle>
                    <DialogDescription>
                        {role
                            ? "Update the role details below."
                            : "Create a new role for the system."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className={`grid grid-cols-1 ${role ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
                            {/* Role ID - Only show when editing */}
                            {role && (
                                <FormField
                                    control={form.control}
                                    name="roleId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role ID</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    readOnly
                                                    className="bg-slate-50 font-mono text-xs cursor-not-allowed"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                System generated unique ID
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Role Name */}
                            <FormField
                                control={form.control}
                                name="roleName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role Name *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Manager, Agent, Finance"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Unique name for this role
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Role Description */}
                            <FormField
                                control={form.control}
                                name="roleDescription"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Handles financial transactions"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Brief overview of role responsibilities
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Status */}
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-slate-50">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Active Status</FormLabel>
                                        <FormDescription>
                                            Enable or disable this role
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value === "ACTIVE"}
                                            onCheckedChange={(checked) =>
                                                field.onChange(checked ? "ACTIVE" : "INACTIVE")
                                            }
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* Permissions & Access Control */}
                        <Card>
                            <CardHeader className="pb-2 p-4">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <i className="pi pi-shield text-blue-500" />
                                    Permissions & Access Control
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { name: "checkerAccess", label: "Checker Access", description: "Allows role to perform checker functions" },
                                        { name: "allAccess", label: "All Access", description: "Grants full system access privileges", activeColor: "bg-orange-500" },
                                        { name: "autoApproveAccess", label: "Auto Approve", description: "Enables auto-approval capabilities" },
                                        { name: "externalApiAccess", label: "External API", description: "Access to external API integration points" },
                                        { name: "viewAccess", label: "View Access", description: "Read-only access to data modules", activeColor: "bg-orange-500" },
                                        { name: "addAccess", label: "Add Access", description: "Permission to create new records", activeColor: "bg-orange-500" },
                                        { name: "editAccess", label: "Edit Access", description: "Permission to modify existing records", activeColor: "bg-orange-500" },
                                        { name: "exportAccess", label: "Export Access", description: "Ability to export data reports" },
                                    ].map((field) => (
                                        <FormField
                                            key={field.name}
                                            control={form.control}
                                            name={field.name as any}
                                            render={({ field: formField }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 shadow-sm">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-sm font-semibold text-slate-700">
                                                            {field.label}
                                                        </FormLabel>
                                                        <FormDescription className="text-xs">
                                                            {field.description}
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            className={`scale-75 origin-right ${field.activeColor && formField.value ? "!bg-orange-500" : ""}`}
                                                            checked={formField.value}
                                                            onCheckedChange={formField.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Duplicate Error */}
                        {duplicateError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                                <i className="pi pi-exclamation-triangle mr-2" />
                                {duplicateError}
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!!duplicateError}
                                className="bg-gradient-to-r from-azam-blue to-blue-700 hover:from-blue-600 hover:to-blue-800"
                            >
                                {role ? "Update" : "Create"} Role
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

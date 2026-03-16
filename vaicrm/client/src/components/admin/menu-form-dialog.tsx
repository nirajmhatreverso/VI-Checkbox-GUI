import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { IconPicker } from "./icon-picker";
import { MenuItem } from "./menu-master";
import { ChevronDown, ChevronRight } from "lucide-react";

// Update schema to match backend Java class structure
const menuFormSchema = z.object({
    pageId: z.string().optional(),
    menuType: z.enum(["LOGO", "NAV", "SECTION"]),
    pageSectionName: z.string().optional(),
    pageMenu: z.string().min(1, "Menu name is required"),
    pageMenuLabel: z.string().min(1, "Label is required"),
    pageUrl: z.string().min(1, "URL is required").regex(/^\//, "URL must start with /"),
    pageMenuIcon: z.string().min(1, "Icon class is required"),
    pageMenuOrder: z.coerce.number().min(0),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    navPageId: z.string().optional(),
    parentNavPageId: z.string().optional(),
    createTs: z.string().optional(),
    createId: z.string().optional(),
    updateTs: z.string().optional(),
    updateId: z.string().optional(),
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

interface MenuFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: MenuItem | null;
    onSave: (item: MenuItem) => void;
    existingMenus: MenuItem[];
}

export function MenuFormDialog({
    open,
    onOpenChange,
    item,
    onSave,
    existingMenus,
}: MenuFormDialogProps) {
    const { user } = useAuth();
    const [showAudit, setShowAudit] = useState(false);
    const [duplicateError, setDuplicateError] = useState<string | null>(null);

    const form = useForm<MenuFormValues>({
        resolver: zodResolver(menuFormSchema),
        defaultValues: {
            menuType: "NAV",
            pageSectionName: "Main",
            pageMenu: "",
            pageMenuLabel: "",
            pageUrl: "/",
            pageMenuIcon: "",
            pageMenuOrder: 0,
            status: "ACTIVE",
            navPageId: "",
            parentNavPageId: "",
            createTs: new Date().toISOString(),
            createId: "admin",
            updateTs: new Date().toISOString(),
            updateId: "admin",
        },
    });

    const menuType = form.watch("menuType");
    const pageMenu = form.watch("pageMenu");
    const pageSectionName = form.watch("pageSectionName");

    useEffect(() => {
        if (item) {
            form.reset({
                ...item,
                pageId: item.pageId || undefined,
                pageSectionName: item.pageSectionName || "",
                pageMenuLabel: String(item.pageMenuLabel),
                pageMenuIcon: String(item.pageMenuIcon),
                pageMenuOrder: Number(item.pageMenuOrder),
                navPageId: String(item.navPageId || ""),
                parentNavPageId: String(item.parentNavPageId || ""),
                createTs: item.createTs || undefined,
                createId: item.createId || undefined,
                updateTs: item.updateTs || undefined,
                updateId: item.updateId || undefined,
            } as MenuFormValues);
        } else {
            form.reset({
                menuType: "NAV",
                pageSectionName: "Main",
                pageMenu: "",
                pageMenuLabel: "",
                pageUrl: "/",
                pageMenuIcon: "",
                pageMenuOrder: 0,
                status: "ACTIVE",
                navPageId: "",
                parentNavPageId: "",
                createTs: new Date().toISOString(),
                createId: "admin",
                updateTs: new Date().toISOString(),
                updateId: "admin",
            });
        }
        setDuplicateError(null);
    }, [item, form, open]);

    // Check for duplicates
    useEffect(() => {
        if (pageMenu) {
            const isDuplicate = existingMenus.some(
                (m) =>
                    m.pageMenu === pageMenu &&
                    (m.pageSectionName || "") === (pageSectionName || "") &&
                    m.pageId !== item?.pageId
            );
            setDuplicateError(
                isDuplicate
                    ? "This menu item already exists in this section"
                    : null
            );
        } else {
            setDuplicateError(null);
        }
    }, [pageMenu, pageSectionName, existingMenus, item]);

    const onSubmit = (values: MenuFormValues) => {
        if (duplicateError) return;

        const currentUserId = user?.username || "unknown";
        const updated: MenuItem = {
            ...values,
            pageId: item?.pageId ?? null,
            pageSectionName: values.pageSectionName || "",
            navPageId: values.navPageId || "",
            parentNavPageId: values.parentNavPageId || "",
            updateTs: new Date().toISOString(),
            updateId: currentUserId,
            // Preserve createId if editing, otherwise set to current user
            createId: item ? values.createId : currentUserId,
            createTs: item ? values.createTs : new Date().toISOString(),
        };
        onSave(updated);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-r from-azam-blue to-blue-700 bg-clip-text text-transparent">
                        {item ? "Edit Menu Item" : "Add New Menu Item"}
                    </DialogTitle>
                    <DialogDescription>
                        Configure the global navigation menu structure.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <div className="grid grid-cols-12 gap-4">
                            {/* Row 1: Core Definitions */}
                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="menuType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Menu Type *</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="LOGO">Logo</SelectItem>
                                                    <SelectItem value="NAV">Navigation</SelectItem>
                                                    <SelectItem value="SECTION">Section</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="pageSectionName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Section Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. Main"
                                                    {...field}
                                                    value={field.value || ""}
                                                    className="h-9"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="pageMenu"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Menu Name *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Internal Name"
                                                    {...field}
                                                    disabled={menuType === "LOGO"}
                                                    className="h-9"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-2">
                                <FormField
                                    control={form.control}
                                    name="pageMenuOrder"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Page Menu Order *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                    className="h-9"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Row 2: Visuals & Links */}
                            <div className="col-span-12 md:col-span-4">
                                <FormField
                                    control={form.control}
                                    name="pageMenuLabel"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Display Label *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="UI Label"
                                                    {...field}
                                                    className="h-9"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <FormField
                                    control={form.control}
                                    name="pageMenuIcon"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Icon *</FormLabel>
                                            <FormControl>
                                                <div className="[&_button]:h-9">
                                                    <IconPicker
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-4 flex items-end">
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border px-3 py-2 bg-slate-50 h-9 w-full">
                                            <span className="text-xs font-medium">Active Status</span>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value === "ACTIVE"}
                                                    onCheckedChange={(checked) =>
                                                        field.onChange(checked ? "ACTIVE" : "INACTIVE")
                                                    }
                                                    className="scale-75 origin-right"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Row 3: URLs & IDs */}
                            <div className="col-span-12 md:col-span-6">
                                <FormField
                                    control={form.control}
                                    name="pageUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Page URL *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="/url-path" {...field} className="h-9" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="navPageId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs text-slate-500">Nav ID</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nav ID" {...field} className="h-9 bg-slate-50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="parentNavPageId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs text-slate-500">Parent ID</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Parent ID" {...field} className="h-9 bg-slate-50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Duplicate Error */}
                        {duplicateError && (
                            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center">
                                <i className="pi pi-exclamation-triangle mr-2" />
                                {duplicateError}
                            </div>
                        )}

                        {/* Audit Fields */}
                        {item && (
                            <Collapsible open={showAudit} onOpenChange={setShowAudit} className="border rounded-md">
                                <CollapsibleTrigger className="flex items-center gap-2 p-2 text-xs font-medium text-slate-600 hover:text-slate-900 w-full bg-slate-50">
                                    {showAudit ? (
                                        <ChevronDown className="w-3 h-3" />
                                    ) : (
                                        <ChevronRight className="w-3 h-3" />
                                    )}
                                    Audit Information
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-3 bg-white text-xs text-slate-600 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <span className="block font-medium text-slate-900">Created At</span>
                                        {item.createTs ? new Date(item.createTs).toLocaleString() : "-"}
                                    </div>
                                    <div>
                                        <span className="block font-medium text-slate-900">Created By</span>
                                        {item.createId || "-"}
                                    </div>
                                    <div>
                                        <span className="block font-medium text-slate-900">Updated At</span>
                                        {item.updateTs ? new Date(item.updateTs).toLocaleString() : "-"}
                                    </div>
                                    <div>
                                        <span className="block font-medium text-slate-900">Updated By</span>
                                        {item.updateId || "-"}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="h-9"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!!duplicateError}
                                className="bg-gradient-to-r from-azam-blue to-blue-700 hover:from-blue-600 hover:to-blue-800 h-9"
                            >
                                {item ? "Update Menu" : "Create Menu"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

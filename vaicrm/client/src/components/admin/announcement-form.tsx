import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/context/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Save,
    RotateCcw,
    Megaphone,
    Globe,
    FileText,
    Type,
    Link as LinkIcon,
    AlertCircle,
    CheckCircle,
    Users,
    Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSaveBulletinMutation, Bulletin } from "@/hooks/use-bulletin";

interface AnnouncementFormProps {
    onBack: () => void;
    initialData?: Bulletin | null;
}

export function AnnouncementForm({ onBack, initialData }: AnnouncementFormProps) {
    const { toast } = useToast();
    const saveMutation = useSaveBulletinMutation();
    const { user } = useAuthContext();

    const { data: busOrgsData, isLoading: isLoadingBusOrgs } = useQuery({
        queryKey: ['business-organizations', user?.salesOrg],
        queryFn: () => apiRequest('/organization/bus-orgs', 'POST', { objId: null, name: null, orgId: user?.salesOrg }),
        staleTime: 1000 * 60 * 60,
        enabled: !!user,
    });

    const businessOrganizations = busOrgsData?.data?.data || [];

    const [formData, setFormData] = useState({
        client: "",
        isActive: true,
        bulletinType: "",
        userType: "",
        title: "",
        url: "",
        description: "",
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                client: initialData.bulletin2busOrg || "",
                isActive: initialData.status === "ACTIVE",
                bulletinType: initialData.type || "",
                userType: "", // userType isn't in Bulletin interface but required by API?
                title: initialData.title || "",
                url: initialData.url || "",
                description: initialData.bulletinText || "",
            });
        }
    }, [initialData]);

    const handleUpdate = async () => {
        if (!formData.client || !formData.title || !formData.description || !formData.bulletinType || !formData.userType) {
            toast({
                title: "Required Fields",
                description: "All mandatory fields must be filled.",
                variant: "destructive",
            });
            return;
        }

        const payload = {
            objId: initialData?.objId || "",
            type: formData.bulletinType,
            bulletinBusOrgId: formData.client,
            userType: formData.userType,
            bulletinBusOrg: "",
            url: formData.url,
            title: formData.title,
            bulletinText: formData.description,
            status: formData.isActive ? "ACTIVE" : "INACTIVE",
        };

        saveMutation.mutate(payload, {
            onSuccess: (data: any) => {
                const success = data?.status === 'SUCCESS' || data?.data?.status === 'SUCCESS';
                if (success) {
                    onBack();
                }
            }
        });
    };

    const handleClear = () => {
        if (initialData) {
            setFormData({
                client: initialData.bulletin2busOrg || "",
                isActive: initialData.status === "ACTIVE",
                bulletinType: initialData.type || "",
                userType: "",
                title: initialData.title || "",
                url: initialData.url || "",
                description: initialData.bulletinText || "",
            });
        } else {
            setFormData({
                client: "",
                title: "",
                url: "",
                description: "",
                isActive: true,
                bulletinType: "",
                userType: "",
            });
        }
    };

    return (
        <div className="space-y-2 animate-in fade-in duration-500 w-full mx-auto">
            {/* CRM Standard Header Card - Compact */}
            <Card className="bg-gradient-to-r from-azam-blue to-blue-800 text-white shadow-lg border-0">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onBack}
                                className="h-8 w-8 text-white hover:bg-white/10 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-1.5 rounded-lg">
                                    <Megaphone className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <h1 className="text-lg font-bold text-white leading-none">
                                        {initialData ? "Admin Edit Bulletin" : "Admin Create Bulletin"}
                                    </h1>
                                    <p className="text-blue-100 text-[10px] mt-0.5 font-medium opacity-80">
                                        {initialData ? "Update network announcements" : "Create new network announcements"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClear}
                                className="h-7 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white transition-all font-semibold text-xs"
                            >
                                <RotateCcw className="w-3 h-3 mr-1.5" />
                                Clear
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleUpdate}
                                disabled={saveMutation.isPending}
                                className="h-7 bg-white text-azam-blue hover:bg-blue-50 transition-all font-bold px-4 shadow-sm text-xs"
                            >
                                {saveMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                                ) : (
                                    <Save className="w-3 h-3 mr-1.5" />
                                )}
                                {initialData ? "Update" : "Create"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Form Section - High Density Layout */}
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-2.5 px-4 flex-row items-center gap-2">
                    <div className="p-1 bg-blue-50 rounded text-azam-blue">
                        <FileText className="w-3.5 h-3.5" />
                    </div>
                    <CardTitle className="text-sm font-bold tracking-wider text-slate-800">Bulletin Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 py-3 space-y-3">
                    {/* 4-Item Attributes Grid - Compact Gaps */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
                                <Globe className="w-3 h-3 text-azam-blue" />
                                Client <span className="text-red-500 font-bold">*</span>
                            </Label>
                            <Select
                                value={formData.client ? String(formData.client) : undefined}
                                onValueChange={(val) => setFormData({ ...formData, client: val })}
                                disabled={isLoadingBusOrgs}
                            >
                                <SelectTrigger uiSize="sm" className="bg-white border-slate-200 focus:ring-1 focus:ring-blue-100 h-8 text-sm">
                                    <SelectValue placeholder={isLoadingBusOrgs ? "Loading..." : "Select Organization"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {businessOrganizations.map((org: any) => (
                                        <SelectItem key={org.objId} value={String(org.objId)}>
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
                                <FileText className="w-3 h-3 text-azam-blue" />
                                Bulletin Type <span className="text-red-500 font-bold">*</span>
                            </Label>
                            <Select
                                value={formData.bulletinType}
                                onValueChange={(val) => setFormData({ ...formData, bulletinType: val })}
                            >
                                <SelectTrigger uiSize="sm" className="bg-white border-slate-200 focus:ring-1 focus:ring-blue-100 h-8 text-sm">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="News">News</SelectItem>
                                    <SelectItem value="Update">Update</SelectItem>
                                    <SelectItem value="Alert">Alert</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-azam-blue" />
                                User Type <span className="text-red-500 font-bold">*</span>
                            </Label>
                            <Select
                                value={formData.userType}
                                onValueChange={(val) => setFormData({ ...formData, userType: val })}
                            >
                                <SelectTrigger uiSize="sm" className="bg-white border-slate-200 focus:ring-1 focus:ring-blue-100 h-8 text-sm">
                                    <SelectValue placeholder="Select User Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SELF">SELF</SelectItem>
                                    <SelectItem value="ALL">ALL</SelectItem>
                                    <SelectItem value="AGENT">AGENT</SelectItem>
                                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                                    <SelectItem value="BOTH">CUSTOMER</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
                                <CheckCircle className="w-3 h-3 text-azam-blue" />
                                Is Active
                            </Label>
                            <div className="flex items-center h-8 px-3 bg-white border border-slate-200 rounded-md">
                                <Checkbox
                                    id="isActive-crm"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                                    className="border-slate-300 data-[state=checked]:bg-azam-blue data-[state=checked]:border-azam-blue h-3.5 w-3.5"
                                />
                                <Label htmlFor="isActive-crm" className="ml-2 text-xs font-semibold text-slate-600 cursor-pointer">
                                    Active
                                </Label>
                            </div>
                        </div>
                    </div>

                    {/* Compact Title and URL row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
                                <Type className="w-3 h-3 text-azam-blue" />
                                Title <span className="text-red-500 font-bold">*</span>
                            </Label>
                            <Input
                                uiSize="sm"
                                placeholder="Enter bulletin title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="bg-white border-slate-200 focus:ring-1 focus:ring-blue-100 h-8 text-sm"
                            />
                        </div>

                        <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
                                <LinkIcon className="w-3 h-3 text-azam-blue" />
                                URL
                            </Label>
                            <Input
                                uiSize="sm"
                                placeholder="External reference link"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                className="bg-white border-slate-200 focus:ring-1 focus:ring-blue-100 h-8 text-sm"
                            />
                        </div>
                    </div>

                    {/* Dense Description Field */}
                    <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-azam-blue" />
                            Description <span className="text-red-500 font-bold">*</span>
                        </Label>
                        <div className="relative group">
                            <Textarea
                                placeholder="Detailed announcement content..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="min-h-[120px] border-slate-200 focus:ring-1 focus:ring-blue-100 resize-none p-3 text-sm leading-relaxed"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

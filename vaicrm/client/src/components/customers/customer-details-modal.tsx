import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
  Calendar,
  CreditCard,
  Edit,
  X,
  Settings,
  BadgeCheck,
  IdCard,
  Hash,
  Globe2,
  MapPinned,
  Layers,
  Copy,
  Check,
  Download,
  ToggleRight,
  Building,
  Loader2,
  Upload,
  History,
  Network,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@shared/schema";
import { buildApiUrl } from "@/lib/config";
import { customerApi } from "@/lib/api-client";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/context/AuthProvider";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "brand";

function initialsFromName(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  return parts.slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function stageToBadgeVariant(stage?: string): BadgeVariant {
  switch ((stage || "").toUpperCase()) {
    case "COMPLETED":
    case "APPROVED":
    case "SUCCESS":
      return "success";
    case "PENDING":
    case "RELEASE_TO_KYC":
    case "CAPTURED":
    case "IN_PROGRESS":
      return "info";
    case "REJECTED":
    case "FAILED":
      return "danger";
    case "SUSPENDED":
    case "INACTIVE":
    default:
      return "muted";
  }
}

function formatDateTime(d?: string | null) {
  if (!d) return "N/A";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleString();
}

function formatDob(d?: string | Date | null) {
  if (!d) return "N/A";
  if (d instanceof Date) return d.toLocaleDateString();
  const s = String(d);
  if (/^\d{8}$/.test(s)) {
    const y = s.slice(0, 4);
    const m = s.slice(4, 6);
    const dd = s.slice(6, 8);
    const dt = new Date(`${y}-${m}-${dd}`);
    return isNaN(dt.getTime()) ? s : dt.toLocaleDateString();
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? s : dt.toLocaleDateString();
}

function yesNo(val: any) {
  if (val === true || String(val).toUpperCase() === "Y" || String(val).toLowerCase() === "true") return "Yes";
  if (val === false || String(val).toUpperCase() === "N" || String(val).toLowerCase() === "false") return "No";
  return "N/A"; // Clean fallback
}

const fileNameFromPath = (p?: string) => (p ? p.split(/[\\/]/).pop() || "N/A" : "N/A");

function InfoItem({
  icon: Icon,
  label,
  value,
  mono,
  canCopy,
}: {
  icon: any;
  label: string;
  value?: string | number | null;
  mono?: boolean;
  canCopy?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const display = (value ?? "N/A") as string;
  const { toast } = useToast();
  const { user } = useAuthContext();
  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      toast({ title: "Copied", description: `${label} copied to clipboard` });
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <div className={`text-sm font-medium ${mono ? "font-mono break-all" : "break-words"}`}>
            {display}
          </div>
          {canCopy && value && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={handleCopy}
              title="Copy"
              aria-label={`Copy ${label}`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditLogTab({ onbId }: { onbId: string }) {
  const auditPayload = {
    requestTnxId: onbId,
    type: "CUSTOMER",
    offSet: 0,
    limit: 100
  };

  const { data: auditResponse, isLoading, isError, error } = useQuery({
    queryKey: ['customerAuditLogs', onbId],
    queryFn: async () => {
      const responseData = await apiRequest('/customers/audit-logs', 'POST', auditPayload);
      return responseData;
    },
    enabled: !!onbId && onbId !== "PREVIEW",
    staleTime: 1000 * 60,
  });

  if (onbId === "PREVIEW") {
    return <div className="text-center text-gray-500 p-8">Audit logs will be available after the customer is submitted.</div>;
  }
  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading audit logs...</div>;
  }
  if (isError) {
    return <div className="text-red-500 p-8">{(error as any)?.statusMessage || "Failed to load logs"}</div>;
  }

  const auditLogs = auditResponse?.data?.data || [];
  
  if (!Array.isArray(auditLogs) || auditLogs.length === 0) {
    return <div className="text-center text-gray-500 p-8">No audit logs found for this customer.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-5 w-5 text-azam-blue" />Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6">
          <div className="absolute left-0 top-0 h-full w-0.5 bg-gray-200" />
          {auditLogs.map((log: any, index: number) => (
            <div key={log.actId || index} className={`relative pb-8 ${index === auditLogs.length - 1 ? 'pb-0' : ''}`}>
              <div className="absolute left-[-22px] top-1 h-4 w-4 rounded-full bg-azam-blue ring-4 ring-white" />
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{log.description}</p>
                  <p className="text-xs text-gray-500">by {log.userName || log.createId} • {log.actionType}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 sm:mt-0">{formatDateTime(log.createTs)}</p>
              </div>
              
              {(log.cmStatus || log.cmStatusMsg || log.cmErrorReason) && (
                <div className={`mt-2 text-xs p-2 rounded-md border ${
                  log.cmStatus === 'S' ? 'bg-green-50 border-green-100 text-green-800' : 
                  log.cmStatus === 'P' ? 'bg-blue-50 border-blue-100 text-blue-800' : 
                  (log.cmStatus === 'F' || log.cmStatus === 'E') ? 'bg-red-50 border-red-100 text-red-800' : 
                  'bg-gray-50 border-gray-200 text-gray-700'
                }`}>
                  {log.cmStatus && (
                     <div className="flex items-center gap-2">
                        <span className="font-semibold">CM Status:</span>
                        <span className="font-mono">{log.cmStatus === 'S' ? 'Success' : log.cmStatus === 'P' ? 'Inprocess' : log.cmStatus === 'F' ? 'Failed' : log.cmStatus === 'E' ? 'Error' : log.cmStatus}</span>
                     </div>
                  )}
                  {log.cmStatusMsg && <div className="mt-1"><span className="font-semibold">Message:</span> {log.cmStatusMsg}</div>}
                  {log.cmErrorReason && <div className="mt-1 font-medium"><span className="font-semibold">Reason:</span> {log.cmErrorReason}</div>}
                </div>
              )}

              {(log.oldData || log.newData) && (
                <div className="mt-2 text-xs bg-gray-50 p-2 rounded-md border">
                  <span className="text-gray-500">From:</span> <span className="font-mono text-red-600">{log.oldData || 'N/A'}</span>
                  <span className="text-gray-500 mx-2">→</span>
                  <span className="text-gray-500">To:</span> <span className="font-mono text-green-600">{log.newData || 'N/A'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomerDetailsModal({
  customer,
  isOpen,
  onClose,
  onEdit,
}: {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (customer: Customer) => void;
}) {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [kycPreviewOpen, setKycPreviewOpen] = useState(false);
  const [kycPreviewUrl, setKycPreviewUrl] = useState<string | null>(null);
  const [kycPreviewMime, setKycPreviewMime] = useState<string>("");
  const [downloading, setDownloading] = useState<"POA" | "POI" | null>(null);
  const [previewing, setPreviewing] = useState<"POA" | "POI" | null>(null);

  const fullName = useMemo(() => {
    if (!customer) return "Customer";
    const parts = [
      (customer as any).salutation || (customer as any).title,
      customer.firstName,
      (customer as any).middleName,
      customer.lastName,
    ].filter(Boolean);
    return parts.join(" ").trim() || "Customer";
  }, [customer]);

  const kycPoiName = useMemo(() => {
    const localFile = (customer as any)?.kycPoi;
    if (localFile instanceof File) return localFile.name;
    return fileNameFromPath((customer as any)?.poiDocPath);
  }, [customer]);

  const kycPoaName = useMemo(() => {
    const localFile = (customer as any)?.kycPoa;
    if (localFile instanceof File) return localFile.name;
    return fileNameFromPath((customer as any)?.poaDocPath);
  }, [customer]);

  const quickTags = useMemo(() => {
    if (!customer) return [];
    return [
      (customer as any)?.customerType && { icon: BadgeCheck, label: (customer as any).customerType, variant: "brand" as BadgeVariant },
      (customer as any)?.region && { icon: MapPinned, label: (customer as any).region, variant: "info" as BadgeVariant },
      (customer as any)?.currency && { icon: CreditCard, label: (customer as any).currency, variant: "success" as BadgeVariant },
    ].filter(Boolean) as { icon: any; label: string; variant: BadgeVariant }[];
  }, [customer]);

  const handleMail = () => customer?.email && window.open(`mailto:${customer.email}`, "_blank");
  const handleCall = () => customer?.mobile && window.open(`tel:${customer.mobile}`, "_self");

  const kycPoiNo = (customer as any)?.poiDocNo || (customer as any)?.kycDocNoPOI || "";
  const kycPoaNo = (customer as any)?.poaDocNo || (customer as any)?.kycDocNoPOA || "";

  async function openKycPreview(fileType: "POA" | "POI") {
    setPreviewing(fileType);
    try {
      const file = fileType === "POA" ? (customer as any)?.kycPoa : (customer as any)?.kycPoi;
      if (file instanceof File) {
        const url = URL.createObjectURL(file);
        setKycPreviewUrl(url);
        setKycPreviewMime(file.type || "application/octet-stream");
        setKycPreviewOpen(true);
        return;
      }

      const custId = (customer as any)?.custId;
      if (!custId) {
        toast({ title: "Preview not available", description: "Customer ID not found.", variant: "destructive" });
        return;
      }

      const res = await apiRequest(
        '/customers/preview-kyc',
        'POST',
        { userType: "CUSTOMER", fileType, id: custId }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to load preview (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setKycPreviewUrl(url);
      setKycPreviewMime(blob.type || "image/*");
      setKycPreviewOpen(true);
    } catch (e: any) {
      toast({ title: "Preview Failed", description: e?.statusMessage || e?.message || "Could not load KYC preview", variant: "destructive" });
    } finally {
      setPreviewing(null);
    }
  }

  async function handleDownloadKyc(fileType: "POA" | "POI") {
    const fileName = fileType === "POA" ? kycPoaName : kycPoiName;
    if (!fileName || fileName === "N/A") {
      toast({ title: "Download Failed", description: "File name is not available.", variant: "destructive" });
      return;
    }

    setDownloading(fileType);
    try {
      const file = fileType === "POA" ? (customer as any)?.kycPoa : (customer as any)?.kycPoi;
      if (file instanceof File) {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        return;
      }

      const custId = (customer as any)?.custId;
      if (!custId) {
        toast({ title: "Download not available", description: "Customer ID not found.", variant: "destructive" });
        return;
      }

      toast({ title: "Downloading...", description: `Preparing ${fileName} for download.` });

      const res = await apiRequest(
        '/customers/download-kyc',
        'POST',
        { userType: "CUSTOMER", fileType, id: custId }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to download file (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Download Failed", description: e?.statusMessage || e?.message || `Could not download ${fileName}`, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  }

  const inst = {
    country: (customer as any)?.countryInst || (customer as any)?.country,
    region: (customer as any)?.regionInst || (customer as any)?.region,
    city: (customer as any)?.cityInst || (customer as any)?.city,
    district: (customer as any)?.districtInst || (customer as any)?.district,
    ward: (customer as any)?.wardInst || (customer as any)?.ward,
    address1: (customer as any)?.address1Inst || (customer as any)?.address1,
    address2: (customer as any)?.address2Inst || (customer as any)?.address2,
    postalCode:
      (customer as any)?.postalCodeInst ||
      (customer as any)?.pinCode ||
      (customer as any)?.postalCode,
  };

  const billing = {
    country: (customer as any)?.country,
    region: (customer as any)?.region,
    city: (customer as any)?.city,
    district: (customer as any)?.district,
    ward: (customer as any)?.ward,
    address1: (customer as any)?.address1,
    address2: (customer as any)?.address2,
    postalCode: (customer as any)?.postalCode,
  };

  const sameAsInstallation = useMemo(() => {
  // Check if the customer object has an explicit sameAsInstallation flag
  if ((customer as any)?.sameAsInstallation !== undefined) {
    return (customer as any).sameAsInstallation;
  }
  
  // Otherwise, intelligently determine if addresses match
  const instCountry = (customer as any)?.countryInst || "";
  const instRegion = (customer as any)?.regionInst || "";
  const instCity = (customer as any)?.cityInst || "";
  const instDistrict = (customer as any)?.districtInst || "";
  const instWard = (customer as any)?.wardInst || "";
  const instAddr1 = (customer as any)?.address1Inst || "";
  
  const billCountry = (customer as any)?.country || "";
  const billRegion = (customer as any)?.region || "";
  const billCity = (customer as any)?.city || "";
  const billDistrict = (customer as any)?.district || "";
  const billWard = (customer as any)?.ward || "";
  const billAddr1 = (customer as any)?.address1 || "";
  
  // If billing fields are empty but installation fields exist, likely same as installation
  if (instAddr1 && !billAddr1 && !billCountry && !billRegion) {
    return true;
  }
  
  // Check if all addresses match
  return (
    instCountry === billCountry &&
    instRegion === billRegion &&
    instCity === billCity &&
    instDistrict === billDistrict &&
    instWard === billWard &&
    instAddr1 === billAddr1
  );
}, [customer]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* expand to near-full width on laptop (lg) */}
      <DialogContent className="w-full sm:max-w-5xl lg:max-w-[95vw] max-h-[90vh] p-0 gap-0">
        <DialogHeader className={customer ? "sr-only" : "p-6 border-b"}>
          <DialogTitle>{customer ? fullName : "Customer Details"}</DialogTitle>
          <DialogDescription>
            {customer ? `Details for customer ID ${(customer as any).custId || 'N/A'}` : "No customer has been selected."}
          </DialogDescription>
        </DialogHeader>

        {!customer ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">No customer selected</h3>
            <p className="text-sm text-gray-500 mt-1">Select a customer to view detailed information.</p>
            <div className="mt-4">
              <Button variant="outline" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex max-h-[92vh] flex-col">
            <div className="shrink-0 bg-gradient-to-r from-azam-blue to-sky-500 text-white px-4 sm:px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3 pr-12">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/15 ring-1 ring-white/30 flex items-center justify-center">
                    <span className="text-base sm:text-lg font-semibold">
                      {initialsFromName(fullName || "C")}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold leading-tight">{fullName}</h2>
                      <Badge variant={stageToBadgeVariant((customer as any).customerStage)} size="sm">
                        {(customer as any).customerStage || "UNKNOWN"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-white/80 text-xs flex flex-wrap items-center gap-2">
                      {(customer as any).custId && (
                        <div className="flex items-center gap-1">
                          <IdCard className="h-3.5 w-3.5" />
                          <span className="font-mono">Customer #{(customer as any).custId}</span>
                        </div>
                      )}
                      {(customer as any).onbId && (
                        <>
                          <span className="opacity-60">•</span>
                          <div className="flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            <span className="font-mono">Onboarding #{(customer as any).onbId}</span>
                          </div>
                        </>
                      )}
                      {(customer as any).createTs && (
                        <>
                          <span className="opacity-60">•</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Created {formatDateTime((customer as any).createTs)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                  {quickTags.map((t, idx) => (
                    <Badge key={idx} variant={t.variant} size="sm" className="bg-white/10 text-white border-white/30">
                      <t.icon className="h-3.5 w-3.5 mr-1" />
                      {t.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="xs" variant="secondary" onClick={handleMail} disabled={!customer.email} aria-label="Email customer">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
                <Button size="xs" variant="secondary" onClick={handleCall} disabled={!customer.mobile} aria-label="Call customer">
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </Button>
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto overflow-x-auto px-2 sm:px-6 pl-2 pt-3 pb-20"
              style={{
                WebkitOverflowScrolling: "touch",
                maxWidth: "100vw",
                width: "95vw",
              }}
            >
              <Tabs defaultValue="general" className="w-full">
                <div className="relative w-full overflow-x-auto sm:overflow-visible">
                  <TabsList
                    className="flex w-max min-w-0 gap-2 pl-2 pr-4 mb-3 overflow-x-auto sm:overflow-x-visible whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300"
                    style={{
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    <TabsTrigger value="general">General Data</TabsTrigger>
                    <TabsTrigger value="personal">Personal Details</TabsTrigger>
                    <TabsTrigger value="address">Address Details</TabsTrigger>
                    <TabsTrigger value="service">Service & Account</TabsTrigger>
                    <TabsTrigger value="financial">Financial & Tax</TabsTrigger>
                    <TabsTrigger value="kyc">KYC Documents</TabsTrigger>
                    <TabsTrigger value="audit">Audit Logs</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="general">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">General Data</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InfoItem icon={BadgeCheck} label="Customer Type" value={(customer as any).customerType || "N/A"} />
                      <InfoItem icon={Network} label="Connection Type" value={(customer as any).connectionType || "N/A"} />
                      <InfoItem icon={Layers} label="Division" value={(customer as any).division || (customer as any).serviceType || "N/A"} />
                      <InfoItem icon={Layers} label="Account Class" value={(customer as any).accountClass || "N/A"} />
                      {((customer as any).accountClass === "Hotel" || (customer as any).accountClass === "HOTEL") && (
                        <InfoItem icon={Building2} label="No of Rooms" value={(customer as any).noOfRooms || "N/A"} />
                      )}
                      <InfoItem icon={ToggleRight} label="SMS Notifications" value={yesNo((customer as any)?.smsFlag)} />
                      <InfoItem icon={IdCard} label="Agent SAP BP ID" value={(customer as any).agentSapBpId || "N/A"} mono canCopy />
                      <InfoItem icon={Settings} label="Customer Status" value={(customer as any)?.customerStatus || (customer as any)?.newOrExisting || "N/A"} />
                      {(((customer as any)?.customerStatus || "").toLowerCase().includes("existing") || ((customer as any)?.newOrExisting || "").toLowerCase().includes("existing")) && (
                        <InfoItem icon={User} label="Parent Customer SAP BP ID" value={(customer as any).parentBpId || "N/A"} mono canCopy />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="personal">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Personal Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 px-1 sm:px-4">
                      <InfoItem icon={User} label="Title" value={(customer as any).salutation || (customer as any).title || "N/A"} />
                      <InfoItem icon={User} label="First Name" value={(customer as any).firstName || "N/A"} />
                      <InfoItem icon={User} label="Middle Name" value={(customer as any).middleName || "N/A"} />
                      <InfoItem icon={User} label="Last Name" value={(customer as any).lastName || "N/A"} />
                      <InfoItem icon={FileText} label="Gender" value={(customer as any).gender || "N/A"} />
                      <InfoItem icon={Calendar} label="Date of Birth" value={formatDob((customer as any).dob || (customer as any).dateOfBirth)} />
                      <InfoItem icon={FileText} label="Race" value={(customer as any).race || "N/A"} />
                      <InfoItem icon={User} label="Organization" value={(customer as any).orgName || "N/A"} />
                      <InfoItem icon={Mail} label="Email" value={(customer as any).email || "N/A"} canCopy />
                      <InfoItem icon={Mail} label="Alternate Email" value={(customer as any).altEmail || "N/A"} />
                      <InfoItem icon={Phone} label="Mobile" value={(customer as any).mobile || "N/A"} canCopy />
                      <InfoItem icon={Phone} label="Phone" value={(customer as any).phone || "N/A"} />
                      <InfoItem icon={Phone} label="Alternate Phone" value={(customer as any).altPhone || (customer as any).altMobile || "N/A"} />
                      <InfoItem icon={FileText} label="Fax" value={(customer as any).fax || "N/A"} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="address">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-azam-blue" />Installation Address</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoItem icon={FileText} label="Address Type" value={(customer as any)?.addressType || "Installation"} />
                          <InfoItem icon={Globe2} label="Country" value={inst.country || "N/A"} />
                          <InfoItem icon={MapPinned} label="Region" value={inst.region || "N/A"} />
                          <InfoItem icon={MapPin} label="City" value={inst.city || "N/A"} />
                          <InfoItem icon={MapPin} label="District" value={inst.district || "N/A"} />
                          <InfoItem icon={MapPin} label="Ward" value={inst.ward || "N/A"} />
                          <InfoItem icon={Hash} label="Postal Code" value={inst.postalCode || "N/A"} />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoItem icon={MapPin} label="Address 1" value={inst.address1 || "N/A"} />
                          <InfoItem icon={MapPin} label="Address 2" value={inst.address2 || "N/A"} />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-azam-blue" />Billing Address</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoItem icon={ToggleRight} label="Same as Installation" value={yesNo(sameAsInstallation)} />
                          <InfoItem icon={Globe2} label="Country" value={billing.country || "N/A"} />
                          <InfoItem icon={MapPinned} label="Region" value={billing.region || "N/A"} />
                          <InfoItem icon={MapPin} label="City" value={billing.city || "N/A"} />
                          <InfoItem icon={MapPin} label="District" value={billing.district || "N/A"} />
                          <InfoItem icon={MapPin} label="Ward" value={billing.ward || "N/A"} />
                          <InfoItem icon={Hash} label="Postal Code" value={billing.postalCode || "N/A"} />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoItem icon={MapPin} label="Address 1" value={billing.address1 || "N/A"} />
                          <InfoItem icon={MapPin} label="Address 2" value={billing.address2 || "N/A"} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                <TabsContent value="service">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Service & Account</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoItem icon={Building} label="Sales Org" value={(customer as any).salesOrg || "N/A"} />
                      <InfoItem icon={Settings} label="Service Type/Division" value={(customer as any).division || (customer as any).serviceType || "N/A"} />
                      <InfoItem icon={FileText} label="SAP BP ID" value={customer.sapBpId || "N/A"} mono canCopy />
                      <InfoItem icon={FileText} label="SAP CA ID" value={customer.sapCaId || "N/A"} mono canCopy />
                      <InfoItem icon={FileText} label="Azam Pay ID" value={(customer as any).azamPesaId || (customer as any).azamPayId || "N/A"} />
                      <InfoItem icon={FileText} label="Azam Max TV ID" value={(customer as any).azamMaxTv || (customer as any).azamMaxTvId || "N/A"} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="financial">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Financial & Tax</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoItem icon={CreditCard} label="Currency" value={(customer as any).currency || "N/A"} />
                      <InfoItem icon={FileText} label="TIN Name" value={(customer as any).tinName || "N/A"} />
                      <InfoItem icon={Hash} label="TIN Number" value={(customer as any).tin || (customer as any).ctinNumber || "N/A"} mono canCopy />
                      <InfoItem icon={Hash} label="VRN Number" value={(customer as any).vrn || (customer as any).cvrnNumber || "N/A"} mono canCopy />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="kyc">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">KYC Documents</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoItem icon={FileText} label="POI Doc No" value={kycPoiNo || "N/A"} mono canCopy />
                        <InfoItem icon={FileText} label="POA Doc No" value={kycPoaNo || "N/A"} mono canCopy />
                        <InfoItem icon={Upload} label="POI File" value={kycPoiName} />
                        <InfoItem icon={Upload} label="POA File" value={kycPoaName} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownloadKyc("POA")} disabled={!kycPoaName || kycPoaName === 'N/A' || downloading === "POA"}>
                          {downloading === "POA" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                          Download POA
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => openKycPreview("POA")} disabled={!kycPoaName || kycPoaName === 'N/A' || previewing === "POA"}>
                          {previewing === "POA" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Preview POA
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownloadKyc("POI")} disabled={!kycPoiName || kycPoiName === 'N/A' || downloading === "POI"}>
                          {downloading === "POI" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                          Download POI
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => openKycPreview("POI")} disabled={!kycPoiName || kycPoiName === 'N/A' || previewing === "POI"}>
                          {previewing === "POI" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Preview POI
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="audit">
                  <div className="px-1 sm:px-4">
                    {((customer as any).cmStatus || (customer as any).cmStatusMsg || (customer as any).cmErrorReason) && (
                      <Card className={`mb-4 border shadow-sm ${
                        (customer as any).cmStatus === 'S' ? 'bg-green-50/60 border-green-200' : 
                        (customer as any).cmStatus === 'P' ? 'bg-blue-50/60 border-blue-200' : 
                        ((customer as any).cmStatus === 'F' || (customer as any).cmStatus === 'E') ? 'bg-red-50/60 border-red-200' : 
                        'bg-blue-50/60 border-blue-200' 
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 shrink-0">
                              {(customer as any).cmStatus === 'S' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (customer as any).cmStatus === 'P' ? (
                                <Info className="h-5 w-5 text-blue-600" />
                              ) : ((customer as any).cmStatus === 'F' || (customer as any).cmStatus === 'E') ? (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              ) : (
                                <Info className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div className="space-y-1 w-full">
                              <h4 className={`font-semibold text-sm ${
                                (customer as any).cmStatus === 'S' ? 'text-green-900' : 
                                (customer as any).cmStatus === 'P' ? 'text-blue-900' : 
                                ((customer as any).cmStatus === 'F' || (customer as any).cmStatus === 'E') ? 'text-red-900' : 
                                'text-blue-900'
                              }`}>
                                CM Status: {(customer as any).cmStatus === 'S' ? 'Success' : 
                                          (customer as any).cmStatus === 'P' ? 'Inprocess' : 
                                          (customer as any).cmStatus === 'F' ? 'Failed' : 
                                          (customer as any).cmStatus === 'E' ? 'Error' : 
                                          (customer as any).cmStatus}
                              </h4>

                              {(customer as any).cmStatusMsg && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Message: </span>
                                  {(customer as any).cmStatusMsg}
                                </div>
                              )}

                              {(customer as any).cmErrorReason && (
                                <div className="text-sm bg-white/60 p-2 rounded border border-red-100 mt-2 text-red-800">
                                  <span className="font-medium text-red-900">Error Reason: </span>
                                  {(customer as any).cmErrorReason}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {(customer as any).onbId ? (
                      <AuditLogTab onbId={(customer as any).onbId} />
                    ) : (
                      <div className="text-center p-8 text-gray-500">Onboarding ID not found, cannot fetch audit logs.</div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="shrink-0 px-4 sm:px-6 py-3 border-t bg-white flex items-center justify-between">
  <div className="text-xs text-gray-500">
    Tip: Use the Copy icon to quickly copy IDs and contact information.
  </div>
  <div className="flex items-center gap-2">
    {onEdit && (() => {
      
      const isAdmin = user?.allAccess === "Y";
      const stage = String(customer?.customerStage || "").toUpperCase();
      
      // Show edit button only if:
      // - Admin: Always show
      // - Agent: Only for CAPTURED status
      const showEditButton = isAdmin || stage === "CAPTURED";
      
      return showEditButton ? (
        <Button variant="outline" onClick={() => onEdit?.(customer)} aria-label="Edit customer">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      ) : null;
    })()}
    <Button variant="default" onClick={onClose} aria-label="Close">
      <X className="h-4 w-4 mr-2" />
      Close
    </Button>
  </div>
</div>
          </div>
        )}
      </DialogContent>
      <Dialog
        open={kycPreviewOpen}
        onOpenChange={(o) => {
          if (!o && kycPreviewUrl && kycPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(kycPreviewUrl);
          }
          setKycPreviewOpen(o);
        }}
      >
        <DialogContent className="w-[95vw] max-w-3xl flex flex-col h-[80vh]">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <DialogTitle>KYC Preview</DialogTitle>
             {/* Added Fallback Open Button */}
             {kycPreviewUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mr-8"
                onClick={() => window.open(kycPreviewUrl!, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
             )}
          </DialogHeader>
          <div className="w-full flex-1 min-h-0 bg-gray-50 border rounded-md relative">
            {kycPreviewUrl ? (
              kycPreviewMime.includes("pdf") ? (
                /* Replaced iframe with object for better PDF handling */
                <object
                  data={kycPreviewUrl}
                  type="application/pdf"
                  className="w-full h-full"
                >
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                    {/* <p>Unable to display PDF directly in the browser.</p> */}
                    <Button onClick={() => window.open(kycPreviewUrl!, '_blank')}>
                      <Download className="h-4 w-4 mr-2" />
                      Download / Open in New Tab
                    </Button>
                  </div>
                </object>
              ) : (
                <img
                  src={kycPreviewUrl}
                  alt="KYC Preview"
                  className="max-h-full max-w-full object-contain mx-auto absolute inset-0 m-auto"
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">No preview available.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
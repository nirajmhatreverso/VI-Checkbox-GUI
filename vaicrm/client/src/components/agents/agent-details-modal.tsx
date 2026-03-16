import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User, Mail, Phone, MapPin, Building2, CreditCard, FileText, Calendar, Banknote, Shield,
  Edit, X, UserCheck, Hash, Upload, Copy, Check, Layers, BadgeCheck, IdCard, Globe2, MapPinned, Download, Building, Loader2, History, AlertTriangle, CheckCircle2,
  Info, ExternalLink 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { agentApi } from "@/lib/agentApi";
import { useAuthContext } from "@/context/AuthProvider";
import { buildApiUrl } from "@/lib/config";

// ... [Keep existing interface Agent and interface AgentDetailsModalProps] ...
export interface Agent {
  agentId: number;
  onbId?: string;
  firstName?: string;
  lastName?: string;
  salutation?: string;
  gender?: string;
  mobile?: string;
  phone?: string;
  fax?: string;
  email?: string;
  type?: string;
  region?: string;
  status?: string;
  agentStage?: string;
  addressOne?: string;
  addressTwo?: string;
  ward?: string;
  sapBpId?: string;
  sapCaId?: string | null;
  division?: string;
  country?: string;
  salesOrg?: string;
  city?: string;
  district?: string;
  pincode?: string;
  tinNo?: string;
  tinName?: string;
  vrnNo?: string;
  currency?: string;
  commValue?: string;
  kycDocNo?: string;
  poaDocNo?: string;
  kycPoiFileName?: string;
  kycPoaFileName?: string;
  kycPoi?: FileList | File | null;
  kycPoa?: FileList | File | null;
  createDt?: string;
  createId?: string;
  createTs?: string;
  updateDt?: string;
  updateId?: string;
  updateTs?: string;
  parentId?: string;
  isSubCollection?: string;
  parentSapBpId?: string;
  cmStatus?: string;
  cmStatusMsg?: string;
  cmErrorReason?: string;
}

interface AgentDetailsModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (agent: Agent) => void;
}

const fileNameFromPath = (p?: string) => (p ? p.split(/[\\/]/).pop() || "N/A" : "N/A");
function stageToBadgeVariant(stage?: string): "success" | "info" | "danger" | "muted" {
  switch ((stage || "").toUpperCase()) {
    case "COMPLETED": case "APPROVED": case "SUCCESS": return "success";
    case "PENDING": case "RELEASE_TO_CM": case "RELEASED": case "RELEASED_TO_CM": case "IN_PROGRESS": return "info";
    case "REJECTED": case "FAILED": return "danger";
    case "SUSPENDED": case "INACTIVE": default: return "muted";
  }
}

function initialsFromName(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  return parts.slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function formatDate(d?: string) {
  if (!d) return "N/A";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleString();
}

function InfoItem({ icon: Icon, label, value, mono, canCopy }: { icon: any; label: string; value?: string | number | null; mono?: boolean; canCopy?: boolean; }) {
  const [copied, setCopied] = useState(false);
  const display = (value ?? "N/A") as string;
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      toast({ title: "Copied", description: `${label} copied to clipboard` });
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast({ title: "Copy failed", description: "Could not copy to clipboard", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <div className="mt-0.5"><Icon className="h-4 w-4 text-gray-500" /></div>
      <div className="flex-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-sm font-medium ${mono ? "font-mono break-all" : "break-words"} flex items-center gap-2`}>
          <span className="break-words">{display}</span>
          {canCopy && value && (
            <Button variant="ghost" size="iconSm" onClick={handleCopy} title="Copy" aria-label={`Copy ${label}`}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
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
      type: "AGENT",
      offSet: 0,
      limit: 100
    };
  
    const { data: auditResponse, isLoading, isError, error } = useQuery({
      queryKey: ['agentAuditLogs', onbId],
      queryFn: () => agentApi.fetchAuditLogs(auditPayload),
      enabled: !!onbId && onbId !== "PREVIEW",
      staleTime: 1000 * 60,
    });
  
    if (onbId === "PREVIEW") {
      return <div className="text-center text-gray-500 p-8">Audit logs will be available after the agent is submitted.</div>;
    }
    if (isLoading) {
      return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading audit logs...</div>;
    }
    if (isError) {
      return <div className="text-black-500 p-8">{(error as any)?.statusMessage || (error as any)?.message}</div>;
    }
  
    const auditLogs = auditResponse?.data?.data || [];
    if (auditLogs.length === 0) {
      return <div className="text-center text-gray-500 p-8">No audit logs found for this agent.</div>;
    }
  
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6">
            <div className="absolute left-0 top-0 h-full w-0.5 bg-gray-200" />
            {auditLogs.map((log: any, index: number) => (
              <div key={log.actId} className={`relative pb-8 ${index === auditLogs.length - 1 ? 'pb-0' : ''}`}>
                <div className="absolute left-[-22px] top-1 h-4 w-4 rounded-full bg-azam-blue ring-4 ring-white" />
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{log.description}</p>
                    <p className="text-xs text-gray-500">by {log.createId} • {log.actionType}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 sm:mt-0">{formatDate(log.createTs)}</p>
                </div>
                {(log.cmStatus || log.cmStatusMsg || log.cmErrorReason) && (
                  <div className={`mt-2 text-xs p-2 rounded-md border ${log.cmStatus === 'S'
                    ? 'bg-green-50 border-green-100 text-green-800'
                    : log.cmStatus === 'P'
                      ? 'bg-blue-50 border-blue-100 text-blue-800'
                      : log.cmStatus === 'F' || log.cmStatus === 'E'
                        ? 'bg-red-50 border-red-100 text-red-800'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}>
                    {log.cmStatus && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">CM Status:</span>
                        <span className="font-mono">{log.cmStatus === 'S' ? 'Success' : log.cmStatus === 'P' ? 'Inprocess' : log.cmStatus === 'F' ? 'Failed' : log.cmStatus === 'E' ? 'Error' : log.cmStatus}</span>
                      </div>
                    )}
                    {log.cmStatusMsg && (
                      <div className="mt-1">
                        <span className="font-semibold">Message:</span> {log.cmStatusMsg}
                      </div>
                    )}
                    {log.cmErrorReason && (
                      <div className="mt-1 font-medium">
                        <span className="font-semibold">Reason:</span> {log.cmErrorReason}
                      </div>
                    )}
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

export default function AgentDetailsModal({ agent, isOpen, onClose, onEdit }: AgentDetailsModalProps) {
  const { toast } = useToast();
  const [kycPreviewOpen, setKycPreviewOpen] = useState(false);
  const [kycPreviewUrl, setKycPreviewUrl] = useState<string | null>(null);
  const [kycPreviewMime, setKycPreviewMime] = useState<string>("");
  const [downloading, setDownloading] = useState<"POA" | "POI" | null>(null);
  const [previewing, setPreviewing] = useState<"POA" | "POI" | null>(null);
const { user } = useAuthContext();
  const kycPoaName = useMemo(
    () => agent?.kycPoaFileName || (agent?.kycPoa as File)?.name || fileNameFromPath((agent as any)?.poaDocPath) || null,
    [agent]
  );
  const kycPoiName = useMemo(
    () => agent?.kycPoiFileName || (agent?.kycPoi as File)?.name || fileNameFromPath((agent as any)?.poiDocPath) || null,
    [agent]
  );

  const shouldShowEdit = useMemo(() => {
    // If no onEdit handler, don't show
    if (!onEdit) return false;
    
    // If user is admin (allAccess === 'Y'), always show edit
    if (user?.allAccess === 'Y') return true;
    
    // For agents (allAccess !== 'Y'), hide edit if status is COMPLETED or RELEASE_TO_CM
    const restrictedStatuses = ['COMPLETED', 'RELEASE_TO_CM', 'RELEASED_TO_CM', 'RELEASED'];
    const currentStatus = agent?.agentStage?.toUpperCase();
    
    if (currentStatus && restrictedStatuses.includes(currentStatus)) {
      return false;
    }
    
    return true;
  }, [onEdit, user?.allAccess, agent?.agentStage]);

  async function openKycPreview(fileType: "POA" | "POI") {
    setPreviewing(fileType);
    try {
      const file = fileType === "POA" ? agent?.kycPoa : agent?.kycPoi;
      if (file instanceof File) {
        const url = URL.createObjectURL(file);
        setKycPreviewUrl(url);
        setKycPreviewMime(file.type || "application/octet-stream");
        setKycPreviewOpen(true);
        return;
      }

      if (agent?.onbId === "PREVIEW" || !agent?.agentId) {
        toast({ title: "Preview Not Available", description: "File can be previewed after submission.", variant: "destructive" });
        return;
      }

      const idToPreview = agent.agentId;
      const fileName = fileType === "POA" ? kycPoaName : kycPoiName;

      const res = await agentApi.previewKyc({
        userType: "AGENT",
        fileType,
        id: idToPreview
      });

      if (!res.ok) {
        try {
          const errJson = await res.json();
          throw new Error(errJson.statusMessage || `Failed to load preview (${res.status})`);
        } catch {
          const errorText = await res.text();
          throw new Error(errorText || `Failed to load preview (${res.status})`);
        }
      }

      const blob = await res.blob();
      
      let mimeType = blob.type;
      if ((!mimeType || mimeType === "application/octet-stream") && fileName) {
          if (fileName.toLowerCase().endsWith(".pdf")) {
              mimeType = "application/pdf";
          } else if (fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
              if (fileName.toLowerCase().endsWith(".png")) mimeType = "image/png";
              else if (fileName.toLowerCase().endsWith(".gif")) mimeType = "image/gif";
              else mimeType = "image/jpeg";
          }
      }

      const finalBlob = new Blob([blob], { type: mimeType });
      const blobUrl = URL.createObjectURL(finalBlob);
      
      setKycPreviewUrl(blobUrl);
      setKycPreviewMime(mimeType);
      setKycPreviewOpen(true);

    } catch (e: any) {
      toast({ title: "Preview Failed", description: e?.statusMessage || "Could not load KYC preview", variant: "destructive" });
    } finally {
      setPreviewing(null);
    }
  }

  async function handleDownloadKyc(fileType: "POA" | "POI") {
    const fileName = fileType === "POA" ? kycPoaName : kycPoiName;
    if (!fileName) {
      toast({ title: "Download Failed", description: "File name is not available.", variant: "destructive" });
      return;
    }

    setDownloading(fileType);
    try {
      const file = fileType === "POA" ? agent?.kycPoa : agent?.kycPoi;
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

      if (agent?.onbId === "PREVIEW" || !agent?.agentId) {
        toast({ title: "Download Not Available", description: "File can be downloaded after submission.", variant: "destructive" });
        return;
      }

      const idToDownload = agent.agentId;
      toast({ title: "Downloading...", description: `Preparing ${fileName} for download.` });

      const res = await agentApi.downloadKyc({
        userType: "AGENT",
        fileType,
        id: idToDownload
      });

      if (!res.ok) {
        try {
          const errJson = await res.json();
          throw new Error(errJson.statusMessage || `Failed to download file (${res.status})`);
        } catch {
          const errorText = await res.text();
          throw new Error(errorText || `Failed to download file (${res.status})`);
        }
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
      toast({ title: "Download Failed", description: e?.statusMessage || `Could not download ${fileName}`, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  }

  const fullName = useMemo(() => {
    if (!agent) return "Agent";
    const parts = [agent.salutation, agent.firstName, agent.lastName].filter(Boolean);
    return parts.join(" ").trim() || "Agent";
  }, [agent]);

  const stageMeta = useMemo(() => {
    const map: Record<string, { title: string; desc: string }> = {
      RELEASE_TO_CM: { title: "Release to CM", desc: "Released to Contract Management." }, RELEASED: { title: "Released", desc: "Released to downstream system." }, RELEASED_TO_CM: { title: "Released to CM", desc: "Released to Contract Management." }, COMPLETED: { title: "Completed", desc: "Onboarding completed successfully." }, APPROVED: { title: "Approved", desc: "Agent has been approved." }, PENDING: { title: "Pending", desc: "Onboarding is pending." }, REJECTED: { title: "Rejected", desc: "This agent was rejected during onboarding." }, IN_PROGRESS: { title: "In Progress", desc: "Onboarding is in progress." }, SUSPENDED: { title: "Suspended", desc: "Agent is currently suspended." }, INACTIVE: { title: "Inactive", desc: "Agent is inactive." }, SUCCESS: { title: "Success", desc: "Operation finished successfully." }, FAILED: { title: "Failed", desc: "Onboarding failed due to an error." },
    };
    const key = (agent?.agentStage || "").toUpperCase();
    return map[key];
  }, [agent?.agentStage]);

  const quickTags = [
    agent?.type && { icon: BadgeCheck, label: agent.type }, agent?.region && { icon: MapPinned, label: agent.region }, agent?.currency && { icon: CreditCard, label: agent.currency },
  ].filter(Boolean) as { icon: any; label: string }[];

  const handleMail = () => agent?.email && window.open(`mailto:${agent.email}`, "_blank");
  const handleCall = () => agent?.mobile && window.open(`tel:${agent.mobile}`, "_self");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-full sm:max-w-5xl p-0"
        style={{ maxWidth: "100vw" }}
      >
        <DialogTitle className="sr-only">{agent ? `${fullName} — Agent Details` : "Agent Details"}</DialogTitle>
        <DialogDescription className="sr-only">Detailed agent profile including personal, business, tax, KYC, and system information.</DialogDescription>
        {!agent ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center"><User className="h-6 w-6 text-gray-400" /></div>
            <h3 className="text-lg font-semibold text-gray-800">No agent selected</h3>
            <p className="text-sm text-gray-500 mt-1">Select an agent to view detailed information.</p>
            <div className="mt-4"><Button variant="outline" onClick={onClose} aria-label="Close"><X className="h-4 w-4 mr-2" />Close</Button></div>
          </div>
        ) : (
          <div className="flex max-h-[92vh] flex-col">
            <div className="shrink-0 bg-gradient-to-r from-azam-blue to-sky-500 text-white px-4 sm:px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3 pr-12">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/15 ring-1 ring-white/30 flex items-center justify-center"><span className="text-base sm:text-lg font-semibold">{initialsFromName(fullName || "A")}</span></div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold leading-tight">{fullName}</h2>
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><span><Badge variant={stageToBadgeVariant(agent.agentStage)} size="sm">{stageMeta?.title || agent.agentStage || "UNKNOWN"}</Badge></span></TooltipTrigger><TooltipContent className="max-w-xs p-3 bg-white border rounded shadow"><div className="font-semibold mb-1 text-gray-800">{stageMeta?.title || "Status Info"}</div><div className="text-xs text-gray-600">{stageMeta?.desc || "No info available for this status."}</div></TooltipContent></Tooltip></TooltipProvider>
                    </div>
                    <div className="mt-1 text-white/80 text-xs flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1"><IdCard className="h-3.5 w-3.5" /><span className="font-mono">Agent #{agent.agentId}</span></div>
                      {agent.onbId && (<><span className="opacity-60">•</span><div className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /><span className="font-mono">Onboarding #{agent.onbId}</span></div></>)}
                      {agent.createTs && (<><span className="opacity-60">•</span><div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /><span>Created {formatDate(agent.createTs)}</span></div></>)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">{quickTags.map((t, idx) => (<Badge key={idx} variant="outline" size="sm" className="bg-white/10 text-white border-white/30"><t.icon className="h-3.5 w-3.5 mr-1" />{t.label}</Badge>))}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="xs" variant="secondary" onClick={handleMail} disabled={!agent.email} aria-label="Email agent"><Mail className="h-4 w-4 mr-1" />Email</Button>
                <Button size="xs" variant="secondary" onClick={handleCall} disabled={!agent.mobile} aria-label="Call agent"><Phone className="h-4 w-4 mr-1" />Call</Button>
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto overflow-x-auto px-2 sm:px-6 pt-3 pb-24"
              style={{
                WebkitOverflowScrolling: "touch",
                maxWidth: "100vw",
                width: "100vw",
              }}
            >
              <Tabs defaultValue="general" className="w-full">
                <div className="relative w-full overflow-x-auto">
                  <TabsList
                    className="flex w-max min-w-0 gap-2 pl-3 pr-4 mb-3 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300"
                    style={{
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    <TabsTrigger value="general">General Data</TabsTrigger>
                    <TabsTrigger value="personal">Personal Details</TabsTrigger>
                    <TabsTrigger value="address">Address Details</TabsTrigger>
                    <TabsTrigger value="tax">Tax Information</TabsTrigger>
                    <TabsTrigger value="financial">Financial Settings</TabsTrigger>
                    <TabsTrigger value="kyc">KYC Documents</TabsTrigger>
                    <TabsTrigger value="audit">Audit Logs</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="general">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">General Data</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4 px-1 sm:px-4">
                      <InfoItem icon={BadgeCheck} label="Agent Type" value={agent.type || "N/A"} />
                      <InfoItem icon={Layers} label="Division" value={agent.division || "N/A"} />
                      <InfoItem icon={IdCard} label="Parent Agent BP" value={agent.parentSapBpId || agent.parentId || "N/A"} mono canCopy />
                      <InfoItem icon={BadgeCheck} label="Sub-Collection Allowed" value={agent.isSubCollection === "Y" ? "Yes" : "No"} />
                      {agent.agentStage === "COMPLETED" && (
                        <>
                          <Separator className="my-2 col-span-2 md:col-span-2" />
                          <InfoItem icon={UserCheck} label="SAP BP ID" value={agent.sapBpId || "N/A"} mono canCopy />
                          <InfoItem icon={FileText} label="SAP CA ID" value={agent.sapCaId || "N/A"} mono canCopy />
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="personal">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Personal Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4 px-1 sm:px-4">
                      <InfoItem icon={User} label="Full Name" value={fullName} />
                      <InfoItem icon={Shield} label="Gender" value={agent.gender || "N/A"} />
                      <InfoItem icon={Mail} label="Email" value={agent.email} canCopy />
                      <InfoItem icon={Phone} label="Mobile" value={agent.mobile} canCopy />
                      <InfoItem icon={Phone} label="Phone" value={agent.phone || "N/A"} />
                      <InfoItem icon={FileText} label="Fax" value={agent.fax || "N/A"} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="address">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Address Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-1 sm:px-4">
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4">
                        <InfoItem icon={Globe2} label="Country" value={agent.country || "N/A"} />
                        <InfoItem icon={MapPinned} label="Region" value={agent.region || "N/A"} />
                        <InfoItem icon={MapPin} label="City" value={agent.city || "N/A"} />
                        <InfoItem icon={MapPin} label="District" value={agent.district || "N/A"} />
                        <InfoItem icon={MapPin} label="Ward" value={agent.ward || "N/A"} />
                        <InfoItem icon={Hash} label="Postal Code" value={agent.pincode || "N/A"} />
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoItem icon={MapPin} label="Address 1" value={agent.addressOne || "N/A"} />
                        <InfoItem icon={MapPin} label="Address 2" value={agent.addressTwo || "N/A"} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="tax">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tax Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4 px-1 sm:px-4">
                      <InfoItem icon={User} label="Tin Name" value={agent.tinName || "N/A"} />
                      <InfoItem icon={Hash} label="TIN Number" value={agent.tinNo || "N/A"} mono canCopy />
                      <InfoItem icon={Hash} label="VRN" value={agent.vrnNo || "N/A"} mono canCopy />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="financial">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Financial Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4 px-1 sm:px-4">
                      <InfoItem icon={CreditCard} label="Currency" value={agent.currency || "N/A"} />
                      <InfoItem icon={Banknote} label="Commission Rate" value={agent.commValue ? `${agent.commValue}%` : "N/A"} />
                      <InfoItem icon={Layers} label="Sales Organization" value={agent.salesOrg || "N/A"} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="kyc">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">KYC Documents</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-1 sm:px-4">
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4">
                        <InfoItem icon={FileText} label="POA Document No" value={agent.poaDocNo || "N/A"} mono canCopy />
                        <InfoItem icon={Upload} label="POA File" value={kycPoaName || "N/A"} />
                        <InfoItem icon={FileText} label="POI Document No" value={agent.kycDocNo || "N/A"} mono canCopy />
                        <InfoItem icon={Upload} label="POI File" value={kycPoiName || "N/A"} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={!agent.poaDocNo || agent.poaDocNo === "N/A" || !kycPoaName || kycPoaName === "N/A" || downloading === "POA"} onClick={() => handleDownloadKyc("POA")}>
                          {downloading === "POA" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                          Download POA
                        </Button>
                        <Button type="button" variant="outline" size="sm" disabled={!agent.poaDocNo || agent.poaDocNo === "N/A" || !kycPoaName || kycPoaName === "N/A" || previewing === "POA"} onClick={() => openKycPreview("POA")}>
                          {previewing === "POA" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Preview POA
                        </Button>
                        <Button size="sm" variant="outline" disabled={!agent.kycDocNo || agent.kycDocNo === "N/A" || !kycPoiName || kycPoiName === "N/A" || downloading === "POI"} onClick={() => handleDownloadKyc("POI")}>
                          {downloading === "POI" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                          Download POI
                        </Button>
                        <Button type="button" variant="outline" size="sm" disabled={!agent.kycDocNo || agent.kycDocNo === "N/A" || !kycPoiName || kycPoiName === "N/A" || previewing === "POI"} onClick={() => openKycPreview("POI")}>
                          {previewing === "POI" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Preview POI
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="audit">
                  <div className="px-1 sm:px-4">
                    {(agent.cmStatus || agent.cmStatusMsg || agent.cmErrorReason) && (
                      <Card className={`border shadow-sm ${agent.cmStatus === 'S' ? 'bg-green-50/60 border-green-200' :
                        agent.cmStatus === 'P' ? 'bg-blue-50/60 border-blue-200' :
                          agent.cmStatus === 'F' || agent.cmStatus === 'E' ? 'bg-red-50/60 border-red-200' :
                            'bg-blue-50/60 border-blue-200'
                        }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 shrink-0">
                              {agent.cmStatus === 'S' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : agent.cmStatus === 'P' ? (
                                <Info className="h-5 w-5 text-blue-600" />
                              ) : (agent.cmStatus === 'F' || agent.cmStatus === 'E') ? (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              ) : (
                                <Info className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div className="space-y-1 w-full">
                              <h4 className={`font-semibold text-sm ${agent.cmStatus === 'S' ? 'text-green-900' :
                                agent.cmStatus === 'P' ? 'text-blue-900' :
                                  agent.cmStatus === 'F' || agent.cmStatus === 'E' ? 'text-red-900' : 'text-blue-900'
                                }`}>
                                CM Status: {agent.cmStatus === 'S' ? 'Success' : agent.cmStatus === 'P' ? 'Inprocess' : agent.cmStatus === 'F' ? 'Failed' : agent.cmStatus === 'E' ? 'Error' : agent.cmStatus}
                              </h4>

                              {agent.cmStatusMsg && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Message: </span>
                                  {agent.cmStatusMsg}
                                </div>
                              )}

                              {agent.cmErrorReason && (
                                <div className="text-sm bg-white/60 p-2 rounded border border-red-100 mt-2 text-red-800">
                                  <span className="font-medium text-red-900">Error Reason: </span>
                                  {agent.cmErrorReason}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {agent.onbId ? <AuditLogTab onbId={agent.onbId} /> : <div className="text-center p-8 text-gray-500">Onboarding ID not found, cannot fetch audit logs.</div>}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <div className="shrink-0 px-4 sm:px-6 py-3 border-t bg-white flex items-center justify-between">
              <div className="text-xs text-gray-500">Tip: Use the Copy icon to quickly copy IDs and contact information.</div>
              <div className="flex items-center gap-2">
                {shouldShowEdit && (
        <Button variant="outline" onClick={() => onEdit?.(agent)} aria-label="Edit agent">
          <Edit className="h-4 w-4 mr-2" />Edit
        </Button>
      )}
                <Button variant="default" onClick={onClose} aria-label="Close"><X className="h-4 w-4 mr-2" />Close</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
      
      <Dialog open={kycPreviewOpen} onOpenChange={(o) => { if (!o && kycPreviewUrl && kycPreviewUrl.startsWith("blob:")) { URL.revokeObjectURL(kycPreviewUrl); } setKycPreviewOpen(o); }}>
        <DialogContent className="w-[95vw] max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-3 border-b bg-gray-50 flex flex-row items-center justify-between space-y-0">
            <DialogTitle>KYC Preview</DialogTitle>
            {kycPreviewUrl && (
                <Button variant="outline" size="sm" onClick={() => window.open(kycPreviewUrl, '_blank')} className="mr-8">
                    <ExternalLink className="h-4 w-4 mr-2" /> Open in New Tab
                </Button>
            )}
          </DialogHeader>
          <div className="flex-1 w-full bg-gray-100 relative overflow-auto">
            {kycPreviewUrl ? (
                kycPreviewMime.includes("pdf") ? (
                    <object 
                        data={kycPreviewUrl} 
                        type="application/pdf" 
                        className="w-full h-full block"
                    >
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500 p-8 text-center">
                            <p>Due to Security Reason cannot open PDF directly.</p>
                            <Button onClick={() => window.open(kycPreviewUrl, '_blank')}>
                                Download / Open PDF
                            </Button>
                        </div>
                    </object>
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <img src={kycPreviewUrl} alt="KYC Preview" className="max-h-full max-w-full object-contain shadow-md" />
                    </div>
                )
            ) : (<div className="flex items-center justify-center h-full text-sm text-gray-500">No preview available.</div>)}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
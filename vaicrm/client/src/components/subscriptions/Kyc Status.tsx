// src/components/subscriber-view/Kyc Status.tsx

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Shield,
  CheckCircle,
  Download,
  FileText,
  XCircle,
  History,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Info,
  AlertTriangle
} from "lucide-react";

// Helper for date formatting
function formatDateTime(d?: string | null) {
  if (!d) return "N/A";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleString();
}

interface KycStatusProps {
  currentSubscriberData: {
    custId?: string;
    onbId?: string;
    kycStatus: string;
    kycDate?: string;
    kycApprovedBy?: string;
    kycPoiName?: string;
    kycPoaName?: string;
    sapBpId?: string;
  };
}

export default function KycStatusTab({ currentSubscriberData }: KycStatusProps) {
  const { toast } = useToast();
  const [kycPreviewOpen, setKycPreviewOpen] = useState(false);
  const [kycPreviewUrl, setKycPreviewUrl] = useState<string | null>(null);
  const [kycPreviewMime, setKycPreviewMime] = useState<string>("");
  const [downloading, setDownloading] = useState<"POA" | "POI" | null>(null);
  const [previewing, setPreviewing] = useState<"POA" | "POI" | null>(null);

  const isVerified = currentSubscriberData.kycStatus === "Verified";
  const onbId = currentSubscriberData.onbId;

  // --- API: Fetch Audit Logs ---
  const { data: auditResponse, isLoading: isAuditLoading, isError: isAuditError, error: auditError } = useQuery({
    queryKey: ['customerAuditLogs', onbId],
    queryFn: async () => {
      if (!onbId) return { data: { data: [] } };
      return apiRequest('/customers/audit-logs', 'POST', {
        requestTnxId: onbId,
        type: "CUSTOMER",
        offSet: 0,
        limit: 100
      });
    },
    enabled: !!onbId,
    staleTime: 1000 * 60,
  });

  const auditLogs = auditResponse?.data?.data || [];

  // --- Logic: Document Download ---
  async function handleDownloadKyc(fileType: "POA" | "POI") {
    const fileName = fileType === "POA" ? currentSubscriberData.kycPoaName : currentSubscriberData.kycPoiName;
    const customerId = currentSubscriberData.sapBpId || currentSubscriberData.custId;

if (!customerId) {
  toast({ title: "Error", description: "Customer ID missing.", variant: "destructive" });
  return;
}

    setDownloading(fileType);
    try {
const res = await apiRequest('/customers/download-kyc', 'POST', { userType: "CUSTOMER", fileType, sapBpId: customerId });
      if (!res.ok) throw new Error("Failed to download");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName || `kyc-${fileType}.jpg`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Download Failed", description: "Could not download document.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  }

  // --- Logic: Document Preview ---
  async function openKycPreview(fileType: "POA" | "POI") {
    const customerId = currentSubscriberData.sapBpId || currentSubscriberData.custId;
    if (!customerId) return;

    setPreviewing(fileType);
    try {
      const res = await apiRequest('/customers/preview-kyc', 'POST', { userType: "CUSTOMER", fileType, sapBpId: customerId });

      if (!res.ok) throw new Error("Failed to load preview");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setKycPreviewUrl(url);
      setKycPreviewMime(blob.type || "image/*");
      setKycPreviewOpen(true);
    } catch (e) {
      toast({ title: "Preview Failed", description: "Could not load document preview.", variant: "destructive" });
    } finally {
      setPreviewing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Col: KYC Status Card */}
        <Card className="bg-white shadow border border-gray-200 rounded-xl h-fit">
          <div className="rounded-t-xl py-3 px-4 flex items-center gap-2 border-b border-gray-100 bg-gray-50">
            <span className="bg-gray-200 rounded-full p-1 flex items-center justify-center">
              <Shield className="h-5 w-5 text-gray-500" />
            </span>
            <span className="text-base font-semibold text-gray-700">KYC Status</span>
            <Badge
              className={`ml-auto px-5 py-2 text-sm font-semibold rounded-full flex items-center gap-2 shadow border ${isVerified
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-red-100 text-red-700 border-red-300"
                }`}
            >
              {isVerified ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {currentSubscriberData.kycStatus}
            </Badge>
          </div>

          <CardContent className="space-y-4 py-5 px-4">
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 shadow-sm">
                <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Verification Date</span>
                <div className="font-semibold text-gray-900 mt-1 text-sm">{currentSubscriberData.kycDate || "N/A"}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 shadow-sm">
                <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Approved By</span>
                <div className="font-semibold text-gray-900 mt-1 text-sm">{currentSubscriberData.kycApprovedBy || "N/A"}</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">KYC Documents</h4>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
  variant="outline"
  size="sm"
  className="flex-1 border-blue-100"
  onClick={() => handleDownloadKyc("POI")}
  disabled={downloading === "POI" || (!currentSubscriberData.sapBpId && !currentSubscriberData.custId)} // ✅ Fix
>
                    {downloading === "POI" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 text-blue-600 mr-2" />}
                    Download POI
                  </Button>
                  <Button
  variant="outline"
  size="sm"
  className="flex-1 border-green-100"
  onClick={() => handleDownloadKyc("POA")}
  disabled={downloading === "POA" || (!currentSubscriberData.sapBpId && !currentSubscriberData.custId)} // ✅ Fix
>
                    {previewing === "POI" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
  variant="outline"
  size="sm"
  className="flex-1 border-green-100"
  onClick={() => handleDownloadKyc("POA")}
  disabled={downloading === "POA" || (!currentSubscriberData.sapBpId && !currentSubscriberData.custId)} // ✅ Fix
>
                    {downloading === "POA" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 text-green-600 mr-2" />}
                    Download POA
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openKycPreview("POA")}
                    disabled={previewing === "POA" || (!currentSubscriberData.sapBpId && !currentSubscriberData.custId)}
                  >
                    {previewing === "POA" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Col: Audit Timeline (Integrated from Customer Onboarding) */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-5 w-5 text-azam-blue" />
              Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAuditLoading ? (
              <div className="flex items-center justify-center p-8 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading timeline...
              </div>
            ) : isAuditError ? (
              <div className="text-red-500 p-8 text-center text-sm">
                {(auditError as any)?.statusMessage || "Failed to load history."}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center text-gray-500 p-8 text-sm">No activity history found.</div>
            ) : (
              <div className="relative pl-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                <div className="absolute left-0 top-0 h-full w-0.5 bg-gray-200" />
                {auditLogs.map((log: any, index: number) => (
                  <div key={log.actId || index} className={`relative pb-8 ${index === auditLogs.length - 1 ? 'pb-0' : ''}`}>
                    <div className="absolute left-[-22px] top-1 h-4 w-4 rounded-full bg-azam-blue ring-4 ring-white" />
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{log.description}</p>
                        <p className="text-xs text-gray-500">by {log.userName || log.createId} • {log.actionType}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 sm:mt-0">{formatDateTime(log.createTs)}</p>
                    </div>

                    {(log.cmStatus || log.cmStatusMsg || log.cmErrorReason) && (
                      <div className={`mt-2 text-xs p-2 rounded-md border ${log.cmStatus === 'S' ? 'bg-green-50 border-green-100 text-green-800' :
                          log.cmStatus === 'P' ? 'bg-blue-50 border-blue-100 text-blue-800' :
                            (log.cmStatus === 'F' || log.cmStatus === 'E') ? 'bg-red-50 border-red-100 text-red-800' :
                              'bg-gray-50 border-gray-200 text-gray-700'
                        }`}>
                        {log.cmStatus && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Status:</span>
                            <span className="font-mono">
                              {log.cmStatus === 'S' ? 'Success' : log.cmStatus === 'P' ? 'Inprocess' : log.cmStatus === 'F' ? 'Failed' : 'Error'}
                            </span>
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
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
            <DialogTitle>Document Preview</DialogTitle>
            {kycPreviewUrl && (
              <Button variant="outline" size="sm" className="mr-8" onClick={() => window.open(kycPreviewUrl!, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" /> Open in New Tab
              </Button>
            )}
          </DialogHeader>
          <div className="w-full flex-1 min-h-0 bg-gray-50 border rounded-md relative">
            {kycPreviewUrl ? (
              kycPreviewMime.includes("pdf") ? (
                <object data={kycPreviewUrl} type="application/pdf" className="w-full h-full">
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                    <Button onClick={() => window.open(kycPreviewUrl!, '_blank')}>
                      <Download className="h-4 w-4 mr-2" /> Download / Open in New Tab
                    </Button>
                  </div>
                </object>
              ) : (
                <img src={kycPreviewUrl} alt="Preview" className="max-h-full max-w-full object-contain mx-auto absolute inset-0 m-auto" />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">No preview available.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
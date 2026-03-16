// /client/src/components/agents/agent-approve-modal.tsx

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { agentApi } from "@/lib/agentApi";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";
import { Loader2 } from "lucide-react";
import type { Agent } from "./agents-data-grid";
import { apiRequest } from "@/lib/queryClient";

interface AgentApproveModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Sanitization helper - allows letters, numbers, spaces, and basic punctuation
const sanitizeComment = (value: string): string => {
  return value.replace(/[^A-Za-z0-9\s.,;:!?'"-]/g, "");
};

export default function AgentApproveModal({ agent, isOpen, onClose, onSuccess }: AgentApproveModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");

  const { data: dropdowns, isLoading: dropdownsLoading } = useOnboardingDropdowns();
  const approvalReasons = dropdowns?.approvalReason || [];
  const rejectReasons = dropdowns?.rejectReason || [];

  useEffect(() => {
    if (isOpen) {
      setActiveTab("approve");
      setReason("");
      setRemarks("");
    }
  }, [isOpen]);

   const mutation = useMutation({
    mutationFn: (payload: { onbId: string; agentStage: 'APPROVED' | 'REJECTED'; reason: string; remark: string }) => 
        apiRequest('/agents/kyc-action', 'POST', payload),
    onSuccess: (data: any) => {
        const stage = activeTab === 'approve' ? 'Approved' : 'Rejected';
        toast({
            title: `${stage} Successfully`,
            description:data?.data?.message || data?.statusMessage || `Agent ${agent?.firstName} has been ${stage.toLowerCase()}.`
        });
        onSuccess();
        onClose();
    },
    onError: (error: any) => {
        toast({
            title: "Operation Failed",
            description: error?.statusMessage || error?.message || "An unexpected error occurred.",
            variant: "destructive",
        });
    }
  });

  const handleSubmit = () => {
    if (!agent?.onbId) {
      toast({ title: "Error", description: "Agent Onboarding ID is missing.", variant: "destructive" });
      return;
    }
    if (!reason) {
      toast({ title: "Validation Error", description: "Please select a reason.", variant: "destructive" });
      return;
    }
    if (activeTab === 'reject' && !remarks.trim()) {
      toast({ title: "Validation Error", description: "Comments are mandatory for rejection.", variant: "destructive" });
      return;
    }
    const stage: 'APPROVED' | 'REJECTED' = activeTab === "approve" ? "APPROVED" : "REJECTED";

    const payload = {
        onbId: agent.onbId,
        agentStage: stage,
        reason: reason,
        remark: remarks.trim(),
    };
    
    mutation.mutate(payload);
  };

  // Handle remarks change with sanitization
  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const sanitizedValue = sanitizeComment(e.target.value);
    setRemarks(sanitizedValue);
  };

   if (!agent) return null;

  const currentReasons = activeTab === 'approve' ? approvalReasons : rejectReasons;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>KYC Action for {agent.firstName} {agent.lastName}</DialogTitle>
          <DialogDescription>
            Review and approve or reject the agent's KYC submission.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-md">
            <button
              onClick={() => setActiveTab("approve")}
              className={`flex-1 p-2 text-sm font-medium rounded ${activeTab === "approve" ? "bg-azam-orange text-white shadow" : "text-gray-600"}`}
            >
              Approve
            </button>
            <button
              onClick={() => setActiveTab("reject")}
              className={`flex-1 p-2 text-sm font-medium rounded ${activeTab === "reject" ? "bg-red-600 text-white shadow" : "text-gray-600"}`}
            >
              Reject
            </button>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason <span className="text-red-500">*</span></Label>
            <Select value={reason} onValueChange={setReason} disabled={dropdownsLoading}>
              <SelectTrigger id="reason">
                <SelectValue placeholder={dropdownsLoading ? "Loading reasons..." : `Select a reason to ${activeTab}`} />
              </SelectTrigger>
              <SelectContent>
                {currentReasons.map((r: { name: string, value: string }) => (
                  <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">
              Additional Comments
              {activeTab === 'reject' ? (
                <span className="text-red-500 ml-1">(Required)</span>
              ) : (
                <span className="text-gray-400 ml-1">(Optional)</span>
              )}
            </Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={handleRemarksChange}
              placeholder="Provide more details if necessary."
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {remarks.length}/500 characters
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !reason}
            className={activeTab === 'approve' ? 'default' : 'bg-red-600 hover:bg-red-700'}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mutation.isPending ? "Submitting..." : `Submit ${activeTab === 'approve' ? 'Approval' : 'Rejection'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
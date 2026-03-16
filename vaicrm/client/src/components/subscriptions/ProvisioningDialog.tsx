// src/components/subscriptions/ProvisioningDialog.tsx (Corrected & Upgraded)

import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle, XCircle, ServerCrash } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface ProvisioningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  smartCardNo: string;
}

// Type definition based on the reference file
type OperationInfo = {
  SCID: string;
  labInfo: string;
  STB: string;
  Date: string;
  zipCode: string;
  requestType: string;
  subRequestType: string;
  pendingStep?: string;
  Status: 'S' | 'F';
  ErrorDesc: string | null;
};


export default function ProvisioningDialog({ isOpen, onClose, smartCardNo }: ProvisioningDialogProps) {
  const { data: provisioningResponse, isLoading, isError, error } = useQuery({
    queryKey: ['provisioningDetails', smartCardNo],
    queryFn: () => apiRequest('/subscriptions/provisioning-details', 'POST', { smartCardNo }),
    enabled: isOpen && !!smartCardNo,
    staleTime: 1000 * 60, // 1 minute stale time from reference
    refetchOnWindowFocus: false,
  });

  // ✅ ADDED: A robust renderContent function from the reference file
  const renderContent = () => {
    // 1. Handle loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-azam-blue" />
          <p className="text-gray-600">Fetching Provisioning History...</p>
        </div>
      );
    }

    // 2. Handle all error states from React Query
    if (isError) {
      const apiError = error as any;

      // Check if the error object is the specific API failure response (e.g., status: "FAILURE")
      if (apiError?.status === 'FAILURE' && apiError?.statusMessage) {
        return (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              {apiError.statusMessage}
            </AlertDescription>
          </Alert>
        );
      }

      // Fallback for other types of errors (e.g., network failure, 500 server error)
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not fetch provisioning history. Please try again later.
          </AlertDescription>
        </Alert>
      );
    }
    
    // 3. Handle SUCCESS status but with no records
    const operationInfo: OperationInfo[] = provisioningResponse?.data?.OperationInfo || [];
    if (operationInfo.length === 0) {
        return (
            <div className="flex flex-col h-64 items-center justify-center text-center text-gray-500">
                <ServerCrash className="h-12 w-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold">No Provisioning Data Found</h3>
                <p className="text-sm">There is no provisioning history available for this smart card.</p>
            </div>
        );
    }

    // 4. If all checks pass, render the table with the data
    return (
  <ScrollArea className="h-[60vh] w-full">
    <Table>
        <TableHeader className="sticky top-0 bg-muted/50 z-10">
          <TableRow>
            <TableHead className="w-[140px]">Date</TableHead>
            <TableHead className="w-[130px]">Request</TableHead>
            <TableHead className="w-[120px]">Pending Step</TableHead>
            <TableHead className="w-[140px]">SmartCard</TableHead>
            <TableHead className="w-[80px]">Status</TableHead>
            <TableHead>Description</TableHead> {/* ✅ Removed min-w-[200px], made flexible */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {operationInfo.map((op, index) => (
            <TableRow key={index}>
              <TableCell className="text-xs whitespace-nowrap">
                {new Date(op.Date).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs">
                <span className="block truncate max-w-[120px]" title={op.requestType?.replaceAll('_', ' ')}>
                  {op.requestType?.replaceAll('_', ' ')}
                </span>
              </TableCell>
              <TableCell>
                {op.pendingStep ? (
                  <Badge variant="outline" className="text-xs max-w-[110px] truncate" title={op.pendingStep}>
                    {op.pendingStep}
                  </Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs block truncate max-w-[130px]" title={op.STB || 'N/A'}>
                  {op.STB || 'N/A'}
                </span>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={op.Status === 'S' ? 'success' : 'destructive'} 
                  className="flex items-center gap-1 w-fit text-xs"
                >
                  {op.Status === 'S' ? 
                    <CheckCircle className="h-3 w-3" /> : 
                    <XCircle className="h-3 w-3" />
                  }
                  {op.Status === 'S' ? 'Success' : 'Failed'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-xs text-muted-foreground">
                  {op.ErrorDesc ? (
                    <span 
                      className="block break-words max-w-[250px]" 
                      title={op.ErrorDesc}
                    >
                      {op.ErrorDesc}
                    </span>
                  ) : (
                    '—'
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
    </Table>
  </ScrollArea>
);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Hardware Provisioning History</DialogTitle>
          <DialogDescription>
            Showing recent provisioning operations for Smart Card: <span className="font-semibold text-gray-800">{smartCardNo}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
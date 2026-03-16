import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, CheckSquare } from "lucide-react";

// Minimal row shape used by the table (you can extend if needed)
type Row = {
  id: number;
  requestId?: string;
  agentName?: string;
  itemType?: string;
  itemSerialNo?: string;
  totalAmount?: number;
  faultyReason?: string;
  centerExecutive?: string;
  approvedDate?: string;
  createDt?: string;
  replacementCenter?: string;
  replacementNotes?: string;
  status?: string;
  cmStatus?: string;
  cmStatusMsg?: string;
};

type DataTableProps = {
  items: Row[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onComplete?: (id: number) => void;
  renderStatusBadge: (status?: string) => React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: React.ReactNode;
};

export default function DataTable({
  items,
  onApprove,
  onReject,
  onComplete,
  renderStatusBadge,
  emptyTitle = "No items found",
  emptySubtitle = "",
  emptyIcon,
}: DataTableProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {items.map((row) => (
          <div key={row.id} className="border rounded-lg p-4">
            <div className="flex flex-col md:flex-row items-start justify-between gap-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.requestId}</span>
                  {renderStatusBadge(row.status)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Agent:</span> {row.agentName}
                  </div>
                  <div>
                    <span className="text-gray-600">Item:</span> {row.itemType}
                  </div>
                  <div>
                    <span className="text-gray-600">Serial:</span> {row.itemSerialNo}
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>{" "}
                    {Number(row.totalAmount || 0).toLocaleString()} 
                  </div>
                  {row.approvedDate !== undefined && (
                    <div>
                      <span className="text-gray-600">Approved:</span>{" "}
                      {row.approvedDate ? new Date(row.approvedDate).toLocaleDateString() : "N/A"}
                    </div>
                  )}
                  {row.createDt !== undefined && (
                    <div>
                      <span className="text-gray-600">Created:</span>{" "}
                      {row.createDt ? new Date(row.createDt).toLocaleDateString() : "N/A"}
                    </div>
                  )}
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Reason:</span> {row.faultyReason}
                </div>
                {row.replacementNotes && (
                  <div className="text-sm">
                    <span className="text-gray-600">Notes:</span> {row.replacementNotes}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {onApprove && (
                  <Button size="xs" variant="outline" onClick={() => onApprove(row.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                )}
                {onReject && (
                  <Button size="xs" variant="outline" onClick={() => onReject(row.id)}>
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                )}
                {onComplete && (
                  <Button size="xs" onClick={() => onComplete(row.id)}>
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-gray-500 mt-2">
              <div>{row.cmStatus}</div>
              {row.cmStatusMsg && <div className="text-xs">{row.cmStatusMsg}</div>}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-8">
          {emptyIcon}
          <p className="text-gray-600 mt-2 font-medium">{emptyTitle}</p>
          {emptySubtitle && <p className="text-gray-500 text-sm mt-1">{emptySubtitle}</p>}
        </div>
      )}
    </>
  );
}

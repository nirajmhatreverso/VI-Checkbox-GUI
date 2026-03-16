export enum BulkUploadType {
  INVOICE_ONLY = 'INVOICE_ONLY',       // Image 1: Invoice No
  BP_AMOUNT = 'BP_AMOUNT',             // Image 2: SapBpId, Amount
  SMART_CARD_FULL = 'SMART_CARD_FULL'  // Image 3: SapBpId, SmartCard, Amount, InvoiceNo
}

export interface BulkUploadResponse {
  success: boolean;
  statusMessage: string;
  data?: {
    processedCount: number;
    failureCount: number;
    referenceId?: string;
  };
}

// Exact headers matching your Excel screenshots
export const BULK_TEMPLATE_HEADERS = {
  [BulkUploadType.INVOICE_ONLY]: ['Invoice No'],
  [BulkUploadType.BP_AMOUNT]: ['SapBpId', 'Amount'],
  [BulkUploadType.SMART_CARD_FULL]: ['SapBpId', 'SmartCard', 'Amount', 'InvoiceNo']
};
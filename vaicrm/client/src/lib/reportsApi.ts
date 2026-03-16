import { apiRequest } from './queryClient';

// ── Types ──────────────────────────────────────────────────────────────────

export interface FetchReportsRequest {
    reportDate: string;          // "YYYY-MM-DD" – mandatory
    salesOrg?: string;
    reportName?: string;
    reportId?: string;
    offSet: number;              // mandatory
    limit: number;               // mandatory
}

export interface ReportMasterBean {
    drId: string;
    reportName: string;
    reportDate: string;
    createTs: string;
    filePath: string;
    fileName: string;
    salesOrg: string;
}

export interface FetchReportsResponse {
    traceId?: string;
    spanId?: string;
    status: string;
    statusCode: number;
    statusMessage: string;
    data?: {
        reportMasterBeans: ReportMasterBean[];
        offset: number;
        limit: number;
        totalRecordCount: number;
    };
}

export interface ReportNameBean {
    reportName: string;
}

export interface FetchReportNamesResponse {
    traceId?: string;
    spanId?: string;
    status: string;
    statusCode: number;
    statusMessage: string;
    data?: {
        reportMasterBeans: ReportNameBean[];
        offset: number;
        limit: number;
        totalRecordCount: number;
    };
}

// ── API helper ─────────────────────────────────────────────────────────────

export const reportsApi = {
    fetchReports: async (payload: FetchReportsRequest): Promise<FetchReportsResponse> => {
        return apiRequest('/reports/fetch', 'POST', payload);
    },

    fetchReportNames: async (salesOrg: string): Promise<FetchReportNamesResponse> => {
        return apiRequest('/reports/fetch/names', 'POST', { salesOrg });
    },

    /**
     * Downloads a report file from the Java backend via the BFF proxy.
     * Uses raw fetch (not apiRequest) because the response is binary, not JSON.
     * Triggers a browser "Save As" download automatically.
     */
    downloadReport: async (fileName: string, filePath: string): Promise<void> => {
        // apiRequest handles CSRF, credentials, and error extraction automatically.
        // It returns the raw Response object because the response is binary (not JSON).
        const res = await apiRequest('/reports/download', 'POST', { fileName, filePath });

        if (!(res instanceof Response)) {
            throw new Error("Invalid response format: Expected binary data");
        }

        // Derive file name from Content-Disposition header, fallback to provided fileName
        const disposition = res.headers.get('content-disposition') ?? '';
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        const downloadName = match ? match[1].replace(/['"]/g, '') : fileName;

        // Create a Blob URL and trigger browser download
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = downloadName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    },
};


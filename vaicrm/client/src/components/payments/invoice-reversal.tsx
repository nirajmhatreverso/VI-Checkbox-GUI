import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    AlertCircle,
    Search,
    X,
    CheckCircle,
    Clock,
    AlertTriangle,
    Calendar as CalendarIcon,
    FileText,
    RotateCcw,
    Loader2,
    UserSearch,
    Filter,
    Eye
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useAuthContext } from "@/context/AuthProvider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import CustomerSearchModal from "@/components/customers/CustomerSearchModal";

// API Response Interface based on the provided structure
interface InvoiceApiResponse {
    ContractAccount: string;
    InvoiceDocumentNumber: string;
    BusinessPartner: string;
    CreationDate: string;
    CreationTime: string;
    BillDate: string;
    DueDate: string;
    Currency: string;
    CompanyCode: string;
    BillAmount: string;
    CreationBy: string;
    Division: string;
    InvoiceUnpaidAmount: string;
    AmountPayable: string;
    Gpart?: string;
    Vkont?: string;
    StateCode?: string;
    ContractNumber?: string;
    Odn?: string;
    Filename?: string;
    InvoiceDocumentNumberDocno?: string;
}

interface Invoice {
    invoiceId: string;
    invoiceNo: string;
    contractAccount: string;
    businessPartner: string;
    creationDate: string;
    creationTime: string;
    billDate: string;
    dueDate: string;
    currency: string;
    companyCode: string;
    billAmount: number;
    createdBy: string;
    division: string;
    unpaidAmount: number;
    amountPayable: number;
}

interface ReversalRequest {
    invoiceNo: string;
    reason: string;
    sapBpId: string;
    sapCaId: string;
    salesOrg: string;
    division: string;
}


interface ApiResponse<T> {
    success?: boolean;
    status?: string;
    statusMessage?: string;
    data?: T;
    results?: T;
    message?: string;
}

// Safe local date -> "YYYY-MM-DD" (avoids timezone shifts)
const toYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

// Format SAP date (YYYYMMDD) to readable format
const formatSAPDate = (sapDate: string) => {
    if (!sapDate || sapDate.length !== 8) return sapDate;
    const year = sapDate.substring(0, 4);
    const month = sapDate.substring(4, 6);
    const day = sapDate.substring(6, 8);
    return `${day}/${month}/${year}`;
};

// Format SAP time (HHMMSS) to readable format
const formatSAPTime = (sapTime: string) => {
    if (!sapTime || sapTime.length !== 6) return sapTime;
    const hour = sapTime.substring(0, 2);
    const minute = sapTime.substring(2, 4);
    const second = sapTime.substring(4, 6);
    return `${hour}:${minute}:${second}`;
};

// Map API response to Invoice interface
const mapApiToInvoice = (apiData: InvoiceApiResponse): Invoice => {
    return {
        invoiceId: apiData.InvoiceDocumentNumber,
        invoiceNo: apiData.InvoiceDocumentNumber,
        contractAccount: apiData.ContractAccount,
        businessPartner: apiData.BusinessPartner,
        creationDate: apiData.CreationDate,
        creationTime: apiData.CreationTime,
        billDate: apiData.BillDate,
        dueDate: apiData.DueDate,
        currency: apiData.Currency,
        companyCode: apiData.CompanyCode,
        billAmount: parseFloat(apiData.BillAmount) || 0,
        createdBy: apiData.CreationBy,
        division: apiData.Division,
        unpaidAmount: parseFloat(apiData.InvoiceUnpaidAmount) || 0,
        amountPayable: parseFloat(apiData.AmountPayable) || 0,
    };
};

export default function InvoiceReversalPage() {
    const { user } = useAuthContext();
    const currentSalesOrg = user?.salesOrg;

    // Customer selection state
    const [selectedCustomerBpId, setSelectedCustomerBpId] = useState("");
    const [selectedCustomerCaId, setSelectedCustomerCaId] = useState("");
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [customerDetails, setCustomerDetails] = useState<any | null>(null);
    const [customerStatus, setCustomerStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [reversalReason, setReversalReason] = useState("");
    const [showReversalForm, setShowReversalForm] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch invoices for selected customer
    const {
        data: queryResult,
        isLoading: invoicesLoading,
        refetch: refetchInvoices,
        error: invoicesError,
    } = useQuery({
        queryKey: ['/subscriptions/invoice-details', selectedCustomerBpId, selectedCustomerCaId],
        queryFn: async () => {
            // ✅ Ensure both BP ID and CA ID are available
            if (!selectedCustomerBpId || !selectedCustomerCaId) {
                return { invoices: [], statusMessage: "" };
            }

            const response: any = await apiRequest("/subscriptions/invoice-details", "POST", {
                sapBpId: selectedCustomerBpId,
                sapCaId: selectedCustomerCaId,
            });

            const statusMessage = response?.statusMessage || "No invoices found";

            // ✅ Match BillingTable pattern: Check for SUCCESS status and data.results
            if (response?.status === "SUCCESS" && response.data?.results) {
                const results = response.data.results;

                if (!Array.isArray(results)) {
                    toast({
                        title: "Error",
                        description: "Invalid response format from server",
                        variant: "destructive",
                    });
                    return { invoices: [], statusMessage };
                }

                const mappedInvoices = results.map((item: InvoiceApiResponse) => mapApiToInvoice(item));

                return { invoices: mappedInvoices, statusMessage };
            } else {
                return { invoices: [], statusMessage };
            }
        },
        enabled: !!selectedCustomerBpId && !!selectedCustomerCaId, // ✅ Both BP ID and CA ID are required
    });

    // Verify and fetch customer details
    const verifyCustomer = async (bp: string) => {
        if (!bp) return;

        setCustomerStatus("loading");
        setCustomerDetails(null);

        try {
            const res = await apiRequest('/agents/user-details', 'POST', {
                type: "Customer",
                isSubCollection: "Y",
                sapBpId: bp,
                salesOrg: currentSalesOrg
            });

            const list = res?.data?.customerDetails || [];

            const foundCustomer = list.find((item: any) =>
                Array.isArray(item.relatedParty) &&
                item.relatedParty.some((rp: any) => String(rp.sapBpId) === bp)
            );

            if (foundCustomer) {
                setCustomerStatus("valid");

                const related = foundCustomer.relatedParty.find((rp: any) => String(rp.sapBpId) === bp);
                const sapCaId = related?.sapCaId || "";
                const division = related?.division || "10";

                const contactList = Array.isArray(foundCustomer.contactMedium) ? foundCustomer.contactMedium : [];
                const addressInfo = contactList.find((c: any) => c.type === 'BILLING_ADDRESS') || {};
                const mobileInfo = contactList.find((c: any) => c.type === 'mobile') || {};
                const emailInfo = contactList.find((c: any) => c.type === 'email') || {};

                const displayDetails = {
                    name: `${foundCustomer.firstName || ''} ${foundCustomer.lastName || ''}`.trim(),
                    sapBpId: bp,
                    mobile: mobileInfo.value,
                    email: emailInfo.value,
                    country: addressInfo.country,
                    region: addressInfo.region,
                    city: addressInfo.city,
                    district: addressInfo.district,
                    ward: addressInfo.ward,
                    sapCaId: sapCaId,
                    division: division,
                    agreementType: foundCustomer.agreementType || ""
                };

                setCustomerDetails(displayDetails);

                // ✅ Update selectedCustomerCaId so invoice query has the required sapCaId
                if (sapCaId) {
                    setSelectedCustomerCaId(sapCaId);
                }
            } else {
                setCustomerStatus("invalid");
                toast({
                    title: "Error",
                    description: "Customer not found",
                    variant: "destructive",
                });
            }
        } catch (error) {
            setCustomerStatus("invalid");
            toast({
                title: "Error",
                description: "Unable to verify customer",
                variant: "destructive",
            });
        }
    };

    // Reverse invoice mutation
    const reverseInvoiceMutation = useMutation({
        mutationFn: async (data: ReversalRequest) => {
            return await apiRequest("/invoice-reversal/reverse", "POST", data);
        },
        onSuccess: (res: any) => {
            toast({
                title: "Success",
                description: `${res?.data?.message || "Invoice reversal initiated successfully"}. Inv No: ${res?.data?.invoiceNumber || ""}`,
            });
            setShowReversalForm(false);
            setSelectedInvoice(null);
            setReversalReason("");
            refetchInvoices();
            queryClient.invalidateQueries({ queryKey: ["/subscriptions/invoice-details"] });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error?.statusMessage || error?.message || "Failed to reverse invoice",
                variant: "destructive",
            });
        },
    });

    const handleCustomerSelect = (sapBpId: string, sapCaId?: string) => {
        setSelectedCustomerBpId(sapBpId);
        setSelectedCustomerCaId(sapCaId || "");
        setSelectedInvoice(null);
        verifyCustomer(sapBpId);
    };

    const handleChangeCustomer = () => {
        setSelectedCustomerBpId("");
        setSelectedCustomerCaId("");
        setSelectedInvoice(null);
        setShowReversalForm(false);
        setCustomerDetails(null);
        setCustomerStatus("idle");
    };

    const handleSelectInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setShowReversalForm(false);
        setReversalReason("");
    };

    const handleReverseInvoice = () => {
        if (!selectedInvoice || !reversalReason.trim()) {
            toast({
                title: "Error",
                description: "Please provide a reversal reason",
                variant: "destructive",
            });
            return;
        }



        if (!selectedCustomerBpId || !selectedCustomerCaId) {
            toast({
                title: "Error",
                description: "Missing customer details (BP ID or CA ID)",
                variant: "destructive",
            });
            return;
        }

        if (!customerDetails?.division) {
            toast({
                title: "Error",
                description: "Missing customer division",
                variant: "destructive",
            });
            return;
        }


        const payload = {
            invoiceNo: selectedInvoice.invoiceNo,
            reason: reversalReason.trim(),
            sapBpId: selectedCustomerBpId,
            sapCaId: selectedCustomerCaId,
            salesOrg: currentSalesOrg || "",
            division: customerDetails.division
        };
        reverseInvoiceMutation.mutate(payload);

    };

    const getStatusBadge = (invoice: Invoice) => {
        const unpaid = Math.abs(invoice.unpaidAmount);
        const total = Math.abs(invoice.billAmount);

        if (unpaid === 0) {
            return <Badge variant="default" className="bg-green-100 text-green-800">Fully Paid</Badge>;
        } else if (unpaid < total) {
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>;
        } else {
            return <Badge variant="destructive">Unpaid</Badge>;
        }
    };

    const formatCurrency = (amount: number, currency?: string) => {
        const curr = currency || currentSalesOrg || "";
        let displayCurrency = curr;
        if (displayCurrency === "TZ10") displayCurrency = "TZS";

        try {
            return new Intl.NumberFormat("en-TZ", {
                style: "currency",
                currency: displayCurrency,
                minimumFractionDigits: 0,
            }).format(Math.abs(amount));
        } catch (e) {
            return new Intl.NumberFormat("en-TZ", {
                style: "currency",
                currency: "TZS",
                minimumFractionDigits: 0,
            }).format(Math.abs(amount));
        }
    };

    const invoicesDataToShow = queryResult?.invoices || [];
    const statusMessage = queryResult?.statusMessage || "No invoices found";

    return (
        <div className="p-4 sm:p-6 w-full">
            <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <RotateCcw className="h-6 w-6" />
                            Invoice Reversal
                        </h1>
                        <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
                            Search and reverse posted invoices for customers
                        </p>
                    </div>
                </div>
            </div>

            {/* Customer Selection */}
            {!selectedCustomerBpId ? (
                <Card className="mb-6 border-dashed border-2 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                        <div className="bg-blue-100 p-4 rounded-full mb-2 ring-8 ring-blue-50">
                            <UserSearch className="h-8 w-8 text-azam-blue" />
                        </div>
                        <div className="space-y-1 max-w-md">
                            <h3 className="text-lg font-semibold text-slate-900">Select a Customer</h3>
                            <p className="text-sm text-slate-500">
                                Search for a customer to view their invoices.
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowCustomerSearch(true)}
                            className="bg-azam-blue hover:bg-azam-blue/90 font-medium px-6 mt-2"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            Search Customer
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Selected Customer Display */}
                    <Card className="mb-4">
                        <CardContent className="pt-6">
                            {customerStatus === "loading" ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-azam-blue mr-2" />
                                    <span className="text-muted-foreground">Loading customer details...</span>
                                </div>
                            ) : customerDetails && customerStatus === "valid" ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <UserSearch className="h-5 w-5 text-azam-blue" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Selected Customer</p>
                                                <p className="font-semibold text-azam-blue">{customerDetails.name || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleChangeCustomer}
                                        >
                                            <Filter className="h-4 w-4 mr-2" />
                                            Change Customer
                                        </Button>
                                    </div>

                                    {/* Customer Details in Compact Format */}
                                    <div className="p-4 rounded-xl border border-orange-200 bg-gradient-to-br from-white via-gray-50 to-orange-50 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-base font-bold text-azam-orange tracking-wide">Customer Details</span>
                                        </div>
                                        <div className="px-2 py-3 rounded-lg bg-white/60 border border-orange-100 flex flex-wrap items-center justify-start gap-y-3 gap-x-6">
                                            <div><span className="text-azam-orange font-semibold">Name:</span> {customerDetails.name}</div>
                                            <div><span className="text-azam-orange font-semibold">SAP BP ID:</span> {customerDetails.sapBpId}</div>
                                            {customerDetails.sapCaId && <div><span className="text-azam-orange font-semibold">SAP CA ID:</span> {customerDetails.sapCaId}</div>}
                                            {customerDetails.mobile && <div><span className="text-azam-orange font-semibold">Mobile:</span> {customerDetails.mobile}</div>}
                                            {customerDetails.email && <div><span className="text-azam-orange font-semibold">Email:</span> {customerDetails.email}</div>}
                                            {customerDetails.country && <div><span className="text-azam-orange font-semibold">Country:</span> {customerDetails.country}</div>}
                                            {customerDetails.region && <div><span className="text-azam-orange font-semibold">Region:</span> {customerDetails.region}</div>}
                                            {customerDetails.city && <div><span className="text-azam-orange font-semibold">City:</span> {customerDetails.city}</div>}
                                            {customerDetails.district && <div><span className="text-azam-orange font-semibold">District:</span> {customerDetails.district}</div>}
                                            {customerDetails.ward && <div><span className="text-azam-orange font-semibold">Ward:</span> {customerDetails.ward}</div>}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <UserSearch className="h-5 w-5 text-azam-blue" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Selected Customer</p>
                                            <p className="font-semibold text-azam-blue">SAP BP ID: {selectedCustomerBpId}</p>
                                            {selectedCustomerCaId && (
                                                <p className="text-sm text-muted-foreground">SAP CA ID: {selectedCustomerCaId}</p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleChangeCustomer}
                                    >
                                        <Filter className="h-4 w-4 mr-2" />
                                        Change Customer
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Invoices Table */}
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Customer Invoices ({invoicesDataToShow.length})
                            </CardTitle>
                            <CardDescription>
                                Click the View button to see invoice details and initiate reversal
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {invoicesLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-azam-blue" />
                                    <span className="ml-2 text-muted-foreground">Loading invoices...</span>
                                </div>
                            ) : invoicesError ? (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>
                                        {(invoicesError as any)?.statusMessage || (invoicesError as any)?.message || "An error occurred while fetching invoices"}
                                    </AlertTitle>
                                </Alert>
                            ) : invoicesDataToShow.length === 0 ? (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>{statusMessage}</AlertTitle>
                                </Alert>
                            ) : (
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[140px]">Invoice No</TableHead>
                                                <TableHead>Contract Account</TableHead>
                                                <TableHead>Business Partner</TableHead>
                                                <TableHead>Bill Date</TableHead>
                                                <TableHead>Due Date</TableHead>
                                                <TableHead className="text-right">Bill Amount</TableHead>
                                                <TableHead className="text-right">Unpaid Amount</TableHead>
                                                <TableHead>Created By</TableHead>
                                                <TableHead>Creation Date</TableHead>
                                                {/* <TableHead>Status</TableHead> */}
                                                <TableHead className="text-center">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invoicesDataToShow.map((invoice: Invoice) => (
                                                <TableRow
                                                    key={invoice.invoiceId}
                                                    className={selectedInvoice?.invoiceId === invoice.invoiceId ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                                >
                                                    <TableCell className="font-medium text-azam-blue">
                                                        {invoice.invoiceNo || '-'}
                                                    </TableCell>
                                                    <TableCell>{invoice.contractAccount || '-'}</TableCell>
                                                    <TableCell>{invoice.businessPartner || '-'}</TableCell>
                                                    <TableCell>{formatSAPDate(invoice.billDate) || '-'}</TableCell>
                                                    <TableCell>{formatSAPDate(invoice.dueDate) || '-'}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {invoice.billAmount ? formatCurrency(invoice.billAmount, invoice.currency) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-600 font-medium">
                                                        {invoice.unpaidAmount !== undefined ? formatCurrency(invoice.unpaidAmount, invoice.currency) : '-'}
                                                    </TableCell>
                                                    <TableCell>{invoice.createdBy || '-'}</TableCell>
                                                    <TableCell>{formatSAPDate(invoice.creationDate) || '-'}</TableCell>
                                                    {/* <TableCell>
                                                        {getStatusBadge(invoice)}
                                                    </TableCell> */}
                                                    <TableCell className="text-center">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleSelectInvoice(invoice)}
                                                            className="h-8"
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            View
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Invoice Details Dialog */}
                    <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            {selectedInvoice && (
                                <>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5" />
                                            Invoice Details
                                        </DialogTitle>
                                        <DialogDescription>
                                            Review invoice details and initiate reversal below
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4">
                                        {/* Eligibility Alert */}
                                        <Alert className="border-green-200 bg-green-50">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <AlertTitle className="text-green-800">Invoice Selected</AlertTitle>
                                            <AlertDescription className="text-green-700">
                                                This invoice can be reversed. Total amount: {formatCurrency(selectedInvoice.billAmount, selectedInvoice.currency)}
                                            </AlertDescription>
                                        </Alert>

                                        {/* Invoice Information - Only showing API response fields */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Contract Account</Label>
                                                <p className="font-medium">{selectedInvoice.contractAccount || '-'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                                                <p className="font-medium">{selectedInvoice.invoiceNo || '-'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Business Partner</Label>
                                                <p className="font-medium">{selectedInvoice.businessPartner || '-'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Creation Date</Label>
                                                <p className="font-medium">{formatSAPDate(selectedInvoice.creationDate) || '-'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Creation Time</Label>
                                                <p className="font-medium">{formatSAPTime(selectedInvoice.creationTime) || '-'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Bill Date</Label>
                                                <p className="font-medium">{formatSAPDate(selectedInvoice.billDate) || '-'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Due Date</Label>
                                                <p className="font-medium">{formatSAPDate(selectedInvoice.dueDate) || '-'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Currency</Label>
                                                <p className="font-medium">{selectedInvoice.currency || '-'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Bill Amount</Label>
                                                <p className="font-bold text-azam-blue">
                                                    {selectedInvoice.billAmount ? formatCurrency(selectedInvoice.billAmount, selectedInvoice.currency) : '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Created By</Label>
                                                <p className="font-medium">{selectedInvoice.createdBy || '-'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Unpaid Amount</Label>
                                                <p className="font-medium text-red-600">
                                                    {selectedInvoice.unpaidAmount !== undefined ? formatCurrency(selectedInvoice.unpaidAmount, selectedInvoice.currency) : '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Amount Payable</Label>
                                                <p className="font-medium">
                                                    {selectedInvoice.amountPayable !== undefined ? formatCurrency(selectedInvoice.amountPayable, selectedInvoice.currency) : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Reversal Form */}
                                        <div className="pt-4 border-t">
                                            {!showReversalForm ? (
                                                <Button
                                                    onClick={() => setShowReversalForm(true)}
                                                    variant="destructive"
                                                    className="w-full sm:w-auto"
                                                >
                                                    <RotateCcw className="h-4 w-4 mr-2" />
                                                    Reverse Invoice
                                                </Button>
                                            ) : (
                                                <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200">
                                                    <h3 className="font-semibold text-red-900 dark:text-red-100 flex items-center gap-2">
                                                        <AlertTriangle className="h-5 w-5" />
                                                        Invoice Reversal
                                                    </h3>



                                                    {/* Reversal Reason */}
                                                    <div>
                                                        <Label htmlFor="reversalReason">Reversal Reason *</Label>
                                                        <Textarea
                                                            id="reversalReason"
                                                            placeholder="Please provide a detailed reason for the reversal..."
                                                            value={reversalReason}
                                                            onChange={(e) => setReversalReason(e.target.value)}
                                                            rows={4}
                                                            className="bg-white"
                                                        />
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 flex-wrap">
                                                        <Button
                                                            onClick={handleReverseInvoice}
                                                            variant="destructive"
                                                            disabled={reverseInvoiceMutation.isPending || !reversalReason.trim()}
                                                        >
                                                            {reverseInvoiceMutation.isPending ? (
                                                                <>
                                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                    Processing...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <RotateCcw className="h-4 w-4 mr-2" />
                                                                    Confirm Reversal
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            onClick={() => {
                                                                setShowReversalForm(false);
                                                                setReversalReason("");
                                                            }}
                                                            variant="outline"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </DialogContent>
                    </Dialog>
                </>
            )}

            {/* Customer Search Modal */}
            <CustomerSearchModal
                isOpen={showCustomerSearch}
                onClose={() => setShowCustomerSearch(false)}
                onSelect={handleCustomerSelect}
            />
        </div>
    );
}

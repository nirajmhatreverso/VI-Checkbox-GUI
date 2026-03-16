import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const REASONS = [
  { value: "vat", label: "With VAT" },
  { value: "no_vat", label: "Without VAT" },
];

export default function CreateAdjustmentTab() {
  const [bpId, setBpId] = useState("");
  const [scId, setScId] = useState("");
  const [details, setDetails] = useState<any>(null);
  const [type, setType] = useState("CREDIT");
  const [invoice, setInvoice] = useState("");
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");
  const [amount, setAmount] = useState("");
  const [walletType, setWalletType] = useState("HW");
  const [vatType, setVatType] = useState("vat");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Simulate fetch details
  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetails(null);
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setDetails({
        name: "John Doe",
        accountType: "Agent",
        balance: 120000,
        subscription: "Active",
      });
      setLoading(false);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Adjustment Submitted",
        description: "Adjustment request submitted and pending approval.",
      });
      setLoading(false);
      setBpId(""); setScId(""); setDetails(null); setType("CREDIT");
      setInvoice(""); setReason(""); setComments(""); setAmount(""); setWalletType("HW"); setVatType("vat");
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-2">Agent/Customer BP ID</label>
          <Input value={bpId} onChange={e => setBpId(e.target.value)} placeholder="Enter BP ID" className="w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">SC ID</label>
          <Input value={scId} onChange={e => setScId(e.target.value)} placeholder="Enter SC ID" className="w-full" />
        </div>
      </div>
      <div className="flex mt-4">
        <Button type="button" variant="outline" onClick={handleFetch} disabled={loading || (!bpId && !scId)}>
          {loading ? "Fetching..." : "Fetch Details"}
        </Button>
      </div>
      {details && (
        <div className="bg-gray-50 border rounded-lg p-4 mt-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><b>Name:</b> {details.name}</div>
            <div><b>Account Type:</b> {details.accountType}</div>
            <div><b>Balance:</b> TSH {details.balance.toLocaleString()}</div>
            <div><b>Subscription:</b> {details.subscription}</div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium mb-2">Adjustment Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CREDIT">CREDIT</SelectItem>
              <SelectItem value="DEBIT">DEBIT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Reference Invoice No</label>
          <Input value={invoice} onChange={e => setInvoice(e.target.value)} placeholder="Enter Invoice No" className="w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        <div>
          <label className="block text-sm font-medium mb-2">Adjustment Reason</label>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter Reason" className="w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Comments</label>
          <Input value={comments} onChange={e => setComments(e.target.value)} placeholder="Enter Comments" className="w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        <div>
          <label className="block text-sm font-medium mb-2">Adjustment Amount</label>
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter Amount" className="w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Wallet Type</label>
          <Select value={walletType} onValueChange={setWalletType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HW">Hardware</SelectItem>
              <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        <div>
          <label className="block text-sm font-medium mb-2">Reason Based (VAT/No VAT)</label>
          <Select value={vatType} onValueChange={setVatType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end mt-8">
        <Button type="submit" className="btn-primary px-8" disabled={loading}>
          {loading ? "Submitting..." : "Submit Adjustment"}
        </Button>
      </div>
    </form>
  );
}
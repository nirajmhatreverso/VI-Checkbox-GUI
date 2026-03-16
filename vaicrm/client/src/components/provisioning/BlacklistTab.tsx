import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Monitor, AlertTriangle, Lock, CheckCircle } from "lucide-react";

export default function BlacklistTab() {
  const [scId, setScId] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/provisioning/blacklist-stb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scId, reason }),
      });
      toast({ 
        title: "Device Blacklisted", 
        description: `STB/Smart Card ${scId} has been successfully blacklisted.`,
        duration: 4000
      });
      setScId("");
      setReason("");
    } catch (err) {
      toast({ title: "Error", description: "Failed to blacklist device." });
    }
    setLoading(false);
  };
  return (
    <div className="w-full max-w-full sm:max-w-xl mx-auto mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="text-red-500" size={20} /> Blacklist Device
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSend}>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Target Device
              </label>
              <div className="relative">
                <Input 
                  value={scId} 
                  onChange={e => setScId(e.target.value)} 
                  placeholder="Enter SC/STB ID to blacklist (e.g., STB123456)"
                  required 
                  className="pl-10 w-full" 
                />
                <Monitor className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Smart Card or Set-Top Box identifier to be blacklisted
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Blacklist Reason
              </label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Enter detailed reason for blacklisting this device..."
                required
                rows={4}
                className="resize-none w-full"
              />
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Reason will be logged for audit and compliance purposes</span>
                <span>{reason.length}/500 characters</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  setScId("");
                  setReason("");
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Clear Form
              </Button>
              <Button 
                type="submit" 
                size="xs"
                disabled={loading || !scId || !reason}
                className="bg-azam-blue hover:bg-azam-blue/90 text-white px-8 py-2 transition-colors duration-200 focus-visible:ring-azam-blue/50 disabled:bg-azam-blue disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Blacklist Device
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
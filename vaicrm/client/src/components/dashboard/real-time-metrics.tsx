import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Signal, Globe, Activity } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";

interface RealTimeMetricsProps {
  className?: string;
  onRefresh?: () => void;
}

// Extend Navigator interface for Network Information API
interface NetworkInformation extends EventTarget {
  readonly rtt: number;
  readonly downlink: number;
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  readonly saveData: boolean;
  onchange: EventListener;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

export default function RealTimeMetrics({ className, onRefresh }: RealTimeMetricsProps) {

  const [metrics, setMetrics] = useState({
    networkStatus: "Checking...",
    coverage: 0,
    lastUpdated: new Date(),
    ping: 0,
    isLoading: false
  });

  const checkMetrics = async () => {
    setMetrics(prev => ({ ...prev, isLoading: true }));
    const start = Date.now();

    try {
      // 1. Measure Ping (Real Browser-to-Server Latency)
      await apiRequest("/api/dashboard/system-status", "GET");
      const end = Date.now();
      const ping = end - start;

      // 2. Get Browser Network Info
      const nav = navigator as NavigatorWithConnection;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

      let status = "Excellent";
      let coverage = 100;

      if (connection) {
        // Use effectiveType for Status
        if (connection.effectiveType === '4g') status = "Excellent";
        else if (connection.effectiveType === '3g') status = "Good";
        else if (connection.effectiveType === '2g') status = "Fair";
        else status = "Poor";

        // Use Downlink speed (Mbps) as a proxy for Coverage Strength
        // Assuming > 10Mbps is 100% quality, scaling down from there
        // This gives a "real" metric based on the user's actual bandwidth
        coverage = Math.min(100, Math.round((connection.downlink / 10) * 100));
      } else {
        // Fallback if API not supported: Base it partially on Ping
        if (ping > 150) status = "Good";
        if (ping > 300) status = "Fair";
        if (ping > 500) status = "Poor";
        // Default coverage if unknown
        coverage = 98;
      }

      setMetrics({
        networkStatus: status,
        coverage: coverage,
        lastUpdated: new Date(),
        ping,
        isLoading: false
      });

      if (onRefresh) onRefresh();

    } catch (error) {

      setMetrics(prev => ({
        ...prev,
        networkStatus: "Offline",
        lastUpdated: new Date(),
        isLoading: false
      }));
    }
  };

  useEffect(() => {
    checkMetrics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkMetrics, 30000);

    // Also listen for online/offline events
    window.addEventListener('online', checkMetrics);
    window.addEventListener('offline', checkMetrics);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', checkMetrics);
      window.removeEventListener('offline', checkMetrics);
    };
  }, []);

  const handleRefresh = () => {
    checkMetrics();
  };

  return (
    <Card className={`border-0 shadow-lg bg-gradient-to-r from-azam-blue to-purple-600 text-white ${className}`}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex items-center space-x-2">
              <Signal className="w-5 h-5" />
              <span className="font-medium">Network Status: {metrics.networkStatus}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span className="font-medium">Coverage: {metrics.coverage}%</span>
            </div>

            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span className="font-medium">Ping: {metrics.ping}ms</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hidden sm:inline-flex">
              Last Updated: {new Intl.DateTimeFormat('en-US', {
                timeZone: 'Africa/Dar_es_Salaam',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              }).format(metrics.lastUpdated)}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className={`border-white/30 text-white transition-all ${metrics.isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: '#5418c3' }}
              onMouseOver={e => !metrics.isLoading && (e.currentTarget.style.backgroundColor = '#6a2be6')}
              onMouseOut={e => !metrics.isLoading && (e.currentTarget.style.backgroundColor = '#5418c3')}
              onClick={handleRefresh}
              disabled={metrics.isLoading}
            >
              {metrics.isLoading ? "Refreshing..." : "Refresh Data"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
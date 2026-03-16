import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { dashboardApi } from "@/lib/dashboardApi";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Users, AlertTriangle, CheckCircle, Clock, Lock, ArrowUpRight, ArrowDownRight
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import RealTimeMetrics from "@/components/dashboard/real-time-metrics";
import Announcements from "@/components/dashboard/announcements";
import QuickActions from "@/components/dashboard/quick-actions";
import MyWorkSummary from "@/components/dashboard/my-work-summary";
import MyTasks from "@/components/dashboard/my-tasks";

import { useAuthContext } from "@/context/AuthProvider";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuthContext();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { toast } = useToast();
  const [hasSubsError, setHasSubsError] = useState(false);

  // ✅ INTEGRATION: Validate Token
  useQuery({
    queryKey: ["validateToken"],
    queryFn: () => apiRequest("/auth/validate", "POST"),
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // ✅ INTEGRATION: Fetch Dashboard Subs Count
  const {
    data: subsDataRaw,
    isLoading: subsLoading,
    refetch: refetchSubs,
    isError,
    error
  } = useQuery({
    queryKey: ["dashboardSubsCount", user?.salesOrg, user?.sapBpId],
    queryFn: async () => {
      // Logic moved to dashboardApi service for cleaner config
      return dashboardApi.getSubscriptionCount(user!);
    },
    enabled: !!user && !hasSubsError, // Stop calling once it has failed
    retry: false, // Do not retry on failure as requested
    refetchOnWindowFocus: false, // Do not refetch on window focus
  });

  // Show error popup if API fails and mark it as failed for this session
  useEffect(() => {
    if (isError && !hasSubsError) {
      setHasSubsError(true);
      const apiError = error as any;
      toast({
        title: "Error fetching dashboard data",
        description: apiError?.statusMessage || apiError?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [isError, hasSubsError, toast]);

  const subsData = subsDataRaw?.data || {};
  const isLoading = subsLoading && !hasSubsError; // Hide loading state if an error has occurred
  const refetch = () => {
    if (!hasSubsError) {
      refetchSubs();
    }
  };

  // Map API data to KPI cards (fallback to mock if specific keys missing)
  const kpiData = [
    {
      title: "Total Subscribers",
      value: subsData.total_customer !== undefined ? subsData.total_customer : "0",
      change: "",
      trend: "",
      icon: Users,
      color: "bg-blue-500"
    },
    {
      title: "Active Subscribers",
      value: subsData.active_customer !== undefined ? subsData.active_customer : "0",
      change: "",
      trend: "",
      icon: CheckCircle,
      color: "bg-green-500"
    },
    {
      title: "To Be Expired",
      value: subsData.to_be_expire_count !== undefined ? subsData.to_be_expire_count : "0",
      change: "",
      trend: "",
      icon: Clock,
      color: "bg-purple-500"
    },
    {
      title: "Expired Sub",
      value: subsData.disconnected_count !== undefined ? subsData.disconnected_count : "0",
      change: "",
      trend: "",
      icon: AlertTriangle,
      color: "bg-orange-500"
    },
    {
      title: "Locked Sub",
      value: subsData.lock_count !== undefined ? subsData.lock_count : "0",
      change: "",
      trend: "",
      icon: Lock,
      color: "bg-red-500"
    },
    {
      title: "Terminated Sub",
      value: subsData.terminated_count !== undefined ? subsData.terminated_count : "0",
      change: "",
      trend: "",
      icon: AlertTriangle,
      color: "bg-red-500"
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-6">
        <div className="w-full space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-gray-300 rounded-xl"></div>
              <div className="h-96 bg-gray-300 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 px-6 py-6">
      <div className="w-full space-y-8">
        {/* System Status Footer */}
        <RealTimeMetrics onRefresh={() => refetch()} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {kpiData.map((kpi, index) => {
            const Icon = kpi.icon;
            const TrendIcon = kpi.trend === 'up' ? ArrowUpRight : ArrowDownRight;
            return (
              <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                      {kpi.change && (
                        <div className={`flex items-center space-x-1 text-sm ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                          <TrendIcon className="w-4 h-4" />
                          <span>{kpi.change}</span>
                        </div>
                      )}
                    </div>
                    <div className={`${kpi.color} p-3 rounded-lg shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${kpi.color} opacity-20`}></div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Revenue & Subscription Trends */}
          {/* Announcements Section */}
          <div className="lg:col-span-2 h-full">
            <Announcements />
          </div>

          {/* Quick Actions */}
          <div className="h-full">
            <QuickActions />
          </div>

        </div>

        {/* Secondary Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* My Tasks Section */}
          <div className="h-full">
            <MyTasks />
          </div>

          {/* My Work Section */}
          <div className="h-full">
            <MyWorkSummary />
          </div>

        </div>
      </div>
    </div >
  );
}
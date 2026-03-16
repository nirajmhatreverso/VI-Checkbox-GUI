import { useState } from "react";
import { Bell, Filter, CheckCircle, Trash2, Eye, EyeOff, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { Notification } from "@shared/schema";
import { useBulletins } from "@/hooks/use-bulletin";

// Helper functions
const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical':
      return "border-red-500 bg-red-50";
    case 'high':
      return "border-orange-500 bg-orange-50";
    case 'medium':
      return "border-yellow-500 bg-yellow-50";
    case 'low':
    default:
      return "border-blue-500 bg-blue-50";
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'kyc':
      return "bg-purple-100 text-purple-800";
    case 'agent':
      return "bg-blue-100 text-blue-800";
    case 'inventory':
      return "bg-green-100 text-green-800";
    case 'payment':
      return "bg-yellow-100 text-yellow-800";
    case 'service':
      return "bg-indigo-100 text-indigo-800";
    case 'security':
      return "bg-red-100 text-red-800";
    case 'announcement':
      return "bg-teal-100 text-teal-800";
    case 'system':
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', user?.id, activeTab, typeFilter, priorityFilter],
    queryFn: () => {
      let url = `/api/notifications?userId=${user?.id}`;
      if (activeTab !== 'all') {
        url += `&status=${activeTab}`;
      }
      return fetch(url).then(res => res.json());
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  // Fetch active bulletins (announcements)
  const { data: bulletinData, isLoading: isLoadingBulletins } = useBulletins({
    status: "ACTIVE",
    limit: 50,
    offSet: 0,
  });

  const bulletins = bulletinData?.bulletinDetails || [];

  const lastViewedAnnouncements = localStorage.getItem('lastViewedAnnouncements') || '0';

  const announcementItems = bulletins.map(b => {
    const createdAtTime = new Date(b.createdDate).getTime();
    const isUnread = createdAtTime > parseInt(lastViewedAnnouncements);
    return {
      id: `bulletin-${b.objId}`,
      isBulletin: true,
      title: b.title,
      message: b.bulletinText,
      type: 'announcement',
      priority: 'info',
      status: isUnread ? 'unread' : 'read',
      createdAt: b.createdDate,
      actionUrl: null,
      rawTimestamp: createdAtTime,
    };
  });

  const allNotifications = [
    ...notifications.map(n => ({ ...n, isBulletin: false, rawTimestamp: new Date(n.createdAt).getTime() })),
    ...announcementItems
  ].sort((a, b) => b.rawTimestamp - a.rawTimestamp);

  // Filter notifications based on filters
  const filteredNotifications = allNotifications.filter(notification => {
    if (activeTab === 'unread' && notification.status !== 'unread') return false;
    if (activeTab === 'read' && notification.status !== 'read') return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    if (priorityFilter !== 'all' && notification.priority !== priorityFilter) return false;
    return true;
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/notifications/user/${user?.id}/read-all`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      // Mark announcements as read
      if (bulletins.length > 0) {
        const maxDate = Math.max(...bulletins.map(b => new Date(b.createdDate).getTime()));
        localStorage.setItem('lastViewedAnnouncements', maxDate.toString());
      }
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: number) =>
      fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    if (notification.isBulletin) {
      return;
    }

    if (notification.status === 'unread') {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
    }
  };

  const unreadCount = allNotifications.filter(n => n.status === 'unread').length;
  const readCount = allNotifications.filter(n => n.status === 'read').length;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6 text-azam-blue" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600">
              Stay updated with important system alerts and updates
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="bg-azam-blue hover:bg-azam-blue/90"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{allNotifications.length}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Bell className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <EyeOff className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Read</p>
                <p className="text-2xl font-bold text-green-600">{readCount}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <Eye className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="kyc">KYC</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setTypeFilter('all');
                  setPriorityFilter('all');
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All ({allNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({readCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {(isLoading || isLoadingBulletins) ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-azam-blue border-t-transparent"></div>
              <span className="ml-3 text-gray-600">Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-600">
                  {activeTab === 'all' ? "You don't have any notifications yet." :
                    activeTab === 'unread' ? "All notifications have been read." :
                      "No read notifications found."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification: any) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    "border-l-4",
                    notification.status === 'unread' ? "ring-1 ring-blue-500/20 bg-blue-50/10" : "bg-white",
                    notification.priority === 'critical' ? 'border-l-red-500' :
                      notification.priority === 'high' ? 'border-l-orange-500' :
                        notification.priority === 'medium' ? 'border-l-yellow-500' :
                          notification.type === 'announcement' ? 'border-l-teal-500' : 'border-l-blue-500'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", getTypeColor(notification.type))}
                          >
                            {notification.type.toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs capitalize",
                              notification.priority === 'critical' && "border-red-500 text-red-700",
                              notification.priority === 'high' && "border-orange-500 text-orange-700",
                              notification.priority === 'medium' && "border-yellow-500 text-yellow-700",
                              notification.priority === 'low' && "border-blue-500 text-blue-700"
                            )}
                          >
                            {notification.priority}
                          </Badge>
                          {notification.status === 'unread' && (
                            <Badge className="bg-blue-500 hover:bg-blue-600 text-xs px-1.5 py-0.5">
                              NEW
                            </Badge>
                          )}
                        </div>

                        <h3 className={cn(
                          "text-lg font-semibold text-gray-900 mb-2",
                          notification.status === 'unread' && "font-bold"
                        )}>
                          {notification.title}
                        </h3>

                        <p className="text-gray-700 mb-3 leading-relaxed">
                          {notification.message}
                        </p>

                        <div className="text-sm text-gray-500">
                          <span>{formatTimeAgo(notification.createdAt)}</span>
                          {notification.readAt && (
                            <span className="ml-4">
                              • Read {formatTimeAgo(notification.readAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center ml-4 space-x-2">
                        {!notification.isBulletin && notification.status === 'unread' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                            disabled={markAsReadMutation.isPending}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {!notification.isBulletin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                            disabled={deleteNotificationMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
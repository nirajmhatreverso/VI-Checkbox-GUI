import { useState, useEffect } from "react";
import { Bell, X, Check, Archive, Trash2, Clock, AlertTriangle, Info, CheckCircle, AlertCircle, User, Package, CreditCard, Settings, Shield, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Notification } from "@shared/schema";
import { useBulletins } from "@/hooks/use-bulletin";

interface NotificationCenterProps {
  className?: string;
}

// Helper function to format time
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

// Helper function to get notification icon
const getNotificationIcon = (type: string, priority: string) => {
  const iconClass = "h-4 w-4";

  switch (type) {
    case 'kyc':
    case 'agent':
      return <User className={iconClass} />;
    case 'inventory':
      return <Package className={iconClass} />;
    case 'payment':
      return <CreditCard className={iconClass} />;
    case 'service':
      return <Settings className={iconClass} />;
    case 'security':
      return <Shield className={iconClass} />;
    case 'announcement':
      return <Megaphone className={iconClass} />;
    case 'system':
    default:
      if (priority === 'critical' || priority === 'high') {
        return <AlertTriangle className={iconClass} />;
      }
      return <Info className={iconClass} />;
  }
};

// Helper function to get priority color
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical':
      return "bg-red-500";
    case 'high':
      return "bg-orange-500";
    case 'medium':
      return "bg-yellow-500";
    case 'low':
    default:
      return "bg-blue-500";
  }
};

// Helper function to get type color
const getTypeColor = (type: string) => {
  switch (type) {
    case 'kyc':
      return "text-purple-600";
    case 'agent':
      return "text-blue-600";
    case 'inventory':
      return "text-green-600";
    case 'payment':
      return "text-yellow-600";
    case 'service':
      return "text-indigo-600";
    case 'security':
      return "text-red-600";
    case 'announcement':
      return "text-teal-600";
    case 'system':
    default:
      return "text-gray-600";
  }
};

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', user?.id],
    queryFn: () => fetch(`/api/notifications?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user?.id,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications', user?.id, 'unread-count'],
    queryFn: () => fetch(`/api/notifications/user/${user?.id}/unread-count`).then(res => res.json()),
    enabled: !!user?.id,
    refetchInterval: 15000 // Refetch every 15 seconds
  });

  const apiUnreadCount = unreadCountData?.count || 0;

  // Fetch active bulletins (announcements)
  const { data: bulletinData, isLoading: isLoadingBulletins } = useBulletins({
    status: "ACTIVE",
    limit: 10,
    offSet: 0,
  });

  const bulletins = bulletinData?.bulletinDetails || [];

  const [lastViewedAnnouncements, setLastViewedAnnouncements] = useState<string>(() => {
    return localStorage.getItem('lastViewedAnnouncements') || '0';
  });

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

  const allItems = [
    ...notifications.map(n => ({ ...n, isBulletin: false, rawTimestamp: new Date(n.createdAt).getTime() })),
    ...announcementItems
  ].sort((a, b) => b.rawTimestamp - a.rawTimestamp);

  const unreadAnnouncementsCount = announcementItems.filter(a => a.status === 'unread').length;
  const unreadCount = apiUnreadCount + unreadAnnouncementsCount;

  // Clear unread announcements when dropdown is closed
  useEffect(() => {
    if (!isOpen && bulletins.length > 0) {
      const maxDate = Math.max(...bulletins.map(b => new Date(b.createdDate).getTime()));
      if (maxDate > parseInt(lastViewedAnnouncements)) {
        setLastViewedAnnouncements(maxDate.toString());
        localStorage.setItem('lastViewedAnnouncements', maxDate.toString());
      }
    }
  }, [isOpen, bulletins, lastViewedAnnouncements]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications', user?.id, 'unread-count'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/notifications/user/${user?.id}/read-all`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications', user?.id, 'unread-count'] });
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: number) =>
      fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications', user?.id, 'unread-count'] });
    }
  });

  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    if (notification.isBulletin) {
      setIsOpen(false);
      return;
    }

    if (notification.status === 'unread') {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
      setIsOpen(false);
    }
  };

  // Handle mark as read
  const handleMarkAsRead = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  // Handle delete
  const handleDelete = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
    if (bulletins.length > 0) {
      const maxDate = Math.max(...bulletins.map(b => new Date(b.createdDate).getTime()));
      setLastViewedAnnouncements(maxDate.toString());
      localStorage.setItem('lastViewedAnnouncements', maxDate.toString());
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative text-white hover:bg-azam-header-light p-2 h-8 w-8",
            className
          )}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 flex items-center justify-center p-0 text-[10px] font-medium rounded-full min-w-[14px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-w-[90vw] bg-white shadow-xl border border-gray-200 rounded-lg"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4 text-gray-600" />
            <DropdownMenuLabel className="p-0 font-semibold text-gray-900">
              Notifications
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              disabled={markAllAsReadMutation.isPending}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <Separator />

        {/* Notifications List */}
        <ScrollArea className="max-h-96">
          {(isLoading || isLoadingBulletins) ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600 mx-auto"></div>
              <p className="mt-2 text-sm">Loading notifications...</p>
            </div>
          ) : allItems.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="py-1">
              {allItems.map((notification: any, index: number) => (
                <div key={notification.id}>
                  <DropdownMenuItem
                    className={cn(
                      "p-3 cursor-pointer hover:bg-gray-50 focus:bg-gray-50",
                      notification.status === 'unread' && "bg-blue-50/50 border-l-2 border-l-blue-500"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      {/* Priority indicator and icon */}
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          "p-2 rounded-full bg-gray-100",
                          getTypeColor(notification.type)
                        )}>
                          {getNotificationIcon(notification.type, notification.priority)}
                        </div>
                        <div className={cn(
                          "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
                          getPriorityColor(notification.priority)
                        )} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium text-gray-900 truncate",
                              notification.status === 'unread' && "font-semibold"
                            )}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className="text-xs text-gray-400 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn("text-xs capitalize", getTypeColor(notification.type))}
                              >
                                {notification.type}
                              </Badge>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center ml-2 space-x-1">
                            {!notification.isBulletin && notification.status === 'unread' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleMarkAsRead(e, notification.id)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                disabled={markAsReadMutation.isPending}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            {!notification.isBulletin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDelete(e, notification.id)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                disabled={deleteNotificationMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  {index < allItems.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {allItems.length > 0 && (
          <>
            <Separator />
            <div className="p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLocation('/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-700"
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
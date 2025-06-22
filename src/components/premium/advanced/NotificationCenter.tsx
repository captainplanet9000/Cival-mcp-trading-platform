'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TradingWebSocketClient } from '@/lib/websocket/websocket-client';
import { usePremiumTheme } from '../core/PremiumThemeProvider';

interface Notification {
  id: string;
  type: 'trade' | 'alert' | 'system' | 'agent' | 'risk' | 'market';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionable: boolean;
  metadata?: Record<string, any>;
}

interface NotificationCenterProps {
  notifications: Notification[];
  wsClient?: TradingWebSocketClient;
  enableRealTime?: boolean;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (notificationId: string) => void;
  className?: string;
}

const TYPE_COLORS = {
  trade: 'bg-blue-100 text-blue-800',
  alert: 'bg-red-100 text-red-800',
  system: 'bg-gray-100 text-gray-800',
  agent: 'bg-purple-100 text-purple-800',
  risk: 'bg-orange-100 text-orange-800',
  market: 'bg-green-100 text-green-800',
};

const SEVERITY_COLORS = {
  info: 'border-blue-200',
  warning: 'border-yellow-300',
  error: 'border-red-300',
  success: 'border-green-300',
};

export function NotificationCenter({
  notifications: initialNotifications,
  wsClient,
  enableRealTime = true,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  className,
}: NotificationCenterProps) {
  const { theme } = usePremiumTheme();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | Notification['type']>('all');

  // Real-time notifications
  useEffect(() => {
    if (!enableRealTime || !wsClient) return;

    const unsubscribe = wsClient.on('notification', (message) => {
      const newNotification = message.data as Notification;
      setNotifications(prev => [newNotification, ...prev]);
    });

    return unsubscribe;
  }, [wsClient, enableRealTime]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'all') return true;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    onMarkAsRead?.(notificationId);
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onMarkAllAsRead?.();
  };

  const handleDismiss = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    onDismiss?.(notificationId);
  };

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="px-2 py-1 text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleMarkAllAsRead}>
                Mark All as Read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('all')}>
                Show All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('unread')}>
                Show Unread Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 mt-2">
          {(['all', 'unread', 'trade', 'alert', 'agent', 'risk'] as const).map(filterType => (
            <Button
              key={filterType}
              variant={filter === filterType ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(filterType)}
              className="h-6 px-2 text-xs capitalize"
            >
              {filterType}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="space-y-2 p-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <p className="text-sm">No notifications to show</p>
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:bg-muted/20',
                    SEVERITY_COLORS[notification.severity],
                    !notification.read && 'bg-muted/10',
                    notification.read && 'opacity-75'
                  )}
                  onClick={() => {
                    onNotificationClick?.(notification);
                    if (!notification.read) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn('text-xs', TYPE_COLORS[notification.type])}>
                          {notification.type}
                        </Badge>
                        <Badge 
                          variant={notification.severity === 'error' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {notification.severity}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      
                      <h4 className="font-medium text-sm text-foreground mb-1">
                        {notification.title}
                      </h4>
                      
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {notification.timestamp.toLocaleTimeString()}
                        </span>
                        
                        {notification.actionable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNotificationClick?.(notification);
                            }}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-2 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notification.id);
                      }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Utility function to generate mock notifications
export function generateMockNotifications(): Notification[] {
  const types: Notification['type'][] = ['trade', 'alert', 'system', 'agent', 'risk', 'market'];
  const severities: Notification['severity'][] = ['info', 'warning', 'error', 'success'];
  
  const messages = {
    trade: [
      'Order executed successfully',
      'Large position opened',
      'Stop loss triggered',
      'Take profit hit',
    ],
    alert: [
      'Risk limit exceeded',
      'Unusual market activity detected',
      'Position size warning',
      'Correlation spike alert',
    ],
    system: [
      'System maintenance scheduled',
      'New update available',
      'Connection restored',
      'Backup completed',
    ],
    agent: [
      'Agent started successfully',
      'Agent performance update',
      'Agent stopped unexpectedly',
      'New agent deployed',
    ],
    risk: [
      'VaR limit approached',
      'Drawdown threshold reached',
      'Portfolio rebalancing needed',
      'Risk model updated',
    ],
    market: [
      'Market opened',
      'High volatility detected',
      'News event impact',
      'Market closing soon',
    ],
  };

  return Array.from({ length: 20 }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const typeMessages = messages[type];
    const message = typeMessages[Math.floor(Math.random() * typeMessages.length)];
    
    return {
      id: `notification_${i}`,
      type,
      severity,
      title: message,
      message: `${message}. Additional details about this notification and what actions may be required.`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      read: Math.random() > 0.3,
      actionable: Math.random() > 0.5,
      metadata: {
        source: type,
        priority: severity === 'error' ? 'high' : 'normal',
      },
    };
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
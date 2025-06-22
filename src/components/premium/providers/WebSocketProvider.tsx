'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

// Enhanced WebSocket types
interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  id: string;
}

interface WebSocketSubscription {
  id: string;
  channel: string;
  callback: (data: any) => void;
  filter?: (data: any) => boolean;
}

interface WebSocketStats {
  messagesReceived: number;
  messagesSent: number;
  reconnections: number;
  lastMessageTime: number;
  latency: number;
  bytesReceived: number;
  bytesSent: number;
}

interface WebSocketContextType {
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Subscription management
  subscribe: (channel: string, callback: (data: any) => void, filter?: (data: any) => boolean) => () => void;
  unsubscribe: (subscriptionId: string) => void;
  
  // Message sending
  send: (message: any) => void;
  sendTyped: <T>(type: string, payload: T) => void;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Statistics and monitoring
  stats: WebSocketStats;
  getLatency: () => number;
  isHealthy: () => boolean;
  
  // Advanced features
  enableHeartbeat: (interval?: number) => void;
  disableHeartbeat: () => void;
  setMessageQueue: (enabled: boolean) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
  url: string;
  protocols?: string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  enableAutoReconnect?: boolean;
}

export function WebSocketProvider({
  children,
  url,
  protocols = [],
  reconnectAttempts = 5,
  reconnectInterval = 3000,
  heartbeatInterval = 30000,
  messageQueueSize = 100,
  enableAutoReconnect = true,
}: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [stats, setStats] = useState<WebSocketStats>({
    messagesReceived: 0,
    messagesSent: 0,
    reconnections: 0,
    lastMessageTime: 0,
    latency: 0,
    bytesReceived: 0,
    bytesSent: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Map<string, WebSocketSubscription>>(new Map());
  const messageQueueRef = useRef<any[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const latencyCheckRef = useRef<{ start: number; id: string } | null>(null);
  const reconnectCountRef = useRef(0);

  // Generate unique IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Connection management
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const ws = new WebSocket(url, protocols);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        reconnectCountRef.current = 0;

        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        }

        // Start heartbeat
        enableHeartbeat();
      };

      ws.onmessage = (event) => {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
          lastMessageTime: Date.now(),
          bytesReceived: prev.bytesReceived + event.data.length,
        }));

        // Handle latency check
        if (message.type === 'pong' && latencyCheckRef.current?.id === message.payload?.id) {
          const latency = Date.now() - latencyCheckRef.current.start;
          setStats(prev => ({ ...prev, latency }));
          latencyCheckRef.current = null;
        }

        // Notify subscribers
        subscriptionsRef.current.forEach((subscription) => {
          if (subscription.channel === message.type || subscription.channel === '*') {
            if (!subscription.filter || subscription.filter(message.payload)) {
              subscription.callback(message.payload);
            }
          }
        });
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        
        if (!event.wasClean && enableAutoReconnect && reconnectCountRef.current < reconnectAttempts) {
          setConnectionError(`Connection lost. Reconnecting... (${reconnectCountRef.current + 1}/${reconnectAttempts})`);
          reconnectCountRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setStats(prev => ({ ...prev, reconnections: prev.reconnections + 1 }));
            connect();
          }, reconnectInterval);
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          setConnectionError('Connection failed. Maximum reconnection attempts reached.');
        }
      };

      ws.onerror = (error) => {
        setConnectionError('WebSocket connection error');
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      setIsConnecting(false);
      setConnectionError('Failed to create WebSocket connection');
      console.error('WebSocket creation error:', error);
    }
  }, [url, protocols, reconnectAttempts, reconnectInterval, enableAutoReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    disableHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    reconnectCountRef.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Message sending
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(message);
      wsRef.current.send(messageString);
      setStats(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + 1,
        bytesSent: prev.bytesSent + messageString.length,
      }));
    } else {
      // Queue message if not connected
      if (messageQueueRef.current.length < messageQueueSize) {
        messageQueueRef.current.push(message);
      }
    }
  }, [messageQueueSize]);

  const sendTyped = useCallback(<T,>(type: string, payload: T) => {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
      id: generateId(),
    };
    send(message);
  }, [send]);

  // Subscription management
  const subscribe = useCallback((
    channel: string, 
    callback: (data: any) => void,
    filter?: (data: any) => boolean
  ) => {
    const subscriptionId = generateId();
    const subscription: WebSocketSubscription = {
      id: subscriptionId,
      channel,
      callback,
      filter,
    };
    
    subscriptionsRef.current.set(subscriptionId, subscription);
    
    // Return unsubscribe function
    return () => {
      subscriptionsRef.current.delete(subscriptionId);
    };
  }, []);

  const unsubscribe = useCallback((subscriptionId: string) => {
    subscriptionsRef.current.delete(subscriptionId);
  }, []);

  // Heartbeat functionality
  const enableHeartbeat = useCallback((interval: number = heartbeatInterval) => {
    disableHeartbeat(); // Clear existing heartbeat
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const id = generateId();
        latencyCheckRef.current = { start: Date.now(), id };
        sendTyped('ping', { id, timestamp: Date.now() });
      }
    }, interval);
  }, [heartbeatInterval, sendTyped]);

  const disableHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  // Utility functions
  const getLatency = useCallback(() => stats.latency, [stats.latency]);
  
  const isHealthy = useCallback(() => {
    const now = Date.now();
    const timeSinceLastMessage = now - stats.lastMessageTime;
    return isConnected && timeSinceLastMessage < heartbeatInterval * 2;
  }, [isConnected, stats.lastMessageTime, heartbeatInterval]);

  const setMessageQueue = useCallback((enabled: boolean) => {
    if (!enabled) {
      messageQueueRef.current = [];
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disableHeartbeat();
    };
  }, [disableHeartbeat]);

  const value: WebSocketContextType = {
    isConnected,
    isConnecting,
    connectionError,
    subscribe,
    unsubscribe,
    send,
    sendTyped,
    connect,
    disconnect,
    reconnect,
    stats,
    getLatency,
    isHealthy,
    enableHeartbeat,
    disableHeartbeat,
    setMessageQueue,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Convenience hooks for specific data types
export function useTradingData() {
  const ws = useWebSocket();
  const [trades, setTrades] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribeTrades = ws.subscribe('trades', (data) => {
      setTrades(prev => [data, ...prev.slice(0, 999)]); // Keep last 1000 trades
    });

    const unsubscribeOrders = ws.subscribe('orders', (data) => {
      setOrders(prev => {
        const index = prev.findIndex(order => order.id === data.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [data, ...prev];
      });
    });

    const unsubscribePositions = ws.subscribe('positions', (data) => {
      setPositions(prev => {
        const index = prev.findIndex(pos => pos.symbol === data.symbol);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [data, ...prev];
      });
    });

    return () => {
      unsubscribeTrades();
      unsubscribeOrders();
      unsubscribePositions();
    };
  }, [ws]);

  return { trades, orders, positions };
}

export function useMarketData(symbols: string[] = []) {
  const ws = useWebSocket();
  const [marketData, setMarketData] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsubscribe = ws.subscribe('market_data', (data) => {
      if (symbols.length === 0 || symbols.includes(data.symbol)) {
        setMarketData(prev => ({
          ...prev,
          [data.symbol]: data,
        }));
      }
    });

    // Subscribe to specific symbols
    symbols.forEach(symbol => {
      ws.sendTyped('subscribe', { channel: 'market_data', symbol });
    });

    return () => {
      unsubscribe();
      // Unsubscribe from symbols
      symbols.forEach(symbol => {
        ws.sendTyped('unsubscribe', { channel: 'market_data', symbol });
      });
    };
  }, [ws, symbols]);

  return marketData;
}
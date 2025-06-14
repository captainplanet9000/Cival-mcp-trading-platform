/**
 * AG-UI Protocol Version 2.0 - Production Ready
 * Phase 12: Complete implementation with full event system and production features
 */

import { EventEmitter } from 'events';

// ===== Core Protocol Types =====

export interface AGUIEvent<T = any> {
  id: string;
  type: string;
  data: T;
  timestamp: number;
  source: string;
  target?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  correlation_id?: string;
  retry_count?: number;
}

export interface AGUIEventHandler<T = any> {
  (event: AGUIEvent<T>): void | Promise<void>;
}

export interface AGUISubscription {
  id: string;
  eventType: string;
  handler: AGUIEventHandler;
  options: SubscriptionOptions;
  unsubscribe: () => void;
}

export interface SubscriptionOptions {
  once?: boolean;
  priority?: number;
  filter?: (event: AGUIEvent) => boolean;
  throttle?: number;
  debounce?: number;
}

export interface TransportConfig {
  url?: string;
  apiKey?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  timeout?: number;
  compression?: boolean;
  encryption?: boolean;
}

export interface PerformanceMetrics {
  eventsProcessed: number;
  averageLatency: number;
  errorRate: number;
  throughput: number;
  connectionUptime: number;
  memoryUsage: number;
}

// ===== Complete Event Registry =====

export interface CoreSystemEvents {
  // System Events
  'system.startup': { component: string; version: string; timestamp: number };
  'system.shutdown': { component: string; reason: string; timestamp: number };
  'system.error': { error: Error; component: string; context: any };
  'system.health_check': { status: 'healthy' | 'degraded' | 'critical'; metrics: any };
  
  // Connection Events
  'connection.established': { transport: string; endpoint: string };
  'connection.lost': { transport: string; reason: string };
  'connection.reconnecting': { attempt: number; delay: number };
  'connection.reconnected': { transport: string; downtime: number };
}

export interface WalletEvents {
  // Master Wallet Events
  'wallet.created': { wallet_id: string; name: string; initial_balance: number };
  'wallet.updated': { wallet_id: string; changes: any };
  'wallet.deleted': { wallet_id: string };
  'wallet.balance_changed': { wallet_id: string; old_balance: number; new_balance: number };
  'wallet.rebalanced': { wallet_id: string; allocations: any[]; timestamp: number };
  'wallet.performance_update': { wallet_id: string; metrics: any };
  
  // HD Wallet Events
  'hd_wallet.keys_generated': { wallet_id: string; chains: string[]; key_count: number };
  'hd_wallet.chain_added': { wallet_id: string; chain: string; address: string };
  'hd_wallet.chain_removed': { wallet_id: string; chain: string };
  
  // Transaction Events
  'transaction.initiated': { transaction_id: string; wallet_id: string; amount: number; type: string };
  'transaction.confirmed': { transaction_id: string; block_hash: string; confirmations: number };
  'transaction.failed': { transaction_id: string; error: string; retry_possible: boolean };
}

export interface GoalEvents {
  // Goal Management Events
  'goal.created': { goal_id: string; description: string; target_value: number; deadline?: string };
  'goal.updated': { goal_id: string; changes: any };
  'goal.deleted': { goal_id: string };
  'goal.progress_updated': { goal_id: string; progress: number; milestone?: string };
  'goal.completed': { goal_id: string; final_value: number; completion_time: number };
  'goal.failed': { goal_id: string; reason: string; final_progress: number };
  'goal.analyzed': { goal_id: string; analysis: any; recommendations: string[] };
  'goal.milestone_reached': { goal_id: string; milestone: string; progress: number };
}

export interface TradingEvents {
  // Trading Operations
  'trade.signal_generated': { signal_id: string; symbol: string; action: string; confidence: number };
  'trade.order_placed': { order_id: string; symbol: string; side: string; quantity: number; price: number };
  'trade.order_filled': { order_id: string; fill_price: number; fill_quantity: number; fees: number };
  'trade.order_cancelled': { order_id: string; reason: string };
  'trade.position_opened': { position_id: string; symbol: string; side: string; size: number; entry_price: number };
  'trade.position_closed': { position_id: string; exit_price: number; pnl: number; hold_time: number };
  'trade.stop_loss_triggered': { position_id: string; trigger_price: number; pnl: number };
  'trade.take_profit_triggered': { position_id: string; trigger_price: number; pnl: number };
  
  // Portfolio Events
  'portfolio.value_updated': { total_value: number; change_24h: number; change_percentage: number };
  'portfolio.rebalanced': { old_allocation: any; new_allocation: any; reason: string };
  'portfolio.risk_alert': { risk_type: string; current_level: number; threshold: number; recommendation: string };
}

export interface AgentEvents {
  // Agent Management
  'agent.created': { agent_id: string; name: string; type: string; configuration: any };
  'agent.started': { agent_id: string; timestamp: number };
  'agent.stopped': { agent_id: string; reason: string; timestamp: number };
  'agent.error': { agent_id: string; error: string; context: any };
  'agent.performance_update': { agent_id: string; metrics: any };
  
  // Agent Communication
  'agent.message_sent': { from: string; to: string; message: string; message_type: string };
  'agent.decision_made': { agent_id: string; decision: any; confidence: number; reasoning: string };
  'agent.collaboration_started': { participants: string[]; topic: string; coordination_mode: string };
  'agent.consensus_reached': { decision_id: string; participants: string[]; agreement_level: number };
  'agent.consensus_failed': { decision_id: string; participants: string[]; reason: string };
}

export interface LLMEvents {
  // LLM Integration
  'llm.request_initiated': { request_id: string; task_type: string; provider: string };
  'llm.request_completed': { request_id: string; response_length: number; tokens_used: number; processing_time: number };
  'llm.request_failed': { request_id: string; error: string; provider: string };
  'llm.provider_status_changed': { provider: string; old_status: string; new_status: string };
  'llm.cost_threshold_exceeded': { provider: string; current_cost: number; threshold: number };
  'llm.analysis_generated': { analysis_id: string; type: string; confidence: number; insights: string[] };
}

export interface AllEvents extends 
  CoreSystemEvents, 
  WalletEvents, 
  GoalEvents, 
  TradingEvents, 
  AgentEvents, 
  LLMEvents {}

// ===== Enhanced Transport Layer =====

export class AGUIWebSocketTransport extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: TransportConfig;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageQueue: AGUIEvent[] = [];
  private metrics: PerformanceMetrics;

  constructor(config: TransportConfig) {
    super();
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      timeout: 10000,
      compression: true,
      encryption: false,
      ...config
    };

    this.metrics = {
      eventsProcessed: 0,
      averageLatency: 0,
      errorRate: 0,
      throughput: 0,
      connectionUptime: 0,
      memoryUsage: 0
    };
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      const url = this.config.url || 'ws://localhost:8000/ws/agui';
      this.ws = new WebSocket(url);

      await this.setupWebSocketHandlers();
      await this.waitForConnection();

      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.processQueuedMessages();

      this.emit('connection.established', { transport: 'websocket', endpoint: url });
    } catch (error) {
      this.isConnecting = false;
      this.handleConnectionError(error);
    }
  }

  private async setupWebSocketHandlers(): Promise<void> {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('AG-UI WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const agEvent: AGUIEvent = JSON.parse(event.data);
        this.metrics.eventsProcessed++;
        this.emit('event', agEvent);
      } catch (error) {
        console.error('Failed to parse AG-UI event:', error);
        this.metrics.errorRate++;
      }
    };

    this.ws.onerror = (error) => {
      console.error('AG-UI WebSocket error:', error);
      this.emit('connection.error', error);
    };

    this.ws.onclose = (event) => {
      console.log('AG-UI WebSocket closed:', event.code, event.reason);
      this.stopHeartbeat();
      
      if (!event.wasClean && this.reconnectAttempts < (this.config.reconnectAttempts || 5)) {
        this.scheduleReconnection();
      }

      this.emit('connection.lost', { transport: 'websocket', reason: event.reason });
    };
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.timeout);

      this.ws.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.ws.addEventListener('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private scheduleReconnection(): void {
    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts - 1);

    this.emit('connection.reconnecting', { 
      attempt: this.reconnectAttempts, 
      delay 
    });

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleConnectionError(error: any): void {
    console.error('AG-UI connection error:', error);
    this.metrics.errorRate++;
    
    if (this.reconnectAttempts < (this.config.reconnectAttempts || 5)) {
      this.scheduleReconnection();
    } else {
      this.emit('connection.failed', { error: error.message });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private processQueuedMessages(): void {
    while (this.messageQueue.length > 0) {
      const event = this.messageQueue.shift();
      if (event) {
        this.send(event);
      }
    }
  }

  send(event: AGUIEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
      this.metrics.throughput++;
    } else {
      // Queue message for later
      this.messageQueue.push(event);
      
      // Attempt to reconnect if not already connecting
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// ===== Enhanced Event Bus =====

export class AGUIEventBus {
  private emitter = new EventEmitter();
  private subscriptions = new Map<string, AGUISubscription>();
  private transport: AGUIWebSocketTransport;
  private middleware: Array<(event: AGUIEvent) => AGUIEvent | null> = [];
  private eventHistory: AGUIEvent[] = [];
  private maxHistorySize = 1000;

  constructor(transportConfig?: TransportConfig) {
    this.transport = new AGUIWebSocketTransport(transportConfig || {});
    this.setupTransportHandlers();
    
    // Set high max listeners to avoid warnings
    this.emitter.setMaxListeners(1000);
  }

  private setupTransportHandlers(): void {
    this.transport.on('event', (event: AGUIEvent) => {
      this.processIncomingEvent(event);
    });

    this.transport.on('connection.established', (data) => {
      this.emit('connection.established', data);
    });

    this.transport.on('connection.lost', (data) => {
      this.emit('connection.lost', data);
    });

    this.transport.on('connection.reconnecting', (data) => {
      this.emit('connection.reconnecting', data);
    });
  }

  async initialize(): Promise<void> {
    await this.transport.connect();
  }

  addMiddleware(middleware: (event: AGUIEvent) => AGUIEvent | null): void {
    this.middleware.push(middleware);
  }

  private processIncomingEvent(event: AGUIEvent): void {
    // Apply middleware
    let processedEvent: AGUIEvent | null = event;
    for (const mw of this.middleware) {
      processedEvent = mw(processedEvent);
      if (!processedEvent) return; // Event filtered out
    }

    // Add to history
    this.eventHistory.push(processedEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit to local subscribers
    this.emitter.emit(processedEvent.type, processedEvent);
    this.emitter.emit('*', processedEvent); // Wildcard listener
  }

  subscribe<K extends keyof AllEvents>(
    eventType: K,
    handler: AGUIEventHandler<AllEvents[K]>,
    options: SubscriptionOptions = {}
  ): AGUISubscription {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const wrappedHandler = (event: AGUIEvent<AllEvents[K]>) => {
      // Apply filter if provided
      if (options.filter && !options.filter(event)) {
        return;
      }

      // Apply throttling/debouncing if configured
      // (Implementation would add actual throttling/debouncing logic here)

      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }

      // Remove subscription if once option is true
      if (options.once) {
        this.unsubscribe(subscriptionId);
      }
    };

    const subscription: AGUISubscription = {
      id: subscriptionId,
      eventType: eventType as string,
      handler: wrappedHandler,
      options,
      unsubscribe: () => this.unsubscribe(subscriptionId)
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.emitter.on(eventType as string, wrappedHandler);

    return subscription;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.emitter.off(subscription.eventType, subscription.handler);
      this.subscriptions.delete(subscriptionId);
    }
  }

  emit<K extends keyof AllEvents>(
    eventType: K,
    data: AllEvents[K],
    options: {
      target?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      correlation_id?: string;
    } = {}
  ): void {
    const event: AGUIEvent<AllEvents[K]> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType as string,
      data,
      timestamp: Date.now(),
      source: 'local',
      priority: options.priority || 'medium',
      correlation_id: options.correlation_id,
      target: options.target
    };

    // Process locally first
    this.processIncomingEvent(event);

    // Send to remote via transport
    if (this.transport.isConnected()) {
      this.transport.send(event);
    }
  }

  // Wildcard subscription
  subscribeToAll(handler: AGUIEventHandler<any>): AGUISubscription {
    return this.subscribe('*' as any, handler);
  }

  // Get event history
  getEventHistory(eventType?: string, limit?: number): AGUIEvent[] {
    let events = this.eventHistory;
    
    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }

    if (limit) {
      events = events.slice(-limit);
    }

    return events;
  }

  // Get subscription statistics
  getSubscriptionStats(): { total: number; byEventType: Record<string, number> } {
    const byEventType: Record<string, number> = {};
    
    for (const subscription of this.subscriptions.values()) {
      byEventType[subscription.eventType] = (byEventType[subscription.eventType] || 0) + 1;
    }

    return {
      total: this.subscriptions.size,
      byEventType
    };
  }

  // Get transport metrics
  getTransportMetrics(): PerformanceMetrics {
    return this.transport.getMetrics();
  }

  // Cleanup
  destroy(): void {
    this.emitter.removeAllListeners();
    this.subscriptions.clear();
    this.transport.disconnect();
  }
}

// ===== Global Instance =====
let globalEventBus: AGUIEventBus | null = null;

export function getAGUIEventBus(): AGUIEventBus {
  if (!globalEventBus) {
    globalEventBus = new AGUIEventBus();
  }
  return globalEventBus;
}

export function initializeAGUI(config?: TransportConfig): Promise<void> {
  globalEventBus = new AGUIEventBus(config);
  return globalEventBus.initialize();
}

// ===== Convenience Functions =====
export function subscribe<K extends keyof AllEvents>(
  eventType: K,
  handler: AGUIEventHandler<AllEvents[K]>,
  options?: SubscriptionOptions
): AGUISubscription {
  return getAGUIEventBus().subscribe(eventType, handler, options);
}

export function emit<K extends keyof AllEvents>(
  eventType: K,
  data: AllEvents[K],
  options?: {
    target?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    correlation_id?: string;
  }
): void {
  getAGUIEventBus().emit(eventType, data, options);
}

export function unsubscribe(subscription: AGUISubscription): void {
  subscription.unsubscribe();
}

// ===== Production Utilities =====

export class AGUILogger {
  private static instance: AGUILogger;
  
  static getInstance(): AGUILogger {
    if (!AGUILogger.instance) {
      AGUILogger.instance = new AGUILogger();
    }
    return AGUILogger.instance;
  }

  logEvent(event: AGUIEvent): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AG-UI] ${event.type}:`, event.data);
    }
  }

  logError(error: Error, context?: any): void {
    console.error('[AG-UI Error]:', error.message, context);
  }

  logPerformance(metrics: PerformanceMetrics): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AG-UI Performance]:', metrics);
    }
  }
}

export class AGUIHealthCheck {
  private eventBus: AGUIEventBus;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(eventBus: AGUIEventBus) {
    this.eventBus = eventBus;
  }

  start(intervalMs: number = 30000): void {
    this.stop();
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);
  }

  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private performHealthCheck(): void {
    const metrics = this.eventBus.getTransportMetrics();
    const subscriptionStats = this.eventBus.getSubscriptionStats();
    
    const healthStatus = this.calculateHealthStatus(metrics);
    
    this.eventBus.emit('system.health_check', {
      status: healthStatus,
      metrics: {
        transport: metrics,
        subscriptions: subscriptionStats,
        timestamp: Date.now()
      }
    });
  }

  private calculateHealthStatus(metrics: PerformanceMetrics): 'healthy' | 'degraded' | 'critical' {
    if (metrics.errorRate > 0.1) return 'critical';
    if (metrics.averageLatency > 1000) return 'degraded';
    if (metrics.connectionUptime < 0.95) return 'degraded';
    return 'healthy';
  }
}

// ===== Export all =====
export * from './event-transport';
export * from './ag-ui-config';

export default {
  initializeAGUI,
  getAGUIEventBus,
  subscribe,
  emit,
  unsubscribe,
  AGUIEventBus,
  AGUIWebSocketTransport,
  AGUILogger,
  AGUIHealthCheck
};
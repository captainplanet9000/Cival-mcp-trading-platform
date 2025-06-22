/**
 * Component-Specific API Types and Endpoints
 * Extensions for the 8 custom trading components
 */

// Chart API Types
export interface TechnicalIndicator {
  name: string;
  type: 'overlay' | 'oscillator';
  parameters: Record<string, any>;
  enabled: boolean;
  color?: string;
}

export interface ChartData {
  symbol: string;
  timeframe: string;
  data: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  indicators?: Array<{
    name: string;
    data: number[];
  }>;
}

export interface ChartRequest {
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  start_time?: string;
  end_time?: string;
  indicators?: string[];
}

// Calendar API Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  type: 'market' | 'strategy' | 'agent' | 'custom';
  agent_id?: string;
  strategy_id?: string;
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly';
    interval: number;
    end_date?: string;
  };
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventRequest {
  title: string;
  description?: string;
  start: string;
  end: string;
  type: 'market' | 'strategy' | 'agent' | 'custom';
  agent_id?: string;
  strategy_id?: string;
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly';
    interval: number;
    end_date?: string;
  };
  metadata?: Record<string, any>;
}

// Upload API Types
export interface UploadResponse {
  file_id: string;
  filename: string;
  url: string;
  size: number;
  content_type: string;
  upload_time: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: {
    extracted_text?: string;
    image_dimensions?: { width: number; height: number };
    document_type?: string;
  };
}

export interface UploadRequest {
  file: File;
  category: 'document' | 'image' | 'data' | 'strategy';
  description?: string;
  tags?: string[];
}

// Agent Communication API Types
export interface MentionableAgent {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'busy';
  avatar?: string;
  description?: string;
  capabilities: string[];
  last_active: string;
}

export interface Conversation {
  id: string;
  title?: string;
  participants: string[];
  created_at: string;
  updated_at: string;
  last_message?: {
    content: string;
    sender_id: string;
    timestamp: string;
  };
  message_count: number;
  unread_count: number;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  mentions: string[];
  attachments?: Array<{
    type: 'file' | 'image' | 'link';
    url: string;
    name: string;
  }>;
  timestamp: string;
  edited_at?: string;
  reactions?: Array<{
    emoji: string;
    user_ids: string[];
  }>;
}

export interface MessageRequest {
  conversation_id: string;
  content: string;
  mentions?: string[];
  attachments?: Array<{
    type: 'file' | 'image' | 'link';
    url: string;
    name: string;
  }>;
}

// Form API Types
export interface FormSchema {
  id: string;
  name: string;
  description?: string;
  schema: any; // Zod schema serialized
  form_type: 'strategy' | 'agent' | 'risk' | 'general';
  version: string;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  schema_id: string;
  form_type: string;
  data: Record<string, any>;
  validation_status: 'valid' | 'invalid' | 'pending';
  validation_errors?: Record<string, string[]>;
  submitted_by: string;
  submitted_at: string;
  processed_at?: string;
  result?: {
    success: boolean;
    message?: string;
    data?: any;
  };
}

export interface FormValidationRequest {
  schema_id: string;
  data: Record<string, any>;
}

// Button Action API Types
export interface TradingAction {
  id: string;
  action: 'buy' | 'sell' | 'close' | 'hedge';
  symbol: string;
  amount?: number;
  price?: number;
  order_type?: 'market' | 'limit' | 'stop';
  confirmation_required: boolean;
  risk_level: 'low' | 'medium' | 'high';
  estimated_fees?: number;
  estimated_impact?: number;
  metadata?: Record<string, any>;
}

export interface TradingActionRequest {
  action: 'buy' | 'sell' | 'close' | 'hedge';
  symbol: string;
  amount?: number;
  price?: number;
  order_type?: 'market' | 'limit' | 'stop';
  force_execution?: boolean;
}

export interface TradingActionResponse {
  action_id: string;
  status: 'pending' | 'confirmed' | 'executed' | 'failed';
  order_id?: string;
  execution_price?: number;
  fees?: number;
  message?: string;
  timestamp: string;
}

// Component API Endpoints Interface
export interface ComponentApiEndpoints {
  // Chart endpoints
  getChartData: (request: ChartRequest) => Promise<ChartData>;
  getTechnicalIndicators: (symbol: string) => Promise<TechnicalIndicator[]>;
  updateChartSettings: (symbol: string, settings: any) => Promise<void>;
  
  // Calendar endpoints
  getCalendarEvents: (start?: string, end?: string) => Promise<CalendarEvent[]>;
  createCalendarEvent: (event: CalendarEventRequest) => Promise<CalendarEvent>;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEventRequest>) => Promise<CalendarEvent>;
  deleteCalendarEvent: (id: string) => Promise<void>;
  
  // Upload endpoints
  uploadFile: (request: UploadRequest) => Promise<UploadResponse>;
  getUploadStatus: (fileId: string) => Promise<UploadResponse>;
  deleteUpload: (fileId: string) => Promise<void>;
  getUploads: (category?: string) => Promise<UploadResponse[]>;
  
  // Communication endpoints
  getMentionableAgents: () => Promise<MentionableAgent[]>;
  getConversations: () => Promise<Conversation[]>;
  getConversation: (id: string) => Promise<Conversation>;
  createConversation: (participants: string[], title?: string) => Promise<Conversation>;
  sendMessage: (request: MessageRequest) => Promise<Message>;
  getMessages: (conversationId: string, limit?: number, offset?: number) => Promise<Message[]>;
  
  // Form endpoints
  getFormSchemas: (type?: string) => Promise<FormSchema[]>;
  getFormSchema: (id: string) => Promise<FormSchema>;
  validateForm: (request: FormValidationRequest) => Promise<{ valid: boolean; errors?: Record<string, string[]> }>;
  submitForm: (schemaId: string, data: Record<string, any>) => Promise<FormSubmission>;
  
  // Trading action endpoints
  validateTradingAction: (request: TradingActionRequest) => Promise<TradingAction>;
  executeTradingAction: (actionId: string) => Promise<TradingActionResponse>;
  getTradingActions: (status?: string) => Promise<TradingAction[]>;
}
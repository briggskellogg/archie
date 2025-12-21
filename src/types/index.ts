// Agent types
export type AgentType = 'instinct' | 'logic' | 'psyche';

export type ResponseType = 'primary' | 'addition' | 'rebuttal' | 'debate';

export interface AgentConfig {
  id: AgentType;
  name: string;
  color: string;
  softColor: string;
  description: string;
  avatar: string;
}

// Message types
export type MessageRole = 'user' | 'system' | AgentType;

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  responseType?: ResponseType;
  referencesMessageId?: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// Agent response from backend
export interface AgentResponse {
  agent: string;
  content: string;
  response_type: string;
  references_message_id?: string;
}

// Weight change notification
export interface WeightChangeNotification {
  message: string;
  old_dominant: string;
  new_dominant: string;
  change_type: 'shift' | 'major_shift' | 'minor';
}

// Send message result
export interface SendMessageResult {
  responses: AgentResponse[];
  debate_mode: 'mild' | 'intense' | null;
  weight_change: WeightChangeNotification | null;
}

// User profile
export interface UserProfile {
  id: number;
  apiKey: string | null;
  anthropicKey: string | null;
  instinctWeight: number;
  logicWeight: number;
  psycheWeight: number;
  totalMessages: number;
  createdAt: Date;
  updatedAt: Date;
}

// Conversation
export interface Conversation {
  id: string;
  title: string | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// User context (learned facts)
export interface UserContext {
  id: number;
  key: string;
  value: string;
  confidence: number;
  sourceAgent: string | null;
  updatedAt: Date;
}

// Debate mode
export type DebateMode = 'mild' | 'intense' | null;


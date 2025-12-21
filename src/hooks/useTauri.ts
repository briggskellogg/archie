import { invoke } from '@tauri-apps/api/core';
import { UserProfile, Message, Conversation, UserContext, SendMessageResult, AgentType } from '../types';

// Initialize app
export async function initApp(): Promise<void> {
  await invoke('init_app');
}

// User profile
export async function getUserProfile(): Promise<UserProfile> {
  const profile = await invoke<{
    id: number;
    api_key: string | null;
    anthropic_key: string | null;
    instinct_weight: number;
    logic_weight: number;
    psyche_weight: number;
    total_messages: number;
    created_at: string;
    updated_at: string;
  }>('get_user_profile');
  
  return {
    id: profile.id,
    apiKey: profile.api_key,
    anthropicKey: profile.anthropic_key,
    instinctWeight: profile.instinct_weight,
    logicWeight: profile.logic_weight,
    psycheWeight: profile.psyche_weight,
    totalMessages: profile.total_messages,
    createdAt: new Date(profile.created_at),
    updatedAt: new Date(profile.updated_at),
  };
}

// API key
export async function validateAndSaveApiKey(apiKey: string): Promise<boolean> {
  return invoke<boolean>('validate_and_save_api_key', { apiKey });
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await invoke('save_api_key', { apiKey });
}

export async function removeApiKey(): Promise<void> {
  await invoke('remove_api_key');
}

// Anthropic API key
export async function saveAnthropicKey(apiKey: string): Promise<void> {
  await invoke('save_anthropic_key', { apiKey });
}

export async function removeAnthropicKey(): Promise<void> {
  await invoke('remove_anthropic_key');
}

// Conversations
export async function createConversation(): Promise<Conversation> {
  const conv = await invoke<{
    id: string;
    title: string | null;
    summary: string | null;
    created_at: string;
    updated_at: string;
  }>('create_conversation');
  
  return {
    id: conv.id,
    title: conv.title,
    summary: conv.summary,
    createdAt: new Date(conv.created_at),
    updatedAt: new Date(conv.updated_at),
  };
}

export async function getRecentConversations(limit: number): Promise<Conversation[]> {
  const convs = await invoke<{
    id: string;
    title: string | null;
    summary: string | null;
    created_at: string;
    updated_at: string;
  }[]>('get_recent_conversations', { limit });
  
  return convs.map(c => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
  }));
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const messages = await invoke<{
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    response_type: string | null;
    references_message_id: string | null;
    timestamp: string;
  }[]>('get_conversation_messages', { conversationId });
  
  return messages.map(m => ({
    id: m.id,
    conversationId: m.conversation_id,
    role: m.role as Message['role'],
    content: m.content,
    responseType: m.response_type as Message['responseType'],
    referencesMessageId: m.references_message_id || undefined,
    timestamp: new Date(m.timestamp),
  }));
}

export async function clearConversation(conversationId: string): Promise<void> {
  await invoke('clear_conversation', { conversationId });
}

// Conversation opener result
export interface ConversationOpenerResult {
  agent: string;
  content: string;
}

// Conversation opener
export async function getConversationOpener(): Promise<ConversationOpenerResult> {
  return invoke<ConversationOpenerResult>('get_conversation_opener');
}

// Send message
export async function sendMessage(
  conversationId: string,
  userMessage: string,
  activeAgents: AgentType[]
): Promise<SendMessageResult> {
  return invoke<SendMessageResult>('send_message', {
    conversationId,
    userMessage,
    activeAgents,
  });
}

// User context
export async function getUserContext(): Promise<UserContext[]> {
  const contexts = await invoke<{
    id: number;
    key: string;
    value: string;
    confidence: number;
    source_agent: string | null;
    updated_at: string;
  }[]>('get_user_context');
  
  return contexts.map(c => ({
    id: c.id,
    key: c.key,
    value: c.value,
    confidence: c.confidence,
    sourceAgent: c.source_agent,
    updatedAt: new Date(c.updated_at),
  }));
}

export async function clearUserContext(): Promise<void> {
  await invoke('clear_user_context');
}

// ============ Memory System ============

export interface FactInfo {
  category: string;
  key: string;
  value: string;
  confidence: number;
}

export interface PatternInfo {
  patternType: string;
  description: string;
  confidence: number;
}

export interface MemoryStats {
  factCount: number;
  patternCount: number;
  themeCount: number;
  topFacts: FactInfo[];
  topPatterns: PatternInfo[];
  topThemes: string[];
}

export async function getMemoryStats(): Promise<MemoryStats> {
  const stats = await invoke<{
    fact_count: number;
    pattern_count: number;
    theme_count: number;
    top_facts: { category: string; key: string; value: string; confidence: number }[];
    top_patterns: { pattern_type: string; description: string; confidence: number }[];
    top_themes: string[];
  }>('get_memory_stats');
  
  return {
    factCount: stats.fact_count,
    patternCount: stats.pattern_count,
    themeCount: stats.theme_count,
    topFacts: stats.top_facts.map(f => ({
      category: f.category,
      key: f.key,
      value: f.value,
      confidence: f.confidence,
    })),
    topPatterns: stats.top_patterns.map(p => ({
      patternType: p.pattern_type,
      description: p.description,
      confidence: p.confidence,
    })),
    topThemes: stats.top_themes,
  };
}

export async function getUserProfileSummary(): Promise<string> {
  return invoke<string>('get_user_profile_summary');
}

// Reset
export async function resetAllData(): Promise<void> {
  await invoke('reset_all_data');
}

// Window controls
export async function setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
  await invoke('set_always_on_top', { alwaysOnTop });
}


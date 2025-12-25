import { invoke } from '@tauri-apps/api/core';
import { UserProfile, Message, Conversation, UserContext, SendMessageResult, AgentType } from '../types';

// App initialization result
export interface InitResult {
  status: 'ready' | 'recovery_needed';
  recoveredCount: number;
}

// Initialize app - returns info about any conversations needing recovery
export async function initApp(): Promise<InitResult> {
  const result = await invoke<{
    status: string;
    recovered_count: number;
  }>('init_app');
  
  return {
    status: result.status as 'ready' | 'recovery_needed',
    recoveredCount: result.recovered_count,
  };
}

// Recover and finalize any orphaned conversations from crashes/force-quits
export async function recoverConversations(): Promise<number> {
  return invoke<number>('recover_conversations');
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

// Note: Multi-profile system removed in v2.0. Single user profile is now used.

// Conversations
export async function createConversation(isDisco: boolean = false): Promise<Conversation> {
  const conv = await invoke<{
    id: string;
    title: string | null;
    summary: string | null;
    is_disco: boolean;
    created_at: string;
    updated_at: string;
  }>('create_conversation', { isDisco });
  
  return {
    id: conv.id,
    title: conv.title,
    summary: conv.summary,
    isDisco: conv.is_disco,
    createdAt: new Date(conv.created_at),
    updatedAt: new Date(conv.updated_at),
  };
}

export async function getRecentConversations(limit: number): Promise<Conversation[]> {
  const convs = await invoke<{
    id: string;
    title: string | null;
    summary: string | null;
    is_disco: boolean;
    created_at: string;
    updated_at: string;
  }[]>('get_recent_conversations', { limit });
  
  return convs.map(c => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    isDisco: c.is_disco,
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

export async function finalizeConversation(conversationId: string): Promise<void> {
  await invoke('finalize_conversation', { conversationId });
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
  activeAgents: AgentType[],
  discoAgents: AgentType[] = []
): Promise<SendMessageResult> {
  return invoke<SendMessageResult>('send_message', {
    conversationId,
    userMessage,
    activeAgents,
    discoAgents,
  });
}

// V2.0: Governor-Centric Message Types

export interface ThoughtResult {
  agent: string;      // "instinct", "logic", "psyche"
  name: string;       // Display name: "Snap", "Swarm", etc.
  content: string;    // The thought content
  is_disco: boolean;  // Whether disco mode was used
  round?: number;     // Which round of thought (0 = initial, 1+ = debate rounds)
}

export interface SendMessageResultV2 {
  thoughts: ThoughtResult[];
  synthesis: string;
  weight_change: {
    message: string;
    old_dominant: string;
    new_dominant: string;
    change_type: string;
  } | null;
}

// V2.0: Governor-Centric Message Processing
export async function sendMessageV2(
  conversationId: string,
  userMessage: string,
  activeAgents: AgentType[],
  discoAgents: AgentType[] = []
): Promise<SendMessageResultV2> {
  return invoke<SendMessageResultV2>('send_message_v2', {
    conversationId,
    userMessage,
    activeAgents,
    discoAgents,
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
  // Derived convenience fields for ReportModal
  patterns: string[];
  themes: string[];
  uniqueConversations: number;
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
  
  const topPatterns = stats.top_patterns.map(p => ({
      patternType: p.pattern_type,
      description: p.description,
      confidence: p.confidence,
    }));
    
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
    topPatterns,
    topThemes: stats.top_themes,
    // Derived convenience fields
    patterns: topPatterns.map(p => p.description),
    themes: stats.top_themes,
    uniqueConversations: stats.fact_count > 0 ? Math.ceil(stats.fact_count / 3) : 0, // Estimate
  };
}

export async function getUserProfileSummary(): Promise<string> {
  return invoke<string>('get_user_profile_summary');
}

// Governor Report (LLM-generated from knowledge base)
export async function generateGovernorReport(profileId?: string): Promise<string> {
  return invoke<string>('generate_governor_report', { profileId: profileId || null });
}

// 3-Sentence User Summary
export async function generateUserSummary(): Promise<string> {
  return invoke<string>('generate_user_summary');
}

// Reset
export async function resetAllData(): Promise<void> {
  await invoke('reset_all_data');
}

// Window controls
export async function setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
  await invoke('set_always_on_top', { alwaysOnTop });
}


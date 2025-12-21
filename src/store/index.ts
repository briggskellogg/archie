import { create } from 'zustand';
import { Message, UserProfile, Conversation, AgentType, DebateMode } from '../types';

interface AgentToggleState {
  instinct: boolean;
  logic: boolean;
  psyche: boolean;
}

interface AppState {
  // User profile
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  
  // Current conversation
  currentConversation: Conversation | null;
  setCurrentConversation: (conv: Conversation | null) => void;
  
  // Messages
  messages: Message[];
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  
  // Agent toggles
  activeAgents: AgentToggleState;
  toggleAgent: (agent: AgentType) => void;
  getActiveAgentsList: () => AgentType[];
  
  // Debate mode
  debateMode: DebateMode;
  setDebateMode: (mode: DebateMode) => void;
  
  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  thinkingAgent: AgentType | 'system' | null;
  setThinkingAgent: (agent: AgentType | 'system' | null) => void;
  thinkingPhase: 'routing' | 'thinking';
  setThinkingPhase: (phase: 'routing' | 'thinking') => void;
  
  // Error
  error: string | null;
  setError: (error: string | null) => void;
  apiConnectionError: string | null;
  setApiConnectionError: (error: string | null) => void;
  
  // Settings
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  
  // Floating mode
  isFloatingMode: boolean;
  setFloatingMode: (floating: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // User profile
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),
  
  // Current conversation
  currentConversation: null,
  setCurrentConversation: (conv) => set({ currentConversation: conv }),
  
  // Messages
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [] }),
  
  // Agent toggles
  activeAgents: {
    instinct: true,
    logic: true,
    psyche: true,
  },
  toggleAgent: (agent) => set((state) => {
    const currentActive = Object.values(state.activeAgents).filter(Boolean).length;
    const isTogglingOff = state.activeAgents[agent];
    
    // Prevent disabling last agent
    if (isTogglingOff && currentActive <= 1) {
      return state;
    }
    
    return {
      activeAgents: {
        ...state.activeAgents,
        [agent]: !state.activeAgents[agent],
      },
    };
  }),
  getActiveAgentsList: () => {
    const state = get();
    const agents: AgentType[] = [];
    if (state.activeAgents.instinct) agents.push('instinct');
    if (state.activeAgents.logic) agents.push('logic');
    if (state.activeAgents.psyche) agents.push('psyche');
    return agents;
  },
  
  // Debate mode
  debateMode: null,
  setDebateMode: (mode) => set({ debateMode: mode }),
  
  // Loading
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  thinkingAgent: null,
  setThinkingAgent: (agent) => set({ thinkingAgent: agent }),
  thinkingPhase: 'routing' as const,
  setThinkingPhase: (phase) => set({ thinkingPhase: phase }),
  
  // Error
  error: null,
  setError: (error) => set({ error }),
  apiConnectionError: null,
  setApiConnectionError: (apiConnectionError) => set({ apiConnectionError }),
  
  // Settings
  isSettingsOpen: false,
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  
  // Floating mode
  isFloatingMode: false,
  setFloatingMode: (isFloatingMode) => set({ isFloatingMode }),
}));

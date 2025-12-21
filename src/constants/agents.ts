import { AgentConfig, AgentType } from '../types';

// Import agent avatars (for agent messages)
import instinctAvatar from '../assets/agents/instinct-incarnate.png';
import logicAvatar from '../assets/agents/logic-incarnate.png';
import psycheAvatar from '../assets/agents/psyche-incarnate.png';

// Import user profile photos (for user messages - based on highest weight)
import instinctProfile from '../assets/agents/instinct.png';
import logicProfile from '../assets/agents/logic.png';
import psycheProfile from '../assets/agents/psyche.png';

// Import Governor avatar (for system messages)
import governorAvatar from '../assets/governor.png';

export const AGENTS: Record<AgentType, AgentConfig> = {
  instinct: {
    id: 'instinct',
    name: 'Snap',
    color: '#E07A5F',
    softColor: '#E07A5F15',
    description: 'Gut feelings, intuition, emotional intelligence, pattern recognition',
    avatar: instinctAvatar,
  },
  logic: {
    id: 'logic',
    name: 'Dot',
    color: '#6BB8C9',
    softColor: '#6BB8C915',
    description: 'Analytical thinking, structured reasoning, evidence-based conclusions',
    avatar: logicAvatar,
  },
  psyche: {
    id: 'psyche',
    name: 'Puff',
    color: '#A78BCA',
    softColor: '#A78BCA15',
    description: 'Self-awareness, emotional depth, motivations, the "why" behind the "what"',
    avatar: psycheAvatar,
  },
};

// User profile photos based on dominant agent
export const USER_PROFILES: Record<AgentType, string> = {
  instinct: instinctProfile,
  logic: logicProfile,
  psyche: psycheProfile,
};

export const AGENT_ORDER: AgentType[] = ['psyche', 'logic', 'instinct'];

// Governor - system agent for admin/error messages
export const GOVERNOR = {
  id: 'system',
  name: 'Governor',
  color: '#94A3B8', // Slate gray
  softColor: '#94A3B815',
  description: 'System administrator and guide',
  avatar: governorAvatar,
};


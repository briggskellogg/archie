import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Info, RotateCcw, ExternalLink, AlertTriangle, FileText, BadgeCheck, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store';
import { AGENTS, USER_PROFILES } from '../constants/agents';
import { resetAllData, getUserProfile } from '../hooks/useTauri';
import { ApiKeyModal } from './ApiKeyModal';
import bekLogo from '../assets/BEK.png';
import governorImage from '../assets/governor.png';
import governorTransparent from '../assets/governor-transparent.png';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestReport?: () => void;
  activeAgentCount?: number;
}

// Radar chart component for agent weights with profile pictures
function RadarChart({ weights }: { weights: { instinct: number; logic: number; psyche: number } }) {
  const size = 280;
  const center = size / 2;
  const radius = 85; // Slightly larger for better visual impact
  
  // Weight range: 20% minimum, 60% maximum
  const MIN_WEIGHT = 0.20;
  const MAX_WEIGHT = 0.60;
  
  // Normalize weight from [0.20, 0.60] to [0.25, 1.0] for chart display
  // This exaggerates differences: 20% -> 25% of radius, 60% -> 100% of radius
  const normalizeWeight = (weight: number) => {
    const clamped = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, weight));
    const normalized = (clamped - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT); // 0 to 1
    return 0.25 + normalized * 0.75; // Map to 0.25-1.0 range
  };
  
  // Image sizes scale with weight
  const minImageSize = 52;
  const maxImageSize = 72;
  
  const getImageSize = (weight: number) => {
    const clamped = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, weight));
    const normalized = (clamped - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT);
    return minImageSize + normalized * (maxImageSize - minImageSize);
  };
  
  // Calculate points for each agent (3 points, 120 degrees apart)
  const angles = {
    logic: -90,      // Top
    psyche: 150,     // Bottom right  
    instinct: 30,    // Bottom left
  };
  
  const getPoint = (agent: 'instinct' | 'logic' | 'psyche', scale: number) => {
    const angle = (angles[agent] * Math.PI) / 180;
    const r = radius * scale;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };
  
  // Label positions (outside the chart) - more space for larger images
  const getLabelPoint = (agent: 'instinct' | 'logic' | 'psyche') => {
    const angle = (angles[agent] * Math.PI) / 180;
    const r = radius + 60;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };
  
  // Background rings at 33%, 66%, 100%
  const rings = [0.33, 0.66, 1];
  
  // Normalize weights for chart display
  const normalizedWeights = {
    instinct: normalizeWeight(weights.instinct),
    logic: normalizeWeight(weights.logic),
    psyche: normalizeWeight(weights.psyche),
  };
  
  // Data points using normalized weights
  const instinctPoint = getPoint('instinct', normalizedWeights.instinct);
  const logicPoint = getPoint('logic', normalizedWeights.logic);
  const psychePoint = getPoint('psyche', normalizedWeights.psyche);
  
  const dataPath = `M ${logicPoint.x} ${logicPoint.y} L ${psychePoint.x} ${psychePoint.y} L ${instinctPoint.x} ${instinctPoint.y} Z`;
  
  const agents = [
    { id: 'logic' as const, point: logicPoint, label: getLabelPoint('logic'), weight: weights.logic },
    { id: 'psyche' as const, point: psychePoint, label: getLabelPoint('psyche'), weight: weights.psyche },
    { id: 'instinct' as const, point: instinctPoint, label: getLabelPoint('instinct'), weight: weights.instinct },
  ];
  
  return (
    <div className="relative" style={{ width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} className="absolute inset-0">
        {/* Background rings */}
        {rings.map((ring, i) => {
          const points = ['instinct', 'logic', 'psyche'].map(agent => 
            getPoint(agent as 'instinct' | 'logic' | 'psyche', ring)
          );
          return (
            <polygon
              key={i}
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="var(--color-smoke)"
              strokeWidth={0.5}
              opacity={0.4}
            />
          );
        })}
        
        {/* Axis lines */}
        {(['instinct', 'logic', 'psyche'] as const).map(agent => {
          const point = getPoint(agent, 1);
          return (
            <line
              key={agent}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="var(--color-smoke)"
              strokeWidth={0.5}
              opacity={0.25}
            />
          );
        })}
        
        {/* Data area */}
        <motion.path
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          d={dataPath}
          fill="url(#radarGradient)"
          stroke="url(#radarStroke)"
          strokeWidth={2}
          opacity={0.85}
        />
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={AGENTS.instinct.color} stopOpacity={0.15} />
            <stop offset="50%" stopColor={AGENTS.logic.color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={AGENTS.psyche.color} stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={AGENTS.instinct.color} />
            <stop offset="50%" stopColor={AGENTS.logic.color} />
            <stop offset="100%" stopColor={AGENTS.psyche.color} />
          </linearGradient>
        </defs>
        
        {/* Data point dots */}
        {agents.map(({ id, point }, i) => (
          <motion.circle
            key={id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
            cx={point.x}
            cy={point.y}
            r={3}
            fill={AGENTS[id].color}
            stroke="var(--color-obsidian)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      
      {/* Profile pictures at corners - size scales with weight */}
      {agents.map(({ id, label, weight }) => {
        const typeLabels = { instinct: 'Instinct', logic: 'Logic', psyche: 'Psyche' };
        const imgSize = getImageSize(weight);
        // Check if this is the dominant trait
        const isDominant = weight === Math.max(weights.instinct, weights.logic, weights.psyche);
        
        return (
          <div
            key={id}
            className="absolute flex flex-col items-center transition-all duration-300 group"
            style={{
              left: label.x - imgSize / 2,
              top: label.y - imgSize / 2 - 8,
            }}
          >
            <div className="relative">
              <div
                className={`rounded-full overflow-hidden border-2 transition-all duration-300 ${isDominant ? 'ring-2 ring-offset-2 ring-offset-obsidian' : ''}`}
                style={{
                  width: imgSize,
                  height: imgSize,
                  borderColor: AGENTS[id].color,
                  boxShadow: `0 0 ${8 + weight * 8}px ${AGENTS[id].color}${Math.round(40 + weight * 30).toString(16)}`,
                  // @ts-expect-error Tailwind CSS variable
                  '--tw-ring-color': isDominant ? AGENTS[id].color : 'transparent',
                }}
              >
                <img
                  src={USER_PROFILES[id]}
                  alt={AGENTS[id].name}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Dominant trait badge */}
              {isDominant && (
                <div 
                  className="absolute top-0 right-0 w-5 h-5 rounded-full flex items-center justify-center shadow-lg z-20"
                  style={{ backgroundColor: AGENTS[id].color }}
                >
                  <BadgeCheck className="w-4 h-4 text-obsidian" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <span 
              className="text-xs font-mono mt-1"
              style={{ color: AGENTS[id].color }}
            >
              {Math.round(weight * 100)}%
            </span>
            <span 
              className="text-[10px] font-mono opacity-60"
              style={{ color: AGENTS[id].color }}
            >
              {typeLabels[id]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Format date like "18 December 2025"
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// 16 Personality Types mapped to Logic/Instinct/Psyche combinations
// Based on 16personalities.com framework:
// - Analysts (Logic-dominant): INTJ, INTP, ENTJ, ENTP
// - Diplomats (Instinct-dominant): INFJ, INFP, ENFJ, ENFP  
// - Sentinels (Psyche-dominant): ISTJ, ISFJ, ESTJ, ESFJ
// - Explorers (Mixed): ISTP, ISFP, ESTP, ESFP
const PERSONALITY_TYPES = {
  // Logic dominant (Analysts)
  'logic-pure': { code: 'INTP', name: 'The Logician', desc: 'Innovative inventor with an unquenchable thirst for knowledge.' },
  'logic-instinct': { code: 'ENTP', name: 'The Debater', desc: 'Smart and curious thinker who thrives on intellectual challenges.' },
  'logic-psyche': { code: 'INTJ', name: 'The Architect', desc: 'Imaginative strategist with a plan for everything.' },
  'logic-balanced': { code: 'ENTJ', name: 'The Commander', desc: 'Bold leader who finds or makes a way.' },
  
  // Instinct dominant (Diplomats)
  'instinct-pure': { code: 'INFP', name: 'The Mediator', desc: 'Poetic and idealistic, seeking good in all situations.' },
  'instinct-logic': { code: 'ENFJ', name: 'The Protagonist', desc: 'Charismatic leader who inspires others.' },
  'instinct-psyche': { code: 'INFJ', name: 'The Advocate', desc: 'Quiet visionary with an inner fire.' },
  'instinct-balanced': { code: 'ENFP', name: 'The Campaigner', desc: 'Enthusiastic free spirit who finds joy in connections.' },
  
  // Psyche dominant (Sentinels)
  'psyche-pure': { code: 'ISFJ', name: 'The Defender', desc: 'Dedicated protector, warm and caring.' },
  'psyche-logic': { code: 'ISTJ', name: 'The Logistician', desc: 'Practical and reliable, devoted to tradition.' },
  'psyche-instinct': { code: 'ESFJ', name: 'The Consul', desc: 'Caring and social, eager to help.' },
  'psyche-balanced': { code: 'ESTJ', name: 'The Executive', desc: 'Excellent administrator who manages things and people.' },
  
  // Mixed/Explorer types
  'mixed-logic-instinct': { code: 'ESTP', name: 'The Entrepreneur', desc: 'Smart, energetic, perceptive, and action-oriented.' },
  'mixed-instinct-psyche': { code: 'ESFP', name: 'The Entertainer', desc: 'Spontaneous and energetic, life is never dull around you.' },
  'mixed-logic-psyche': { code: 'ISTP', name: 'The Virtuoso', desc: 'Bold experimenter, master of tools.' },
  'balanced': { code: 'ISFP', name: 'The Adventurer', desc: 'Flexible artist, ready to explore and experience.' },
};

function getPersonalityType(weights: { instinct: number; logic: number; psyche: number }): { code: string; name: string; desc: string; key: string } {
  const { instinct, logic, psyche } = weights;
  
  const sorted = [
    { id: 'logic', weight: logic },
    { id: 'instinct', weight: instinct },
    { id: 'psyche', weight: psyche },
  ].sort((a, b) => b.weight - a.weight);
  
  const dominant = sorted[0];
  const secondary = sorted[1];
  const tertiary = sorted[2];
  
  const dominantWeight = dominant.weight;
  const secondaryWeight = secondary.weight;
  const tertiaryWeight = tertiary.weight;
  
  // Check for balanced (all within 10% of each other)
  if (Math.abs(dominantWeight - tertiaryWeight) < 0.10) {
    return { ...PERSONALITY_TYPES['balanced'], key: 'balanced' };
  }
  
  // Check for mixed (top two are close, third is clearly lower)
  if (Math.abs(dominantWeight - secondaryWeight) < 0.08 && (secondaryWeight - tertiaryWeight) > 0.10) {
    const mixKey = `mixed-${[dominant.id, secondary.id].sort().join('-')}` as keyof typeof PERSONALITY_TYPES;
    if (PERSONALITY_TYPES[mixKey]) {
      return { ...PERSONALITY_TYPES[mixKey], key: mixKey };
    }
  }
  
  // Dominant with secondary influence
  if ((dominantWeight - secondaryWeight) < 0.12) {
    const key = `${dominant.id}-${secondary.id}` as keyof typeof PERSONALITY_TYPES;
    if (PERSONALITY_TYPES[key]) {
      return { ...PERSONALITY_TYPES[key], key };
    }
  }
  
  // Dominant with balanced others
  if ((secondaryWeight - tertiaryWeight) < 0.08) {
    const key = `${dominant.id}-balanced` as keyof typeof PERSONALITY_TYPES;
    if (PERSONALITY_TYPES[key]) {
      return { ...PERSONALITY_TYPES[key], key };
    }
  }
  
  // Pure dominant
  const pureKey = `${dominant.id}-pure` as keyof typeof PERSONALITY_TYPES;
  return { ...PERSONALITY_TYPES[pureKey], key: pureKey };
}

// Generate user profile description based on weights
function getProfileDescription(weights: { instinct: number; logic: number; psyche: number }, totalMessages: number): { 
  title: string; 
  code: string;
  description: string; 
  forming: string;
  confidence: number;
} {
  const personality = getPersonalityType(weights);
  
  // Confidence builds over 100 messages
  const confidence = Math.min(100, Math.round((totalMessages / 100) * 100));
  
  // How weights are forming
  let forming = '';
  if (totalMessages < 10) {
    forming = `${confidence}% confident · Still learning your patterns...`;
  } else if (totalMessages < 50) {
    forming = `${confidence}% confident · Your profile is taking shape.`;
  } else if (totalMessages < 100) {
    forming = `${confidence}% confident · Almost there, keep chatting.`;
  } else {
    forming = `Profile established · Continues to evolve with you.`;
  }
  
  return { 
    title: personality.name, 
    code: personality.code,
    description: personality.desc, 
    forming,
    confidence,
  };
}

export function Settings({ isOpen, onClose, onRequestReport, activeAgentCount = 3 }: SettingsProps) {
  const { userProfile, clearMessages, setCurrentConversation, setUserProfile, apiConnectionError } = useAppStore();
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showGovernorDetails, setShowGovernorDetails] = useState(false);
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFullReset = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      clearMessages();
      setCurrentConversation(null);
      // Set profile to null to trigger API key modal
      setUserProfile(null);
      onClose();
      // Reload the page to reset state
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-void/80 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-2 top-2 w-[480px] max-h-[calc(100vh-16px)] bg-obsidian/98 backdrop-blur-xl border border-smoke/40 rounded-2xl z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-smoke/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="font-sans text-base text-ivory font-medium">Profile</h2>
                {/* Connection status */}
                {userProfile?.apiKey && !apiConnectionError && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-emerald-500/80 font-mono">Connected</span>
                  </span>
                )}
                {apiConnectionError && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] text-red-400/80 font-mono">Error</span>
                  </span>
                )}
                {/* API key edit button */}
                <button
                  onClick={() => setShowApiModal(true)}
                  className="p-1 rounded text-ash/60 hover:text-pearl hover:bg-smoke/30 transition-colors cursor-pointer"
                  title="Change API Key"
                >
                  <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono text-ash bg-smoke/30 hover:bg-smoke/50 border border-smoke/50 transition-colors cursor-pointer"
                >
                  ESC
                </button>
              </div>
            </div>

            <div className="p-4 space-y-5 flex-1 overflow-y-auto">
              {/* Governor Card - Compact with expandable details */}
              <section className="relative overflow-hidden rounded-xl border border-smoke/30 bg-gradient-to-br from-charcoal/60 to-obsidian/60">
                <div className="p-3">
                  {/* Header with status - always visible */}
                  <div className="flex items-center gap-3">
                    <img 
                      src={governorImage} 
                      alt="Governor" 
                      className="w-9 h-9 rounded-lg flex-shrink-0"
                      style={{ 
                        boxShadow: activeAgentCount > 1 
                          ? '0 0 0 2px rgba(16, 185, 129, 0.4), 0 0 12px rgba(16, 185, 129, 0.2)'
                          : '0 0 0 1px rgba(100, 100, 100, 0.3)',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-sans font-medium text-pearl">Governor</span>
                        {activeAgentCount > 1 ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-mono text-emerald-400">Routing</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-ash/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-ash/40" />
                            <span className="text-[9px] font-mono text-ash/60">Direct</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-ash/50 font-mono truncate">
                        {activeAgentCount > 1 ? 'Multi-agent orchestration active' : 'Single-agent mode'}
                      </p>
                    </div>
                    {/* Report button */}
                    {onRequestReport && (
                      <button
                        onClick={() => {
                          onClose();
                          onRequestReport();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-ash bg-smoke/30 hover:bg-aurora/20 hover:text-aurora border border-smoke/40 transition-colors cursor-pointer flex-shrink-0"
                        title="Get Governor Report"
                      >
                        <FileText className="w-3 h-3" strokeWidth={1.5} />
                        Report
                      </button>
                    )}
                    {/* Expand/collapse button */}
                    <button
                      onClick={() => setShowGovernorDetails(!showGovernorDetails)}
                      className="p-1.5 rounded-lg hover:bg-smoke/20 text-ash/50 hover:text-pearl transition-all cursor-pointer flex-shrink-0"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 transition-transform duration-200 ${showGovernorDetails ? 'rotate-180' : ''}`} 
                        strokeWidth={1.5} 
                      />
                    </button>
                  </div>
                  
                  {/* Expandable details */}
                  <AnimatePresence>
                    {showGovernorDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 mt-3 border-t border-smoke/20">
                          <p className="text-[11px] text-ash/60 font-mono leading-relaxed mb-2">
                            Orchestrates agent turn-taking and prevents cognitive overload for both human and machine — ensuring balanced, coherent conversations. Also manages your personalized knowledge-base.
                          </p>
                          <a 
                            href="https://chuck-nbc.fandom.com/wiki/The_Governor"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-aurora/60 hover:text-aurora font-mono transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-2.5 h-2.5" strokeWidth={1.5} />
                            Reference: The Governor in Chuck
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* Agent weights - Radar chart */}
              {userProfile && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-ash font-mono">
                      {formatDate(userProfile.createdAt)}
                    </span>
                    <span className="text-xs text-ash font-mono">{userProfile.totalMessages} messages</span>
                  </div>
                  
                  <div 
                    className="rounded-xl pt-6 pb-3 px-4 border border-smoke/30 relative overflow-hidden"
                    style={{
                      // Dynamic gradient based on INVERTED weights (lower = more dominant)
                      // Colors: Logic #00D4FF, Psyche #E040FB, Instinct #EF4444
                      background: (() => {
                        const logicInv = 1 - userProfile.logicWeight;
                        const psycheInv = 1 - userProfile.psycheWeight;
                        const instinctInv = 1 - userProfile.instinctWeight;
                        const total = logicInv + psycheInv + instinctInv;
                        const l = (logicInv / total) * 0.12;
                        const p = (psycheInv / total) * 0.12;
                        const i = (instinctInv / total) * 0.12;
                        return `linear-gradient(135deg, 
                          rgba(0, 212, 255, ${l.toFixed(3)}) 0%,
                          rgba(224, 64, 251, ${p.toFixed(3)}) 50%,
                          rgba(239, 68, 68, ${i.toFixed(3)}) 100%
                        )`;
                      })(),
                    }}
                  >
                    {/* Info tooltip in top left */}
                    <div 
                      className="absolute top-2 left-2 z-20 p-1.5 rounded-lg text-ash/40 hover:text-ash transition-colors group cursor-help"
                      title="Evolves based on your interactions"
                    >
                      <Info className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {/* Tooltip on hover */}
                      <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-charcoal border border-smoke/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        <span className="text-[10px] text-ash font-mono">Evolves based on your interactions</span>
                      </div>
                    </div>
                    
                    {/* Reset button in top right */}
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="absolute top-2 right-2 z-20 p-1.5 rounded-lg text-ash/40 hover:text-instinct hover:bg-instinct/10 transition-colors cursor-pointer"
                      title="Reset all data"
                    >
                      <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    
                    {/* Subtle radial overlay for depth */}
                    <div 
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: (() => {
                          const logicInv = 1 - userProfile.logicWeight;
                          const psycheInv = 1 - userProfile.psycheWeight;
                          const instinctInv = 1 - userProfile.instinctWeight;
                          const total = logicInv + psycheInv + instinctInv;
                          const l = (logicInv / total) * 0.15;
                          const p = (psycheInv / total) * 0.15;
                          const i = (instinctInv / total) * 0.15;
                          return `
                            radial-gradient(circle at 50% 10%, rgba(0, 212, 255, ${l.toFixed(3)}) 0%, transparent 50%),
                            radial-gradient(circle at 20% 80%, rgba(224, 64, 251, ${p.toFixed(3)}) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(239, 68, 68, ${i.toFixed(3)}) 0%, transparent 50%)
                          `;
                        })(),
                      }}
                    />
                    <div className="relative z-10 pt-8">
                      <RadarChart 
                        weights={{
                          instinct: userProfile.instinctWeight,
                          logic: userProfile.logicWeight,
                          psyche: userProfile.psycheWeight,
                        }} 
                      />
                    </div>
                    
                    {/* Profile description */}
                    {(() => {
                      const profile = getProfileDescription(
                        { instinct: userProfile.instinctWeight, logic: userProfile.logicWeight, psyche: userProfile.psycheWeight },
                        userProfile.totalMessages
                      );
                      return (
                        <div className="relative z-10 mt-4 pt-3 border-t border-smoke/20">
                          {/* Personality type header */}
                          <div className="text-center mb-2">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <span 
                                className="text-sm font-sans font-medium"
                                style={{
                                  background: 'linear-gradient(90deg, #00D4FF, #E040FB)',
                                  backgroundClip: 'text',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                }}
                              >
                                {profile.title}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-silver font-mono text-center leading-relaxed mb-2">
                            {profile.description}
                          </p>
                          
                          {/* Confidence bar */}
                          <div className="mb-3">
                            <div className="h-1 bg-smoke/30 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${profile.confidence}%`,
                                  background: profile.confidence >= 100 
                                    ? 'linear-gradient(90deg, #00D4FF, #E040FB)'
                                    : 'rgba(148, 163, 184, 0.5)',
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-ash/60 font-mono text-center mt-1">
                              {profile.forming}
                            </p>
                          </div>
                          
                          {/* 16personalities credit */}
                          <a 
                            href="https://www.16personalities.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 text-[9px] text-ash/40 hover:text-ash/70 font-mono transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5" strokeWidth={1.5} />
                            Inspired by 16personalities.com
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                </section>
              )}

            </div>



            {/* Footer - sticky at bottom */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-smoke/30 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <img src={governorTransparent} alt="" className="w-4 h-4 opacity-60" />
                <p className="text-xs text-ash/60 font-mono">Intersect v1.0.0</p>
              </div>
              <a 
                href="https://briggskellogg.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block cursor-pointer"
              >
                <img 
                  src={bekLogo} 
                  alt="BEK" 
                  className="h-[16px] w-auto opacity-40 hover:opacity-100 transition-opacity duration-200"
                />
              </a>
            </div>
          </motion.div>

          {/* Reset confirmation modal */}
          <AnimatePresence>
            {showResetConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              >
                <div 
                  className="absolute inset-0 bg-void/80"
                  onClick={() => setShowResetConfirm(false)}
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative bg-charcoal border border-smoke/50 rounded-xl p-5 max-w-xs w-full"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${AGENTS.instinct.color}20` }}
                    >
                      <AlertTriangle className="w-5 h-5" style={{ color: AGENTS.instinct.color }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="font-sans font-medium text-pearl">Reset Everything?</h4>
                      <p className="text-xs text-ash font-mono">This cannot be undone</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-silver font-mono mb-4">
                    All conversations, learned context, and agent weights will be permanently deleted.
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 px-3 py-2 bg-smoke/40 text-pearl font-mono text-sm rounded-lg hover:bg-smoke/60 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFullReset}
                      disabled={isResetting}
                      className="flex-1 px-3 py-2 text-white font-mono text-sm rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                      style={{ backgroundColor: AGENTS.instinct.color }}
                    >
                      {isResetting ? 'Resetting...' : 'Reset'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* API Key modal - use the full ApiKeyModal component */}
          <ApiKeyModal
            isOpen={showApiModal}
            onComplete={() => {
              setShowApiModal(false);
              // Refresh profile
              getUserProfile().then(setUserProfile);
            }}
            initialOpenAiKey={userProfile?.apiKey}
            initialAnthropicKey={userProfile?.anthropicKey}
          />
        </>
      )}
    </AnimatePresence>
  );
}

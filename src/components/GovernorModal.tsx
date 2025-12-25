import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Sparkles, Zap, Eye } from 'lucide-react';
import { useAppStore } from '../store';
import { AGENTS, DISCO_AGENTS } from '../constants/agents';
import { getUserProfile, getMemoryStats, MemoryStats } from '../hooks/useTauri';
import { ApiKeyModal } from './ApiKeyModal';
import governorTransparent from '../assets/governor-transparent.png';

interface GovernorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Full-size star chart with hover mechanics
function StarChart({ 
  weights, 
  personalityTitle,
  personalityDescription,
  confidence,
  stats
}: { 
  weights: { instinct: number; logic: number; psyche: number }; 
  personalityTitle: string;
  personalityDescription: string;
  confidence: number;
  stats: { messages: number; facts: number; sessions: number };
}) {
  const [hoveredAgent, setHoveredAgent] = useState<'instinct' | 'logic' | 'psyche' | null>(null);
  const size = 300;
  const center = size / 2;
  const radius = 90;
  
  const MIN_WEIGHT = 0.20;
  const MAX_WEIGHT = 0.60;
  
  const normalizeWeight = (weight: number) => {
    const clamped = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, weight));
    const normalized = (clamped - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT);
    return 0.3 + normalized * 0.7;
  };
  
  const getImageSize = (weight: number, isHovered: boolean) => {
    const clamped = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, weight));
    const normalized = (clamped - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT);
    const base = 52 + normalized * 16;
    return isHovered ? base * 1.15 : base;
  };
  
  const angles = { psyche: -90, logic: 150, instinct: 30 };
  const agentModes = useAppStore((s) => s.agentModes);
  
  const getPoint = (agent: 'instinct' | 'logic' | 'psyche', scale: number) => {
    const angle = (angles[agent] * Math.PI) / 180;
    return {
      x: center + Math.cos(angle) * radius * scale,
      y: center + Math.sin(angle) * radius * scale,
    };
  };
  
  const points = {
    instinct: getPoint('instinct', normalizeWeight(weights.instinct)),
    logic: getPoint('logic', normalizeWeight(weights.logic)),
    psyche: getPoint('psyche', normalizeWeight(weights.psyche)),
  };
  
  const trianglePath = `M ${points.psyche.x} ${points.psyche.y} L ${points.logic.x} ${points.logic.y} L ${points.instinct.x} ${points.instinct.y} Z`;
  
  return (
    <div className="relative">
      {/* Chart */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0">
          <defs>
            <linearGradient id="chartFillFull" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(167, 139, 202, 0.2)" />
              <stop offset="50%" stopColor="rgba(107, 184, 201, 0.2)" />
              <stop offset="100%" stopColor="rgba(224, 122, 95, 0.2)" />
            </linearGradient>
            <linearGradient id="chartStrokeFull" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A78BCA" />
              <stop offset="50%" stopColor="#6BB8C9" />
              <stop offset="100%" stopColor="#E07A5F" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Grid rings */}
          {[0.4, 0.7, 1].map((scale, i) => (
            <polygon
              key={i}
              points={`${center + Math.cos(-Math.PI/2) * radius * scale},${center + Math.sin(-Math.PI/2) * radius * scale} ${center + Math.cos(Math.PI * 5/6) * radius * scale},${center + Math.sin(Math.PI * 5/6) * radius * scale} ${center + Math.cos(Math.PI/6) * radius * scale},${center + Math.sin(Math.PI/6) * radius * scale}`}
              fill="none"
              stroke="rgba(148, 163, 184, 0.06)"
              strokeWidth="1"
            />
          ))}
          
          {/* Axis lines */}
          {(['psyche', 'logic', 'instinct'] as const).map((agent) => {
            const outer = getPoint(agent, 1);
            return (
              <line
                key={agent}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(148, 163, 184, 0.08)"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Data triangle */}
          <motion.path 
            d={trianglePath} 
            fill="url(#chartFillFull)" 
            stroke="url(#chartStrokeFull)" 
            strokeWidth="2"
            filter="url(#glow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Data points */}
          {(['psyche', 'logic', 'instinct'] as const).map((agent) => {
            const isAgentDisco = agentModes[agent] === 'disco';
            const config = isAgentDisco ? DISCO_AGENTS[agent] : AGENTS[agent];
            return (
              <motion.circle 
                key={agent} 
                cx={points[agent].x} 
                cy={points[agent].y} 
                r="4" 
                fill={config.color}
                filter="url(#glow)"
              />
            );
          })}
        </svg>
        
        {/* Agent avatars with hover */}
        {(['psyche', 'logic', 'instinct'] as const).map((agent) => {
          const point = getPoint(agent, 1.15);
          const isHovered = hoveredAgent === agent;
          const imgSize = getImageSize(weights[agent], isHovered);
          const isAgentDisco = agentModes[agent] === 'disco';
          const config = isAgentDisco ? DISCO_AGENTS[agent] : AGENTS[agent];
          
          return (
            <div
              key={agent}
              className="absolute flex flex-col items-center cursor-pointer group"
              style={{ left: point.x - imgSize / 2, top: point.y - imgSize / 2 }}
              onMouseEnter={() => setHoveredAgent(agent)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              <motion.div
                animate={{ 
                  scale: isHovered ? 1.1 : 1,
                  y: isHovered ? -4 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="rounded-full overflow-hidden"
                style={{
                  width: imgSize,
                  height: imgSize,
                  border: `2.5px solid ${config.color}`,
                  boxShadow: isHovered 
                    ? `0 0 30px ${config.color}60, 0 8px 20px rgba(0,0,0,0.3)` 
                    : `0 0 16px ${config.color}30`,
                }}
              >
                <img src={config.avatar} alt={config.name} className="w-full h-full object-cover" />
              </motion.div>
              <motion.span 
                className="text-[10px] font-mono mt-1 font-medium"
                style={{ color: config.color }}
                animate={{ opacity: isHovered ? 1 : 0.8 }}
              >
                {Math.round(weights[agent] * 100)}%
              </motion.span>
              
              {/* Hover tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute top-full mt-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl z-50 w-[220px]"
                    style={{ 
                      backgroundColor: 'rgba(20, 20, 22, 0.95)',
                      borderColor: `${config.color}40`,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-sans font-semibold" style={{ color: config.color }}>
                        {config.name}
                      </span>
                      <span className="text-[9px] text-ash/50 font-mono uppercase px-1.5 py-0.5 bg-white/5 rounded">
                        {agent}
                      </span>
                    </div>
                    <p className="text-[11px] text-ash/70 font-mono leading-relaxed">
                      {config.description}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      
      {/* Personality Box - Below Chart */}
      <motion.div 
        className="mt-4 p-4 rounded-xl border border-smoke/20 bg-gradient-to-b from-white/[0.03] to-transparent"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-base font-sans font-semibold text-pearl mb-1">{personalityTitle}</h3>
            <p className="text-[11px] text-ash/60 font-mono leading-relaxed">{personalityDescription}</p>
          </div>
          
          {/* Confidence meter - 16personalities style */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] text-ash/40 font-mono uppercase">Confidence</span>
              <span className="text-sm font-mono text-pearl font-medium">{confidence}%</span>
            </div>
            <div className="w-24 h-1.5 bg-smoke/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #6BB8C9, #A78BCA, #E07A5F)' }}
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
        
        {/* Stats row */}
        <div className="flex gap-6 mt-4 pt-3 border-t border-smoke/10">
          <div>
            <span className="text-lg font-mono text-pearl">{stats.messages}</span>
            <span className="text-[9px] text-ash/40 font-mono uppercase ml-1.5">messages</span>
          </div>
          <div>
            <span className="text-lg font-mono text-pearl">{stats.facts}</span>
            <span className="text-[9px] text-ash/40 font-mono uppercase ml-1.5">facts</span>
          </div>
          <div>
            <span className="text-lg font-mono text-pearl">{stats.sessions}</span>
            <span className="text-[9px] text-ash/40 font-mono uppercase ml-1.5">sessions</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Tag component
function Tag({ label, type }: { label: string; type: 'pattern' | 'theme' }) {
  const isPattern = type === 'pattern';
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-mono border ${
      isPattern 
        ? 'bg-emerald-500/10 text-emerald-400/90 border-emerald-500/20' 
        : 'bg-violet-500/10 text-violet-400/90 border-violet-500/20'
    }`}>
      {label}
    </span>
  );
}

// Observation tag with special styling
function ObservationTag({ label, category }: { label: string; category: 'cognitive' | 'communication' | 'emergent' | 'tension' }) {
  const styles = {
    cognitive: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300',
    communication: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-300',
    emergent: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300',
    tension: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-300',
  };
  
  return (
    <motion.span 
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-mono border bg-gradient-to-r ${styles[category]}`}
      whileHover={{ scale: 1.02, y: -1 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      {label}
    </motion.span>
  );
}

export function GovernorModal({ isOpen, onClose }: GovernorModalProps) {
  const { 
    userProfile, 
    setUserProfile,
    toggleAllDisco,
    hasAnyDiscoAgent,
    agentModes,
    toggleAgentMode,
  } = useAppStore();
  
  const [showApiModal, setShowApiModal] = useState(false);
  const [animatedWeights, setAnimatedWeights] = useState({ instinct: 0.33, logic: 0.33, psyche: 0.33 });
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [discoHovered, setDiscoHovered] = useState(false);
  
  const AGENT_ORDER: Array<'instinct' | 'logic' | 'psyche'> = ['instinct', 'logic', 'psyche'];
  
  // Animate weights on open
  useEffect(() => {
    if (isOpen && userProfile) {
      const timeout = setTimeout(() => {
        setAnimatedWeights({
          instinct: userProfile.instinctWeight,
          logic: userProfile.logicWeight,
          psyche: userProfile.psycheWeight,
        });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, userProfile]);
  
  // Load profile and stats on mount
  useEffect(() => {
    if (isOpen) {
      getUserProfile().then(setUserProfile);
      loadStats();
    }
  }, [isOpen, setUserProfile]);
  
  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await getMemoryStats();
      setMemoryStats(stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };
  
  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.metaKey && e.key.toLowerCase() === 'k') { e.preventDefault(); setShowApiModal(true); }
    else if (e.metaKey && e.key.toLowerCase() === 'd') { e.preventDefault(); toggleAllDisco(); }
  }, [isOpen, onClose, toggleAllDisco]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  if (!userProfile) return null;
  
  const hasDisco = hasAnyDiscoAgent();
  const hasApiKey = userProfile.apiKey && userProfile.anthropicKey;
  
  // Get personality archetype
  const getPersonalityArchetype = () => {
    const sorted = [
      { agent: 'instinct', weight: userProfile.instinctWeight },
      { agent: 'logic', weight: userProfile.logicWeight },
      { agent: 'psyche', weight: userProfile.psycheWeight },
    ].sort((a, b) => b.weight - a.weight);
    
    const archetypes: Record<string, Record<string, { title: string; description: string }>> = {
      instinct: { 
        logic: { title: "The Decisive Strategist", description: "You trust your gut but validate with evidence. Action-oriented with analytical backup." },
        psyche: { title: "The Intuitive Empath", description: "You feel your way through decisions, guided by instinct and emotional intelligence." }
      },
      logic: { 
        instinct: { title: "The Pragmatic Analyst", description: "You analyze then act. Evidence-based decisions with room for decisive action." },
        psyche: { title: "The Thoughtful Observer", description: "You process deeply before concluding. Logical frameworks informed by introspection." }
      },
      psyche: { 
        instinct: { title: "The Emotional Navigator", description: "You lead with feeling and trust your body's wisdom. Heart and gut in harmony." },
        logic: { title: "The Reflective Thinker", description: "You contemplate before concluding. Inner wisdom validated by careful reasoning." }
      },
    };
    
    return archetypes[sorted[0].agent]?.[sorted[1].agent] || { title: "Emerging Profile", description: "Your patterns are still crystallizing." };
  };
  
  const archetype = getPersonalityArchetype();
  
  // Calculate confidence based on data
  const getConfidence = () => {
    const messages = userProfile.totalMessages;
    const facts = memoryStats?.factCount || 0;
    // More data = higher confidence, caps at ~95%
    const baseConfidence = Math.min(95, 40 + (messages * 0.3) + (facts * 0.1));
    return Math.round(baseConfidence);
  };
  
  // Derive observation tags
  const getObservations = () => {
    const cognitive: string[] = [];
    const communication: string[] = [];
    const emergent: string[] = [];
    const tension: string[] = [];
    
    // Cognitive
    if (userProfile.instinctWeight > 0.38) cognitive.push('decisive', 'action-first');
    if (userProfile.logicWeight > 0.38) cognitive.push('analytical', 'systematic');
    if (userProfile.psycheWeight > 0.38) cognitive.push('reflective', 'meaning-seeking');
    if (userProfile.instinctWeight > userProfile.logicWeight && userProfile.instinctWeight > userProfile.psycheWeight) 
      cognitive.push('gut-driven');
    if (userProfile.logicWeight > userProfile.instinctWeight && userProfile.logicWeight > userProfile.psycheWeight) 
      cognitive.push('evidence-based');
    if (userProfile.psycheWeight > userProfile.instinctWeight && userProfile.psycheWeight > userProfile.logicWeight) 
      cognitive.push('emotionally-aware');
    
    // Communication
    const total = userProfile.totalMessages;
    if (total > 50) communication.push('conversational');
    if (total > 100) communication.push('engaged');
    if (userProfile.instinctWeight > 0.35) communication.push('direct');
    if (userProfile.logicWeight > 0.35) communication.push('precise');
    if (userProfile.psycheWeight > 0.35) communication.push('exploratory');
    
    // Emergent
    if (total > 20) emergent.push('pattern-forming');
    if (total > 50) emergent.push('rapport-building');
    if (memoryStats?.factCount && memoryStats.factCount > 20) emergent.push('self-revealing');
    if (memoryStats?.patterns && memoryStats.patterns.length > 3) emergent.push('consistent');
    if (memoryStats?.themes && memoryStats.themes.length > 3) emergent.push('thematically-rich');
    
    // Tensions
    const weights = [userProfile.instinctWeight, userProfile.logicWeight, userProfile.psycheWeight];
    const max = Math.max(...weights);
    const min = Math.min(...weights);
    if (max - min < 0.1) tension.push('balanced-but-torn');
    if (userProfile.instinctWeight > 0.35 && userProfile.logicWeight > 0.35) tension.push('acts-then-analyzes');
    if (userProfile.logicWeight > 0.35 && userProfile.psycheWeight > 0.35) tension.push('thinks-then-feels');
    
    return { cognitive, communication, emergent, tension };
  };
  
  const observations = getObservations();
  
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
            className="fixed inset-0 bg-void/95 backdrop-blur-xl z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-h-[92vh] overflow-hidden"
          >
            <div className="relative bg-gradient-to-b from-charcoal/95 to-obsidian border border-smoke/20 rounded-2xl shadow-2xl">
              
              {/* ===== COMPACT HEADER ===== */}
              <div className="px-5 py-4 border-b border-smoke/15">
                <div className="flex items-center justify-between">
                  {/* Governor + Agents */}
                  <div className="flex items-center gap-3">
                    {/* Governor Avatar */}
                    <div className="relative">
                      <motion.div 
                        className="w-11 h-11 rounded-xl overflow-hidden"
                        style={{
                          border: hasDisco ? '2px solid rgba(251, 191, 36, 0.5)' : '2px solid rgba(212, 175, 55, 0.4)',
                          boxShadow: hasDisco ? '0 0 20px rgba(251, 191, 36, 0.2)' : 'none',
                        }}
                      >
                        <img src={governorTransparent} alt="Governor" className="w-full h-full object-cover" />
                      </motion.div>
                      <motion.div
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-charcoal"
                        style={{ backgroundColor: hasApiKey ? '#22C55E' : '#6B7280' }}
                        animate={hasApiKey ? { scale: [1, 1.15, 1] } : undefined}
                        transition={hasApiKey ? { duration: 2, repeat: Infinity } : undefined}
                      />
                    </div>
                    
                    <div>
                      <h2 className="text-base font-sans font-semibold text-pearl">The Governor</h2>
                      <p className="text-[10px] text-ash/50 font-mono">Your cognitive council</p>
                    </div>
                  </div>
                  
                  {/* Right side: Disco + API + Close */}
                  <div className="flex items-center gap-2">
                    {/* API Key Button */}
                    <button
                      onClick={() => setShowApiModal(true)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
                        hasApiKey 
                          ? 'text-ash/50 border-smoke/20 hover:border-smoke/40 hover:bg-white/5'
                          : 'text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15'
                      }`}
                      title="API Keys (⌘K)"
                    >
                      <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <kbd className="text-[8px] font-mono opacity-50">⌘K</kbd>
                    </button>
                    
                    {/* Disco Pill */}
                    <div 
                      className="relative"
                      onMouseEnter={() => setDiscoHovered(true)}
                      onMouseLeave={() => setDiscoHovered(false)}
                    >
                      <button
                        onClick={toggleAllDisco}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          hasDisco
                            ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/15 border border-amber-500/50 text-amber-400'
                            : 'bg-smoke/20 border border-smoke/30 text-ash/50 hover:text-pearl'
                        }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${hasDisco ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
                        <span className="text-[10px] font-mono font-medium">{hasDisco ? 'DISCO' : 'Normal'}</span>
                        <kbd className="text-[8px] font-mono opacity-40">⌘D</kbd>
                      </button>
                      
                      {/* Disco Elysium-inspired hover tooltip */}
                      <AnimatePresence>
                        {discoHovered && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            className="absolute top-full right-0 mt-2 w-[260px] p-4 rounded-xl border backdrop-blur-xl shadow-2xl z-50"
                            style={{
                              background: hasDisco 
                                ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.95) 0%, rgba(30, 20, 10, 0.98) 100%)'
                                : 'rgba(20, 20, 22, 0.98)',
                              borderColor: hasDisco ? 'rgba(251, 191, 36, 0.3)' : 'rgba(100, 100, 100, 0.2)',
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className={`w-4 h-4 ${hasDisco ? 'text-amber-400' : 'text-ash/50'}`} strokeWidth={1.5} />
                              <span className={`text-sm font-sans font-semibold ${hasDisco ? 'text-amber-300' : 'text-pearl'}`}>
                                Disco Mode
                              </span>
                            </div>
                            <p className="text-[11px] text-ash/70 font-mono leading-relaxed mb-3">
                              {hasDisco 
                                ? "The Governor becomes a brutal mentor—wise but unsparing. Expect philosophical challenges and uncomfortable truths."
                                : "Activate for a Disco Elysium-inspired experience. The Governor will challenge you with adversarial wisdom."
                              }
                            </p>
                            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                              <span className="text-[9px] text-ash/40 font-mono">Toggle with</span>
                              <kbd className="px-1.5 py-0.5 bg-black/30 rounded text-[9px] font-mono text-ash/60">⌘D</kbd>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Close */}
                    <button 
                      onClick={onClose} 
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-ash/40 hover:text-pearl hover:bg-white/5 transition-all"
                    >
                      <kbd className="text-[9px] font-mono">ESC</kbd>
                    </button>
                  </div>
                </div>
                
                {/* Agent Toggles */}
                <div className="flex items-center gap-2 mt-3">
                  {AGENT_ORDER.map((agentId, idx) => {
                    const mode = agentModes[agentId];
                    const isAgentDisco = mode === 'disco';
                    const isActive = mode !== 'off';
                    const config = isAgentDisco ? DISCO_AGENTS[agentId] : AGENTS[agentId];
                    
                    return (
                      <motion.button
                        key={agentId}
                        onClick={() => toggleAgentMode(agentId)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
                          isActive
                            ? isAgentDisco 
                              ? 'bg-amber-500/10 border-amber-500/30' 
                              : 'bg-white/[0.03] border-smoke/20'
                            : 'bg-transparent border-smoke/10 opacity-40'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title={`Toggle ${config.name} (⌘${idx + 1})`}
                      >
                        <motion.div 
                          className="w-5 h-5 rounded-full overflow-hidden"
                          style={{ border: `1.5px solid ${isActive ? config.color : '#444'}` }}
                          animate={{ 
                            filter: isActive ? 'grayscale(0%)' : 'grayscale(100%)',
                            opacity: isActive ? 1 : 0.5,
                          }}
                        >
                          <img src={config.avatar} alt={config.name} className="w-full h-full object-cover" />
                        </motion.div>
                        <span className={`text-[10px] font-mono ${isActive ? 'text-pearl' : 'text-ash/40'}`}>
                          {config.name}
                        </span>
                        <kbd className="text-[8px] font-mono text-ash/30">⌘{idx + 1}</kbd>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              
              {/* Scrollable Content */}
              <div className="max-h-[calc(92vh-180px)] overflow-y-auto">
                
                {/* ===== STAR CHART SECTION ===== */}
                <div className="px-5 py-5 flex justify-center">
                  <StarChart 
                    weights={animatedWeights} 
                    personalityTitle={archetype.title}
                    personalityDescription={archetype.description}
                    confidence={getConfidence()}
                    stats={{
                      messages: userProfile.totalMessages,
                      facts: memoryStats?.factCount || 0,
                      sessions: memoryStats?.uniqueConversations || 0,
                    }}
                  />
                </div>
                
                {/* ===== PATTERNS & THEMES SECTION ===== */}
                <div className="px-5 py-4 border-t border-smoke/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-emerald-500/60" strokeWidth={1.5} />
                    <div>
                      <h4 className="text-[11px] font-mono text-ash/70 uppercase tracking-widest">Behavioral Fingerprint</h4>
                      <p className="text-[9px] text-ash/40 font-mono">Patterns extracted from your conversations</p>
                    </div>
                  </div>
                  
                  {isLoadingStats ? (
                    <div className="flex items-center justify-center py-8">
                      <motion.div 
                        className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memoryStats?.patterns && memoryStats.patterns.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {memoryStats.patterns.map((pattern, idx) => (
                            <Tag key={idx} label={pattern} type="pattern" />
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-ash/30 font-mono py-2">Continue chatting to surface patterns...</p>
                      )}
                      
                      {memoryStats?.themes && memoryStats.themes.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {memoryStats.themes.map((theme, idx) => (
                            <Tag key={idx} label={theme} type="theme" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* ===== THE OBSERVATION SECTION ===== */}
                <div className="px-5 py-5 border-t border-smoke/10">
                  {/* Special header with gradient */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 via-violet-500/20 to-amber-500/20 border border-white/10">
                      <Eye className="w-4 h-4 text-white/70" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-mono text-pearl/90 uppercase tracking-widest">The Observation</h4>
                      <p className="text-[9px] text-ash/40 font-mono">What the Governor perceives</p>
                    </div>
                  </div>
                  
                  {/* Gradient background card */}
                  <motion.div 
                    className="relative p-4 rounded-xl overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {/* Animated gradient background */}
                    <motion.div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(251, 191, 36, 0.15) 100%)',
                      }}
                      animate={{
                        background: [
                          'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(251, 191, 36, 0.15) 100%)',
                          'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(6, 182, 212, 0.15) 50%, rgba(139, 92, 246, 0.15) 100%)',
                          'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(251, 191, 36, 0.15) 50%, rgba(6, 182, 212, 0.15) 100%)',
                        ],
                      }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 border border-white/5 rounded-xl" />
                    
                    <div className="relative space-y-4">
                      {/* Cognitive */}
                      {observations.cognitive.length > 0 && (
                        <div>
                          <p className="text-[9px] text-cyan-400/60 font-mono uppercase mb-2 tracking-wider">Cognitive Patterns</p>
                          <div className="flex flex-wrap gap-1.5">
                            {observations.cognitive.map((tag, idx) => (
                              <ObservationTag key={idx} label={tag} category="cognitive" />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Communication */}
                      {observations.communication.length > 0 && (
                        <div>
                          <p className="text-[9px] text-violet-400/60 font-mono uppercase mb-2 tracking-wider">Communication Style</p>
                          <div className="flex flex-wrap gap-1.5">
                            {observations.communication.map((tag, idx) => (
                              <ObservationTag key={idx} label={tag} category="communication" />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Emergent */}
                      {observations.emergent.length > 0 && (
                        <div>
                          <p className="text-[9px] text-amber-400/60 font-mono uppercase mb-2 tracking-wider">Emergent Signals</p>
                          <div className="flex flex-wrap gap-1.5">
                            {observations.emergent.map((tag, idx) => (
                              <ObservationTag key={idx} label={tag} category="emergent" />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Tensions */}
                      {observations.tension.length > 0 && (
                        <div>
                          <p className="text-[9px] text-rose-400/60 font-mono uppercase mb-2 tracking-wider">Interesting Tensions</p>
                          <div className="flex flex-wrap gap-1.5">
                            {observations.tension.map((tag, idx) => (
                              <ObservationTag key={idx} label={tag} category="tension" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-5 py-2.5 border-t border-smoke/10 bg-black/20">
                <span className="text-[9px] font-mono text-ash/25">Intersect v2.0.0</span>
              </div>
            </div>
          </motion.div>
          
          {/* API Key Modal */}
          <ApiKeyModal
            isOpen={showApiModal}
            onComplete={() => {
              setShowApiModal(false);
              getUserProfile().then(setUserProfile);
            }}
            initialOpenAiKey={userProfile.apiKey}
            initialAnthropicKey={userProfile.anthropicKey}
          />
        </>
      )}
    </AnimatePresence>
  );
}

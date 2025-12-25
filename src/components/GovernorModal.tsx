import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Sparkles } from 'lucide-react';
import { useAppStore } from '../store';
import { AGENTS } from '../constants/agents';
import { getUserProfile } from '../hooks/useTauri';
import { ApiKeyModal } from './ApiKeyModal';
import governorTransparent from '../assets/governor-transparent.png';
import instinctProfile from '../assets/agents/instinct.png';
import logicProfile from '../assets/agents/logic.png';
import psycheProfile from '../assets/agents/psyche.png';

const PROFILE_IMAGES = {
  instinct: instinctProfile,
  logic: logicProfile,
  psyche: psycheProfile,
} as const;

interface GovernorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Simplified radar chart for v2 - just shows weights, no profile switching
function StarChart({ weights }: { weights: { instinct: number; logic: number; psyche: number } }) {
  const size = 280;
  const center = size / 2;
  const radius = 85;
  
  const MIN_WEIGHT = 0.20;
  const MAX_WEIGHT = 0.60;
  
  const normalizeWeight = (weight: number) => {
    const clamped = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, weight));
    const normalized = (clamped - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT);
    return 0.25 + normalized * 0.75;
  };
  
  const minImageSize = 52;
  const maxImageSize = 72;
  
  const getImageSize = (weight: number) => {
    const clamped = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, weight));
    const normalized = (clamped - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT);
    return minImageSize + normalized * (maxImageSize - minImageSize);
  };
  
  const angles = {
    psyche: -90,
    logic: 150,
    instinct: 30,
  };
  
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
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((scale, i) => (
          <polygon
            key={i}
            points={`${center + Math.cos(-Math.PI/2) * radius * scale},${center + Math.sin(-Math.PI/2) * radius * scale} ${center + Math.cos(Math.PI * 5/6) * radius * scale},${center + Math.sin(Math.PI * 5/6) * radius * scale} ${center + Math.cos(Math.PI/6) * radius * scale},${center + Math.sin(Math.PI/6) * radius * scale}`}
            fill="none"
            stroke="rgba(110, 110, 118, 0.15)"
            strokeWidth="1"
          />
        ))}
        
        {/* Axis lines */}
        {['psyche', 'logic', 'instinct'].map((agent) => {
          const endPoint = getPoint(agent as 'instinct' | 'logic' | 'psyche', 1);
          return (
            <line
              key={agent}
              x1={center}
              y1={center}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="rgba(110, 110, 118, 0.2)"
              strokeWidth="1"
            />
          );
        })}
        
        {/* Filled triangle */}
        <path
          d={trianglePath}
          fill="url(#chartGradient)"
          stroke="url(#chartStroke)"
          strokeWidth="2"
          opacity="0.8"
        />
        
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(167, 139, 202, 0.3)" />
            <stop offset="50%" stopColor="rgba(107, 184, 201, 0.3)" />
            <stop offset="100%" stopColor="rgba(224, 122, 95, 0.3)" />
          </linearGradient>
          <linearGradient id="chartStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BCA" />
            <stop offset="50%" stopColor="#6BB8C9" />
            <stop offset="100%" stopColor="#E07A5F" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Agent images at vertices */}
      {(['psyche', 'logic', 'instinct'] as const).map((agent) => {
        const point = getPoint(agent, 1.15);
        const size = getImageSize(weights[agent]);
        const config = AGENTS[agent];
        
        return (
          <div
            key={agent}
            className="absolute flex flex-col items-center"
            style={{
              left: point.x - size / 2,
              top: point.y - size / 2,
            }}
          >
            <div
              className="rounded-full overflow-hidden border-2 transition-all duration-300"
              style={{
                width: size,
                height: size,
                borderColor: config.color,
                boxShadow: `0 0 ${size * 0.15}px ${config.color}40`,
              }}
            >
              <img
                src={PROFILE_IMAGES[agent]}
                alt={config.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span
              className="text-[10px] font-mono mt-1"
              style={{ color: config.color }}
            >
              {Math.round(weights[agent] * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Get personality description based on weights
function getPersonalityDescription(weights: { instinct: number; logic: number; psyche: number }, messageCount: number) {
  const { instinct, logic, psyche } = weights;
  
  const sorted = [
    { agent: 'instinct', weight: instinct },
    { agent: 'logic', weight: logic },
    { agent: 'psyche', weight: psyche },
  ].sort((a, b) => b.weight - a.weight);
  
  const dominant = sorted[0].agent;
  const secondary = sorted[1].agent;
  
  const descriptions: Record<string, Record<string, string>> = {
    instinct: {
      logic: "Action-oriented thinker who trusts gut feelings backed by analysis",
      psyche: "Emotionally intuitive with strong instincts for what feels right",
    },
    logic: {
      instinct: "Analytical mind that values quick, decisive action",
      psyche: "Thoughtful analyst who considers emotional dimensions",
    },
    psyche: {
      instinct: "Deep feeler with strong intuitive responses",
      logic: "Introspective thinker who processes emotions analytically",
    },
  };
  
  const titles: Record<string, Record<string, string>> = {
    instinct: { logic: "The Decisive Strategist", psyche: "The Intuitive Empath" },
    logic: { instinct: "The Pragmatic Analyst", psyche: "The Thoughtful Observer" },
    psyche: { instinct: "The Emotional Navigator", logic: "The Reflective Thinker" },
  };
  
  const confidence = Math.min(100, Math.round((messageCount / 50) * 100));
  const forming = confidence >= 100 
    ? "Profile crystallized" 
    : `Profile forming... ${confidence}% confidence`;
  
  return {
    title: titles[dominant]?.[secondary] || "Emerging Profile",
    description: descriptions[dominant]?.[secondary] || "Your unique thinking pattern is still developing.",
    confidence,
    forming,
  };
}

export function GovernorModal({ isOpen, onClose }: GovernorModalProps) {
  const { 
    userProfile, 
    setUserProfile,
    toggleAllDisco,
    hasAnyDiscoAgent,
    getDiscoAgentsList,
  } = useAppStore();
  
  const [showApiModal, setShowApiModal] = useState(false);
  const [animatedWeights, setAnimatedWeights] = useState({
    instinct: 0.33,
    logic: 0.33,
    psyche: 0.33,
  });
  
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
  
  // Load profile on mount
  useEffect(() => {
    if (isOpen) {
      getUserProfile().then(setUserProfile);
    }
  }, [isOpen, setUserProfile]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.metaKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setShowApiModal(true);
    } else if (e.metaKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      toggleAllDisco();
    }
  }, [isOpen, onClose, toggleAllDisco]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  if (!userProfile) return null;
  
  const discoCount = getDiscoAgentsList().length;
  const hasDisco = hasAnyDiscoAgent();
  const personality = getPersonalityDescription(
    { instinct: userProfile.instinctWeight, logic: userProfile.logicWeight, psyche: userProfile.psycheWeight },
    userProfile.totalMessages
  );
  
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
            className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] max-h-[85vh] bg-obsidian border border-smoke/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-smoke/30">
              <div className="flex items-center gap-2">
                <img src={governorTransparent} alt="Governor" className="w-6 h-6" />
                <h2 className="text-sm font-sans font-medium text-pearl">Governor</h2>
              </div>
              <button
                onClick={onClose}
                className="text-ash/60 hover:text-pearl transition-colors text-xs font-mono"
              >
                ESC
              </button>
            </div>
            
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Star Chart Section */}
              <section className="bg-charcoal/30 rounded-xl p-4 border border-smoke/20">
                <h3 className="text-xs font-mono text-ash/60 uppercase tracking-wider mb-4">Your Star Chart</h3>
                
                <div className="flex justify-center">
                  <StarChart weights={{
                    instinct: animatedWeights.instinct,
                    logic: animatedWeights.logic,
                    psyche: animatedWeights.psyche,
                  }} />
                </div>
                
                {/* Personality description */}
                <div className="mt-4 pt-3 border-t border-smoke/20 text-center">
                  <span 
                    className="text-sm font-sans font-medium"
                    style={{
                      background: 'linear-gradient(90deg, #6BB8C9, #A78BCA)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {personality.title}
                  </span>
                  <p className="text-xs text-silver font-mono mt-1 leading-relaxed">
                    {personality.description}
                  </p>
                  
                  {/* Confidence bar */}
                  <div className="mt-3">
                    <div className="h-1 bg-smoke/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${personality.confidence}%`,
                          background: personality.confidence >= 100 
                            ? 'linear-gradient(90deg, #6BB8C9, #A78BCA)'
                            : 'rgba(148, 163, 184, 0.5)',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-ash/60 font-mono mt-1">
                      {personality.forming}
                    </p>
                  </div>
                </div>
              </section>
              
              {/* Disco Mode Toggle */}
              <section className="bg-charcoal/30 rounded-xl p-4 border border-smoke/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono text-ash/60 uppercase tracking-wider mb-1">Governor Mode</h3>
                    <p className="text-[11px] text-ash/50 font-mono">
                      {hasDisco ? 'Disco: Brutally honest mentor' : 'Normal: Curious guide'}
                    </p>
                  </div>
                  
                  <button
                    onClick={toggleAllDisco}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      hasDisco
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 text-amber-400'
                        : 'bg-smoke/30 border border-smoke/40 text-ash/70 hover:text-pearl'
                    }`}
                  >
                    <Sparkles className={`w-4 h-4 ${hasDisco ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
                    <span className="text-xs font-mono">
                      {hasDisco ? `DISCO (${discoCount}/3)` : 'OFF'}
                    </span>
                    <kbd className="ml-1 px-1 py-0.5 bg-smoke/30 rounded text-[9px] font-mono border border-smoke/40">⌘D</kbd>
                  </button>
                </div>
              </section>
              
              {/* Messages Count */}
              <section className="bg-charcoal/30 rounded-xl p-4 border border-smoke/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono text-ash/60 uppercase tracking-wider mb-1">Conversation History</h3>
                    <p className="text-xl font-mono text-pearl">{userProfile.totalMessages}</p>
                    <p className="text-[10px] text-ash/50 font-mono">messages exchanged</p>
                  </div>
                </div>
              </section>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-smoke/30 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <img src={governorTransparent} alt="" className="w-4 h-4 opacity-60" />
                <p className="text-xs text-ash/60 font-mono">Intersect v2.1.0</p>
              </div>
              <div className="flex items-center gap-2">
                {userProfile.apiKey && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-emerald-500/80 font-mono">Connected</span>
                  </span>
                )}
                <button
                  onClick={() => setShowApiModal(true)}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-ash/60 hover:text-pearl hover:bg-smoke/30 transition-colors cursor-pointer"
                  title="API Keys (⌘K)"
                >
                  <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <kbd className="w-5 h-5 bg-smoke/30 rounded text-[9px] font-mono text-ash/50 border border-smoke/40 flex items-center justify-center">⌘K</kbd>
                </button>
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


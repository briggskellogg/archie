import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AGENTS, DISCO_AGENTS } from '../constants/agents';
import { AgentType } from '../types';

interface ThoughtBubbleProps {
  agent: string;      // "instinct", "logic", "psyche"
  name: string;       // Display name: "Snap", "Swarm", etc.
  content: string;    // The thought content
  isDisco: boolean;   // Whether disco mode was used
  index: number;      // For staggered animation
  round?: number;     // Debate round (0 = initial)
  showRound?: boolean; // Whether to show round indicator
}

export function ThoughtBubble({ agent, name, content, isDisco, index, round = 0, showRound = false }: ThoughtBubbleProps) {
  // Get the full agent config with avatar and description
  const agentConfig = isDisco 
    ? DISCO_AGENTS[agent as AgentType] 
    : AGENTS[agent as AgentType];
  
  const color = agentConfig?.color || '#6BB8C9';
  const avatar = agentConfig?.avatar;
  const description = agentConfig?.description || '';
  
  // Typing animation state
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  
  useEffect(() => {
    // Start typing after stagger delay
    const startDelay = index * 350; // 350ms between each thought starting
    
    const startTimeout = setTimeout(() => {
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex < content.length) {
          // Type 2-4 characters at a time for thoughts (faster than Governor)
          const charsToAdd = Math.min(
            2 + Math.floor(Math.random() * 3),
            content.length - currentIndex
          );
          currentIndex += charsToAdd;
          setDisplayedText(content.slice(0, currentIndex));
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 8); // Fast interval for quick thought typing
      
      return () => clearInterval(typingInterval);
    }, startDelay);
    
    return () => clearTimeout(startTimeout);
  }, [content, index]);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.2, 
        delay: index * 0.35, // Stagger animation matches typing delay
        ease: 'easeOut' 
      }}
      className="flex items-start gap-2 mb-2"
    >
      {/* Agent avatar with hover tooltip */}
      <div 
        className="relative flex-shrink-0 group/avatar"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div 
          className={`w-5 h-5 rounded-full overflow-hidden border cursor-default transition-all ${
            isDisco ? 'border-amber-500/50' : ''
          }`}
          style={{ borderColor: isDisco ? undefined : `${color}50` }}
        >
          {avatar && (
            <img 
              src={avatar} 
              alt={name} 
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        {/* Hover tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1.5 px-3 py-2 bg-obsidian/95 border rounded-lg shadow-xl w-[200px] z-50 pointer-events-none"
              style={{ borderColor: `${color}40` }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span 
                  className="text-xs font-sans font-medium"
                  style={{ color }}
                >
                  {name}
                </span>
                <span className="text-[9px] text-ash/50 font-mono uppercase">{agent}</span>
              </div>
              <p className="text-[10px] text-ash/80 font-mono leading-relaxed">
                {description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Thought content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Agent name tag */}
        <span 
          className="text-[10px] font-mono font-medium mr-1.5"
          style={{ color }}
        >
          {name}
          {showRound && round > 0 && (
            <span className="text-ash/40 ml-1">↩</span>
          )}
        </span>
        
        {/* Thought text - smaller, readable, with typing cursor */}
        <span className="text-xs text-silver/90 font-mono leading-relaxed">
          {displayedText}
          {isTyping && (
            <motion.span 
              className="inline-block ml-0.5 w-[1px] h-[0.9em] align-baseline rounded-full"
              style={{ backgroundColor: color }}
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </span>
      </div>
    </motion.div>
  );
}

// Container for multiple thoughts (displayed BEFORE Governor's response)
interface ThoughtsContainerProps {
  thoughts: Array<{
    agent: string;
    name: string;
    content: string;
    is_disco: boolean;
    round?: number;
  }>;
}

export function ThoughtsContainer({ thoughts }: ThoughtsContainerProps) {
  if (!thoughts || thoughts.length === 0) return null;
  
  // Check if there are multiple rounds
  const maxRound = Math.max(...thoughts.map(t => t.round || 0));
  const hasMultipleRounds = maxRound > 0;
  
  // Group thoughts by round if there are multiple rounds
  const thoughtsByRound = hasMultipleRounds 
    ? thoughts.reduce((acc, thought) => {
        const round = thought.round || 0;
        if (!acc[round]) acc[round] = [];
        acc[round].push(thought);
        return acc;
      }, {} as Record<number, typeof thoughts>)
    : { 0: thoughts };
  
  const sortedRounds = Object.keys(thoughtsByRound).map(Number).sort((a, b) => a - b);
  
  // Get display label for council section
  const getCouncilLabel = () => {
    if (hasMultipleRounds) {
      return `Internal Council (${maxRound + 1} rounds)`;
    }
    return 'Internal Council';
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="mb-3 ml-10 pl-3 border-l-2 border-smoke/40"
    >
      <div className="text-[9px] text-ash/60 font-mono uppercase tracking-wider mb-2">
        {getCouncilLabel()}
      </div>
      
      <AnimatePresence>
        {sortedRounds.map((round, roundIdx) => {
          const roundThoughts = thoughtsByRound[round];
          // Calculate global index for stagger effect
          const globalStartIdx = sortedRounds
            .slice(0, roundIdx)
            .reduce((sum, r) => sum + (thoughtsByRound[r]?.length || 0), 0);
          
          return (
            <div key={round} className={round > 0 ? 'mt-2 pt-2 border-t border-smoke/10' : ''}>
              {hasMultipleRounds && round > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: globalStartIdx * 0.35 }}
                  className="text-[8px] text-ash/50 font-mono uppercase tracking-wider mb-1"
                >
                  ↩ responding...
                </motion.div>
              )}
              {roundThoughts.map((thought, idx) => (
                <ThoughtBubble
                  key={`${thought.agent}-${round}-${idx}`}
                  agent={thought.agent}
                  name={thought.name}
                  content={thought.content}
                  isDisco={thought.is_disco}
                  index={globalStartIdx + idx}
                  round={thought.round || 0}
                  showRound={hasMultipleRounds}
                />
              ))}
            </div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

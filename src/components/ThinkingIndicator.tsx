import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentType } from '../types';
import { AGENTS, DISCO_AGENTS, GOVERNOR } from '../constants/agents';

// Cutesy, witty synonyms for thinking
const THINKING_WORDS = [
  'pondering',
  'noodling',
  'meandering',
  'musing',
  'mulling',
  'chewing on it',
  'percolating',
  'simmering',
  'brewing',
  'stewing',
  'daydreaming',
  'wondering',
  'contemplating',
  'ruminating',
  'puzzling',
  'marinating',
];

interface ThinkingIndicatorProps {
  agent: AgentType | 'system' | null;
  phase: 'routing' | 'thinking' | 'debating';
  isDisco?: boolean;
  debateRound?: number;
}

export function ThinkingIndicator({ agent, phase, isDisco = false, debateRound = 0 }: ThinkingIndicatorProps) {
  const [wordIndex, setWordIndex] = useState(() => Math.floor(Math.random() * THINKING_WORDS.length));
  
  // Rotate through words every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex(prev => (prev + 1) % THINKING_WORDS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  // During routing phase, show Governor; during thinking phase, show the agent
  const isRouting = phase === 'routing';
  const isDebating = phase === 'debating';
  const agentConfig = isDisco ? DISCO_AGENTS : AGENTS;
  
  const getAgentConfig = () => {
    if (isRouting || !agent || agent === 'system') return GOVERNOR;
    return agentConfig[agent];
  };
  
  const config = getAgentConfig();
  const currentWord = THINKING_WORDS[wordIndex];
  
  // Status text varies by phase
  const getStatusText = () => {
    if (isRouting) return 'routing...';
    if (isDebating) return `debating (round ${debateRound})...`;
    return `${currentWord}...`;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-start mb-2"
    >
      {/* Avatar and bubble row - centered */}
      <div className="flex gap-2.5 items-center">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img 
              src={config.avatar} 
              alt={config.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Thinking bubble - pill shape like message bubbles */}
        <div
          className="rounded-full px-3.5 py-1 bg-charcoal/40 flex items-center gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: config.color }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1, 0.8],
              }}
              transition={{
                duration: isRouting ? 0.6 : isDebating ? 0.5 : 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Status text below with rotating word */}
      <div className="text-[10px] text-ash/40 mt-0.5 font-mono ml-10 flex items-center gap-1">
        <span style={{ color: config.color }}>{config.name}</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={currentWord}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="inline-block"
          >
            {getStatusText()}
          </motion.span>
        </AnimatePresence>
        {isRouting && agent && agent !== 'system' && (
          <>
            <span className="mx-1">→</span>
            <span style={{ color: agentConfig[agent].color }}>{agentConfig[agent].name}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

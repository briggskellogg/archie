import { motion } from 'framer-motion';
import { AgentType } from '../types';
import { AGENTS, GOVERNOR } from '../constants/agents';

interface ThinkingIndicatorProps {
  agent: AgentType | 'system' | null;
  phase: 'routing' | 'thinking';
}

export function ThinkingIndicator({ agent, phase }: ThinkingIndicatorProps) {
  // During routing phase, show Governor; during thinking phase, show the agent
  const isRouting = phase === 'routing';
  const getAgentConfig = () => {
    if (isRouting || !agent || agent === 'system') return GOVERNOR;
    return AGENTS[agent];
  };
  const config = getAgentConfig();
  const statusText = isRouting ? 'routing...' : 'is thinking...';
  
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
          <div 
            className="w-7 h-7 rounded-full overflow-hidden"
            style={{ 
              boxShadow: `0 0 0 1px ${config.color}60`,
            }}
          >
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
                duration: isRouting ? 0.6 : 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Status text below */}
      <div className="text-[10px] text-ash/40 mt-0.5 font-mono ml-10">
        <span style={{ color: config.color }}>{config.name}</span>
        <span className="ml-1">{statusText}</span>
        {isRouting && agent && agent !== 'system' && (
          <>
            <span className="mx-1">→</span>
            <span style={{ color: AGENTS[agent].color }}>{AGENTS[agent].name}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

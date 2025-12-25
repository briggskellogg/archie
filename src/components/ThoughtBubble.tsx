import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThoughtBubbleProps {
  agent: string;      // "instinct", "logic", "psyche"
  name: string;       // Display name: "Snap", "Swarm", etc.
  content: string;    // The thought content
  isDisco: boolean;   // Whether disco mode was used
  index: number;      // For staggered animation
}

// Agent colors
const AGENT_COLORS: Record<string, { normal: string; disco: string }> = {
  instinct: { normal: '#E07A5F', disco: '#EF4444' },
  logic: { normal: '#6BB8C9', disco: '#22D3EE' },
  psyche: { normal: '#A78BCA', disco: '#C084FC' },
};

export function ThoughtBubble({ agent, name, content, isDisco, index }: ThoughtBubbleProps) {
  const colors = AGENT_COLORS[agent] || AGENT_COLORS.logic;
  const color = isDisco ? colors.disco : colors.normal;
  
  // Typing animation state
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  
  useEffect(() => {
    // Start typing after stagger delay
    const startDelay = index * 400; // 400ms between each thought starting
    
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
        delay: index * 0.4, // Stagger animation matches typing delay
        ease: 'easeOut' 
      }}
      className="flex items-start gap-2 mb-1.5"
    >
      {/* Agent indicator dot */}
      <div 
        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      
      {/* Thought content */}
      <div className="flex-1 min-w-0">
        {/* Agent name */}
        <span 
          className="text-[10px] font-mono font-medium mr-1.5"
          style={{ color }}
        >
          {name}
        </span>
        
        {/* Thought text - smaller, muted, with typing cursor */}
        <span className="text-xs text-ash/70 font-mono leading-relaxed">
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

// Container for multiple thoughts (displayed below Governor's response)
interface ThoughtsContainerProps {
  thoughts: Array<{
    agent: string;
    name: string;
    content: string;
    is_disco: boolean;
  }>;
}

export function ThoughtsContainer({ thoughts }: ThoughtsContainerProps) {
  if (!thoughts || thoughts.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3, delay: 0.5 }} // Delay to appear after Governor finishes typing
      className="mt-3 ml-10 pl-3 border-l-2 border-smoke/20"
    >
      <div className="text-[9px] text-ash/40 font-mono uppercase tracking-wider mb-2">
        Internal Council
      </div>
      <AnimatePresence>
        {thoughts.map((thought, idx) => (
          <ThoughtBubble
            key={`${thought.agent}-${idx}`}
            agent={thought.agent}
            name={thought.name}
            content={thought.content}
            isDisco={thought.is_disco}
            index={idx}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

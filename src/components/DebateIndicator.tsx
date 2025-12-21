import { motion, AnimatePresence } from 'framer-motion';
import { DebateMode } from '../types';

interface DebateIndicatorProps {
  mode: DebateMode;
}

export function DebateIndicator({ mode }: DebateIndicatorProps) {
  if (!mode) return null;
  
  const isIntense = mode === 'intense';
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full backdrop-blur-md border ${
          isIntense 
            ? 'bg-red-500/20 border-red-500/50 text-red-400' 
            : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
        }`}
        style={{
          animation: `${isIntense ? 'debate-pulse-intense' : 'debate-pulse-mild'} ${isIntense ? '1s' : '1.5s'} ease-in-out infinite`,
        }}
      >
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className={isIntense ? 'animate-bounce' : 'animate-pulse-soft'}>
            {isIntense ? '⚡' : '💬'}
          </span>
          <span>
            {isIntense 
              ? 'Agents debating intensely' 
              : 'Agents discussing'
            }
          </span>
          <span className="text-xs text-ash">
            — type to interrupt
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


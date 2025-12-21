import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';
import { AGENTS } from '../constants/agents';
import { getMemoryStats, getUserProfileSummary, MemoryStats } from '../hooks/useTauri';
import governorImage from '../assets/governor.png';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExpandedItem {
  type: 'pattern' | 'theme';
  key: string;
}

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const { userProfile } = useAppStore();
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [report, setReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayedReport, setDisplayedReport] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedItem, setExpandedItem] = useState<ExpandedItem | null>(null);
  const [itemSummary, setItemSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Fetch memory stats and generate report when modal opens
  useEffect(() => {
    if (isOpen) {
      generateReport();
    } else {
      setReport('');
      setDisplayedReport('');
      setExpandedItem(null);
      setItemSummary('');
    }
  }, [isOpen]);

  // Typewriter effect for report
  useEffect(() => {
    if (!report) return;
    
    let index = 0;
    const speed = 4;
    
    const timer = setInterval(() => {
      if (index < report.length) {
        setDisplayedReport(report.slice(0, index + speed));
        index += speed;
      } else {
        setDisplayedReport(report);
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [report]);

  const generateReport = async () => {
    setIsGenerating(true);
    setReport('');
    setDisplayedReport('');

    try {
      const [stats, _profileSummary] = await Promise.all([
        getMemoryStats(),
        getUserProfileSummary(),
      ]);
      
      setMemoryStats(stats);
      setLastUpdated(new Date());

      // Determine traits
      const traits = userProfile ? [
        { name: 'Logic', value: userProfile.logicWeight, agent: 'Dot', style: 'analytical' },
        { name: 'Instinct', value: userProfile.instinctWeight, agent: 'Snap', style: 'intuitive' },
        { name: 'Psyche', value: userProfile.psycheWeight, agent: 'Puff', style: 'introspective' },
      ].sort((a, b) => b.value - a.value) : [];

      const dominant = traits[0];
      const secondary = traits[1];
      const tertiary = traits[2];

      // Build conversational, emergent report
      let reportText = '';
      
      if (userProfile && userProfile.totalMessages > 0) {
        const messageCount = userProfile.totalMessages;
        const dominantPct = Math.round(dominant.value * 100);
        
        // Opening observation - varies based on message count
        if (messageCount < 20) {
          reportText += `We're still early in getting to know each other. After ${messageCount} messages from you, I'm starting to see how you think.\n\n`;
        } else if (messageCount < 50) {
          reportText += `I've been paying attention. Over ${messageCount} of your messages, patterns are emerging.\n\n`;
        } else if (messageCount < 100) {
          reportText += `We've built something here. ${messageCount} messages in, I have a solid read on how you operate.\n\n`;
        } else {
          reportText += `After ${messageCount} messages, I know you well. Here's what I've observed.\n\n`;
        }

        // Core observation - conversational, not clinical
        if (dominant.name === 'Logic') {
          if (dominantPct > 55) {
            reportText += `You're distinctly analytical. When something comes up, your first instinct is to break it down, find the structure, understand the mechanism. ${secondary.agent} occasionally pulls you toward ${secondary.style} thinking, but ${dominant.agent}'s methodical approach is clearly home base for you.\n\n`;
          } else {
            reportText += `You lean analytical, but you're not rigid about it. There's a balance — you want evidence and structure, but you don't dismiss ${secondary.style} insights when they surface. ${dominant.agent} leads, but ${secondary.agent} has your ear.\n\n`;
          }
        } else if (dominant.name === 'Instinct') {
          if (dominantPct > 55) {
            reportText += `You move fast. Your gut speaks and you listen — often reaching conclusions before you've fully articulated why. There's a confidence in how you cut through noise. ${secondary.agent} provides balance, but ${dominant.agent}'s quick-fire pattern matching is your default mode.\n\n`;
          } else {
            reportText += `Your instincts are sharp, but you check them. You trust your gut reads, yet you're willing to slow down when the stakes are high. ${dominant.agent} leads the charge, with ${secondary.agent} as a counterweight.\n\n`;
          }
        } else {
          if (dominantPct > 55) {
            reportText += `You go deep. When something matters, you're not satisfied with surface-level understanding — you want to know the why behind the what. Motivations, meaning, the emotional truth of things. ${dominant.agent}'s introspective lens is clearly your native mode.\n\n`;
          } else {
            reportText += `You're drawn to meaning, but you're practical about it. There's depth to how you think, but you don't get lost in it. ${dominant.agent} asks the deeper questions while ${secondary.agent} keeps things grounded.\n\n`;
          }
        }

        // Closing insight - forward looking
        const tertiaryPct = Math.round(tertiary.value * 100);
        if (tertiaryPct < 25) {
          reportText += `One thing to consider: you don't lean much into ${tertiary.style} thinking. That's not wrong — but ${tertiary.agent} might offer perspectives you're not naturally seeking out.`;
        } else {
          reportText += `Your cognitive balance is healthy — you're not overly reliant on any single mode of thinking. That flexibility serves you.`;
        }

      } else {
        reportText = `We haven't talked enough yet for me to have real observations.\n\n`;
        reportText += `I'm not going to give you generic insights — I'll wait until I actually have something meaningful to say about how you think.\n\n`;
        reportText += `Chat with the agents. Let them challenge you. I'll be watching, and I'll have more to offer once patterns emerge.`;
      }

      // Simulate thinking
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setReport(reportText);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setReport("Something went wrong generating the report. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate summary for a pattern or theme
  const handleItemClick = async (type: 'pattern' | 'theme', key: string, content: string) => {
    const itemKey = `${type}-${key}`;
    
    if (expandedItem?.key === itemKey) {
      setExpandedItem(null);
      setItemSummary('');
      return;
    }

    setExpandedItem({ type, key: itemKey });
    setIsSummarizing(true);
    setItemSummary('');

    // Generate a contextual summary
    await new Promise(resolve => setTimeout(resolve, 800));

    let summary = '';
    if (type === 'pattern') {
      // Pattern summaries
      const patternLower = content.toLowerCase();
      if (patternLower.includes('anxiety') || patternLower.includes('stress')) {
        summary = `This pattern has surfaced multiple times. It suggests this is something you're actively working through, not just a passing topic. The agents can help you explore it from different angles — Puff for the emotional depth, Dot for practical strategies, Snap for cutting through overthinking.`;
      } else if (patternLower.includes('decision') || patternLower.includes('choice')) {
        summary = `You seem to be navigating decisions actively. This pattern indicates you're not just thinking about choices abstractly — you're facing real ones. Consider which agent's perspective helps you most when the stakes feel high.`;
      } else {
        summary = `This pattern emerged from repeated signals in our conversations. It's not something I assigned — it's something you showed me through consistent behavior or focus.`;
      }
    } else {
      // Theme summaries
      summary = `"${content}" keeps coming up in our conversations. This isn't random — recurring themes usually reflect what's actively on your mind, whether you're aware of it or not. It might be worth asking yourself why this topic pulls your attention.`;
    }

    setItemSummary(summary);
    setIsSummarizing(false);
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showDetails = !isGenerating && displayedReport.length >= report.length;

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
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-8"
          >
            <div className="w-full max-w-lg bg-obsidian/98 backdrop-blur-xl border border-smoke/40 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-smoke/20 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl overflow-hidden"
                    style={{ 
                      boxShadow: '0 0 0 2px rgba(234, 179, 8, 0.3), 0 0 16px rgba(234, 179, 8, 0.15)',
                    }}
                  >
                    <img src={governorImage} alt="Governor" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="text-sm font-sans font-medium text-pearl">The Governor's Report</h2>
                    {lastUpdated && (
                      <p className="text-[10px] text-ash/50 font-mono">
                        Updated {formatDate(lastUpdated)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono text-ash bg-smoke/30 hover:bg-smoke/50 border border-smoke/50 transition-colors cursor-pointer"
                >
                  ESC
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {/* Report Content */}
                <div className="px-5 py-5">
                  {isGenerating ? (
                    <div className="flex items-center gap-3 py-12 justify-center">
                      <Loader2 className="w-5 h-5 text-aurora animate-spin" strokeWidth={1.5} />
                      <span className="text-sm text-ash/60 font-mono">Compiling observations...</span>
                    </div>
                  ) : (
                    <div className="text-[13px] text-pearl/80 font-mono leading-relaxed whitespace-pre-line">
                      {displayedReport}
                      {displayedReport.length < report.length && (
                        <motion.span
                          className="inline-block ml-0.5 w-[2px] h-[15px] bg-aurora align-middle"
                          animate={{ opacity: [1, 0.3] }}
                          transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Patterns - clickable */}
                {showDetails && memoryStats && memoryStats.topPatterns.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-5 pb-4"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1 h-3 rounded-full" style={{ backgroundColor: AGENTS.psyche.color }} />
                      <span className="text-[10px] text-ash/60 font-mono uppercase tracking-wide">Patterns observed</span>
                    </div>
                    <div className="space-y-2">
                      {memoryStats.topPatterns.slice(0, 3).map((pattern, i) => {
                        const isExpanded = expandedItem?.key === `pattern-${i}`;
                        return (
                          <div key={i}>
                            <button
                              onClick={() => handleItemClick('pattern', String(i), pattern.description)}
                              className="w-full text-left px-3 py-2 rounded-lg bg-charcoal/40 hover:bg-charcoal/60 border border-smoke/20 transition-all cursor-pointer group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <span 
                                    className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-medium uppercase mb-1"
                                    style={{ backgroundColor: `${AGENTS.psyche.color}20`, color: AGENTS.psyche.color }}
                                  >
                                    {pattern.patternType.replace(/_/g, ' ')}
                                  </span>
                                  <p className="text-[11px] text-pearl/70 font-mono">{pattern.description}</p>
                                </div>
                                <ChevronRight 
                                  className={`w-4 h-4 text-ash/40 group-hover:text-pearl/60 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                                  strokeWidth={1.5} 
                                />
                              </div>
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 py-2 mt-1 bg-charcoal/20 rounded-lg border-l-2" style={{ borderColor: AGENTS.psyche.color }}>
                                    {isSummarizing ? (
                                      <div className="flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 text-psyche animate-spin" />
                                        <span className="text-[10px] text-ash/50 font-mono">Governor is thinking...</span>
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-ash/70 font-mono leading-relaxed">{itemSummary}</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Themes - clickable */}
                {showDetails && memoryStats && memoryStats.topThemes.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="px-5 pb-4"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1 h-3 rounded-full" style={{ backgroundColor: AGENTS.instinct.color }} />
                      <span className="text-[10px] text-ash/60 font-mono uppercase tracking-wide">Recurring themes</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {memoryStats.topThemes.slice(0, 6).map((theme, i) => {
                        const isExpanded = expandedItem?.key === `theme-${i}`;
                        return (
                          <div key={i} className="relative">
                            <button
                              onClick={() => handleItemClick('theme', String(i), theme)}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-mono transition-all cursor-pointer ${
                                isExpanded 
                                  ? 'bg-instinct/20 border-instinct/40' 
                                  : 'hover:bg-charcoal/60'
                              }`}
                              style={{ 
                                background: isExpanded ? undefined : `linear-gradient(135deg, ${AGENTS.instinct.color}15 0%, ${AGENTS.logic.color}15 100%)`,
                                border: `1px solid ${isExpanded ? AGENTS.instinct.color : AGENTS.instinct.color + '30'}`,
                                color: '#e5e7eb',
                              }}
                            >
                              {theme}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {/* Theme summary - shows below all themes */}
                    <AnimatePresence>
                      {expandedItem?.type === 'theme' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-2"
                        >
                          <div className="px-3 py-2 bg-charcoal/20 rounded-lg border-l-2" style={{ borderColor: AGENTS.instinct.color }}>
                            {isSummarizing ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-3 h-3 text-instinct animate-spin" />
                                <span className="text-[10px] text-ash/50 font-mono">Governor is thinking...</span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-ash/70 font-mono leading-relaxed">{itemSummary}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>

              {/* Stats footer - compact, no percentages */}
              {showDetails && memoryStats && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-5 py-3 border-t border-smoke/20 flex-shrink-0"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-ash/50">
                    <div className="flex items-center gap-4">
                      <span>{memoryStats.factCount} facts learned</span>
                      <span>{memoryStats.patternCount} patterns</span>
                      <span>{memoryStats.topThemes.length} themes</span>
                    </div>
                    {userProfile && (
                      <span>{userProfile.totalMessages} messages</span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

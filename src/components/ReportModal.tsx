import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight, ExternalLink, RefreshCw, Sparkles, MessageSquare, Brain, Zap } from 'lucide-react';
import { useAppStore } from '../store';
import { getMemoryStats, MemoryStats, generateGovernorReport, generateUserSummary } from '../hooks/useTauri';
import governorImage from '../assets/governor-transparent.png';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApiModal?: () => void;
}

interface ExpandedItem {
  type: 'pattern' | 'theme';
  key: string;
}

export function ReportModal({ isOpen, onClose, onOpenApiModal }: ReportModalProps) {
  const { userProfile, hasAnyDiscoAgent } = useAppStore();
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [governorReport, setGovernorReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedItem, setExpandedItem] = useState<ExpandedItem | null>(null);
  const [itemSummary, setItemSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [lastKnownMessageCount, setLastKnownMessageCount] = useState<number>(0);
  const [lastKnownFactCount, setLastKnownFactCount] = useState<number>(0);
  const [userSummary, setUserSummary] = useState<string>('');

  // Fetch stats and generate report when modal opens (only if data changed)
  useEffect(() => {
    if (isOpen) {
      checkAndRefreshReport();
    } else {
      setExpandedItem(null);
      setItemSummary('');
    }
  }, [isOpen]);

  const checkAndRefreshReport = async () => {
    try {
      const currentStats = await getMemoryStats();
      const currentMessageCount = userProfile?.totalMessages || 0;
      const currentFactCount = currentStats.factCount;
      
      const hasNewData = currentMessageCount !== lastKnownMessageCount || 
                         currentFactCount !== lastKnownFactCount ||
                         !governorReport;
      
      if (hasNewData) {
        setLastKnownMessageCount(currentMessageCount);
        setLastKnownFactCount(currentFactCount);
        generateAllReports(currentStats);
      } else {
        setMemoryStats(currentStats);
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
      generateAllReports(null);
    }
  };

  const generateAllReports = async (stats: MemoryStats | null) => {
    setIsGenerating(true);
    setGovernorReport('');
    setUserSummary('');

    try {
      if (stats) {
        setMemoryStats(stats);
      } else {
        const fetchedStats = await getMemoryStats();
        setMemoryStats(fetchedStats);
      }
      setLastUpdated(new Date());

      // Generate report and summary in parallel
      const [report, summary] = await Promise.all([
        generateGovernorReport(),
        generateUserSummary(),
      ]);
      
      setGovernorReport(report);
      setUserSummary(summary);
    } catch (err) {
      console.error('Failed to generate reports:', err);
      setGovernorReport("Something went wrong generating the report. Try again.");
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

    await new Promise(resolve => setTimeout(resolve, 800));

    let summary = '';
    if (type === 'pattern') {
      const patternLower = content.toLowerCase();
      if (patternLower.includes('anxiety') || patternLower.includes('stress')) {
        summary = `This pattern has surfaced multiple times. It suggests this is something you're actively working through, not just a passing topic. The Governor can help you explore it from different angles through the agents.`;
      } else if (patternLower.includes('decision') || patternLower.includes('choice')) {
        summary = `You seem to be navigating decisions actively. This pattern indicates you're not just thinking about choices abstractly — you're facing real ones.`;
      } else {
        summary = `This pattern emerged from repeated signals in our conversations. It's not something I assigned — it's something you showed me through consistent behavior or focus.`;
      }
    } else {
      summary = `"${content}" keeps coming up in our conversations. This isn't random — recurring themes usually reflect what's actively on your mind, whether you're aware of it or not.`;
    }

    setItemSummary(summary);
    setIsSummarizing(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && isOpen && onOpenApiModal) {
        e.preventDefault();
        onOpenApiModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onOpenApiModal]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isDisco = hasAnyDiscoAgent();

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[500px] max-h-[80vh] bg-obsidian border border-smoke/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-smoke/20 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={governorImage} alt="Governor" className="w-8 h-8" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-sans font-medium text-pearl">Governor Report</h2>
                      {isDisco && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                          <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-pulse" strokeWidth={2} />
                          <span className="text-[9px] font-mono text-amber-400">Disco</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ash/50 font-mono">
                      {lastUpdated ? `Updated ${formatDate(lastUpdated)}` : 'Observations & insights'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateAllReports(null)}
                    disabled={isGenerating}
                    className="p-1.5 rounded text-ash/50 hover:text-pearl hover:bg-smoke/30 transition-colors disabled:opacity-50"
                    title="Refresh report"
                  >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={onClose}
                    className="px-1.5 py-1 rounded text-[10px] font-mono text-ash bg-smoke/30 hover:bg-smoke/50 border border-smoke/50 transition-colors cursor-pointer"
                  >
                    ESC
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* User Summary - Top Card */}
              {userSummary && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-aurora/10 to-violet-500/10 border border-aurora/20"
                >
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-aurora/70 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div>
                      <h3 className="text-xs font-mono text-aurora/70 uppercase tracking-wider mb-1.5">Who You Are</h3>
                      <p className="text-[13px] text-pearl/90 font-mono leading-relaxed">
                        {userSummary}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Governor's Observations */}
              <section className="bg-charcoal/30 rounded-xl p-4 border border-smoke/20">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-ash/50" strokeWidth={1.5} />
                  <h3 className="text-xs font-mono text-ash/60 uppercase tracking-wider">Observations</h3>
                </div>
                
                {isGenerating ? (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="w-5 h-5 text-aurora animate-spin" strokeWidth={1.5} />
                    <span className="text-sm text-ash/60 font-mono">Compiling observations...</span>
                  </div>
                ) : (
                  <p className="text-[13px] text-pearl/80 font-mono leading-relaxed">
                    {governorReport || 'Start a conversation to see the Governor\'s observations.'}
                  </p>
                )}
              </section>

              {/* Stats Row */}
              {memoryStats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-charcoal/30 rounded-xl p-3 border border-smoke/20 text-center">
                    <p className="text-lg font-mono text-pearl">{userProfile?.totalMessages || 0}</p>
                    <p className="text-[10px] text-ash/50 font-mono">Messages</p>
                  </div>
                  <div className="bg-charcoal/30 rounded-xl p-3 border border-smoke/20 text-center">
                    <p className="text-lg font-mono text-pearl">{memoryStats.factCount}</p>
                    <p className="text-[10px] text-ash/50 font-mono">Facts Learned</p>
                  </div>
                  <div className="bg-charcoal/30 rounded-xl p-3 border border-smoke/20 text-center">
                    <p className="text-lg font-mono text-pearl">{memoryStats.uniqueConversations}</p>
                    <p className="text-[10px] text-ash/50 font-mono">Conversations</p>
                  </div>
                </div>
              )}

              {/* Patterns & Themes - Combined List */}
              {memoryStats && (memoryStats.patterns.length > 0 || memoryStats.themes.length > 0) && (
                <section className="bg-charcoal/30 rounded-xl p-4 border border-smoke/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-ash/50" strokeWidth={1.5} />
                    <h3 className="text-xs font-mono text-ash/60 uppercase tracking-wider">Patterns & Themes</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Patterns */}
                    {memoryStats.patterns.map((pattern, idx) => {
                      const itemKey = `pattern-${idx}`;
                      const isExpanded = expandedItem?.key === itemKey;
                      
                      return (
                        <div key={itemKey}>
                          <button
                            onClick={() => handleItemClick('pattern', String(idx), pattern)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                              isExpanded
                                ? 'bg-smoke/40 border border-smoke/50'
                                : 'bg-smoke/20 hover:bg-smoke/30 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-aurora/70 bg-aurora/10 uppercase">Pattern</span>
                                <span className="text-[12px] text-pearl font-mono">{pattern}</span>
                              </div>
                              <ChevronRight className={`w-3.5 h-3.5 text-ash/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={1.5} />
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 py-2 ml-4 border-l-2 border-aurora/30">
                                  {isSummarizing ? (
                                    <div className="flex items-center gap-2 py-1">
                                      <Loader2 className="w-3 h-3 text-aurora/60 animate-spin" strokeWidth={1.5} />
                                      <span className="text-[11px] text-ash/60 font-mono">Thinking...</span>
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-ash/80 font-mono leading-relaxed">{itemSummary}</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                    
                    {/* Themes */}
                    {memoryStats.themes.map((theme, idx) => {
                      const itemKey = `theme-${idx}`;
                      const isExpanded = expandedItem?.key === itemKey;
                      
                      return (
                        <div key={itemKey}>
                          <button
                            onClick={() => handleItemClick('theme', String(idx), theme)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                              isExpanded
                                ? 'bg-smoke/40 border border-smoke/50'
                                : 'bg-smoke/20 hover:bg-smoke/30 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-violet-400/70 bg-violet-500/10 uppercase">Theme</span>
                                <span className="text-[12px] text-pearl font-mono">{theme}</span>
                              </div>
                              <ChevronRight className={`w-3.5 h-3.5 text-ash/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={1.5} />
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 py-2 ml-4 border-l-2 border-violet-500/30">
                                  {isSummarizing ? (
                                    <div className="flex items-center gap-2 py-1">
                                      <Loader2 className="w-3 h-3 text-violet-400/60 animate-spin" strokeWidth={1.5} />
                                      <span className="text-[11px] text-ash/60 font-mono">Thinking...</span>
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-ash/80 font-mono leading-relaxed">{itemSummary}</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Governor Reference */}
              <div className="text-center pt-2">
                <a 
                  href="https://chuck-nbc.fandom.com/wiki/The_Governor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] text-ash/40 hover:text-ash/70 font-mono transition-colors"
                >
                  <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                  Reference: The Governor in Chuck
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

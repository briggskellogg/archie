import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight, ExternalLink, Key } from 'lucide-react';
import { useAppStore } from '../store';
import { AGENTS } from '../constants/agents';
import { getMemoryStats, MemoryStats, getAllPersonaProfiles } from '../hooks/useTauri';
import { PersonaProfile } from '../types';
import governorImage from '../assets/governor.png';

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
  const { userProfile, agentModes } = useAppStore();
  const activeAgentCount = Object.values(agentModes).filter(m => m !== 'off').length;
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [overallReport, setOverallReport] = useState<string>('');
  const [profileReports, setProfileReports] = useState<{id: string; name: string; report: string; dominantTrait: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedItem, setExpandedItem] = useState<ExpandedItem | null>(null);
  const [itemSummary, setItemSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [allProfiles, setAllProfiles] = useState<PersonaProfile[]>([]);
  const [lastKnownMessageCount, setLastKnownMessageCount] = useState<number>(0);
  const [lastKnownFactCount, setLastKnownFactCount] = useState<number>(0);

  // Fetch profiles and generate report when modal opens (only if data changed)
  useEffect(() => {
    if (isOpen) {
      checkAndRefreshReport();
    } else {
      // Reset expanded state when closing, but keep report cached
      setExpandedItem(null);
      setItemSummary('');
    }
  }, [isOpen]);

  const checkAndRefreshReport = async () => {
    try {
      // First, fetch current stats to check if we need to regenerate
      const currentStats = await getMemoryStats();
      const profiles = await getAllPersonaProfiles();
      setAllProfiles(profiles);
      
      const currentTotalMessages = profiles.reduce((sum, p) => sum + p.messageCount, 0);
      const currentFactCount = currentStats.factCount;
      
      // Check if data has changed since last report
      const hasNewData = currentTotalMessages !== lastKnownMessageCount || 
                         currentFactCount !== lastKnownFactCount ||
                         !overallReport; // Also regenerate if we don't have a report yet
      
      if (hasNewData) {
        // Data changed, regenerate report
        setLastKnownMessageCount(currentTotalMessages);
        setLastKnownFactCount(currentFactCount);
        generateAllReports(profiles, currentStats);
      } else {
        // No changes, just update the profiles list without regenerating
        setMemoryStats(currentStats);
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
      // On error, try to generate anyway
      fetchProfilesAndGenerateReport();
    }
  };

  const fetchProfilesAndGenerateReport = async () => {
    try {
      const profiles = await getAllPersonaProfiles();
      setAllProfiles(profiles);
      const stats = await getMemoryStats();
      generateAllReports(profiles, stats);
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
      generateAllReports([], null);
    }
  };

  const generateAllReports = async (profiles: PersonaProfile[], stats: MemoryStats | null) => {
    setIsGenerating(true);
    setOverallReport('');
    setProfileReports([]);

    try {
      if (stats) {
        setMemoryStats(stats);
      } else {
        const fetchedStats = await getMemoryStats();
        setMemoryStats(fetchedStats);
      }
      setLastUpdated(new Date());

      // Generate overall report
      const overall = generateOverallReport(profiles);
      
      // Generate individual profile reports
      const individual = profiles.map(profile => ({
        id: profile.id,
        name: profile.name,
        report: generateSingleProfileReport(profile),
        dominantTrait: profile.dominantTrait,
      }));

      // Simulate thinking
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOverallReport(overall);
      setProfileReports(individual);
    } catch (err) {
      console.error('Failed to generate reports:', err);
      setOverallReport("Something went wrong generating the report. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateOverallReport = (profiles: PersonaProfile[]): string => {
    const totalMessages = profiles.reduce((sum, p) => sum + p.messageCount, 0);
    
    if (totalMessages === 0) {
      return `We haven't talked enough yet for me to have real observations. I'm not going to give you generic insights — I'll wait until I actually have something meaningful to say about how you think.`;
    }

    let report = '';
    
    // Opening
    if (totalMessages < 50) {
      report += `Across your ${profiles.length} profiles, I've tracked ${totalMessages} messages. Patterns are beginning to emerge.`;
    } else if (totalMessages < 150) {
      report += `With ${totalMessages} messages across ${profiles.length} profiles, I have a solid read on how you operate in different contexts.`;
    } else {
      report += `${totalMessages} messages. ${profiles.length} profiles. I know you well — in all your modes.`;
    }

    // Cross-profile observation
    const activeProfiles = profiles.filter(p => p.messageCount > 0);
    if (activeProfiles.length > 1) {
      const dominantTraits = activeProfiles.map(p => p.dominantTrait);
      const uniqueDominants = [...new Set(dominantTraits)];
      
      if (uniqueDominants.length === 1) {
        report += ` Interestingly, ${uniqueDominants[0]} dominates across all your active profiles. Your core thinking style persists regardless of context.`;
      } else {
        report += ` Your profiles show genuine cognitive diversity — you shift between ${uniqueDominants.join(', ')} depending on context. That's valuable flexibility.`;
      }
    }

    return report;
  };

  const generateSingleProfileReport = (profile: PersonaProfile): string => {
    const traits = [
      { name: 'Logic', value: profile.logicWeight, agent: 'Dot', style: 'analytical' },
      { name: 'Instinct', value: profile.instinctWeight, agent: 'Snap', style: 'intuitive' },
      { name: 'Psyche', value: profile.psycheWeight, agent: 'Puff', style: 'introspective' },
    ].sort((a, b) => b.value - a.value);

    const dominant = traits[0];
    const secondary = traits[1];
    const tertiary = traits[2];
    const dominantPct = Math.round(dominant.value * 100);
    const tertiaryPct = Math.round(tertiary.value * 100);

    let reportText = '';
    
    if (profile.messageCount === 0) {
      reportText = `You haven't used the "${profile.name}" profile yet.\n\n`;
      reportText += `This profile is ${profile.dominantTrait}-dominant by design. When you're ready to explore this mode of thinking, switch to this profile and start a conversation.\n\n`;
      reportText += `I'll be watching and learning from day one.`;
      return reportText;
    }

    // Opening
    if (profile.messageCount < 20) {
      reportText += `The "${profile.name}" profile: ${profile.messageCount} messages so far. Early days, but patterns are forming.\n\n`;
    } else if (profile.messageCount < 50) {
      reportText += `"${profile.name}" — ${profile.messageCount} messages in. I'm getting a clear picture.\n\n`;
    } else {
      reportText += `Your "${profile.name}" profile is well-established. ${profile.messageCount} messages tell a story.\n\n`;
    }

    // Core observation
    if (dominant.name === 'Logic') {
      if (dominantPct > 55) {
        reportText += `In this mode, you're distinctly analytical. ${dominant.agent}'s methodical approach is your default, with ${secondary.agent} occasionally providing ${secondary.style} counterpoints.\n\n`;
      } else {
        reportText += `You lean analytical here, but with balance. ${dominant.agent} leads, but ${secondary.agent} has influence.\n\n`;
      }
    } else if (dominant.name === 'Instinct') {
      if (dominantPct > 55) {
        reportText += `In "${profile.name}" mode, you trust your gut. ${dominant.agent}'s quick-fire pattern matching dominates, with ${secondary.agent} as backup.\n\n`;
      } else {
        reportText += `Your instincts lead here, but you check them. ${dominant.agent} moves first, ${secondary.agent} validates.\n\n`;
      }
    } else {
      if (dominantPct > 55) {
        reportText += `"${profile.name}" is your introspective mode. ${dominant.agent} digs deep, asking the questions that matter.\n\n`;
      } else {
        reportText += `Depth characterizes this profile, but you stay practical. ${dominant.agent} explores meaning while ${secondary.agent} keeps things grounded.\n\n`;
      }
    }

    // Closing
    if (tertiaryPct < 25) {
      reportText += `Worth noting: ${tertiary.style} thinking is minimal here. ${tertiary.agent} might offer perspectives you're missing in this mode.`;
    } else {
      reportText += `This profile shows good cognitive balance — you're not over-reliant on any single mode.`;
    }

    return reportText;
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      // ⌘K to open API key modal
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showDetails = !isGenerating && overallReport.length > 0;

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
              <div className="px-5 py-4 border-b border-smoke/20 flex-shrink-0">
                {/* Top row: Title and connection status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl overflow-hidden"
                      style={{ 
                        boxShadow: '0 0 0 2px rgba(234, 179, 8, 0.3), 0 0 16px rgba(234, 179, 8, 0.15)',
                      }}
                    >
                      <img src={governorImage} alt="Governor" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-sans font-medium text-pearl">The Governor</h2>
                      {/* Routing pill with hover tooltip */}
                      <div className="relative group/routing">
                        {activeAgentCount > 1 ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 cursor-help">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[9px] font-mono text-amber-400">Routing</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-ash/10 cursor-help">
                            <span className="w-1.5 h-1.5 rounded-full bg-ash/40" />
                            <span className="text-[9px] font-mono text-ash/60">Direct</span>
                          </span>
                        )}
                        {/* Hover tooltip */}
                        <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-obsidian border border-smoke/40 rounded-xl shadow-xl opacity-0 invisible group-hover/routing:opacity-100 group-hover/routing:visible transition-all duration-200 z-50 pointer-events-none group-hover/routing:pointer-events-auto">
                          <p className="text-[11px] text-ash/70 font-mono leading-relaxed mb-2">
                            {activeAgentCount > 1 
                              ? 'Governor is routing — orchestrates agent turn-taking and prevents cognitive overload for both human and machine.'
                              : 'Governor not routing — in single-agent mode, the Governor has no need to orchestrate.'
                            }
                          </p>
                          <p className="text-[10px] text-ash/50 font-mono mb-2">
                            Also manages your personalized knowledge-base.
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
                      </div>
                    </div>
                  </div>
                  {/* Connection status & API key - top right */}
                  <div className="flex items-center gap-2">
                    {userProfile?.apiKey && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-emerald-500/80 font-mono">Connected</span>
                      </span>
                    )}
                    {onOpenApiModal && (
                      <button
                        onClick={onOpenApiModal}
                        className="flex items-center gap-2 px-1.5 py-1 rounded text-ash/60 hover:text-pearl hover:bg-smoke/30 transition-colors cursor-pointer"
                        title="Change API Key (⌘K)"
                      >
                        <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <kbd className="w-5 h-5 bg-smoke/30 rounded text-[9px] font-mono text-ash/50 border border-smoke/40 flex items-center justify-center">⌘K</kbd>
                      </button>
                    )}
                  </div>
                </div>
                {/* Subtitle row */}
                <p className="text-[10px] text-ash/50 font-mono ml-[52px]">
                  {activeAgentCount > 1 ? 'Multi-agent orchestration active' : 'Single-agent mode'}
                </p>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {/* Overall Report Section */}
                <div className="px-6 py-5 border-b border-smoke/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-ash/50 uppercase tracking-wide">Overview</span>
                    {lastUpdated && (
                      <span className="text-[10px] text-ash/40 font-mono">
                        Updated on {formatDate(lastUpdated)}
                      </span>
                    )}
                  </div>
                  {isGenerating ? (
                    <div className="flex items-center gap-3 py-10 justify-center">
                      <Loader2 className="w-5 h-5 text-aurora animate-spin" strokeWidth={1.5} />
                      <span className="text-sm text-ash/60 font-mono">Compiling observations...</span>
                    </div>
                  ) : (
                    <p className="text-[13px] text-pearl/80 font-mono leading-relaxed">
                      {overallReport}
                    </p>
                  )}
                </div>

                {/* Individual Profile Sections */}
                {!isGenerating && profileReports.length > 0 && (
                  <div className="px-6 py-5">
                    <span className="text-xs font-mono text-ash/50 uppercase tracking-wide block mb-3">Profile Insights</span>
                    <div className="space-y-4">
                    {profileReports.map((pr, index) => {
                      const traitColor = pr.dominantTrait === 'logic' ? '#00D4FF' 
                        : pr.dominantTrait === 'instinct' ? '#EF4444' 
                        : '#E040FB';
                      const profile = allProfiles.find(p => p.id === pr.id);
                      
                      return (
                        <motion.div
                          key={pr.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-5 rounded-xl border border-smoke/30 bg-charcoal/20"
                          style={{ borderLeftColor: traitColor, borderLeftWidth: '3px' }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-sm font-mono font-medium"
                                style={{ color: traitColor }}
                              >
                                {pr.name}
                              </span>
                              <span className="text-[9px] font-mono text-ash/40 uppercase">
                                {pr.dominantTrait}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-ash/50">
                              {profile?.messageCount || 0} messages
                            </span>
                          </div>
                          <p className="text-[12px] text-pearl/70 font-mono leading-relaxed">
                            {pr.report}
                          </p>
                        </motion.div>
                      );
                    })}
                    </div>
                  </div>
                )}

                {/* Patterns - clickable */}
                {showDetails && memoryStats && memoryStats.topPatterns.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-6 py-5 border-t border-smoke/10"
                  >
                    <div className="flex items-center gap-1.5 mb-4">
                      <div className="w-1 h-3 rounded-full" style={{ backgroundColor: AGENTS.psyche.color }} />
                      <span className="text-[10px] text-ash/60 font-mono uppercase tracking-wide">Patterns observed</span>
                    </div>
                    <div className="space-y-3">
                      {memoryStats.topPatterns.slice(0, 3).map((pattern, i) => {
                        const isExpanded = expandedItem?.key === `pattern-${i}`;
                        return (
                          <div key={i}>
                            <button
                              onClick={() => handleItemClick('pattern', String(i), pattern.description)}
                              className="w-full text-left px-4 py-3 rounded-lg bg-charcoal/40 hover:bg-charcoal/60 border border-smoke/20 transition-all cursor-pointer group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <span 
                                    className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-medium uppercase mb-2"
                                    style={{ backgroundColor: `${AGENTS.psyche.color}20`, color: AGENTS.psyche.color }}
                                  >
                                    {pattern.patternType.replace(/_/g, ' ')}
                                  </span>
                                  <p className="text-[11px] text-pearl/70 font-mono leading-relaxed">{pattern.description}</p>
                                </div>
                                <ChevronRight 
                                  className={`w-4 h-4 text-ash/40 group-hover:text-pearl/60 transition-transform ml-3 ${isExpanded ? 'rotate-90' : ''}`} 
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
                    className="px-6 py-5 border-t border-smoke/10"
                  >
                    <div className="flex items-center gap-1.5 mb-4">
                      <div className="w-1 h-3 rounded-full" style={{ backgroundColor: AGENTS.instinct.color }} />
                      <span className="text-[10px] text-ash/60 font-mono uppercase tracking-wide">Recurring themes</span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {memoryStats.topThemes.slice(0, 6).map((theme, i) => {
                        const isExpanded = expandedItem?.key === `theme-${i}`;
                        return (
                          <div key={i} className="relative">
                            <button
                              onClick={() => handleItemClick('theme', String(i), theme)}
                              className={`px-4 py-2 rounded-full text-[11px] font-mono transition-all cursor-pointer ${
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

              {/* Stats footer */}
              {showDetails && memoryStats && (
                <div className="px-5 py-3 border-t border-smoke/20 flex-shrink-0">
                  <div className="flex items-center justify-between text-[10px] font-mono text-ash/50">
                    <div className="flex items-center gap-3">
                      <span>{memoryStats.factCount} facts learned</span>
                      <span className="text-ash/30">|</span>
                      <span>{memoryStats.patternCount} patterns</span>
                      <span className="text-ash/30">|</span>
                      <span>{memoryStats.topThemes.length} themes</span>
                    </div>
                    {userProfile && (
                      <span>{userProfile.totalMessages} total messages</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

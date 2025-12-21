import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from './store';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ChatWindow } from './components/ChatWindow';
import { Settings } from './components/Settings';
import { ReportModal } from './components/ReportModal';
import { initApp, getUserProfile } from './hooks/useTauri';
import { AGENTS } from './constants/agents';

function App() {
  const {
    setUserProfile,
    isSettingsOpen,
    setSettingsOpen,
    activeAgents,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);

  // Open report modal (closes settings first)
  const handleOpenReport = () => {
    setSettingsOpen(false);
    setReportOpen(true);
  };

  // Initialize app
  useEffect(() => {
    async function init() {
      try {
        await initApp();
        const profile = await getUserProfile();
        setUserProfile(profile);
        
        // Check if BOTH API keys are needed (require OpenAI AND Anthropic)
        if (!profile.apiKey || !profile.anthropicKey) {
          setNeedsApiKey(true);
        }
      } catch (err) {
        console.error('Failed to initialize:', err);
        setNeedsApiKey(true);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [setUserProfile]);

  // Handle API key setup complete - only close if BOTH keys are present
  const handleApiKeyComplete = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
      // Only close modal if both keys are now present
      if (profile.apiKey && profile.anthropicKey) {
        setNeedsApiKey(false);
      }
    } catch (err) {
      console.error('Failed to get profile:', err);
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-ai-mesh">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="flex gap-4 mb-6 justify-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              className="w-12 h-12 rounded-full overflow-hidden border-2"
              style={{ borderColor: AGENTS.instinct.color }}
            >
              <img src={AGENTS.instinct.avatar} alt="Instinct" className="w-full h-full object-cover" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              className="w-12 h-12 rounded-full overflow-hidden border-2"
              style={{ borderColor: AGENTS.logic.color }}
            >
              <img src={AGENTS.logic.avatar} alt="Logic" className="w-full h-full object-cover" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
              className="w-12 h-12 rounded-full overflow-hidden border-2"
              style={{ borderColor: AGENTS.psyche.color }}
            >
              <img src={AGENTS.psyche.avatar} alt="Psyche" className="w-full h-full object-cover" />
            </motion.div>
          </div>
          <p className="text-ash font-mono text-sm">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-void">
      {/* Chat window is always visible */}
      <ChatWindow onOpenSettings={() => setSettingsOpen(true)} />

      {/* API Key modal overlays the chat when needed */}
      <ApiKeyModal 
        isOpen={needsApiKey} 
        onComplete={handleApiKeyComplete} 
      />

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        onRequestReport={handleOpenReport}
        activeAgentCount={Object.values(activeAgents).filter(Boolean).length}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}

export default App;

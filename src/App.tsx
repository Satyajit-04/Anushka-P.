import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  FileText, Bot, HardDrive, Cpu, Settings, Split, Maximize2, 
  Minimize2, PanelLeftClose, PanelLeft, Sparkles, BookOpen, Layers, 
  ArrowRight, ShieldCheck
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { DrivePickerModal } from './components/DrivePickerModal';
import { DocumentViewer } from './components/DocumentViewer';
import { ChatInterface } from './components/ChatInterface';
import { ModelSettingsModal } from './components/ModelSettingsModal';
import { 
  ChatMessage, 
  ChatSourceCitation, 
  LLMConfig, 
  PDFDocumentData, 
  WebLLMProgress 
} from './types';
import { initAuth, googleSignIn, logout } from './services/firebaseAuth';
import { retrieveDocumentContext } from './services/pdfParser';
import { generateChatResponse, checkWebGPUSupport } from './services/llmService';
import { createSamplePdfDocument } from './services/sampleDocs';

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'gemini-server',
  webLlmModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  lmStudioEndpoint: 'http://localhost:1234/v1',
  temperature: 0.2,
  maxTokens: 1024,
  topKChunks: 6,
};

export default function App() {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Document state
  const [activeDoc, setActiveDoc] = useState<PDFDocumentData | null>(null);
  const [activeCitationPage, setActiveCitationPage] = useState<number | null>(null);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);

  // LLM Configuration & Chat state
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(DEFAULT_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [webLlmProgress, setWebLlmProgress] = useState<WebLLMProgress | null>(null);

  // Layout state
  const [showDocPanel, setShowDocPanel] = useState(true);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authenticatedUser) => {
        setUser(authenticatedUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Pre-load default sample document so user has instant interactive experience
  useEffect(() => {
    if (!activeDoc) {
      const sample = createSamplePdfDocument(0);
      setActiveDoc(sample);
    }
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result?.user) {
        setUser(result.user);
        setIsDrivePickerOpen(true);
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleDocumentLoaded = (doc: PDFDocumentData) => {
    setActiveDoc(doc);
    setActiveCitationPage(1);
    setMessages([]);
    setShowDocPanel(true);
  };

  const handleSelectCitationPage = (page: number) => {
    setActiveCitationPage(page);
    setShowDocPanel(true);
  };

  const handleSendMessage = useCallback(async (userPrompt: string) => {
    if (!userPrompt.trim() || isGenerating || !activeDoc) return;

    // 1. Context Retrieval (Multi-page for summaries, Top-K semantic for specific questions)
    const { citations, contextChunks } = retrieveDocumentContext(
      userPrompt,
      activeDoc,
      llmConfig.topKChunks
    );

    const userMessageId = `msg_${Date.now()}_user`;
    const botMessageId = `msg_${Date.now()}_bot`;

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    };

    const initialBotMessage: ChatMessage = {
      id: botMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      sources: citations,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, initialBotMessage]);
    setIsGenerating(true);

    const startTime = performance.now();
    let tokenCount = 0;

    try {
      const response = await generateChatResponse(
        userPrompt,
        contextChunks,
        llmConfig,
        (tokenDelta, fullTextSoFar) => {
          tokenCount++;
          const elapsedSec = (performance.now() - startTime) / 1000;
          const tokensPerSec = elapsedSec > 0.2 ? tokenCount / elapsedSec : undefined;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: fullTextSoFar, tokensPerSec }
                : msg
            )
          );
        },
        (progress) => {
          setWebLlmProgress(progress);
        }
      );

      const totalElapsedSec = (performance.now() - startTime) / 1000;
      const finalTokensPerSec = totalElapsedSec > 0.2 ? tokenCount / totalElapsedSec : undefined;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content: response || 'No response generated.',
                isStreaming: false,
                tokensPerSec: finalTokensPerSec,
              }
            : msg
        )
      );
    } catch (err: any) {
      console.error('Generation error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content: `Error during local model inference:\n${err.message || 'Unknown generation error'}\n\n*Tip: You can switch inference provider (e.g. to Gemini or Ollama) in Settings.*`,
                isStreaming: false,
                error: true,
              }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }, [activeDoc, isGenerating, llmConfig]);

  return (
    <div className="flex h-screen flex-col bg-[#FDFCF8] font-sans text-[#4A443F] antialiased overflow-hidden selection:bg-[#E8F0E8] selection:text-[#2C332C]">
      
      {/* Top Navigation */}
      <Navbar
        user={user}
        activeDoc={activeDoc}
        llmConfig={llmConfig}
        onOpenDrivePicker={() => setIsDrivePickerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isSigningIn={isSigningIn}
        onSelectProvider={(provider) => setLlmConfig((prev) => ({ ...prev, provider }))}
      />

      {/* Main Workspace Area */}
      <main className="flex flex-1 overflow-hidden bg-[#FDFCF8]">
        
        {/* Left / Split Panel: PDF Document Reader & RAG Index */}
        {activeDoc && showDocPanel && (
          <div className="w-full md:w-1/2 lg:w-5/12 flex-shrink-0 h-full overflow-hidden border-r border-[#E5E0D5] bg-[#F4F1EC]">
            <DocumentViewer
              document={activeDoc}
              activePageFocus={activeCitationPage}
              onPageChange={(page) => setActiveCitationPage(page)}
            />
          </div>
        )}

        {/* Right Panel: Chat Interface */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#FDFCF8]">
          
          {/* Document Panel Toggle Button */}
          {activeDoc && (
            <div className="absolute left-3 top-3 z-10 hidden md:block">
              <button
                onClick={() => setShowDocPanel(!showDocPanel)}
                title={showDocPanel ? 'Collapse PDF reader' : 'Show PDF reader'}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DCD7CD] bg-white/90 shadow-xs text-[#7A7167] hover:bg-white hover:text-[#2C332C] hover:border-[#5B6D5B]/30 transition"
              >
                {showDocPanel ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </button>
            </div>
          )}

          <ChatInterface
            document={activeDoc}
            messages={messages}
            isGenerating={isGenerating}
            onSendMessage={handleSendMessage}
            onClearChat={() => setMessages([])}
            onSelectCitationPage={handleSelectCitationPage}
            llmConfig={llmConfig}
            webLlmProgress={webLlmProgress}
            onOpenDrivePicker={() => setIsDrivePickerOpen(true)}
          />
        </div>

      </main>

      {/* Google Drive PDF Explorer Modal */}
      <DrivePickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        user={user}
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
        onDocumentLoaded={handleDocumentLoaded}
        currentDocId={activeDoc?.id}
      />

      {/* Model & RAG Settings Modal */}
      <ModelSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={llmConfig}
        onSaveConfig={(newConfig) => setLlmConfig(newConfig)}
      />

    </div>
  );
}

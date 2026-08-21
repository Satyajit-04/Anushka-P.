import React from 'react';
import { FileText, HardDrive, Cpu, Settings, LogIn, LogOut, ChevronDown, Check, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';
import { LLMConfig, PDFDocumentData } from '../types';
import { AVAILABLE_WEBLLM_MODELS } from '../services/llmService';

interface NavbarProps {
  user: User | null;
  activeDoc: PDFDocumentData | null;
  llmConfig: LLMConfig;
  onOpenDrivePicker: () => void;
  onOpenSettings: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  isSigningIn: boolean;
  onSelectProvider: (provider: LLMConfig['provider']) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeDoc,
  llmConfig,
  onOpenDrivePicker,
  onOpenSettings,
  onSignIn,
  onSignOut,
  isSigningIn,
  onSelectProvider,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = React.useState(false);

  const getProviderLabel = () => {
    switch (llmConfig.provider) {
      case 'browser-webllm': {
        const found = AVAILABLE_WEBLLM_MODELS.find((m) => m.id === llmConfig.webLlmModel);
        return {
          badge: 'Local WebGPU',
          name: found ? found.name.split('(')[0].trim() : 'Local WebLLM',
          color: 'bg-[#E8F0E8] text-[#5B6D5B] border-[#5B6D5B]/20',
          dot: 'bg-[#5B6D5B]',
        };
      }
      case 'local-ollama':
        return {
          badge: 'Local Ollama',
          name: llmConfig.ollamaModel || 'llama3.2',
          color: 'bg-[#EBE7DF] text-[#4A443F] border-[#DCD7CD]',
          dot: 'bg-[#5B6D5B]',
        };
      case 'local-lmstudio':
        return {
          badge: 'Local LM Studio',
          name: 'Local Server',
          color: 'bg-[#F2EFE9] text-[#7A7167] border-[#DCD7CD]',
          dot: 'bg-[#7A7167]',
        };
      case 'gemini-server':
        return {
          badge: 'Cloud AI',
          name: 'Gemini 2.5 Flash',
          color: 'bg-[#E8F0E8] text-[#5B6D5B] border-[#5B6D5B]/30',
          dot: 'bg-[#5B6D5B]',
        };
    }
  };

  const currentLabel = getProviderLabel();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#E5E0D5] bg-[#FDFCF8]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand & Active Document */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B6D5B] text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-[#2C332C]">LocalDoc AI</span>
                <span className="hidden rounded-full bg-[#E8F0E8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5B6D5B] sm:inline-block border border-[#5B6D5B]/20">
                  Privacy-First LLM
                </span>
              </div>
              <p className="text-xs text-[#9A9289] hidden sm:block">Private document RAG with Google Drive</p>
            </div>
          </div>

          {activeDoc && (
            <div className="hidden items-center gap-2 rounded-xl border border-[#E5E0D5] bg-[#F4F1EC] px-3 py-1.5 md:flex max-w-xs truncate shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#5B6D5B]" />
              <span className="truncate text-xs font-semibold text-[#2C332C]" title={activeDoc.name}>
                {activeDoc.name}
              </span>
              <span className="text-[11px] text-[#9A9289]">({activeDoc.totalPages}p)</span>
            </div>
          )}
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Drive Selector Button */}
          <button
            id="btn-open-drive-picker"
            onClick={onOpenDrivePicker}
            className="flex items-center gap-2 rounded-xl border border-[#DCD7CD] bg-white px-3.5 py-2 text-xs font-semibold text-[#5B6D5B] shadow-xs transition hover:bg-[#F4F1EC] hover:border-[#5B6D5B]/40 active:scale-95"
          >
            <HardDrive className="h-4 w-4 text-[#5B6D5B]" />
            <span>{activeDoc ? 'Switch PDF' : 'Import from Drive'}</span>
          </button>

          {/* Model Switcher Dropdown */}
          <div className="relative">
            <button
              id="btn-model-dropdown-toggle"
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-xs transition active:scale-95 ${currentLabel.color}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${currentLabel.dot}`} />
              <Cpu className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-semibold">{currentLabel.name}</span>
              <span className="sm:hidden">{currentLabel.badge}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>

            {modelDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setModelDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E5E0D5] bg-white p-2.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9A9289]">
                    Active Inference Engine
                  </div>

                  <button
                    onClick={() => {
                      onSelectProvider('browser-webllm');
                      setModelDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                      llmConfig.provider === 'browser-webllm' ? 'bg-[#E8F0E8] text-[#2C332C] font-semibold' : 'text-[#4A443F] hover:bg-[#F4F1EC]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#5B6D5B]" />
                        <span>In-Browser WebGPU LLM</span>
                      </div>
                      <p className="text-[11px] text-[#9A9289] pl-3.5">100% offline & local memory</p>
                    </div>
                    {llmConfig.provider === 'browser-webllm' && <Check className="h-4 w-4 text-[#5B6D5B]" />}
                  </button>

                  <button
                    onClick={() => {
                      onSelectProvider('local-ollama');
                      setModelDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                      llmConfig.provider === 'local-ollama' ? 'bg-[#EBE7DF] text-[#2C332C] font-semibold' : 'text-[#4A443F] hover:bg-[#F4F1EC]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#7A7167]" />
                        <span>Local Ollama Server</span>
                      </div>
                      <p className="text-[11px] text-[#9A9289] pl-3.5">localhost:11434 desktop app</p>
                    </div>
                    {llmConfig.provider === 'local-ollama' && <Check className="h-4 w-4 text-[#5B6D5B]" />}
                  </button>

                  <button
                    onClick={() => {
                      onSelectProvider('local-lmstudio');
                      setModelDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                      llmConfig.provider === 'local-lmstudio' ? 'bg-[#F2EFE9] text-[#2C332C] font-semibold' : 'text-[#4A443F] hover:bg-[#F4F1EC]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#9A9289]" />
                        <span>Local LM Studio</span>
                      </div>
                      <p className="text-[11px] text-[#9A9289] pl-3.5">localhost:1234/v1</p>
                    </div>
                    {llmConfig.provider === 'local-lmstudio' && <Check className="h-4 w-4 text-[#5B6D5B]" />}
                  </button>

                  <button
                    onClick={() => {
                      onSelectProvider('gemini-server');
                      setModelDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                      llmConfig.provider === 'gemini-server' ? 'bg-[#E8F0E8] text-[#2C332C] font-semibold' : 'text-[#4A443F] hover:bg-[#F4F1EC]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#5B6D5B]" />
                        <span>Gemini 2.5 Flash</span>
                      </div>
                      <p className="text-[11px] text-[#9A9289] pl-4">Cloud fallback proxy</p>
                    </div>
                    {llmConfig.provider === 'gemini-server' && <Check className="h-4 w-4 text-[#5B6D5B]" />}
                  </button>

                  <div className="my-1.5 border-t border-[#E5E0D5]" />
                  <button
                    onClick={() => {
                      setModelDropdownOpen(false);
                      onOpenSettings();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-[#7A7167] hover:bg-[#F4F1EC] hover:text-[#2C332C]"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Configure Models & Parameters</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Settings button */}
          <button
            id="btn-nav-settings"
            onClick={onOpenSettings}
            title="Model & RAG Settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCD7CD] bg-white text-[#7A7167] shadow-xs transition hover:border-[#5B6D5B]/40 hover:bg-[#F4F1EC] hover:text-[#2C332C]"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* User Profile / Google Sign in */}
          {user ? (
            <div className="flex items-center gap-2 border-l border-[#E5E0D5] pl-2 sm:pl-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google Account'}
                  className="h-8 w-8 rounded-full border border-[#DCD7CD] shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F0E8] text-xs font-bold text-[#5B6D5B]">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="hidden lg:block text-left text-xs">
                <p className="font-semibold text-[#2C332C] leading-tight truncate max-w-[110px]">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-[#9A9289]">Google Drive Connected</p>
              </div>
              <button
                id="btn-sign-out"
                onClick={onSignOut}
                title="Disconnect Google Drive"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[#9A9289] hover:bg-[#F4F1EC] hover:text-[#4A443F] transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-sign-in-google-nav"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 rounded-xl bg-[#5B6D5B] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4D5C4D] active:scale-95 disabled:opacity-50"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{isSigningIn ? 'Connecting...' : 'Connect Drive'}</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { 
  X, Cpu, HardDrive, Sliders, Check, AlertCircle, RefreshCw, 
  Sparkles, Terminal, Info, Globe, ShieldCheck
} from 'lucide-react';
import { LLMConfig, LLMProviderType } from '../types';
import { 
  AVAILABLE_WEBLLM_MODELS, 
  checkWebGPUSupport, 
  testOllamaConnection, 
  testLMStudioConnection 
} from '../services/llmService';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onSaveConfig: (newConfig: LLMConfig) => void;
}

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [localConfig, setLocalConfig] = useState<LLMConfig>(config);
  const [ollamaStatus, setOllamaStatus] = useState<{ testing: boolean; result?: { success: boolean; models?: string[]; error?: string } }>({ testing: false });
  const [lmStudioStatus, setLmStudioStatus] = useState<{ testing: boolean; result?: { success: boolean; models?: string[]; error?: string } }>({ testing: false });
  const hasWebGPU = checkWebGPUSupport();

  if (!isOpen) return null;

  const handleTestOllama = async () => {
    setOllamaStatus({ testing: true });
    const res = await testOllamaConnection(localConfig.ollamaEndpoint);
    setOllamaStatus({ testing: false, result: res });
    if (res.success && res.models && res.models.length > 0 && !res.models.includes(localConfig.ollamaModel)) {
      setLocalConfig((prev) => ({ ...prev, ollamaModel: res.models![0] }));
    }
  };

  const handleTestLMStudio = async () => {
    setLmStudioStatus({ testing: true });
    const res = await testLMStudioConnection(localConfig.lmStudioEndpoint);
    setLmStudioStatus({ testing: false, result: res });
  };

  const handleSave = () => {
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-[#E5E0D5] bg-[#FDFCF8] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E0D5] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B6D5B] text-white shadow-xs">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2C332C]">LLM Engine & RAG Configuration</h2>
              <p className="text-xs text-[#9A9289]">Configure local inference model, server endpoints, and retrieval parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#9A9289] hover:bg-[#F4F1EC] hover:text-[#2C332C] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Provider Selection */}
          <div>
            <label className="text-[10px] font-bold text-[#2C332C] uppercase tracking-wider">
              1. Select Inference Provider
            </label>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Option 1: In-Browser WebGPU */}
              <button
                type="button"
                onClick={() => setLocalConfig((c) => ({ ...c, provider: 'browser-webllm' }))}
                className={`flex flex-col text-left rounded-2xl border p-4 transition ${
                  localConfig.provider === 'browser-webllm'
                    ? 'border-[#5B6D5B] bg-[#E8F0E8]/70 shadow-xs'
                    : 'border-[#E5E0D5] bg-white hover:border-[#5B6D5B]/40 hover:bg-[#FDFCF8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#5B6D5B]" />
                    <span className="text-xs font-bold text-[#2C332C]">In-Browser WebGPU</span>
                  </div>
                  {localConfig.provider === 'browser-webllm' && <Check className="h-4 w-4 text-[#5B6D5B]" />}
                </div>
                <p className="text-[11px] text-[#7A7167] mt-1.5 leading-relaxed">
                  100% private. Runs directly on your device GPU via WebLLM.
                </p>
                {!hasWebGPU && (
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold">
                    <AlertCircle className="h-3 w-3" /> WebGPU disabled in browser
                  </span>
                )}
              </button>

              {/* Option 2: Local Ollama */}
              <button
                type="button"
                onClick={() => setLocalConfig((c) => ({ ...c, provider: 'local-ollama' }))}
                className={`flex flex-col text-left rounded-2xl border p-4 transition ${
                  localConfig.provider === 'local-ollama'
                    ? 'border-[#5B6D5B] bg-[#EBE7DF] shadow-xs'
                    : 'border-[#E5E0D5] bg-white hover:border-[#5B6D5B]/40 hover:bg-[#FDFCF8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#7A7167]" />
                    <span className="text-xs font-bold text-[#2C332C]">Local Ollama</span>
                  </div>
                  {localConfig.provider === 'local-ollama' && <Check className="h-4 w-4 text-[#5B6D5B]" />}
                </div>
                <p className="text-[11px] text-[#7A7167] mt-1.5 leading-relaxed">
                  Connect to your local Ollama desktop instance (e.g. Llama 3, DeepSeek, Mistral).
                </p>
              </button>

              {/* Option 3: Local LM Studio */}
              <button
                type="button"
                onClick={() => setLocalConfig((c) => ({ ...c, provider: 'local-lmstudio' }))}
                className={`flex flex-col text-left rounded-2xl border p-4 transition ${
                  localConfig.provider === 'local-lmstudio'
                    ? 'border-[#5B6D5B] bg-[#F2EFE9] shadow-xs'
                    : 'border-[#E5E0D5] bg-white hover:border-[#5B6D5B]/40 hover:bg-[#FDFCF8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#9A9289]" />
                    <span className="text-xs font-bold text-[#2C332C]">Local LM Studio</span>
                  </div>
                  {localConfig.provider === 'local-lmstudio' && <Check className="h-4 w-4 text-[#5B6D5B]" />}
                </div>
                <p className="text-[11px] text-[#7A7167] mt-1.5 leading-relaxed">
                  OpenAI-compatible local server at localhost:1234.
                </p>
              </button>

              {/* Option 4: Cloud Gemini Proxy */}
              <button
                type="button"
                onClick={() => setLocalConfig((c) => ({ ...c, provider: 'gemini-server' }))}
                className={`flex flex-col text-left rounded-2xl border p-4 transition ${
                  localConfig.provider === 'gemini-server'
                    ? 'border-[#5B6D5B] bg-[#E8F0E8]/70 shadow-xs'
                    : 'border-[#E5E0D5] bg-white hover:border-[#5B6D5B]/40 hover:bg-[#FDFCF8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#5B6D5B]" />
                    <span className="text-xs font-bold text-[#2C332C]">Gemini 3.7 Flash</span>
                  </div>
                  {localConfig.provider === 'gemini-server' && <Check className="h-4 w-4 text-[#5B6D5B]" />}
                </div>
                <p className="text-[11px] text-[#7A7167] mt-1.5 leading-relaxed">
                  Instant cloud fallback with zero client hardware requirements.
                </p>
              </button>

            </div>
          </div>

          {/* Provider Specific Settings */}
          {localConfig.provider === 'browser-webllm' && (
            <div className="rounded-2xl border border-[#E5E0D5] bg-white p-5 space-y-3.5 shadow-xs">
              <label className="text-xs font-bold text-[#2C332C]">
                Choose In-Browser WebGPU Model:
              </label>
              <div className="space-y-2">
                {AVAILABLE_WEBLLM_MODELS.map((model) => (
                  <label
                    key={model.id}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                      localConfig.webLlmModel === model.id
                        ? 'border-[#5B6D5B] bg-[#E8F0E8]/60 shadow-xs'
                        : 'border-[#E5E0D5] bg-white hover:bg-[#FDFCF8]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="webLlmModel"
                      value={model.id}
                      checked={localConfig.webLlmModel === model.id}
                      onChange={(e) => setLocalConfig((c) => ({ ...c, webLlmModel: e.target.value }))}
                      className="mt-0.5 accent-[#5B6D5B]"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#2C332C]">{model.name}</span>
                        <div className="flex gap-2 text-[10px] text-[#9A9289] font-semibold">
                          <span>{model.sizeText}</span>
                          <span>•</span>
                          <span>{model.vramText}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#7A7167] mt-0.5 leading-relaxed">{model.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {localConfig.provider === 'local-ollama' && (
            <div className="rounded-2xl border border-[#E5E0D5] bg-white p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2C332C]">Ollama API Endpoint:</label>
                <button
                  type="button"
                  onClick={handleTestOllama}
                  disabled={ollamaStatus.testing}
                  className="flex items-center gap-1.5 rounded-xl border border-[#DCD7CD] bg-white px-3 py-1 text-xs font-semibold text-[#5B6D5B] hover:bg-[#F4F1EC] transition shadow-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${ollamaStatus.testing ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
              </div>

              <input
                type="text"
                value={localConfig.ollamaEndpoint}
                onChange={(e) => setLocalConfig((c) => ({ ...c, ollamaEndpoint: e.target.value }))}
                placeholder="http://localhost:11434"
                className="w-full rounded-xl border border-[#DCD7CD] bg-[#FDFCF8] px-3.5 py-2 text-xs text-[#2C332C] outline-none focus:border-[#5B6D5B]/50 transition"
              />

              <div>
                <label className="text-xs font-bold text-[#2C332C]">Model Name:</label>
                <input
                  type="text"
                  value={localConfig.ollamaModel}
                  onChange={(e) => setLocalConfig((c) => ({ ...c, ollamaModel: e.target.value }))}
                  placeholder="llama3.2 or mistral or gemma2"
                  className="mt-1 w-full rounded-xl border border-[#DCD7CD] bg-[#FDFCF8] px-3.5 py-2 text-xs text-[#2C332C] outline-none focus:border-[#5B6D5B]/50 transition"
                />
              </div>

              {ollamaStatus.result && (
                <div
                  className={`rounded-xl p-3 text-xs ${
                    ollamaStatus.result.success
                      ? 'bg-[#E8F0E8] text-[#2C332C] border border-[#5B6D5B]/30'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {ollamaStatus.result.success ? (
                    <div>
                      <span className="font-bold text-[#5B6D5B]">Connected to Ollama!</span>
                      {ollamaStatus.result.models && ollamaStatus.result.models.length > 0 && (
                        <p className="mt-1 text-[11px] text-[#4A443F]">
                          Available models: {ollamaStatus.result.models.join(', ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="font-semibold">Connection Failed:</span> {ollamaStatus.result.error}
                    </div>
                  )}
                </div>
              )}

              {/* Ollama CORS helper */}
              <div className="rounded-xl border border-[#E5E0D5] bg-[#FDFCF8] p-3.5 text-[11px] text-[#4A443F]">
                <div className="flex items-center gap-1.5 font-bold text-[#2C332C] mb-1">
                  <Terminal className="h-3.5 w-3.5 text-[#5B6D5B]" />
                  <span>Enabling CORS in Ollama (if connection fails)</span>
                </div>
                <p className="text-[#7A7167]">Run Ollama with origins allowed so web apps can reach it:</p>
                <code className="mt-1 block rounded-lg bg-[#EBE7DF] p-2 font-mono text-[10px] text-[#2C332C]">
                  OLLAMA_ORIGINS="*" ollama serve
                </code>
              </div>
            </div>
          )}

          {localConfig.provider === 'local-lmstudio' && (
            <div className="rounded-2xl border border-[#E5E0D5] bg-white p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2C332C]">LM Studio Endpoint:</label>
                <button
                  type="button"
                  onClick={handleTestLMStudio}
                  disabled={lmStudioStatus.testing}
                  className="flex items-center gap-1.5 rounded-xl border border-[#DCD7CD] bg-white px-3 py-1 text-xs font-semibold text-[#5B6D5B] hover:bg-[#F4F1EC] transition shadow-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${lmStudioStatus.testing ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
              </div>

              <input
                type="text"
                value={localConfig.lmStudioEndpoint}
                onChange={(e) => setLocalConfig((c) => ({ ...c, lmStudioEndpoint: e.target.value }))}
                placeholder="http://localhost:1234/v1"
                className="w-full rounded-xl border border-[#DCD7CD] bg-[#FDFCF8] px-3.5 py-2 text-xs text-[#2C332C] outline-none focus:border-[#5B6D5B]/50 transition"
              />

              {lmStudioStatus.result && (
                <div
                  className={`rounded-xl p-3 text-xs ${
                    lmStudioStatus.result.success
                      ? 'bg-[#E8F0E8] text-[#2C332C] border border-[#5B6D5B]/30'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {lmStudioStatus.result.success ? (
                    <div>
                      <span className="font-bold text-[#5B6D5B]">Connected to LM Studio!</span>
                      {lmStudioStatus.result.models && (
                        <p className="mt-1 text-[11px] text-[#4A443F]">
                          Loaded models: {lmStudioStatus.result.models.join(', ') || 'Default loaded model'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="font-semibold">Connection Failed:</span> {lmStudioStatus.result.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* RAG & Generation Parameters */}
          <div className="space-y-4 border-t border-[#E5E0D5] pt-4">
            <label className="text-[10px] font-bold text-[#2C332C] uppercase tracking-wider">
              2. Generation & Retrieval Parameters
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between text-xs text-[#4A443F] mb-1 font-semibold">
                  <span>Temperature (Creativity)</span>
                  <span className="font-bold text-[#2C332C]">{localConfig.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={localConfig.temperature}
                  onChange={(e) => setLocalConfig((c) => ({ ...c, temperature: parseFloat(e.target.value) }))}
                  className="w-full accent-[#5B6D5B]"
                />
                <div className="flex justify-between text-[10px] text-[#9A9289]">
                  <span>0.0 (Strict/Precise)</span>
                  <span>1.0 (Creative)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <div className="flex items-center justify-between text-xs text-[#4A443F] mb-1 font-semibold">
                  <span>Max Tokens</span>
                  <span className="font-bold text-[#2C332C]">{localConfig.maxTokens}</span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="128"
                  value={localConfig.maxTokens}
                  onChange={(e) => setLocalConfig((c) => ({ ...c, maxTokens: parseInt(e.target.value, 10) }))}
                  className="w-full accent-[#5B6D5B]"
                />
                <div className="flex justify-between text-[10px] text-[#9A9289]">
                  <span>256 tokens</span>
                  <span>4,096 tokens</span>
                </div>
              </div>

              {/* Top-K Chunks */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between text-xs text-[#4A443F] mb-1 font-semibold">
                  <span>RAG Top-K Context Segments</span>
                  <span className="font-bold text-[#2C332C]">{localConfig.topKChunks} chunks</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="1"
                  value={localConfig.topKChunks}
                  onChange={(e) => setLocalConfig((c) => ({ ...c, topKChunks: parseInt(e.target.value, 10) }))}
                  className="w-full accent-[#5B6D5B]"
                />
                <p className="text-[11px] text-[#9A9289] mt-0.5">
                  Number of most relevant PDF excerpt chunks injected into the context prompt per query.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E5E0D5] bg-[#F4F1EC] px-6 py-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[#7A7167]">
            <ShieldCheck className="h-4 w-4 text-[#5B6D5B]" />
            <span className="font-medium">Settings saved in local session</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#DCD7CD] bg-white px-4 py-2 text-xs font-semibold text-[#7A7167] hover:bg-stone-50 transition shadow-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-[#5B6D5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4D5C4D] transition shadow-xs"
            >
              Apply Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User as UserIcon, Sparkles, Copy, Check, Trash2, 
  Download, RefreshCw, AlertCircle, Bookmark, Cpu, ChevronRight, CornerDownLeft,
  FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, ChatSourceCitation, LLMConfig, PDFDocumentData, WebLLMProgress } from '../types';

interface ChatInterfaceProps {
  document: PDFDocumentData | null;
  messages: ChatMessage[];
  isGenerating: boolean;
  onSendMessage: (query: string) => void;
  onClearChat: () => void;
  onSelectCitationPage: (page: number) => void;
  llmConfig: LLMConfig;
  webLlmProgress: WebLLMProgress | null;
  onOpenDrivePicker: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  document,
  messages,
  isGenerating,
  onSendMessage,
  onClearChat,
  onSelectCitationPage,
  llmConfig,
  webLlmProgress,
  onOpenDrivePicker,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating, webLlmProgress]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSummarize = () => {
    onSendMessage('Provide a comprehensive summary of this document, covering the main goals, key findings, structure, and conclusion.');
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const docName = document?.name || 'Document';
    const text = messages
      .map((m) => `[${m.role.toUpperCase()}] (${new Date(m.timestamp).toLocaleTimeString()}):\n${m.content}\n`)
      .join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `Chat_${docName.replace(/\.pdf$/i, '')}_Export.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col bg-[#FDFCF8]">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#E5E0D5] bg-white/70 backdrop-blur-md px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F0E8] text-[#5B6D5B] shadow-xs">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#2C332C]">LocalDoc Chat Engine</h3>
            <p className="text-[11px] text-[#9A9289]">
              {document ? `Grounded on ${document.name}` : 'Awaiting document selection'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {document && (
            <button
              id="btn-header-summarize"
              onClick={handleSummarize}
              disabled={isGenerating}
              title="Generate a full summary of this document"
              className="flex h-8 items-center gap-1.5 rounded-xl border border-[#DCD7CD] bg-white px-3 text-xs font-semibold text-[#5B6D5B] hover:bg-[#E8F0E8] hover:border-[#5B6D5B]/50 transition shadow-xs disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Summarize Document</span>
            </button>
          )}

          {messages.length > 0 && (
            <>
              <button
                onClick={handleExportChat}
                title="Export conversation as Markdown"
                className="flex h-8 items-center gap-1.5 rounded-xl border border-[#DCD7CD] bg-white px-3 text-xs font-semibold text-[#5B6D5B] hover:bg-[#F4F1EC] transition shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={onClearChat}
                title="Clear conversation"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DCD7CD] bg-white text-[#9A9289] hover:bg-[#F4F1EC] hover:text-red-600 transition shadow-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* WebLLM Model Download Progress Banner */}
      {webLlmProgress && !webLlmProgress.loaded && (
        <div className="border-b border-[#E5E0D5] bg-[#E8F0E8]/70 px-6 py-3">
          <div className="flex items-center justify-between text-xs text-[#2C332C] font-semibold mb-1.5">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 animate-spin text-[#5B6D5B]" />
              <span>Loading Local WebGPU Model weights into browser cache...</span>
            </div>
            <span className="font-bold text-[#5B6D5B]">{Math.round(webLlmProgress.progress * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#DCD7CD]">
            <div
              className="h-full bg-[#5B6D5B] transition-all duration-300 rounded-full"
              style={{ width: `${webLlmProgress.progress * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-[#7A7167] mt-1 truncate">{webLlmProgress.text}</p>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        
        {/* If no document selected */}
        {!document && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F0E8] text-[#5B6D5B] shadow-xs border border-[#5B6D5B]/20">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-[#2C332C]">Select a PDF to Start Chatting</h3>
            <p className="mt-1.5 max-w-sm text-xs text-[#9A9289] leading-relaxed">
              Connect your Google Drive to load your documents, or pick from sample research papers to test local AI reasoning.
            </p>
            <button
              onClick={onOpenDrivePicker}
              className="mt-5 flex items-center gap-2 rounded-xl bg-[#5B6D5B] px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-[#4D5C4D] active:scale-95"
            >
              <span>Browse Documents</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Initial Empty State with Single Option: Summarize Document */}
        {document && messages.length === 0 && (
          <div className="py-2">
            <div className="rounded-2xl border border-[#E5E0D5] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#5B6D5B] uppercase tracking-wider mb-1">
                <Sparkles className="h-3.5 w-3.5 text-[#5B6D5B]" />
                <span>Document Ready</span>
              </div>
              <p className="text-xs text-[#4A443F] leading-relaxed">
                <span className="font-semibold text-[#2C332C]">{document.name}</span> ({document.totalPages} {document.totalPages === 1 ? 'page' : 'pages'}) is indexed and ready.
              </p>

              {/* Single Option: Small and sweet Summarize Document button */}
              <div className="mt-3.5 flex items-center gap-3">
                <button
                  id="btn-option-summarize-doc"
                  onClick={handleSummarize}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#5B6D5B] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#4B5A4B] active:scale-95 disabled:opacity-50 group"
                >
                  <FileText className="h-3.5 w-3.5 text-[#E8F0E8] group-hover:scale-105 transition-transform" />
                  <span>Summarize Document</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => {
          const isUser = message.role === 'user';
          const isCopied = copiedId === message.id;

          return (
            <div
              key={message.id}
              className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse justify-start' : 'justify-start'}`}
            >
              {/* Avatar */}
              {!isUser ? (
                <div className="w-10 h-10 rounded-2xl bg-[#5B6D5B] shrink-0 flex items-center justify-center text-white shadow-md">
                  <Bot className="h-5 w-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F2EFE9] border border-[#DCD7CD] shrink-0 flex items-center justify-center text-[#7A7167] shadow-xs">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}

              {/* Message Box */}
              <div
                className={`group relative max-w-[82%] sm:max-w-[75%] p-5 text-sm leading-relaxed transition ${
                  isUser
                    ? 'bg-[#5B6D5B] rounded-3xl rounded-tr-none shadow-lg text-white'
                    : 'bg-white rounded-3xl rounded-tl-none shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[#E5E0D5] text-[#4A443F]'
                }`}
              >
                {/* Error Banner */}
                {message.error && (
                  <div className="mb-2 flex items-center gap-1.5 text-red-600 font-semibold text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Inference Error</span>
                  </div>
                )}

                {/* Message Content */}
                <div className={`prose prose-sm max-w-none break-words ${isUser ? 'text-white prose-invert' : 'text-[#4A443F]'}`}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>

                {/* Source Citations */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3.5 border-t border-[#E5E0D5]/70 pt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9289] mb-2 flex items-center gap-1.5">
                      <Bookmark className="h-3 w-3 text-[#5B6D5B]" />
                      <span>Referenced Document Pages:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {message.sources.map((src, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => onSelectCitationPage(src.pageNumber)}
                          title={src.excerpt}
                          className="flex items-center gap-1.5 rounded-xl border border-[#E5E0D5] bg-[#FDFCF8] px-2.5 py-1 text-xs font-bold text-[#5B6D5B] transition hover:bg-[#E8F0E8] hover:border-[#5B6D5B]/40 active:scale-95 shadow-xs"
                        >
                          <span>Page {src.pageNumber}</span>
                          <ChevronRight className="h-3 w-3 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Footer */}
                <div className={`mt-3 flex items-center justify-between text-[11px] ${isUser ? 'text-white/70' : 'text-[#9A9289]'}`}>
                  <div className="flex items-center gap-2">
                    <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {message.tokensPerSec && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isUser ? 'bg-white/20 text-white' : 'bg-[#F2EFE9] text-[#7A7167]'}`}>
                        {message.tokensPerSec.toFixed(1)} t/s
                      </span>
                    )}
                  </div>
                  
                  {!isUser && (
                    <button
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      className="opacity-0 group-hover:opacity-100 transition hover:text-[#2C332C]"
                      title="Copy response"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-[#5B6D5B]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Generating Indicator */}
        {isGenerating && (
          <div className="flex items-start gap-3.5 justify-start">
            <div className="w-10 h-10 rounded-2xl bg-[#5B6D5B] shrink-0 flex items-center justify-center text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div className="rounded-3xl rounded-tl-none border border-[#E5E0D5] bg-white p-5 text-[#4A443F] shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex items-center gap-2.5">
              <RefreshCw className="h-4 w-4 animate-spin text-[#5B6D5B]" />
              <span className="text-xs text-[#7A7167] font-medium">Generating local response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-6 bg-white/80 backdrop-blur-sm border-t border-[#E5E0D5]">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              ref={inputRef}
              id="input-chat-prompt"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!document || isGenerating}
              placeholder={
                !document
                  ? 'Select or load a PDF to start asking questions...'
                  : 'Ask about the risks, budget, key takeaways, or any specific question...'
              }
              className="w-full bg-[#F2EFE9] border-2 border-transparent focus:border-[#5B6D5B]/40 focus:bg-white focus:outline-none rounded-2xl px-6 py-4 pr-16 text-sm text-[#2C332C] placeholder-[#9A9289] transition-all shadow-inner disabled:opacity-50"
            />
            <button
              id="btn-send-chat"
              type="submit"
              disabled={!inputText.trim() || !document || isGenerating}
              className="absolute right-2.5 w-11 h-11 bg-[#5B6D5B] rounded-xl flex items-center justify-center text-white shadow-md hover:bg-[#4D5C4D] hover:shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Privacy & Engine Badges */}
          <div className="flex items-center justify-center gap-4 mt-3.5">
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5B6D5B" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-[10px] text-[#9A9289] font-bold uppercase tracking-widest">
                AES-256 Storage
              </span>
            </div>
            <div className="w-1 h-1 rounded-full bg-[#DCD7CD]" />
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5B6D5B" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className="text-[10px] text-[#9A9289] font-bold uppercase tracking-widest">
                Local Processing Only
              </span>
            </div>
            <div className="w-1 h-1 rounded-full bg-[#DCD7CD]" />
            <div className="text-[10px] text-[#7A7167] font-semibold">
              {llmConfig.provider === 'browser-webllm' ? 'WebGPU' : llmConfig.provider === 'local-ollama' ? 'Ollama' : llmConfig.provider === 'local-lmstudio' ? 'LM Studio' : 'Gemini'}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

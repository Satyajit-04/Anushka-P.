import React, { useState, useEffect } from 'react';
import { 
  FileText, ChevronLeft, ChevronRight, Search, Layers, Info, 
  Copy, Check, ExternalLink, Hash, Eye, Sparkles, BookOpen
} from 'lucide-react';
import { PDFDocumentData } from '../types';
import { formatFileSize } from '../services/googleDriveService';

interface DocumentViewerProps {
  document: PDFDocumentData;
  activePageFocus?: number | null;
  onPageChange?: (page: number) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  activePageFocus,
  onPageChange,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'pages' | 'chunks' | 'stats'>('pages');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  // Sync when user clicks a citation from chat
  useEffect(() => {
    if (activePageFocus && activePageFocus >= 1 && activePageFocus <= document.totalPages) {
      setCurrentPage(activePageFocus);
      setActiveTab('pages');
    }
  }, [activePageFocus, document.totalPages]);

  const currentPageData = document.pages.find((p) => p.pageNumber === currentPage);

  const handleNextPage = () => {
    if (currentPage < document.totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      onPageChange?.(nextPage);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      onPageChange?.(prevPage);
    }
  };

  const handleCopyPageText = () => {
    if (currentPageData) {
      navigator.clipboard.writeText(currentPageData.text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const totalCharacters = document.pages.reduce((acc, p) => acc + p.text.length, 0);
  const estimatedTokens = Math.round(totalCharacters / 4);

  // Highlight search term in text
  const renderHighlightedText = (text: string) => {
    if (!docSearchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${docSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === docSearchQuery.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5 font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[#F4F1EC] border-r border-[#E5E0D5]">
      
      {/* Top Header */}
      <div className="border-b border-[#E5E0D5] p-5 bg-[#F4F1EC]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#5B6D5B] flex items-center justify-center text-white shrink-0 shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#2C332C] truncate" title={document.name}>
                {document.name}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-[#9A9289] font-medium mt-0.5">
                <span>{document.totalPages} Pages</span>
                <span>•</span>
                <span>{document.chunks.length} RAG Chunks</span>
                <span>•</span>
                <span className="capitalize">{document.sourceType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="mt-4 flex rounded-xl bg-[#EBE7DF] p-1 text-xs font-semibold text-[#7A7167]">
          <button
            id="tab-view-pages"
            onClick={() => setActiveTab('pages')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              activeTab === 'pages' ? 'bg-white text-[#2C332C] shadow-xs font-bold' : 'hover:text-[#2C332C]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Document Pages</span>
          </button>

          <button
            id="tab-view-chunks"
            onClick={() => setActiveTab('chunks')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              activeTab === 'chunks' ? 'bg-white text-[#2C332C] shadow-xs font-bold' : 'hover:text-[#2C332C]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>RAG Chunks</span>
          </button>

          <button
            id="tab-view-stats"
            onClick={() => setActiveTab('stats')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              activeTab === 'stats' ? 'bg-white text-[#2C332C] shadow-xs font-bold' : 'hover:text-[#2C332C]'
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>Info & Privacy</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Document Pages */}
      {activeTab === 'pages' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          
          {/* Controls Bar: Search & Page navigation */}
          <div className="flex items-center justify-between border-b border-[#E5E0D5] bg-[#EBE7DF]/60 px-5 py-2.5">
            <div className="relative flex-1 max-w-[210px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9A9289]" />
              <input
                type="text"
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                placeholder="Find in page..."
                className="w-full rounded-xl border border-[#DCD7CD] bg-white py-1.5 pl-8 pr-2.5 text-xs text-[#2C332C] placeholder-[#9A9289] outline-none focus:border-[#5B6D5B]/50 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-prev-page"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DCD7CD] bg-white text-[#7A7167] hover:bg-[#F4F1EC] hover:text-[#2C332C] disabled:opacity-40 transition shadow-xs"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-1 text-xs text-[#4A443F] font-semibold px-1">
                <span>Page</span>
                <select
                  value={currentPage}
                  onChange={(e) => {
                    const p = parseInt(e.target.value, 10);
                    setCurrentPage(p);
                    onPageChange?.(p);
                  }}
                  className="rounded-lg border border-[#DCD7CD] bg-white px-2 py-1 text-xs font-bold text-[#2C332C] outline-none shadow-xs"
                >
                  {document.pages.map((p) => (
                    <option key={p.pageNumber} value={p.pageNumber}>
                      {p.pageNumber}
                    </option>
                  ))}
                </select>
                <span>of {document.totalPages}</span>
              </div>

              <button
                id="btn-next-page"
                onClick={handleNextPage}
                disabled={currentPage >= document.totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DCD7CD] bg-white text-[#7A7167] hover:bg-[#F4F1EC] hover:text-[#2C332C] disabled:opacity-40 transition shadow-xs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={handleCopyPageText}
                title="Copy current page text"
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-xl border border-[#DCD7CD] bg-white text-[#7A7167] hover:bg-[#F4F1EC] hover:text-[#5B6D5B] transition shadow-xs"
              >
                {copiedText ? <Check className="h-3.5 w-3.5 text-[#5B6D5B]" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Page Document Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {currentPageData && currentPageData.text.trim().length > 0 ? (
              <div className="rounded-2xl border border-[#E5E0D5] bg-white p-6 shadow-sm">
                <div className="mb-3.5 flex items-center justify-between border-b border-[#E5E0D5] pb-2.5 text-[10px] font-bold uppercase tracking-wider text-[#9A9289]">
                  <span className="flex items-center gap-1.5 text-[#5B6D5B]">
                    <Hash className="h-3 w-3" /> Page {currentPage} Extracted Content
                  </span>
                  <span>{currentPageData.text.length} characters</span>
                </div>
                <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#4A443F]">
                  {renderHighlightedText(currentPageData.text)}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[#9A9289]">
                <FileText className="h-8 w-8 mb-2 opacity-40 text-[#7A7167]" />
                <p className="text-xs">Page {currentPage} has no readable extracted text.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: RAG Chunks */}
      {activeTab === 'chunks' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="text-[11px] text-[#7A7167] font-medium">
            {document.chunks.length} semantically partitioned chunks indexed in memory:
          </div>
          {document.chunks.map((chunk, idx) => (
            <div
              key={chunk.id || idx}
              className="rounded-2xl border border-[#E5E0D5] bg-white p-4 text-xs transition hover:border-[#5B6D5B]/50 hover:bg-[#FDFCF8] shadow-xs"
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-[#7A7167] mb-2">
                <span className="rounded-lg bg-[#E8F0E8] px-2 py-0.5 text-[#5B6D5B] font-bold">
                  Source Page {chunk.pageNumber}
                </span>
                <span className="text-[#9A9289]">Chunk #{idx + 1} • {chunk.text.length} chars</span>
              </div>
              <p className="line-clamp-4 text-[#4A443F] leading-relaxed">{chunk.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Document Stats & Info */}
      {activeTab === 'stats' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="rounded-2xl border border-[#E5E0D5] bg-white p-5 space-y-3.5 shadow-sm">
            <h4 className="font-bold text-[#2C332C] border-b border-[#E5E0D5] pb-2.5">Document Metadata</h4>
            <div className="grid grid-cols-2 gap-3.5 text-[#4A443F]">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#9A9289]">File Name</p>
                <p className="font-semibold text-[#2C332C] break-all mt-0.5">{document.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#9A9289]">File Size</p>
                <p className="font-semibold text-[#2C332C] mt-0.5">{formatFileSize(document.size)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#9A9289]">Total Pages</p>
                <p className="font-semibold text-[#2C332C] mt-0.5">{document.totalPages}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#9A9289]">Estimated Tokens</p>
                <p className="font-semibold text-[#2C332C] mt-0.5">~{estimatedTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#9A9289]">Total Characters</p>
                <p className="font-semibold text-[#2C332C] mt-0.5">{totalCharacters.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#9A9289]">RAG Chunk Segments</p>
                <p className="font-semibold text-[#2C332C] mt-0.5">{document.chunks.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCD7CD] bg-[#E8F0E8] p-5">
            <h4 className="font-bold text-[#2C332C] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5B6D5B]" />
              Local Privacy Assurance
            </h4>
            <p className="text-xs text-[#4A443F] leading-relaxed">
              When using In-Browser WebGPU or Local Ollama, this document content is loaded directly into your browser's private memory and is never transmitted to external third-party AI cloud servers.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

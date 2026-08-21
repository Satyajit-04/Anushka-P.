import React, { useState, useEffect } from 'react';
import { 
  X, Search, RefreshCw, HardDrive, FileText, Upload, Check, AlertCircle, 
  ExternalLink, Loader2, Sparkles, BookOpen, Clock, FileUp
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleDriveFile, PDFDocumentData } from '../types';
import { listDrivePdfFiles, downloadDrivePdfBinary, formatFileSize, formatDate } from '../services/googleDriveService';
import { parsePdfArrayBuffer } from '../services/pdfParser';
import { SAMPLE_DOCUMENTS, createSamplePdfDocument } from '../services/sampleDocs';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSignIn: () => void;
  isSigningIn: boolean;
  onDocumentLoaded: (doc: PDFDocumentData) => void;
  currentDocId?: string;
}

export const DrivePickerModal: React.FC<DrivePickerModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignIn,
  isSigningIn,
  onDocumentLoaded,
  currentDocId,
}) => {
  const [activeTab, setActiveTab] = useState<'drive' | 'samples' | 'upload'>('drive');
  const [searchTerm, setSearchTerm] = useState('');
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load drive files when modal opens or user logs in
  useEffect(() => {
    if (isOpen && user && activeTab === 'drive') {
      fetchFiles(searchTerm);
    }
  }, [isOpen, user, activeTab]);

  const fetchFiles = async (query = '') => {
    if (!user) return;
    setIsLoadingFiles(true);
    setErrorMessage(null);
    try {
      const res = await listDrivePdfFiles(query);
      setDriveFiles(res.files);
    } catch (err: any) {
      console.error('Error listing Drive PDFs:', err);
      setErrorMessage(err.message || 'Failed to load PDF files from Google Drive.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(searchTerm);
  };

  const handleSelectDriveFile = async (file: GoogleDriveFile) => {
    setLoadingFileId(file.id);
    setErrorMessage(null);
    setParseProgress(null);
    try {
      const buffer = await downloadDrivePdfBinary(file.id);
      const docData = await parsePdfArrayBuffer(buffer, file.name, 'drive', (current, total) => {
        setParseProgress({ current, total });
      });
      onDocumentLoaded(docData);
      onClose();
    } catch (err: any) {
      console.error('Error loading PDF file:', err);
      setErrorMessage(err.message || 'Could not parse this PDF file. Please try another.');
    } finally {
      setLoadingFileId(null);
      setParseProgress(null);
    }
  };

  const handleSelectSample = (sampleIndex: number) => {
    const docData = createSamplePdfDocument(sampleIndex);
    onDocumentLoaded(docData);
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      setErrorMessage('Please select a valid PDF document (.pdf).');
      return;
    }

    setLoadingFileId('local-file');
    setErrorMessage(null);
    setParseProgress(null);
    try {
      const buffer = await file.arrayBuffer();
      const docData = await parsePdfArrayBuffer(buffer, file.name, 'local', (current, total) => {
        setParseProgress({ current, total });
      });
      onDocumentLoaded(docData);
      onClose();
    } catch (err: any) {
      console.error('Error loading local PDF file:', err);
      setErrorMessage(err.message || 'Failed to extract text from this local PDF file.');
    } finally {
      setLoadingFileId(null);
      setParseProgress(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-[#E5E0D5] bg-[#FDFCF8] shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5E0D5] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B6D5B] text-white shadow-xs">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2C332C]">Select PDF Document</h2>
              <p className="text-xs text-[#9A9289]">Pick a PDF from Google Drive, sample library, or local file</p>
            </div>
          </div>
          <button
            id="btn-close-drive-modal"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#9A9289] hover:bg-[#F4F1EC] hover:text-[#2C332C] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5E0D5] bg-[#F4F1EC] px-6 pt-2">
          <button
            id="tab-drive-files"
            onClick={() => { setActiveTab('drive'); setErrorMessage(null); }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'drive'
                ? 'border-[#5B6D5B] text-[#5B6D5B] font-bold'
                : 'border-transparent text-[#7A7167] hover:text-[#2C332C]'
            }`}
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>Google Drive</span>
          </button>

          <button
            id="tab-sample-files"
            onClick={() => { setActiveTab('samples'); setErrorMessage(null); }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'samples'
                ? 'border-[#5B6D5B] text-[#5B6D5B] font-bold'
                : 'border-transparent text-[#7A7167] hover:text-[#2C332C]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sample PDFs</span>
          </button>

          <button
            id="tab-upload-files"
            onClick={() => { setActiveTab('upload'); setErrorMessage(null); }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'upload'
                ? 'border-[#5B6D5B] text-[#5B6D5B] font-bold'
                : 'border-transparent text-[#7A7167] hover:text-[#2C332C]'
            }`}
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Upload File</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <div className="flex items-start gap-2.5 flex-1">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMessage}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {(errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('scope') || errorMessage.toLowerCase().includes('sign in')) && (
                <button
                  id="btn-reauth-drive"
                  onClick={onSignIn}
                  disabled={isSigningIn}
                  className="rounded-xl bg-[#5B6D5B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4D5C4D] transition shadow-xs disabled:opacity-50"
                >
                  {isSigningIn ? 'Authorizing...' : 'Authorize Drive Access'}
                </button>
              )}
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 p-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Parsing Progress Banner */}
        {loadingFileId && (
          <div className="mx-6 mt-4 rounded-2xl border border-[#DCD7CD] bg-[#E8F0E8] p-4">
            <div className="flex items-center justify-between text-xs font-bold text-[#2C332C] mb-1.5">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#5B6D5B]" />
                <span>Extracting text & building RAG semantic index...</span>
              </div>
              {parseProgress && (
                <span className="text-[#5B6D5B]">
                  Page {parseProgress.current} / {parseProgress.total}
                </span>
              )}
            </div>
            {parseProgress && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#DCD7CD]">
                <div
                  className="h-full bg-[#5B6D5B] transition-all duration-200 rounded-full"
                  style={{ width: `${(parseProgress.current / parseProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: Google Drive */}
          {activeTab === 'drive' && (
            <div>
              {!user ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F0E8] text-[#5B6D5B] shadow-xs border border-[#5B6D5B]/20">
                    <HardDrive className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-[#2C332C]">Connect Google Drive</h3>
                  <p className="mt-1.5 max-w-md text-xs text-[#7A7167] leading-relaxed">
                    Connect your Google account with read-only permission to browse and index your PDF documents securely.
                  </p>
                  
                  {/* Official Google Sign In Button */}
                  <div className="mt-6">
                    <button
                      id="btn-sign-in-google-modal"
                      onClick={onSignIn}
                      disabled={isSigningIn}
                      className="inline-flex items-center gap-3 rounded-full border border-[#DCD7CD] bg-white px-5 py-2.5 text-xs font-semibold text-[#2C332C] shadow-sm transition hover:bg-[#F4F1EC] active:scale-95 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                      <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search Bar & Refresh */}
                  <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9A9289]" />
                      <input
                        id="input-search-drive"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search PDF files in Google Drive..."
                        className="w-full rounded-xl border border-[#DCD7CD] bg-white py-2 pl-9 pr-3 text-xs text-[#2C332C] placeholder-[#9A9289] outline-none transition focus:border-[#5B6D5B]/50"
                      />
                    </div>
                    <button
                      id="btn-search-drive-submit"
                      type="submit"
                      disabled={isLoadingFiles}
                      className="flex items-center gap-1.5 rounded-xl bg-[#5B6D5B] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4D5C4D] disabled:opacity-50 shadow-xs"
                    >
                      Search
                    </button>
                    <button
                      id="btn-refresh-drive"
                      type="button"
                      onClick={() => fetchFiles(searchTerm)}
                      disabled={isLoadingFiles}
                      title="Refresh file list"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCD7CD] bg-white text-[#7A7167] hover:bg-[#F4F1EC] hover:text-[#2C332C] transition shadow-xs"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    </button>
                  </form>

                  {/* Drive Files List */}
                  {isLoadingFiles ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[#7A7167]">
                      <Loader2 className="h-6 w-6 animate-spin text-[#5B6D5B] mb-2" />
                      <p className="text-xs">Fetching PDFs from your Google Drive...</p>
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border border-dashed border-[#DCD7CD] bg-white p-6">
                      <FileText className="h-8 w-8 text-[#9A9289] mb-2" />
                      <p className="text-xs font-semibold text-[#2C332C]">No PDF files found</p>
                      <p className="text-[11px] text-[#9A9289] mt-1 max-w-xs leading-relaxed">
                        No PDF files match your query in Google Drive. You can upload a PDF to Google Drive or test with a Sample PDF.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9289] px-1">
                        Found {driveFiles.length} PDF Documents
                      </div>
                      {driveFiles.map((file) => {
                        const isCurrent = currentDocId === file.id;
                        const isLoadingThis = loadingFileId === file.id;

                        return (
                          <div
                            key={file.id}
                            className={`group flex items-center justify-between rounded-2xl border p-3.5 transition ${
                              isCurrent
                                ? 'border-[#5B6D5B] bg-[#E8F0E8]/50 shadow-xs'
                                : 'border-[#E5E0D5] bg-white hover:border-[#5B6D5B]/40 hover:bg-[#FDFCF8] shadow-xs'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F0E8] text-[#5B6D5B]">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-[#2C332C] truncate" title={file.name}>
                                  {file.name}
                                </h4>
                                <div className="flex items-center gap-3 text-[11px] text-[#7A7167] mt-0.5">
                                  <span>{formatFileSize(file.size)}</span>
                                  {file.modifiedTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-[#9A9289]" />
                                      {formatDate(file.modifiedTime)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View on Google Drive"
                                  className="flex h-8 w-8 items-center justify-center rounded-xl text-[#9A9289] hover:bg-[#F4F1EC] hover:text-[#2C332C] transition"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => handleSelectDriveFile(file)}
                                disabled={isLoadingThis}
                                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                                  isCurrent
                                    ? 'bg-[#5B6D5B] text-white shadow-xs'
                                    : 'bg-[#5B6D5B] text-white hover:bg-[#4D5C4D] shadow-xs'
                                } disabled:opacity-50`}
                              >
                                {isLoadingThis ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Indexing...</span>
                                  </>
                                ) : isCurrent ? (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Loaded</span>
                                  </>
                                ) : (
                                  <span>Load PDF</span>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Sample Documents */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-[#7A7167]">
                Explore the PDF chatbot instantly with realistic research and corporate filings:
              </p>
              {SAMPLE_DOCUMENTS.map((sample, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-[#E5E0D5] bg-white p-4.5 transition hover:border-[#5B6D5B]/40 hover:bg-[#FDFCF8] shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F0E8] text-[#5B6D5B]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#2C332C]">{sample.name}</h4>
                      <p className="text-[11px] text-[#7A7167] mt-1 leading-relaxed">{sample.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-[#5B6D5B] font-bold">
                        <span>{sample.pages.length} Pages</span>
                        <span>•</span>
                        <span>Multi-section formatted PDF</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectSample(idx)}
                    className="shrink-0 rounded-xl bg-[#5B6D5B] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4D5C4D] active:scale-95 shadow-xs"
                  >
                    Load Sample
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Upload Local File */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition ${
                  isDragOver
                    ? 'border-[#5B6D5B] bg-[#E8F0E8]/50'
                    : 'border-[#DCD7CD] bg-white hover:border-[#5B6D5B]/40'
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F0E8] shadow-xs text-[#5B6D5B]">
                  <Upload className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-bold text-[#2C332C]">Drag & Drop your PDF document</h4>
                <p className="mt-1 text-[11px] text-[#7A7167]">Supports standard PDF files up to 50MB</p>
                
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#5B6D5B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#4D5C4D] active:scale-95">
                  <span>Browse Device</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#E5E0D5] bg-[#F4F1EC] px-6 py-3.5 text-right">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#DCD7CD] bg-white px-4 py-2 text-xs font-semibold text-[#5B6D5B] hover:bg-stone-50 transition shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

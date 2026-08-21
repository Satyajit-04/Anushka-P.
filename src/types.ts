export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
}

export interface PDFPage {
  pageNumber: number;
  text: string;
}

export interface DocumentChunk {
  id: string;
  pageNumber: number;
  text: string;
  charStart?: number;
  charEnd?: number;
}

export interface PDFDocumentData {
  id: string;
  name: string;
  size?: number;
  totalPages: number;
  pages: PDFPage[];
  chunks: DocumentChunk[];
  summary?: string;
  rawArrayBuffer?: ArrayBuffer;
  sourceType: 'drive' | 'sample' | 'local';
}

export type LLMProviderType = 'browser-webllm' | 'local-ollama' | 'local-lmstudio' | 'gemini-server';

export interface WebLLMModelOption {
  id: string;
  name: string;
  sizeText: string;
  vramText: string;
  description: string;
  recommended?: boolean;
}

export interface LLMConfig {
  provider: LLMProviderType;
  webLlmModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  lmStudioEndpoint: string;
  temperature: number;
  maxTokens: number;
  topKChunks: number;
}

export interface ChatSourceCitation {
  pageNumber: number;
  excerpt: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: ChatSourceCitation[];
  isStreaming?: boolean;
  tokensPerSec?: number;
  error?: boolean;
}

export interface WebLLMProgress {
  progress: number;
  text: string;
  loaded: boolean;
  modelId: string;
}

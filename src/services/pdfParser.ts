import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentData, PDFPage, DocumentChunk, ChatSourceCitation } from '../types';

// Set up worker source
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export async function parsePdfArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  sourceType: 'drive' | 'sample' | 'local' = 'drive',
  onProgress?: (current: number, total: number) => void
): Promise<PDFDocumentData> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: PDFPage[] = [];
  const chunks: DocumentChunk[] = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress(i, numPages);
    }
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    
    // Group text items with appropriate spacing
    let lastY: number | null = null;
    let pageText = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        const textItem = item as { str: string; transform: number[] };
        const currentY = textItem.transform[5];
        
        if (lastY !== null && Math.abs(currentY - lastY) > 5) {
          pageText += '\n' + textItem.str;
        } else {
          pageText += (pageText.endsWith(' ') || pageText.length === 0 ? '' : ' ') + textItem.str;
        }
        lastY = currentY;
      }
    }

    const cleanText = pageText.trim();
    pages.push({
      pageNumber: i,
      text: cleanText,
    });

    // Chunk the page text into readable sections (~500 chars with overlap)
    const pageChunks = chunkPageText(cleanText, i, chunks.length);
    chunks.push(...pageChunks);
  }

  return {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: fileName,
    totalPages: numPages,
    pages,
    chunks,
    size: arrayBuffer.byteLength,
    rawArrayBuffer: arrayBuffer,
    sourceType,
  };
}

function chunkPageText(text: string, pageNumber: number, startIndex: number): DocumentChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const result: DocumentChunk[] = [];
  const paragraphs = text.split(/\n\s*\n|\n(?=[A-Z0-9\.\-\•\*\#])/g).filter((p) => p.trim().length > 0);
  
  let currentChunk = '';
  let chunkIdx = startIndex;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if ((currentChunk + '\n' + trimmed).length > 600 && currentChunk.length > 100) {
      result.push({
        id: `chunk_${chunkIdx++}`,
        pageNumber,
        text: currentChunk.trim(),
      });
      // Small overlap if paragraph is long
      currentChunk = trimmed;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n${trimmed}` : trimmed;
    }
  }

  if (currentChunk.trim().length > 0) {
    result.push({
      id: `chunk_${chunkIdx++}`,
      pageNumber,
      text: currentChunk.trim(),
    });
  }

  // Fallback for huge unstructured blobs without paragraphs
  if (result.length === 0 && text.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < text.length; i += 400) {
      result.push({
        id: `chunk_${chunkIdx++}`,
        pageNumber,
        text: text.substring(i, i + chunkSize),
      });
    }
  }

  return result;
}

export interface RetrievalResult {
  citations: ChatSourceCitation[];
  contextChunks: { pageNumber: number; text: string }[];
  isSummaryQuery: boolean;
}

export function isSummaryIntent(query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase().trim();
  return (
    q.includes('summar') ||
    q.includes('overview') ||
    q.includes('synthes') ||
    q.includes('takeaway') ||
    q.includes('main point') ||
    q.includes('key point') ||
    q.includes('what is this document') ||
    q.includes('what is this pdf') ||
    q.includes('tell me about this') ||
    q.includes('brief me on')
  );
}

export function retrieveDocumentContext(
  query: string,
  doc: PDFDocumentData,
  topK: number = 6
): RetrievalResult {
  if (!doc || !doc.chunks || doc.chunks.length === 0) {
    return { citations: [], contextChunks: [], isSummaryQuery: false };
  }

  const isSummary = isSummaryIntent(query);

  if (isSummary) {
    // Collect broad representative chunks from across all pages of the document
    const selectedChunks: DocumentChunk[] = [];
    const totalPages = doc.totalPages || 1;
    const maxChars = 12000;
    let accumulatedChars = 0;

    // First pass: pick beginning chunk of each page
    for (let p = 1; p <= totalPages; p++) {
      const pageChunks = doc.chunks.filter((c) => c.pageNumber === p);
      if (pageChunks.length > 0) {
        for (const chunk of pageChunks) {
          if (accumulatedChars + chunk.text.length <= maxChars) {
            selectedChunks.push(chunk);
            accumulatedChars += chunk.text.length;
          }
        }
      }
      if (accumulatedChars >= maxChars) break;
    }

    // Fallback if very few chunks
    if (selectedChunks.length === 0) {
      selectedChunks.push(...doc.chunks.slice(0, 10));
    }

    const citations: ChatSourceCitation[] = selectedChunks.map((c) => ({
      pageNumber: c.pageNumber,
      excerpt: c.text.length > 220 ? c.text.substring(0, 220) + '...' : c.text,
      score: 1,
    }));

    // Deduplicate citations by page number for clean UI badges
    const uniqueCitations: ChatSourceCitation[] = [];
    const seenPages = new Set<number>();
    for (const cit of citations) {
      if (!seenPages.has(cit.pageNumber)) {
        seenPages.add(cit.pageNumber);
        uniqueCitations.push(cit);
      }
    }

    const contextChunks = selectedChunks.map((c) => ({
      pageNumber: c.pageNumber,
      text: c.text,
    }));

    return {
      citations: uniqueCitations.slice(0, 8),
      contextChunks,
      isSummaryQuery: true,
    };
  }

  // Targeted Q&A query retrieval
  const citations = searchRelevantChunks(query, doc.chunks, topK);
  
  // Find the full text for each retrieved chunk (not truncated excerpt)
  const contextChunks: { pageNumber: number; text: string }[] = [];
  for (const cit of citations) {
    const matchingChunk = doc.chunks.find(
      (c) => c.pageNumber === cit.pageNumber && c.text.includes(cit.excerpt.replace('...', '').substring(0, 60))
    ) || doc.chunks.find((c) => c.pageNumber === cit.pageNumber);

    if (matchingChunk) {
      contextChunks.push({
        pageNumber: matchingChunk.pageNumber,
        text: matchingChunk.text,
      });
    } else {
      contextChunks.push({
        pageNumber: cit.pageNumber,
        text: cit.excerpt,
      });
    }
  }

  return {
    citations,
    contextChunks,
    isSummaryQuery: false,
  };
}

export function searchRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  topK: number = 6
): ChatSourceCitation[] {
  if (!chunks || chunks.length === 0) return [];
  if (!query || query.trim().length === 0) {
    return chunks.slice(0, topK).map((c) => ({
      pageNumber: c.pageNumber,
      excerpt: c.text.substring(0, 200),
      score: 1,
    }));
  }

  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (queryTerms.length === 0) {
    return chunks.slice(0, topK).map((c) => ({
      pageNumber: c.pageNumber,
      excerpt: c.text.substring(0, 200),
      score: 1,
    }));
  }

  // Compute BM25-like lexical relevance
  const scored = chunks.map((chunk) => {
    const chunkLower = chunk.text.toLowerCase();
    let score = 0;

    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${term}`, 'gi');
      const matches = chunkLower.match(regex);
      if (matches) {
        score += matches.length * 2;
      } else if (chunkLower.includes(term)) {
        score += 1;
      }
    }

    // Exact phrase bonus
    if (chunkLower.includes(query.toLowerCase())) {
      score += 10;
    }

    return {
      chunk,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take topK distinct or high scoring chunks
  const top = scored
    .filter((item) => item.score > 0)
    .slice(0, topK);

  // If no term matched, fall back to first few chunks (e.g. for general summaries)
  if (top.length === 0) {
    return chunks.slice(0, Math.min(topK, chunks.length)).map((c) => ({
      pageNumber: c.pageNumber,
      excerpt: c.text.length > 250 ? c.text.substring(0, 250) + '...' : c.text,
      score: 0.5,
    }));
  }

  return top.map((item) => ({
    pageNumber: item.chunk.pageNumber,
    excerpt: item.chunk.text.length > 300 ? item.chunk.text.substring(0, 300) + '...' : item.chunk.text,
    score: item.score,
  }));
}

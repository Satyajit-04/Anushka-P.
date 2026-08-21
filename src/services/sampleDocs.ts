import { PDFDocumentData } from '../types';

export const SAMPLE_DOCUMENTS: { name: string; description: string; pages: { pageNumber: number; text: string }[] }[] = [
  {
    name: 'Research_Paper_On_Device_LLMs_2026.pdf',
    description: 'Academic survey on WebGPU quantizations, memory bandwidth optimization, and on-device private inference.',
    pages: [
      {
        pageNumber: 1,
        text: `SURVEY ON ON-DEVICE LARGE LANGUAGE MODELS AND WEBGPU INFERENCE
Published: January 2026 | Antigravity AI Research Labs
Authors: Dr. Elena Vance, Marcus Chen, Sophia Lindqvist

ABSTRACT:
Recent advances in 4-bit weight quantization (q4f16) and WebGPU standards have made zero-latency, client-side inference possible on consumer laptops and mobile devices. This paper benchmarks 1B-3B parameter instruction-tuned models executing completely offline within sandboxed browser runtimes. Our empirical findings demonstrate that sub-3B models achieve up to 38 tokens per second on Apple M-series silicon while guaranteeing absolute user data confidentiality.

1. INTRODUCTION & PRIVACY IMPERATIVES
Traditional cloud-hosted LLMs mandate transmitting sensitive proprietary documents to remote endpoints. In healthcare, legal analysis, and personal document intelligence, regulatory frameworks such as GDPR and HIPAA strictly discourage third-party data serialization. On-device local LLMs provide a mathematically airtight privacy boundary: raw tokens and extracted PDF embeddings never leave the client's volatile memory.`,
      },
      {
        pageNumber: 2,
        text: `2. BENCHMARKING QUANTIZATION FORMALISMS
We evaluated AWQ, GPTQ, and MLC-LLM quantization runtimes across three hardware configurations:
- Apple M3 Pro (18-core GPU, 36GB Unified Memory)
- NVIDIA RTX 4070 (12GB VRAM, TensorRT-LLM)
- Intel Core Ultra 7 (Integrated Arc GPU, 16GB Shared RAM)

RESULTS TABLE 1:
Model Architecture | Quantization | RAM Usage | Tokens/Sec (M3) | Tokens/Sec (Arc)
Llama-3.2-1B-Instruct | q4f16_1 | 860 MB | 42.4 t/s | 18.2 t/s
Qwen-2.5-1.5B-Instruct | q4f16_1 | 1,240 MB | 31.8 t/s | 12.6 t/s
SmolLM2-135M-Instruct | q0f16 | 280 MB | 84.1 t/s | 46.0 t/s
Phi-3.5-mini-3.8B | q4f16_1 | 2,340 MB | 19.5 t/s | 7.1 t/s

Key takeaway: Llama-3.2-1B delivers the optimal Pareto frontier between reasoning accuracy on extractive Q&A benchmarks (87.4% MMLU-subscore) and memory footprint (<900 MB).`,
      },
      {
        pageNumber: 3,
        text: `3. RETRIEVAL AUGMENTED GENERATION (RAG) ARCHITECTURE
For document QA, our pipeline deploys an in-memory TF-IDF and BM25 lexical retriever combined with cosine similarity matching on chunked paragraphs (500 character windows with 100 character stride).

4. CONCLUSION & RECOMMENDATIONS
Zero-cloud local inference represents the next epoch of enterprise document processing. When handling confidential Google Drive PDFs, integrating WebLLM or local Ollama instances prevents data leakage vectors while delivering sub-second initial token latency.`,
      },
    ],
  },
  {
    name: 'Quarterly_Financial_Earnings_Report_Q4.pdf',
    description: 'Corporate financial statements, revenue growth breakdown, operating margins, and FY2026 guidance.',
    pages: [
      {
        pageNumber: 1,
        text: `APEX TECHNOLOGIES INC. - Q4 & FULL YEAR 2025 FINANCIAL RESULTS
Press Release Date: February 12, 2026

EXECUTIVE HIGHLIGHTS:
- Q4 Total Revenue surged to $4.85 Billion, an increase of 24.8% year-over-year compared to $3.88 Billion in Q4 2024.
- Cloud & AI Platform Services generated $2.12 Billion, now representing 43.7% of total revenue.
- GAAP Operating Income rose 31.2% to $1.42 Billion, delivering an operating margin of 29.3%.
- Diluted Earnings Per Share (EPS) for the quarter reached $1.68 vs. $1.32 in the prior year period.
- Free Cash Flow for the full fiscal year totaled $5.20 Billion, up 18.5% from $4.39 Billion in FY2024.`,
      },
      {
        pageNumber: 2,
        text: `SEGMENT REVENUE BREAKDOWN (in millions):
Segment | Q4 2025 | Q4 2024 | YoY Growth
1. Enterprise Cloud Solutions: $2,120M | $1,580M | +34.2%
2. Cybersecurity & Edge Computing: $1,430M | $1,210M | +18.2%
3. Hardware & Infrastructure: $890M | $790M | +12.6%
4. Professional Advisory: $410M | $300M | +36.7%
Total: $4,850M | $3,880M | +24.8%

CAPITAL ALLOCATION & BUYBACKS:
The Board of Directors has authorized an incremental $2.5 Billion share repurchase program and declared a quarterly cash dividend of $0.45 per share payable on March 25, 2026.`,
      },
      {
        pageNumber: 3,
        text: `BUSINESS OUTLOOK & FY2026 FORWARD GUIDANCE:
For the full fiscal year 2026, Apex Technologies management provides the following forward guidance:
- Full Year Revenue expected between $21.5 Billion and $22.2 Billion (projected 19% - 23% growth).
- GAAP Operating Margin projected between 29.5% and 31.0%.
- Capital Expenditures planned at $1.8 Billion, prioritizing sovereign local-AI data center clusters and sustainable edge compute nodes.
- Full Year Non-GAAP Diluted EPS projected between $7.10 and $7.45.`,
      },
    ],
  },
];

export function createSamplePdfDocument(sampleIndex: number): PDFDocumentData {
  const sample = SAMPLE_DOCUMENTS[sampleIndex] || SAMPLE_DOCUMENTS[0];
  const chunks = sample.pages.flatMap((page, pIdx) => {
    const lines = page.text.split('\n\n');
    return lines.map((para, cIdx) => ({
      id: `sample_c_${pIdx}_${cIdx}`,
      pageNumber: page.pageNumber,
      text: para.trim(),
    })).filter((c) => c.text.length > 0);
  });

  return {
    id: `sample_doc_${sampleIndex}`,
    name: sample.name,
    totalPages: sample.pages.length,
    pages: sample.pages,
    chunks,
    size: 245000,
    sourceType: 'sample',
  };
}

import { CreateMLCEngine, MLCEngineInterface } from '@mlc-ai/web-llm';
import { LLMConfig, WebLLMModelOption, WebLLMProgress, DocumentChunk } from '../types';

export const AVAILABLE_WEBLLM_MODELS: WebLLMModelOption[] = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B Instruct (Recommended)',
    sizeText: '~880 MB',
    vramText: '~1.1 GB VRAM',
    description: 'Meta’s cutting-edge lightweight model. Fast, articulate, and accurate for PDF document reasoning.',
    recommended: true,
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B Instruct (Ultra Fast)',
    sizeText: '~390 MB',
    vramText: '~600 MB VRAM',
    description: 'Extremely lightweight and fast model. Ideal for lower-spec laptops or fast responses.',
  },
  {
    id: 'SmolLM2-135M-Instruct-q0f16',
    name: 'SmolLM2 135M Instruct (Instant)',
    sizeText: '~135 MB',
    vramText: '~300 MB VRAM',
    description: 'Super compact model. Loads almost immediately with minimal memory footprint.',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B Instruct',
    sizeText: '~1.3 GB',
    vramText: '~1.6 GB VRAM',
    description: 'Higher accuracy for complex tables, math, and multi-paragraph synthesis.',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini 3.8B Instruct',
    sizeText: '~2.2 GB',
    vramText: '~2.8 GB VRAM',
    description: 'Microsoft’s flagship small language model for thorough technical document synthesis.',
  }
];

let globalWebLlmEngine: MLCEngineInterface | null = null;
let currentLoadedModelId: string | null = null;

export function checkWebGPUSupport(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && !!(navigator as any).gpu;
}

export async function getOrInitWebLLMEngine(
  modelId: string,
  onProgress?: (progress: WebLLMProgress) => void
): Promise<MLCEngineInterface> {
  if (globalWebLlmEngine && currentLoadedModelId === modelId) {
    if (onProgress) {
      onProgress({ progress: 1, text: 'Model is ready in memory', loaded: true, modelId });
    }
    return globalWebLlmEngine;
  }

  if (globalWebLlmEngine) {
    try {
      await globalWebLlmEngine.unload();
    } catch (e) {
      console.warn('Error unloading previous model:', e);
    }
    globalWebLlmEngine = null;
    currentLoadedModelId = null;
  }

  const engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (report) => {
      if (onProgress) {
        onProgress({
          progress: report.progress,
          text: report.text,
          loaded: report.progress === 1,
          modelId,
        });
      }
    },
  });

  globalWebLlmEngine = engine;
  currentLoadedModelId = modelId;
  return engine;
}

export async function testOllamaConnection(endpoint: string): Promise<{ success: boolean; models?: string[]; error?: string }> {
  try {
    const cleanUrl = endpoint.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      return { success: false, error: `Ollama returned HTTP ${res.status}: ${res.statusText}` };
    }
    const data = await res.json();
    const modelNames = data.models ? data.models.map((m: any) => m.name || m.model) : [];
    return { success: true, models: modelNames };
  } catch (err: any) {
    return { 
      success: false, 
      error: err.message || 'Cannot reach local Ollama. Ensure Ollama is running (e.g. `OLLAMA_ORIGINS="*" ollama serve`).' 
    };
  }
}

export async function testLMStudioConnection(endpoint: string): Promise<{ success: boolean; models?: string[]; error?: string }> {
  try {
    const cleanUrl = endpoint.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/models`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      return { success: false, error: `LM Studio returned HTTP ${res.status}: ${res.statusText}` };
    }
    const data = await res.json();
    const modelNames = data.data ? data.data.map((m: any) => m.id) : [];
    return { success: true, models: modelNames };
  } catch (err: any) {
    return { 
      success: false, 
      error: err.message || 'Cannot reach LM Studio local server. Check that Local Server is started in LM Studio.' 
    };
  }
}

export async function generateChatResponse(
  prompt: string,
  relevantChunks: { pageNumber: number; text: string }[],
  config: LLMConfig,
  onToken?: (token: string, fullText: string) => void,
  onProgress?: (progress: WebLLMProgress) => void
): Promise<string> {
  // Format the document context clearly
  const contextStr = relevantChunks.length > 0
    ? relevantChunks
        .map((c) => `[Source Page ${c.pageNumber}]:\n${c.text}`)
        .join('\n\n')
    : 'No specific document excerpts found.';

  const isSummary = /summar|overview|synthes|takeaway|main point|key point|what is this/i.test(prompt);

  const systemPrompt = isSummary
    ? `You are an expert AI PDF Executive Summarizer and Document Analyst.
Your goal is to provide a comprehensive, beautifully structured summary of the PDF document based on the provided excerpts across its pages.
Organize your response into clear, readable markdown sections:
- **Executive Summary**: A concise 2-3 sentence overview of the document's main premise, author, and purpose.
- **Key Findings & Highlights**: Bullet points of the most critical takeaways, metrics, or arguments.
- **Core Topics & Sections**: Synthesize the main sections and arguments covered across the pages.
- **Conclusion & Implications**: The primary conclusion, recommendations, or next steps.

Always include page citation tags like [Page X] whenever citing specific facts, data points, or findings. Ground all information strictly in the document text provided.`
    : `You are a helpful and accurate AI PDF Assistant.
You must answer the user's question directly using the provided PDF document excerpts.
Always mention or cite the page numbers in brackets like [Page X] when referencing facts.
If the answer cannot be found in the provided excerpts, clearly state that the document does not contain that specific detail.
Keep your response structured with headings or bullet points where appropriate.`;

  const userContent = `Here is the relevant context from the PDF document:

${contextStr}

---
User Request: ${prompt}`;

  // 1. WebLLM (In-Browser WebGPU Local LLM)
  if (config.provider === 'browser-webllm') {
    try {
      if (!checkWebGPUSupport()) {
        throw new Error('WebGPU is not supported in this browser. Falling back to Gemini.');
      }

      const engine = await getOrInitWebLLMEngine(config.webLlmModel, onProgress);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ];

      let fullText = '';
      const chunks = await engine.chat.completions.create({
        messages: messages as any,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
      });

      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          if (onToken) onToken(delta, fullText);
        }
      }

      return fullText;
    } catch (webLlmErr: any) {
      console.warn('WebLLM failed, falling back to server-side Gemini:', webLlmErr);
      // Seamless fallback to server Gemini if WebGPU fails or is blocked
      return await generateGeminiServerResponse(prompt, systemPrompt, relevantChunks, onToken);
    }
  }

  // 2. Local Ollama Server
  if (config.provider === 'local-ollama') {
    const cleanUrl = config.ollamaEndpoint.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel || 'llama3.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        stream: true,
        options: {
          temperature: config.temperature,
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ollama error (${response.status}): ${errText || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is empty from Ollama');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const textChunk = decoder.decode(value, { stream: true });
      const lines = textChunk.split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const delta = parsed.message?.content || '';
          if (delta) {
            fullText += delta;
            if (onToken) onToken(delta, fullText);
          }
        } catch {
          // ignore non-json stream lines
        }
      }
    }

    return fullText;
  }

  // 3. Local LM Studio
  if (config.provider === 'local-lmstudio') {
    const cleanUrl = config.lmStudioEndpoint.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio error (${response.status}): ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is empty from LM Studio');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const textChunk = decoder.decode(value, { stream: true });
      const lines = textChunk.split('\n').filter((l) => l.trim().startsWith('data: '));
      for (const line of lines) {
        const jsonStr = line.replace(/^data:\s*/, '').trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            if (onToken) onToken(delta, fullText);
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    return fullText;
  }

  // 4. Server-Side Gemini API (Default & Fallback)
  return await generateGeminiServerResponse(prompt, systemPrompt, relevantChunks, onToken);
}

export async function generateGeminiServerResponse(
  prompt: string,
  systemPrompt: string,
  relevantChunks: { pageNumber: number; text: string }[],
  onToken?: (token: string, fullText: string) => void
): Promise<string> {
  const contextChunks = relevantChunks.map((c) => `[Source Page ${c.pageNumber}]:\n${c.text}`);
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      systemInstruction: systemPrompt,
      contextChunks,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error (${response.status})`);
  }

  const data = await response.json();
  const text = data.text || '';
  if (onToken) {
    onToken(text, text);
  }
  return text;
}

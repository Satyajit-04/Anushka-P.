import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Server-side Gemini API fallback / assist
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      }

      const { prompt, systemInstruction, contextChunks } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let fullSystemInstruction = systemInstruction || 
        'You are an expert AI PDF assistant. Answer accurately based on the provided PDF context. Cite [Page X] when referencing information. If the answer is not in the document, state so clearly.';
      
      if (contextChunks && Array.isArray(contextChunks) && contextChunks.length > 0) {
        fullSystemInstruction += `\n\n--- DOCUMENT CONTEXT START ---\n${contextChunks.join('\n\n')}\n--- DOCUMENT CONTEXT END ---`;
      }

      // Fast, resilient model candidates ordered for high availability and low latency
      const candidateModels = [
        'gemini-3.1-flash-lite',
        'gemini-3.7-flash',
        'gemini-flash-latest',
      ];
      let lastError: any = null;
      let responseText: string | null = null;

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: fullSystemInstruction,
              temperature: 0.2,
            }
          });

          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} encountered error, attempting fallback:`, err?.message || err);
          // If 503 or 429 high demand error, immediately fall through to the next available model
          continue;
        }
      }

      if (!responseText) {
        throw lastError || new Error('Unable to generate response after attempting available models.');
      }

      return res.json({ text: responseText });
    } catch (error: any) {
      console.error('Gemini chat error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to process chat request' });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PDF Chatbot Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

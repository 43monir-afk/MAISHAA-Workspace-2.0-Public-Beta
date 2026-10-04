import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the Gemini API key supporting both:
 * 1. Google AI Studio injected environment secret (process.env.GEMINI_API_KEY)
 * 2. Local Windows PC / development .env and .env.local files
 * 
 * Handles blank-variable override problems: if process.env.GEMINI_API_KEY is an empty
 * string or whitespace, it will look into the project .env file and use the non-empty key.
 */
export function getAiApiKey(): string | null {
  // 1. Check if process.env already has a non-empty key (e.g. AI Studio runtime injection)
  const envVal = process.env.GEMINI_API_KEY;
  if (typeof envVal === 'string' && envVal.trim() !== '' && envVal.trim() !== 'MY_GEMINI_API_KEY') {
    let key = envVal.trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1).trim();
    }
    if (key !== '' && key !== 'MY_GEMINI_API_KEY') {
      return key;
    }
  }

  // 2. If missing or empty in process.env, inspect local .env and .env.local files
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '.env.local'),
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const fileContent = fs.readFileSync(envPath, 'utf8');
        const parsed = dotenv.parse(fileContent);
        if (
          parsed.GEMINI_API_KEY &&
          typeof parsed.GEMINI_API_KEY === 'string' &&
          parsed.GEMINI_API_KEY.trim() !== '' &&
          parsed.GEMINI_API_KEY.trim() !== 'MY_GEMINI_API_KEY'
        ) {
          let parsedKey = parsed.GEMINI_API_KEY.trim();
          if (
            (parsedKey.startsWith('"') && parsedKey.endsWith('"')) ||
            (parsedKey.startsWith("'") && parsedKey.endsWith("'"))
          ) {
            parsedKey = parsedKey.slice(1, -1).trim();
          }
          if (parsedKey !== '' && parsedKey !== 'MY_GEMINI_API_KEY') {
            process.env.GEMINI_API_KEY = parsedKey;
            return parsedKey;
          }
        }
      } catch {
        // Ignore read/parse errors
      }
    }
  }

  return null;
}

// Initialize environment configuration immediately before any services/routes run
export function loadEnvironment(): void {
  // 1. Initial dotenv load for non-override vars
  dotenv.config();

  // 2. Resolve GEMINI_API_KEY ensuring non-empty .env value overcomes blank environment variables
  const resolvedKey = getAiApiKey();
  if (resolvedKey) {
    process.env.GEMINI_API_KEY = resolvedKey;
  }
}

loadEnvironment();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to check if Gemini is configured and instantiate client
export function getAiClient(): GoogleGenAI | null {
  const apiKey = getAiApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. AI Status endpoint (unified and comprehensive)
app.get('/api/ai/status', (_req: Request, res: Response) => {
  const apiKey = getAiApiKey();
  const configured = Boolean(apiKey);
  res.json({
    configured,
    status: configured ? 'CONFIGURED' : 'NOT_CONFIGURED',
    provider: 'gemini',
    model: 'gemini-3.8-flash',
    message: configured
      ? 'AI Engine Ready'
      : 'AI Assistant বর্তমানে কনফিগার করা নেই। (AI Assistant currently not configured)',
  });
});

// 2. Document-Grounded AI Analysis & Q&A endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'AI Assistant বর্তমানে কনফিগার করা নেই। (AI Assistant not configured)',
      status: 'NOT_CONFIGURED',
    });
  }

  const { prompt, documentContext, taskType, language = 'bn' } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Length safety guard (max 40,000 characters)
  const safeContext = documentContext ? String(documentContext).slice(0, 40000) : '';

  const systemInstruction = `You are MAISHAA WORKSPACE Document Intelligence Assistant.
STRICT GROUNDING & ANTI-HALLUCINATION RULES:
1. Base all your responses strictly and exclusively on the provided DOCUMENT CONTEXT.
2. If the user asks a question whose answer is NOT present in the provided document context, explicitly state:
   - In Bangla: "প্রদত্ত ডকুমেন্টে এই তথ্যটি পাওয়া যায়নি।"
   - In English: "This information was not found in the provided document."
3. NEVER invent or fabricate names, dates, amounts, percentages, clauses, table entries, or citations.
4. Clearly distinguish verified facts found in the document from analytical summaries.
5. Language instruction: ${
    language === 'bn'
      ? 'Respond in clear, professional, formal Bengali (Bangla).'
      : 'Respond in professional English.'
  }
6. Task Type context: ${taskType || 'general_document_qa'}.`;

  const contents = safeContext
    ? `=== DOCUMENT CONTEXT START ===\n${safeContext}\n=== DOCUMENT CONTEXT END ===\n\nUSER REQUEST: ${prompt}`
    : `USER REQUEST: ${prompt}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.2, // Low temperature for high factual grounding
      },
    });

    const reply = response.text || '';
    return res.json({
      reply,
      isAiOutput: true,
      taskType: taskType || 'general',
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Server AI error:', error?.message || error);
    return res.status(500).json({
      error: error?.message || 'AI processing request failed',
      status: 'PROVIDER_ERROR',
    });
  }
});

// 3. Document Translation endpoint (text-first)
app.post('/api/ai/translate', async (req: Request, res: Response) => {
  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'AI Translation বর্তমানে কনফিগার করা নেই। (AI translation not configured)',
      status: 'NOT_CONFIGURED',
    });
  }

  const { text, targetLanguage = 'en' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required for translation' });
  }

  const safeText = text.slice(0, 30000);
  const targetName = targetLanguage === 'bn' ? 'Bengali (বাংলা)' : 'English';

  const systemInstruction = `You are MAISHAA WORKSPACE Official Document Translation Assistant.
Translate the text faithfully into ${targetName}.
RULES:
1. Maintain administrative, legal, and business terminology accuracy.
2. Do not add commentaries, opinions, or fabrications.
3. Output ONLY the translated text.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: safeText,
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    });

    return res.json({
      translatedText: response.text || '',
      targetLanguage,
      isAiOutput: true,
    });
  } catch (error: any) {
    console.error('Server translation error:', error?.message || error);
    return res.status(500).json({
      error: error?.message || 'Translation failed',
      status: 'PROVIDER_ERROR',
    });
  }
});

// 4. AI Command Center — Intent Analysis and Suggested Action Planning (Phase 4 Step 4A)
app.post('/api/ai/command', async (req: Request, res: Response) => {
  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      status: 'NOT CONFIGURED',
      message: 'AI Assistant বর্তমানে কনফিগার করা নেই। (AI provider is not configured)',
    });
  }

  const { instruction, sourceContext } = req.body;

  if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Instruction is required for intent analysis',
    });
  }

  const trimmedInstruction = instruction.trim().slice(0, 5000);

  const hasSource = !!(sourceContext && (sourceContext.fileName || sourceContext.extractedSnippet));
  const sourceDetails = hasSource
    ? `SOURCE CONTEXT:\n- File Name: ${sourceContext.fileName || 'Unknown'}\n- File Type: ${sourceContext.fileType || 'Unknown'}\n- File Size: ${sourceContext.fileSize ? sourceContext.fileSize + ' bytes' : 'Unknown'}\n${
        sourceContext.extractedSnippet
          ? `- Content Snippet: ${String(sourceContext.extractedSnippet).slice(0, 20000)}`
          : ''
      }`
    : 'SOURCE CONTEXT: No source content provided. Analyze instruction in general document/task context without inventing source facts.';

  const systemInstruction = `You are the central intent analyzer for MAISHAA WORKSPACE AI Command Center.
Your ONLY role is to analyze user instructions, detect intent and language, and propose a structured suggested plan.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. You must NEVER execute generation, deletion, file alteration, or batch execution.
2. Every output must strictly have "requiresConfirmation": true.
3. Supported Intent Categories:
   - "summarize": User wants an executive summary or condensation.
   - "rewrite": User wants text rephrased, polished, or stylized.
   - "translate": User wants translation between languages (e.g. Bangla <-> English).
   - "document_plan": User wants a structured document/report outline or architecture.
   - "office_pack_plan": User asks for a complete office package or multi-format workflow.
   - "spreadsheet_analysis": User asks to analyze, tabulate, clean, or formula-check tabular/CSV/spreadsheet data.
   - "presentation_plan": User asks for slide outlines, deck structure, or keynote points.
   - "extract_information": User asks to extract specific entities, dates, tables, or facts.
   - "organize_content": User asks to organize, categorize, or restructure notes/content.
   - "unsupported": User request cannot be mapped to office/document tasks or is out of scope.
4. Detected Language:
   - Must be exactly one of: "Bangla", "English", "Mixed", "Unknown".
   - Faithfully preserve and handle Bengali (বাংলা) unicode.
5. Office Pack Outputs:
   - "suggestedOutputs" can only contain items from: ["DOCX", "PDF", "XLSX", "PPTX"].
   - Suggest outputs only if relevant to the intent.
6. Anti-Hallucination & Grounding:
   - If Source Context is NOT provided, clearly state in summary and warnings that "Source content unavailable; suggestions based purely on text instruction."
   - NEVER label speculative assumptions as extracted source facts. Clearly distinguish source facts from AI suggestions.`;

  const userContent = `${sourceDetails}\n\nUSER INSTRUCTION:\n${trimmedInstruction}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userContent,
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              description: 'One of: summarize, rewrite, translate, document_plan, office_pack_plan, spreadsheet_analysis, presentation_plan, extract_information, organize_content, unsupported',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence between 0.0 and 1.0',
            },
            language: {
              type: Type.STRING,
              description: 'One of: Bangla, English, Mixed, Unknown',
            },
            summary: {
              type: Type.STRING,
              description: 'Clear, concise summary of the analyzed intent and plan',
            },
            suggestedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of high-level suggested steps',
            },
            suggestedOutputs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Subset of: DOCX, PDF, XLSX, PPTX',
            },
            requiresConfirmation: {
              type: Type.BOOLEAN,
              description: 'Must always be true',
            },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Warnings or notices',
            },
          },
          required: [
            'intent',
            'confidence',
            'language',
            'summary',
            'suggestedActions',
            'suggestedOutputs',
            'requiresConfirmation',
            'warnings',
          ],
        },
      },
    });

    const rawText = response.text || '{}';
    let parsedPlan: any;
    try {
      parsedPlan = JSON.parse(rawText);
    } catch {
      return res.status(500).json({
        status: 'ERROR',
        message: 'Malformed response returned by AI provider',
      });
    }

    const allowedIntents = [
      'summarize',
      'rewrite',
      'translate',
      'document_plan',
      'office_pack_plan',
      'spreadsheet_analysis',
      'presentation_plan',
      'extract_information',
      'organize_content',
      'unsupported',
    ];
    const intent = allowedIntents.includes(parsedPlan.intent) ? parsedPlan.intent : 'unsupported';

    const allowedLanguages = ['Bangla', 'English', 'Mixed', 'Unknown'];
    const language = allowedLanguages.includes(parsedPlan.language) ? parsedPlan.language : 'Unknown';

    const allowedOutputs = ['DOCX', 'PDF', 'XLSX', 'PPTX'];
    const suggestedOutputs = Array.isArray(parsedPlan.suggestedOutputs)
      ? parsedPlan.suggestedOutputs.filter((o: string) => allowedOutputs.includes(o))
      : [];

    const suggestedActions = Array.isArray(parsedPlan.suggestedActions)
      ? parsedPlan.suggestedActions.map((a: any) => String(a))
      : [];

    const warnings = Array.isArray(parsedPlan.warnings)
      ? parsedPlan.warnings.map((w: any) => String(w))
      : [];

    if (!hasSource && !warnings.some((w: string) => w.toLowerCase().includes('source'))) {
      warnings.push('Source content unavailable; suggestions based purely on user instruction.');
    }

    const normalizedPlan = {
      intent,
      confidence: typeof parsedPlan.confidence === 'number' ? Math.max(0, Math.min(1, parsedPlan.confidence)) : 0.8,
      language,
      summary: String(parsedPlan.summary || 'Plan analyzed.'),
      suggestedActions,
      suggestedOutputs,
      requiresConfirmation: true,
      warnings,
    };

    const audit = {
      timestamp: new Date().toISOString(),
      intent,
      providerStatus: 'CONFIGURED',
      status: 'SUCCESS' as const,
      confirmationRequired: true,
    };

    return res.json({
      status: 'COMPLETE',
      plan: normalizedPlan,
      audit,
    });
  } catch (error: any) {
    const errorStr = (error?.message || String(error)).toLowerCase();
    const isQuota =
      errorStr.includes('quota') ||
      errorStr.includes('resource_exhausted') ||
      errorStr.includes('429') ||
      errorStr.includes('rate-limit');

    if (isQuota) {
      return res.status(429).json({
        status: 'QUOTA EXCEEDED',
        message: 'AI Provider quota exceeded. You can retry in a few moments. All offline/browser Office tools remain operational.',
        isQuotaExceeded: true,
      });
    }

    const isTimeout = error?.name === 'AbortError' || errorStr.includes('timeout');
    if (isTimeout) {
      return res.status(504).json({
        status: 'TIMEOUT',
        message: 'AI request timed out. Please try again.',
      });
    }

    console.error('Server AI command error:', error?.message || error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'AI provider error occurred while analyzing command.',
    });
  }
});

// Phase 4 Step 4B: Confirmed AI Text Execution Endpoint (Summarize, Rewrite, Translate, Extract)
app.post('/api/ai/execute', async (req: Request, res: Response) => {
  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      status: 'NOT CONFIGURED',
      message: 'Gemini API is not configured on the server. Set GEMINI_API_KEY environment variable.',
    });
  }

  const {
    action = 'summarize',
    instruction = '',
    sourceText = '',
    targetLanguage = 'English',
  } = req.body;

  if (!instruction && !sourceText) {
    return res.status(400).json({ error: 'Instruction or sourceText is required' });
  }

  // Length safety guard (max 30,000 characters)
  const safeText = sourceText ? String(sourceText).slice(0, 30000) : '';
  const langText = targetLanguage === 'Bangla' ? 'formal Bengali (Bangla)' : 'professional English';

  let systemInstruction = `You are MAISHAA WORKSPACE Executive Document Engine.
STRICT ANTI-HALLUCINATION & FACTUAL ACCURACY RULES:
1. Base all outputs strictly and exclusively on the provided SOURCE TEXT and USER INSTRUCTION.
2. If facts, figures, names, or dates are not in the source text, DO NOT invent them.
3. Language requirement: Respond primarily in ${langText}.
4. Provide clean, well-formatted, professional output ready for office documentation.`;

  let promptInstruction = '';
  switch (action) {
    case 'summarize':
      promptInstruction = `Generate a clear, structured executive summary in ${langText}.
Structure:
- Executive Summary Overview
- Key Findings & Core Points (bulleted)
- Important Dates, Numbers & Deliverables (if present in text)
- Concluding Takeaway

User instruction context: ${instruction || 'Summarize the document clearly'}`;
      break;

    case 'rewrite':
      promptInstruction = `Rewrite and polish the following content according to this user instruction: "${instruction || 'Rewrite professionally'}".
Ensure high readability, formal tone, and clear paragraph transitions in ${langText}. Preserve all underlying facts and figures accurately.`;
      break;

    case 'translate':
      promptInstruction = `Faithfully and accurately translate the following text into ${langText}.
Maintain natural phrasing, formal tone, and exact terminology. Do not summarize or omit sections.`;
      break;

    case 'extract_information':
      promptInstruction = `Extract all critical facts, dates, amounts, stakeholders, and action items into categorized bullet points in ${langText}.
User instruction context: ${instruction || 'Extract key information'}`;
      break;

    case 'organize_content':
      promptInstruction = `Reorganize the following text into a cohesive, well-structured document format with clear headings, subheadings, and bullet points in ${langText}.
User instruction context: ${instruction || 'Organize content logically'}`;
      break;

    default:
      promptInstruction = `Execute the following office instruction: "${instruction}" in ${langText}, strictly grounded in the provided source text.`;
      break;
  }

  const contents = safeText
    ? `=== SOURCE CONTENT START ===\n${safeText}\n=== SOURCE CONTENT END ===\n\nTASK:\n${promptInstruction}`
    : `TASK:\n${promptInstruction}\nUSER INSTRUCTION:\n${instruction}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return res.json({
      success: true,
      action,
      targetLanguage,
      generatedText: response.text || '',
      isAiOutput: true,
    });
  } catch (error: any) {
    const errorStr = String(error?.message || error).toLowerCase();
    const isQuota =
      errorStr.includes('quota') ||
      errorStr.includes('resource_exhausted') ||
      errorStr.includes('429') ||
      errorStr.includes('rate-limit');

    if (isQuota) {
      return res.status(429).json({
        status: 'QUOTA EXCEEDED',
        message: 'AI Provider quota exceeded. You can retry shortly. All offline browser tools (DOCX, PDF, XLSX, PPTX) remain available.',
        isQuotaExceeded: true,
      });
    }

    const isTimeout = error?.name === 'AbortError' || errorStr.includes('timeout');
    if (isTimeout) {
      return res.status(504).json({
        status: 'TIMEOUT',
        message: 'AI text generation timed out. Please try again.',
      });
    }

    console.error('Server AI execution error:', error?.message || error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'AI provider error occurred while executing command.',
    });
  }
});



// High-Fidelity Cloud AI OCR Endpoint (Gemini Vision)
app.post('/api/ai/ocr', async (req: Request, res: Response) => {
  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      status: 'NOT CONFIGURED',
      message: 'Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your .env file.',
    });
  }

  const { imageBase64, mimeType = 'image/jpeg', targetLanguage = 'Mixed' } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ status: 'INVALID_REQUEST', message: 'imageBase64 is required for Cloud OCR.' });
  }

  const langNote = targetLanguage === 'Bangla' ? 'Bangla (Bengali)' : targetLanguage === 'English' ? 'English' : 'Bengali and English';

  try {
    const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-z]+;base64,/, '');
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        {
          text: `You are an expert Optical Character Recognition (OCR) engine. Perform high-accuracy transcription of this document image.
1. Extract ALL text in ${langNote} exactly as written.
2. Maintain natural paragraph linebreaks, numerical values, tables, and punctuation.
3. Return a clean JSON object:
{
  "rawText": "Exact text extracted from the document",
  "cleanedText": "Normalized text with cleaned spacing and formatting",
  "confidence": 96,
  "wordsCount": 150,
  "linesCount": 20
}`,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      status: 'SUCCESS',
      text: parsed.rawText || response.text || '',
      cleanedText: parsed.cleanedText || parsed.rawText || response.text || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 95,
      wordsCount: parsed.wordsCount || (parsed.cleanedText ? parsed.cleanedText.split(/\s+/).length : 0),
      linesCount: parsed.linesCount || (parsed.cleanedText ? parsed.cleanedText.split('\n').length : 0),
    });
  } catch (error: any) {
    console.error('Cloud OCR error:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: error?.message || 'Cloud OCR recognition failed.',
    });
  }
});

// Image -> AI Prompt Generator (Gemini Vision Image Reverse Prompting)
app.post('/api/ai/image-to-prompt', async (req: Request, res: Response) => {
  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      status: 'NOT CONFIGURED',
      message: 'Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your .env file.',
    });
  }

  const { imageBase64, mimeType = 'image/jpeg', customInstruction } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ status: 'INVALID_REQUEST', message: 'imageBase64 is required.' });
  }

  try {
    const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-z]+;base64,/, '');
    const userPromptText = customInstruction
      ? `Analyze this image in detail and create an exceptional generative AI image prompt for it. Follow this extra instruction: "${customInstruction}".`
      : 'Analyze this image in high detail and craft a professional, rich generative AI image prompt capturing its subjects, environment, mood, lighting, color palette, camera angle, and artistic medium.';

    const systemInstruction = `You are MAISHAA WORKSPACE Vision Prompt Engineer.
Reverse-engineer the provided image into a high-fidelity image generation prompt compatible with modern models (Midjourney, Flux, Imagen, Stable Diffusion).
Return ONLY valid JSON matching this schema:
{
  "prompt": "Detailed multi-sentence prompt describing subject, composition, lighting, camera/lens, materials, mood, and color palette",
  "shortTitle": "Concise 3-6 word description",
  "styleTags": ["tag1", "tag2", "tag3", "tag4"],
  "cameraSettings": "e.g. 50mm f/1.8 lens, eye-level, soft bokeh",
  "lighting": "e.g. golden hour rim lighting, volumetric soft shadows"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        { text: userPromptText },
      ],
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      status: 'SUCCESS',
      prompt: parsed.prompt || response.text || '',
      shortTitle: parsed.shortTitle || 'Generated Image Prompt',
      styleTags: Array.isArray(parsed.styleTags) ? parsed.styleTags : ['photorealistic', 'detailed'],
      cameraSettings: parsed.cameraSettings || 'Natural perspective',
      lighting: parsed.lighting || 'Balanced ambient lighting',
      isAiOutput: true,
    });
  } catch (error: any) {
    const errorStr = String(error?.message || error).toLowerCase();
    const isQuota =
      errorStr.includes('quota') ||
      errorStr.includes('resource_exhausted') ||
      errorStr.includes('429') ||
      errorStr.includes('rate-limit');

    if (isQuota) {
      return res.status(429).json({
        status: 'QUOTA EXCEEDED',
        message: 'Gemini API quota exceeded. Please wait a moment before trying again, or use our Quota-Free Manual Prompt Builder below.',
        isQuotaExceeded: true,
      });
    }

    console.error('Server Image-to-Prompt error:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: error?.message || 'Failed to generate prompt from image.',
    });
  }
});

// Serve frontend: Vite middlewares in dev, static dist in production
async function startServer() {
  const isDev =
    process.env.NODE_ENV === 'development' ||
    (!process.env.NODE_ENV && !fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html')));

  if (!isDev) {
    const distPath = fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'))
      ? path.resolve(process.cwd(), 'dist')
      : path.resolve(__dirname, 'dist');

    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[Production] Serving static assets from ${distPath}`);
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log(`[Development] Vite middleware mounted`);
  }

  app.listen(PORT, () => {
    console.log(`MAISHAA WORKSPACE server running on port ${PORT}`);
    const isConfigured = Boolean(getAiApiKey());
    console.log(`Gemini API configured: ${isConfigured}`);
  });
}

// Only start when run directly (not during test import)
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  startServer();
}

export default app;

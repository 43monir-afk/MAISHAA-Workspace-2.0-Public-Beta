import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { PUBLIC_ROUTES_SEO, generateSchemaJsonLd, CANONICAL_DOMAIN } from './src/config/seoConfig';

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

// ==========================================
// MAISHAA BG REMOVER STUDIO SERVER ENDPOINTS
// ==========================================

app.get('/api/image/provider-status', (_req: Request, res: Response) => {
  const removeBgKey = process.env.REMOVE_BG_API_KEY;
  const geminiKey = getAiApiKey();
  const hasRemoveBg = typeof removeBgKey === 'string' && removeBgKey.trim().length > 5;
  const hasGemini = typeof geminiKey === 'string' && geminiKey.trim().length > 5;

  return res.json({
    status: 'OK',
    removeBgAvailable: hasRemoveBg,
    geminiAvailable: hasGemini,
    activeProvider: hasRemoveBg ? 'removebg' : hasGemini ? 'gemini' : 'local',
    message: hasRemoveBg
      ? 'remove.bg Cloud AI Provider Connected'
      : hasGemini
      ? 'Gemini Vision AI Provider Connected'
      : 'Local High-Performance Processor Active (Color & Saliency Matting)',
  });
});

app.post('/api/image/remove-bg', async (req: Request, res: Response) => {
  const removeBgKey = process.env.REMOVE_BG_API_KEY;
  const imageBase64 = req.body?.imageBase64 || req.body?.image;

  if (!imageBase64) {
    return res.status(400).json({ status: 'INVALID_REQUEST', message: 'Image payload is required.' });
  }

  // 1. Try remove.bg API if configured on server
  if (removeBgKey && removeBgKey.trim().length > 5) {
    try {
      const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-z]+;base64,/, '');
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': removeBgKey.trim(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          image_file_b64: cleanBase64,
          size: 'auto',
          format: 'png',
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        const data = await response.json();
        const resultBase64 = data.data?.result_b64;
        if (resultBase64) {
          const buffer = Buffer.from(resultBase64, 'base64');
          res.setHeader('Content-Type', 'image/png');
          return res.send(buffer);
        }
      }
    } catch (err: any) {
      console.warn('remove.bg server request failed:', err?.message);
    }
  }

  return res.status(503).json({
    status: 'PROVIDER_UNAVAILABLE',
    message: 'Cloud AI background removal provider is not configured or reachable. Local processing is available.',
  });
});

app.post('/api/image/generate-bg', async (req: Request, res: Response) => {
  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      status: 'NOT_CONFIGURED',
      message: 'Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your .env file.',
    });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ status: 'INVALID_REQUEST', message: 'A prompt is required.' });
  }

  try {
    // Attempt Imagen 3 generation using Google Gen AI SDK
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: `Clean high resolution studio background, ${prompt.trim()}, no human subject, empty backdrop, professional commercial photography, 8k wallpaper`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    const generatedImg = response.generatedImages?.[0]?.image?.imageBytes;
    if (generatedImg) {
      const dataUrl = `data:image/jpeg;base64,${generatedImg}`;
      return res.json({ status: 'SUCCESS', imageUrl: dataUrl });
    }

    return res.status(500).json({ status: 'ERROR', message: 'No image was generated by the model.' });
  } catch (error: any) {
    console.error('Server generate-bg error:', error?.message);
    return res.status(500).json({
      status: 'ERROR',
      message: error?.message || 'Failed to generate background image.',
    });
  }
});

// -------------------------------------------------------------
// Public SEO, Ads & Search Visibility Routes
// -------------------------------------------------------------

// 1. Official ads.txt route
app.get('/ads.txt', (_req: Request, res: Response) => {
  const adsTxtPath = path.resolve(process.cwd(), 'public', 'ads.txt');
  if (fs.existsSync(adsTxtPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(adsTxtPath);
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send('# MAISHAA WORKSPACE ads.txt\n# domain: workspace.maishaa.bd\nadsterra.com, direct\n');
});

// 2. robots.txt route
app.get('/robots.txt', (_req: Request, res: Response) => {
  const robotsTxtPath = path.resolve(process.cwd(), 'public', 'robots.txt');
  if (fs.existsSync(robotsTxtPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(robotsTxtPath);
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /storage/\n\nSitemap: https://workspace.maishaa.bd/sitemap.xml\n');
});

// 3. Dynamic XML Sitemap route
app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const routes = Object.keys(PUBLIC_ROUTES_SEO);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${CANONICAL_DOMAIN}${r === '/' ? '' : r}</loc>
    <lastmod>2026-10-07</lastmod>
    <changefreq>${r === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${r === '/' ? '1.0' : r.startsWith('/pdf-studio') || r.startsWith('/image-studio') ? '0.9' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  return res.send(xml);
});

/**
 * Injects route-tailored SEO tags, OpenGraph cards, Twitter cards, Schema.org JSON-LD,
 * and crawler fallback content into index.html.
 */
export function injectSeoMetadata(rawHtml: string, reqPath: string): string {
  const cleanPath = reqPath.split('?')[0].replace(/\/+$/, '') || '/';
  const seo = PUBLIC_ROUTES_SEO[cleanPath] || PUBLIC_ROUTES_SEO['/'];
  const canonicalUrl = `${CANONICAL_DOMAIN}${seo.path === '/' ? '' : seo.path}`;
  const schemaJson = JSON.stringify(generateSchemaJsonLd(cleanPath));

  // Build semantic crawler and screen-reader content block
  const crawlerContent = `
    <!-- Prerendered Semantic SEO Content for Search Crawlers & Assistive Tech -->
    <div id="seo-prerender-summary" style="display:none;" aria-hidden="true">
      <h1>${seo.h1Bn}</h1>
      <h2>${seo.h1En}</h2>
      <p>${seo.summaryBn}</p>
      <p>${seo.summaryEn}</p>
      <h3>Supported Formats: ${seo.supportedFormats.join(', ')}</h3>
      <p>Limits: ${seo.limits}</p>
      <ol>
        ${seo.instructionsBn.map((step) => `<li>${step}</li>`).join('')}
      </ol>
      <div>
        ${seo.faqs.map((f) => `<article><h4>${f.questionBn}</h4><p>${f.answerBn}</p></article>`).join('')}
      </div>
    </div>
  `;

  let html = rawHtml;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${seo.titleBn}</title>`);

  // Replace Meta Description
  html = html.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${seo.metaDescriptionBn}" />`
  );

  // Replace/Inject Canonical & Social Cards in <head>
  const tagsToInject = `
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${seo.titleBn}" />
    <meta property="og:description" content="${seo.metaDescriptionBn}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="MAISHAA WORKSPACE" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${seo.titleBn}" />
    <meta name="twitter:description" content="${seo.metaDescriptionBn}" />
    <script type="application/ld+json">
      ${schemaJson}
    </script>
  `;

  html = html.replace('</head>', `${tagsToInject}\n  </head>`);

  // Inject prerendered content before root element
  html = html.replace('<div id="root"></div>', `${crawlerContent}\n    <div id="root"></div>`);

  return html;
}

// Serve frontend: Vite middlewares in dev, static dist in production
async function startServer() {
  const isDev =
    process.env.NODE_ENV === 'development' ||
    (!process.env.NODE_ENV && !fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html')));

  if (!isDev) {
    const distPath = fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'))
      ? path.resolve(process.cwd(), 'dist')
      : path.resolve(__dirname, 'dist');

    // Serve static assets (js, css, images) directly
    app.use(express.static(distPath, { index: false }));

    // SPA and public SEO page router
    app.get('*', (req: Request, res: Response) => {
      const cleanPath = req.path.split('?')[0].replace(/\/+$/, '') || '/';
      const isKnownRoute = Boolean(PUBLIC_ROUTES_SEO[cleanPath]);

      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        const rawIndex = fs.readFileSync(indexPath, 'utf8');

        if (isKnownRoute) {
          const renderedHtml = injectSeoMetadata(rawIndex, cleanPath);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(200).send(renderedHtml);
        } else {
          // Unknown nonexistent route: return true 404 with friendly fallback
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(404).send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>৪০৪ — পৃষ্ঠাটি পাওয়া যায়নি | 404 Not Found — MAISHAA WORKSPACE</title>
  <style>
    body { background: #0b1329; color: #e2e8f0; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
    .card { background: #0f172a; border: 1px solid #1e293b; padding: 2.5rem; border-radius: 1rem; max-width: 450px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { color: #38bdf8; font-size: 3rem; margin: 0 0 0.5rem 0; font-weight: 900; }
    h2 { font-size: 1.25rem; margin: 0 0 1rem 0; }
    p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
    a { display: inline-block; background: #0ea5e9; color: #040914; padding: 0.75rem 1.5rem; border-radius: 0.75rem; text-decoration: none; font-weight: bold; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>404</h1>
    <h2>পৃষ্ঠাটি পাওয়া যায়নি (Page Not Found)</h2>
    <p>আপনি যে লিঙ্কটি খুঁজছেন তা মায়িশা ওয়ার্কস্পেসে বিদ্যমান নেই অথবা স্থানান্তরিত হয়েছে।</p>
    <a href="/">হোমে ফিরে যান (Back to Home)</a>
  </div>
</body>
</html>`);
        }
      }

      return res.status(404).send('Not Found');
    });

    console.log(`[Production] Serving static assets and SEO routes from ${distPath}`);
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

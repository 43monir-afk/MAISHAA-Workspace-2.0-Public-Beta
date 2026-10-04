/**
 * MAISHAA WORKSPACE — Phase 2 Presentation Intelligence Service
 * Extracts slide text, titles, word counts, and presentation structure from PPTX files.
 * Uses client-side JSZip to parse standard OpenXML presentation slides.
 */

import JSZip from 'jszip';
import pptxgen from 'pptxgenjs';
import { validateFileInput } from '../utils/privacy';

export interface SlideAnalysis {
  slideNumber: number;
  title?: string;
  texts: string[];
  wordCount: number;
}

export interface PresentationAnalysisResult {
  fileName: string;
  fileSize: number;
  slideCount: number;
  totalWordCount: number;
  slides: SlideAnalysis[];
  extractedTextGrouped: string;
}

/**
 * Parse XML string and extract all text inside <a:t> nodes.
 */
function extractTextsFromSlideXml(xmlStr: string): { title?: string; texts: string[] } {
  const texts: string[] = [];
  const textTagRegex = /<a:t(?:\s+[^>]*)?>([^<]*)<\/a:t>/gi;
  let match;
  while ((match = textTagRegex.exec(xmlStr)) !== null) {
    const txt = match[1].trim();
    if (txt) {
      texts.push(txt);
    }
  }

  // Detect potential title: check title placeholder or first text item
  let title: string | undefined;
  if (xmlStr.includes('type="title"') || xmlStr.includes('type="ctrTitle"')) {
    title = texts[0];
  } else if (texts.length > 0 && texts[0].length < 100) {
    title = texts[0];
  }

  return { title, texts };
}

/**
 * Parse a PPTX file and extract structured presentation intelligence.
 */
export async function parsePresentation(file: File): Promise<PresentationAnalysisResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slideFiles: Array<{ name: string; num: number }> = [];

    zip.forEach((relativePath) => {
      const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
      if (match) {
        slideFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
      }
    });

    if (slideFiles.length === 0) {
      throw new Error('উপস্থাপনায় কোনো স্লাইড পাওয়া যায়নি (No slides found in presentation)');
    }

    // Sort slides numerically (slide1, slide2, ...)
    slideFiles.sort((a, b) => a.num - b.num);

    const slides: SlideAnalysis[] = [];
    let totalWordCount = 0;
    const groupedParts: string[] = [];

    for (let i = 0; i < slideFiles.length; i++) {
      const item = slideFiles[i];
      const xml = await zip.file(item.name)?.async('text');
      if (xml) {
        const { title, texts } = extractTextsFromSlideXml(xml);
        const slideWords = texts.join(' ').trim().split(/\s+/).filter(Boolean).length;
        totalWordCount += slideWords;

        slides.push({
          slideNumber: i + 1,
          title: title || `Slide ${i + 1}`,
          texts,
          wordCount: slideWords,
        });

        groupedParts.push(
          `--- Slide ${i + 1}: ${title || 'Untitled'} ---\n${texts.join('\n')}\n`
        );
      }
    }

    return {
      fileName: file.name,
      fileSize: file.size,
      slideCount: slides.length,
      totalWordCount,
      slides,
      extractedTextGrouped: groupedParts.join('\n'),
    };
  } catch (err: any) {
    throw new Error(`PPTX লোড করতে ব্যর্থ: ${err.message || 'Corrupted or unreadable PPTX'}`);
  }
}

/**
 * Generate a complete, styled PPTX presentation from edited slide structures.
 */
export async function createOrExportPresentation(
  slides: SlideAnalysis[],
  themeColor: string = '0d9488'
): Promise<Blob> {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.title = 'MAISHAA WORKSPACE Presentation';
  pres.author = 'MAISHAA WORKSPACE 2';

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const slide = pres.addSlide();

    // Top banner
    slide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: 1.1,
      fill: { color: themeColor },
    });

    // Slide Title
    slide.addText(s.title || `Slide ${i + 1}`, {
      x: 0.8,
      y: 0.25,
      w: 8.4,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });

    // Content bullets
    const contentLines = s.texts.filter((t) => t.trim() !== (s.title || '').trim());
    if (contentLines.length > 0) {
      slide.addText(
        contentLines.map((line) => ({
          text: line,
          options: {
            fontSize: 14,
            color: '1E293B',
            bullet: true,
            breakLine: true,
            paraSpaceAfter: 8,
          },
        })),
        {
          x: 0.8,
          y: 1.6,
          w: 8.4,
          h: 4.8,
          valign: 'top',
        }
      );
    } else {
      slide.addText('[Add bullet points or description here]', {
        x: 0.8,
        y: 2.0,
        w: 8.4,
        h: 1.5,
        fontSize: 14,
        color: '94A3B8',
        italic: true,
      });
    }

    // Subtle Footer
    slide.addText(`MAISHAA WORKSPACE 2 • Slide ${i + 1} of ${slides.length}`, {
      x: 0.8,
      y: 6.8,
      w: 8.4,
      h: 0.4,
      fontSize: 9,
      color: '64748B',
    });
  }

  const out = await pres.write({ outputType: 'blob' });
  return out as Blob;
}


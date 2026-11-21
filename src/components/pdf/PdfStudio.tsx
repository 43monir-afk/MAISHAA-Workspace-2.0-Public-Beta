import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  mergePdfs,
  splitPdf,
  extractPages,
  deletePages,
  rotatePages,
  imagesToPdf,
  convertPdfToImages,
  parsePageRange,
  optimizePdf,
  repairDamagedPdf,
  convertToPdfA,
  cropPdfPages,
  fillPdfAcroForm,
  addWatermark,
  addPageNumbers,
  reorderPages,
  addSignature,
  type PageNumberPosition,
  type SignaturePosition,
  type SignatureSource,
  getPdfMetadata,
  PdfMetadata,
  type PdfPageImage,
} from '../../services/pdfService';
import { PDFDocument } from 'pdf-lib';
import SignaturePad from './SignaturePad';
import RedactionEditor from './RedactionEditor';
import PdfEditor from './PdfEditor';
import { comparePdfsToReport } from '../../services/pdfCompareService';
import { redactPdf, type RedactRect } from '../../services/pdfRedactService';
import { decryptPdfWithPassword, isPdfEncrypted } from '../../services/pdfSecurityService';
import { encryptPdfStandard, decryptPdfStandard } from '../../services/pdfStandardEncryptionService';
import { formatFileSize, generateSafeOutputFilename } from '../../utils/fileDetection';
import { createManagedObjectUrl } from '../../utils/privacy';
import { downloadFileOnce } from '../../utils/downloadHelper';
import { AdSlot } from '../common/AdSlot';
import { ProGate, ProMark } from '../site/ProGate';
import { useAuth } from '../../context/AuthContext';
import { isProPdfTab } from '../../config/plans';
import { ToolSeoGuide } from '../common/ToolSeoGuide';
import {
  FileText,
  Upload,
  Split,
  Combine,
  Scissors,
  Trash2,
  RotateCw,
  Image as ImageIcon,
  Minimize2,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Plus,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Lock,
  Unlock,
  Wrench,
  Archive,
  Crop,
  FormInput,
  Key,
  Eye,
  X,
  ArrowUpDown,
  GitCompare,
  EyeOff,
  PenLine,
  Stamp,
  Hash,
  ImageDown,
  Type,
  Layers,
  Pencil,
} from 'lucide-react';
import { extractPdfImages, addTextToPdf, overlayPdf } from '../../services/pdfExtrasService';

type PdfSubTab =
  | 'merge'
  | 'split'
  | 'extract'
  | 'delete'
  | 'rotate'
  | 'crop'
  | 'imagesToPdf'
  | 'pdfToImages'
  | 'compress'
  | 'protect'
  | 'unlock'
  | 'repair'
  | 'pdfa'
  | 'forms'
  | 'watermark'
  | 'pageNumbers'
  | 'reorder'
  | 'sign'
  | 'redact'
  | 'compare'
  | 'extractImages'
  | 'addText'
  | 'overlay'
  | 'editor'
  | 'metadata';

export const PdfStudio: React.FC = () => {
  const {
    t,
    language,
    stagedFiles,
    addJob,
    updateJob,
    showNotification,
    pdfInitialTab,
  } = useWorkspace();

  const [activeSubTab, setActiveSubTab] = useState<PdfSubTab>('merge');
  const { isPro } = useAuth();

  // Deep-link routing synchronization
  useEffect(() => {
    if (pdfInitialTab) {
      if (['merge', 'split', 'compress', 'delete', 'extract', 'crop', 'protect', 'unlock', 'repair', 'pdfa', 'forms', 'metadata', 'pdfToImages', 'watermark', 'pageNumbers', 'reorder', 'sign', 'redact', 'compare', 'extractImages', 'addText', 'overlay', 'editor'].includes(pdfInitialTab)) {
        setActiveSubTab(pdfInitialTab as PdfSubTab);
      } else if (pdfInitialTab === 'organize') {
        setActiveSubTab('rotate');
      } else if (pdfInitialTab === 'convert') {
        setActiveSubTab('imagesToPdf');
      }
    }
  }, [pdfInitialTab]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Operation specific parameters
  const [pageRange, setPageRange] = useState<string>('1-2');
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [rotateScope, setRotateScope] = useState<'all' | 'custom'>('all');
  const [rotatePagesInput, setRotatePagesInput] = useState<string>('1');

  // Watermark / page numbers / reorder parameters
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(25);
  const [watermarkSize, setWatermarkSize] = useState<number>(56);
  const [watermarkColor, setWatermarkColor] = useState<string>('#888888');
  const [pageNumberPosition, setPageNumberPosition] = useState<PageNumberPosition>('bottom-center');
  const [pageNumberStart, setPageNumberStart] = useState<number>(1);
  const [pageNumberShowTotal, setPageNumberShowTotal] = useState<boolean>(false);
  const [reorderInput, setReorderInput] = useState<string>('');

  // Extra tools (PDF24-inspired): Add text, Overlay
  const [addTextValue, setAddTextValue] = useState<string>('');
  const [addTextPage, setAddTextPage] = useState<number>(1);
  const [addTextX, setAddTextX] = useState<number>(10);
  const [addTextY, setAddTextY] = useState<number>(10);
  const [addTextSize, setAddTextSize] = useState<number>(14);
  const [addTextColor, setAddTextColor] = useState<string>('#000000');
  const [overlayPosition, setOverlayPosition] = useState<'over' | 'under'>('over');
  const [overlayPageMode, setOverlayPageMode] = useState<'first' | 'match'>('first');
  const [extractNote, setExtractNote] = useState<string | null>(null);

  // Redact PDF parameters
  const [redactRects, setRedactRects] = useState<RedactRect[]>([]);
  // Boxes belong to one file: drop them when the file changes.
  const redactFile = selectedFiles[0];
  useEffect(() => {
    setRedactRects([]);
  }, [redactFile]);

  // Sign PDF parameters
  const [signMode, setSignMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [signText, setSignText] = useState<string>('');
  const [signImage, setSignImage] = useState<{ bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' } | null>(null);
  const [signPages, setSignPages] = useState<'first' | 'last' | 'all'>('last');
  const [signPosition, setSignPosition] = useState<SignaturePosition>('bottom-right');
  const [signWidth, setSignWidth] = useState<number>(25);

  // PDF to Image Specific Parameters
  const [pdfImageFormat, setPdfImageFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [pdfImageScale, setPdfImageScale] = useState<number>(2.0);
  const [pdfImageQuality, setPdfImageQuality] = useState<number>(92);
  const [pdfImagePageScope, setPdfImagePageScope] = useState<'all' | 'custom'>('all');
  const [pdfImagePageRangeInput, setPdfImagePageRangeInput] = useState<string>('1');
  const [pdfConvertedPages, setPdfConvertedPages] = useState<PdfPageImage[]>([]);
  const [pdfPreviewModalUrl, setPdfPreviewModalUrl] = useState<string | null>(null);

  // Advanced PDF Studio Parameters (iLovePDF parity)
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [pdfaProfile, setPdfaProfile] = useState<'PDF/A-1b' | 'PDF/A-2b'>('PDF/A-1b');
  const [cropMargins, setCropMargins] = useState({ top: 36, right: 36, bottom: 36, left: 36 });
  const [formFieldName, setFormFieldName] = useState<string>('Full_Name');
  const [formFieldValue, setFormFieldValue] = useState<string>('ফারজানা ইসলাম দিনা');
  const [flattenForm, setFlattenForm] = useState<boolean>(false);

  // Metadata inspect state
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // Result state
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    blob: Blob;
    downloadUrl: string;
    filename: string;
    originalSize: number;
    newSize: number;
    reductionPercentage?: number;
    meaningfulReduction?: boolean;
    pageCount: number;
  } | null>(null);


  // Initialize with staged files if available
  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      if (activeSubTab === 'imagesToPdf') {
        const images = stagedFiles.filter((f) => f.type.startsWith('image/'));
        if (images.length > 0) setSelectedFiles(images);
      } else {
        const pdfs = stagedFiles.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
        if (pdfs.length > 0) setSelectedFiles(pdfs);
      }
    }
  }, [stagedFiles, activeSubTab]);

  // Handle metadata inspection when file is selected in metadata subtab
  useEffect(() => {
    if (activeSubTab === 'metadata' && selectedFiles.length > 0 && selectedFiles[0].name.toLowerCase().endsWith('.pdf')) {
      loadMetadata(selectedFiles[0]);
    }
  }, [activeSubTab, selectedFiles]);

  const loadMetadata = async (file: File) => {
    setIsLoadingMetadata(true);
    setProcessingError(null);
    try {
      const data = await getPdfMetadata(file);
      setMetadata(data);
    } catch (err: any) {
      setProcessingError(err.message || 'Failed to read PDF metadata');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    if (activeSubTab === 'merge' || activeSubTab === 'imagesToPdf' || activeSubTab === 'compare' || activeSubTab === 'overlay') {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    } else {
      setSelectedFiles(newFiles.slice(0, 1));
    }
    setLastResult(null);
    setProcessingError(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFileOrder = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= selectedFiles.length) return;
    const updated = [...selectedFiles];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setSelectedFiles(updated);
  };

  const executePdfAction = async () => {
    if (selectedFiles.length === 0) {
      setProcessingError(
        language === 'bn'
          ? 'অনুগ্রহ করে ফাইল নির্বাচন করুন'
          : 'Please select a file first'
      );
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);
    setLastResult(null);

    const totalOriginalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    const filenames = selectedFiles.map((f) => f.name);

    // Register job in tracker
    const jobId = addJob({
      toolType: `PDF: ${activeSubTab.toUpperCase()}`,
      fileNames: filenames,
      originalSize: totalOriginalSize,
      status: 'PROCESSING',
    });

    try {
      let result;
      let outName = '';

      switch (activeSubTab) {
        case 'merge': {
          result = await mergePdfs(selectedFiles);
          outName = generateSafeOutputFilename('merged', 'merged_document', 'pdf');
          break;
        }

        case 'split': {
          result = await splitPdf(selectedFiles[0], pageRange);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            `split_pages_${pageRange.replace(/[^0-9-]/g, '_')}`,
            'pdf'
          );
          break;
        }

        case 'extract': {
          const pages = pageRange
            .split(/[,;\s]+/)
            .map((p) => parseInt(p, 10))
            .filter((p) => !isNaN(p));
          result = await extractPages(selectedFiles[0], pages);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            `extracted_p${pages.join('_')}`,
            'pdf'
          );
          break;
        }

        case 'delete': {
          const pagesToDelete = pageRange
            .split(/[,;\s]+/)
            .map((p) => parseInt(p, 10))
            .filter((p) => !isNaN(p));
          result = await deletePages(selectedFiles[0], pagesToDelete);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            'pages_removed',
            'pdf'
          );
          break;
        }

        case 'rotate': {
          const pages =
            rotateScope === 'custom'
              ? rotatePagesInput
                  .split(/[,;\s]+/)
                  .map((p) => parseInt(p, 10))
                  .filter((p) => !isNaN(p))
              : undefined;

          result = await rotatePages(selectedFiles[0], rotateAngle, pages);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            `rotated_${rotateAngle}deg`,
            'pdf'
          );
          break;
        }

        case 'watermark': {
          result = await addWatermark(selectedFiles[0], {
            text: watermarkText,
            opacity: watermarkOpacity / 100,
            fontSize: watermarkSize,
            color: watermarkColor,
          });
          outName = generateSafeOutputFilename(selectedFiles[0].name, 'watermarked', 'pdf');
          break;
        }

        case 'pageNumbers': {
          result = await addPageNumbers(selectedFiles[0], {
            position: pageNumberPosition,
            startAt: pageNumberStart,
            showTotal: pageNumberShowTotal,
          });
          outName = generateSafeOutputFilename(selectedFiles[0].name, 'numbered', 'pdf');
          break;
        }

        case 'extractImages': {
          const ex = await extractPdfImages(selectedFiles[0]);
          if (!ex.zipBlob) {
            throw new Error(
              language === 'bn'
                ? 'এই PDF থেকে বের করার মতো ছবি পাওয়া যায়নি (স্ক্যান বা বিশেষ ফরম্যাটের ছবি বাদ যেতে পারে)।'
                : 'No exportable images were found in this PDF (some special image types cannot be exported).'
            );
          }
          setExtractNote(
            language === 'bn'
              ? `${ex.images.length}টি ছবি বের হয়েছে${ex.skipped ? `, ${ex.skipped}টি বিশেষ ধরনের ছবি বাদ গেছে` : ''}।`
              : `${ex.images.length} image(s) extracted${ex.skipped ? `, ${ex.skipped} unsupported image(s) skipped` : ''}.`
          );
          result = {
            blob: ex.zipBlob,
            originalSize: selectedFiles[0].size,
            newSize: ex.zipBlob.size,
            pageCount: ex.images.length,
            meaningfulReduction: false,
          };
          outName = generateSafeOutputFilename(selectedFiles[0].name, 'images', 'zip');
          break;
        }

        case 'addText': {
          result = await addTextToPdf(selectedFiles[0], [
            { page: addTextPage, text: addTextValue, xPct: addTextX, yPct: addTextY, size: addTextSize, color: addTextColor },
          ]);
          outName = generateSafeOutputFilename(selectedFiles[0].name, 'text_added', 'pdf');
          break;
        }

        case 'overlay': {
          if (selectedFiles.length !== 2) {
            throw new Error(
              language === 'bn'
                ? 'ঠিক দুটি PDF দিন: প্রথমটি মূল ফাইল, দ্বিতীয়টি ওভারলে (লেটারহেড/স্ট্যাম্প)।'
                : 'Add exactly two PDFs: the base file first, the overlay (letterhead/stamp) second.'
            );
          }
          result = await overlayPdf(selectedFiles[0], selectedFiles[1], {
            position: overlayPosition,
            pageMode: overlayPageMode,
          });
          outName = generateSafeOutputFilename(selectedFiles[0].name, 'overlay', 'pdf');
          break;
        }

        case 'compare': {
          if (selectedFiles.length !== 2) {
            throw new Error(
              language === 'bn'
                ? 'তুলনার জন্য ঠিক দুটি PDF বেছে নিন (প্রথমটি পুরোনো, দ্বিতীয়টি নতুন)।'
                : 'Select exactly two PDFs to compare (first = original, second = changed).'
            );
          }
          const cmp = await comparePdfsToReport(selectedFiles[0], selectedFiles[1]);
          result = {
            blob: cmp.blob,
            originalSize: selectedFiles[0].size + selectedFiles[1].size,
            newSize: cmp.size,
            pageCount: cmp.pageCount,
            meaningfulReduction: false,
          };
          outName = generateSafeOutputFilename(selectedFiles[0].name, 'comparison_report', 'pdf');
          break;
        }

        case 'redact': {
          const red = await redactPdf(selectedFiles[0], redactRects);
          result = {
            blob: red.blob,
            originalSize: red.originalSize,
            newSize: red.newSize,
            pageCount: red.pageCount,
            meaningfulReduction: false,
          };
          outName = generateSafeOutputFilename(selectedFiles[0].name, 'redacted', 'pdf');
          break;
        }

        case 'sign': {
          let signature: SignatureSource;
          if (signMode === 'type') {
            signature = { kind: 'text', text: signText };
          } else {
            if (!signImage) {
              throw new Error(
                signMode === 'draw'
                  ? 'Please draw your signature first.'
                  : 'Please choose a PNG or JPG signature image first.'
              );
            }
            signature = { kind: 'image', bytes: signImage.bytes, mime: signImage.mime };
          }
          result = await addSignature(selectedFiles[0], {
            signature,
            pages: signPages,
            position: signPosition,
            widthPercent: signWidth,
          });
          outName = generateSafeOutputFilename(selectedFiles[0].name, 'signed', 'pdf');
          break;
        }

        case 'reorder': {
          result = await reorderPages(selectedFiles[0], reorderInput);
          outName = generateSafeOutputFilename(selectedFiles[0].name, 'reordered', 'pdf');
          break;
        }

        case 'imagesToPdf': {
          result = await imagesToPdf(selectedFiles);
          outName = generateSafeOutputFilename(
            'images',
            'compiled_presentation',
            'pdf'
          );
          break;
        }

        case 'pdfToImages': {
          const pages = pdfImagePageScope === 'custom'
            ? parsePageRange(pdfImagePageRangeInput, 9999)
            : undefined;
          const convRes = await convertPdfToImages(selectedFiles[0], {
            format: pdfImageFormat,
            quality: pdfImageQuality / 100,
            scale: pdfImageScale,
            pageNumbers: pages,
          });
          setPdfConvertedPages(convRes.images);
          const outBlob = convRes.zipBlob || convRes.images[0].blob;
          outName = convRes.zipFilename || convRes.images[0].filename;
          result = {
            blob: outBlob,
            originalSize: selectedFiles[0].size,
            newSize: outBlob.size,
            pageCount: convRes.selectedPageCount,
            meaningfulReduction: false,
          };
          break;
        }

        case 'compress': {
          result = await optimizePdf(selectedFiles[0]);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            'optimized',
            'pdf'
          );
          break;
        }

        case 'crop': {
          result = await cropPdfPages(selectedFiles[0], cropMargins);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            'cropped',
            'pdf'
          );
          break;
        }

        case 'protect': {
          // Standard AES-256 PDF encryption: opens with a password in Acrobat, Chrome, phones, etc.
          const enc = await encryptPdfStandard(selectedFiles[0], passwordInput);
          let pages = 1;
          try {
            pages = (await PDFDocument.load(await selectedFiles[0].arrayBuffer(), { ignoreEncryption: true })).getPageCount();
          } catch {
            /* page count is informational only */
          }
          result = {
            blob: enc.blob,
            originalSize: selectedFiles[0].size,
            newSize: enc.size,
            pageCount: pages,
            meaningfulReduction: false,
          };
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            'protected_aes256',
            'pdf'
          );
          break;
        }

        case 'unlock': {
          // Files protected by older versions of this app use the legacy envelope; everything else is a standard PDF.
          const isLegacy = await isPdfEncrypted(selectedFiles[0]);
          const dec = isLegacy
            ? await decryptPdfWithPassword(selectedFiles[0], passwordInput)
            : await decryptPdfStandard(selectedFiles[0], passwordInput);
          let unlockedPages = 1;
          try {
            unlockedPages = (await PDFDocument.load(await dec.blob.arrayBuffer())).getPageCount();
          } catch {
            /* page count is informational only */
          }
          result = {
            blob: dec.blob,
            originalSize: selectedFiles[0].size,
            newSize: dec.size,
            pageCount: unlockedPages,
            meaningfulReduction: false,
          };
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            'decrypted_unlocked',
            'pdf'
          );
          break;
        }

        case 'repair': {
          const rep = await repairDamagedPdf(selectedFiles[0]);
          result = {
            blob: rep.blob,
            originalSize: rep.originalSize,
            newSize: rep.newSize,
            pageCount: rep.repairedPages,
            meaningfulReduction: false,
          };
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            'repaired',
            'pdf'
          );
          break;
        }

        case 'pdfa': {
          const pdfaRes = await convertToPdfA(selectedFiles[0], pdfaProfile);
          result = {
            blob: pdfaRes.blob,
            originalSize: selectedFiles[0].size,
            newSize: pdfaRes.size,
            pageCount: 1,
            meaningfulReduction: false,
          };
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            `archival_${pdfaProfile.replace(/[/]/g, '_')}`,
            'pdf'
          );
          break;
        }

        case 'forms': {
          const fValues: Record<string, string> = { [formFieldName]: formFieldValue };
          result = await fillPdfAcroForm(selectedFiles[0], fValues, flattenForm);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            flattenForm ? 'forms_flattened' : 'forms_interactive',
            'pdf'
          );
          break;
        }

        default:
          throw new Error('Unsupported action');
      }

      const downloadUrl = createManagedObjectUrl(result.blob);

      setLastResult({
        blob: result.blob,
        downloadUrl,
        filename: outName,
        originalSize: result.originalSize,
        newSize: result.newSize,
        reductionPercentage: result.reductionPercentage,
        meaningfulReduction: result.meaningfulReduction,
        pageCount: result.pageCount,
      });


      // Update job tracker
      updateJob(jobId, {
        status: 'COMPLETED',
        outputSize: result.newSize,
        outputUrl: downloadUrl,
        outputFilename: outName,
        reductionPercentage: result.reductionPercentage,
        notes:
          activeSubTab === 'compress' && !result.meaningfulReduction
            ? language === 'bn'
              ? t.pdf.noReductionNote
              : 'File was already optimal. Output kept pristine.'
            : undefined,
      });

      showNotification(
        language === 'bn'
          ? 'পিডিএফ প্রসেসিং সফলভাবে সম্পন্ন হয়েছে!'
          : 'PDF processed successfully!'
      );
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'Operation failed';
      setProcessingError(errMsg);
      updateJob(jobId, {
        status: 'FAILED',
        errorState: errMsg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const navTabs = [
    { id: 'editor', label: language === 'bn' ? 'PDF এডিটর' : 'PDF Editor', icon: Pencil },
    { id: 'merge', label: t.pdf.merge, icon: Combine },
    { id: 'split', label: t.pdf.split, icon: Split },
    { id: 'extract', label: t.pdf.extract, icon: Scissors },
    { id: 'delete', label: t.pdf.deletePages, icon: Trash2 },
    { id: 'rotate', label: t.pdf.rotate, icon: RotateCw },
    { id: 'crop', label: language === 'bn' ? 'ক্রপ পৃষ্ঠা' : 'Crop Pages', icon: Crop },
    { id: 'compare', label: language === 'bn' ? 'PDF তুলনা' : 'Compare PDF', icon: GitCompare },
    { id: 'redact', label: language === 'bn' ? 'তথ্য লুকান (Redact)' : 'Redact PDF', icon: EyeOff },
    { id: 'addText', label: language === 'bn' ? 'লেখা যোগ করুন' : 'Add Text', icon: Type },
    { id: 'overlay', label: language === 'bn' ? 'ওভারলে' : 'Overlay PDF', icon: Layers },
    { id: 'extractImages', label: language === 'bn' ? 'ছবি বের করুন' : 'Extract Images', icon: ImageDown },
    { id: 'sign', label: language === 'bn' ? 'সই করুন' : 'Sign PDF', icon: PenLine },
    { id: 'reorder', label: language === 'bn' ? 'পৃষ্ঠা সাজান' : 'Reorder Pages', icon: ArrowUpDown },
    { id: 'watermark', label: language === 'bn' ? 'ওয়াটারমার্ক' : 'Watermark', icon: Stamp },
    { id: 'pageNumbers', label: language === 'bn' ? 'পৃষ্ঠা নম্বর' : 'Page Numbers', icon: Hash },
    { id: 'imagesToPdf', label: t.pdf.imagesToPdf, icon: ImageIcon },
    { id: 'pdfToImages', label: t.pdf.pdfToImages, icon: ImageIcon },
    { id: 'compress', label: t.pdf.compress, icon: Minimize2 },
    { id: 'protect', label: language === 'bn' ? 'পাসওয়ার্ড সুরক্ষা' : 'Protect PDF', icon: Lock },
    { id: 'unlock', label: language === 'bn' ? 'আনলক পিডিএফ' : 'Unlock PDF', icon: Unlock },
    { id: 'repair', label: language === 'bn' ? 'পিডিএফ মেরামত' : 'Repair PDF', icon: Wrench },
    { id: 'pdfa', label: language === 'bn' ? 'পিডিএফ/এ আর্কাইভ' : 'PDF/A Archival', icon: Archive },
    { id: 'forms', label: language === 'bn' ? 'অ্যাক্রোফর্ম পূরণ' : 'AcroForms', icon: FormInput },
    { id: 'metadata', label: t.pdf.metadata, icon: Info },
  ];

  const proLocked = isProPdfTab(activeSubTab) && !isPro;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Studio Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <FileText className="w-5 h-5" />
          </span>
          <span className="text-xs font-semibold text-rose-400 font-mono">
            PDF STUDIO (CLIENT-SIDE)
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          {t.pdf.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          {t.pdf.subtitle}
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80 no-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as PdfSubTab);
                setProcessingError(null);
                setLastResult(null); setExtractNote(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {isProPdfTab(tab.id) && !isPro && <ProMark />}
            </button>
          );
        })}
      </div>

      {proLocked && (
        <ProGate name={navTabs.find((x) => x.id === activeSubTab)?.label || 'PDF'}>
          <></>
        </ProGate>
      )}

      {/* Main Studio Interactive Workspace (kept mounted but hidden while Pro-locked) */}
      {activeSubTab === 'editor' && !proLocked && (
        <PdfEditor language={language === 'bn' ? 'bn' : 'en'} initialFile={selectedFiles[0] ?? stagedFiles?.find((f) => f.name.toLowerCase().endsWith('.pdf')) ?? null} />
      )}
      <div className={proLocked || activeSubTab === 'editor' ? 'hidden' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'}>
        {/* Left Column: File Staging & Configuration */}
        <div className="lg:col-span-7 space-y-5">
          {/* File Picker / Drop Zone */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" />
                {activeSubTab === 'imagesToPdf'
                  ? language === 'bn'
                    ? 'ছবি ফাইলসমূহ'
                    : 'Selected Images'
                  : language === 'bn'
                  ? 'পিডিএফ ফাইলসমূহ'
                  : 'Selected PDF File(s)'}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {selectedFiles.length}{' '}
                {language === 'bn' ? 'টি নির্বাচিত' : 'selected'}
              </span>
            </div>

            {/* Hidden file input */}
            <input
              id="pdfStudioFileInput"
              type="file"
              multiple={activeSubTab === 'merge' || activeSubTab === 'imagesToPdf' || activeSubTab === 'compare' || activeSubTab === 'overlay'}
              accept={activeSubTab === 'imagesToPdf' ? '.png,.jpg,.jpeg,.webp' : '.pdf'}
              className="hidden"
              onChange={handleFileSelect}
            />

            {selectedFiles.length === 0 ? (
              <label
                htmlFor="pdfStudioFileInput"
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-800/20 hover:bg-slate-800/40 cursor-pointer transition-all"
              >
                <Upload className="w-8 h-8 text-teal-400/80 mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  {activeSubTab === 'imagesToPdf'
                    ? language === 'bn'
                      ? 'ছবি নির্বাচন করতে ক্লিক করুন'
                      : 'Click to select image files'
                    : language === 'bn'
                    ? 'পিডিএফ নির্বাচন করতে ক্লিক করুন'
                    : 'Click to select PDF document'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  {language === 'bn'
                    ? 'বা ফাইল ড্র্যাগ করে ছেড়ে দিন'
                    : 'or drag and drop here'}
                </span>
              </label>
            ) : (
              <div className="space-y-2">
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}_${idx}`}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-800/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 font-mono flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate max-w-[200px] sm:max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Order buttons if multiple */}
                        {(activeSubTab === 'merge' || activeSubTab === 'imagesToPdf') && (
                          <div className="flex items-center mr-2">
                            <button
                              onClick={() => moveFileOrder(idx, idx - 1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveFileOrder(idx, idx + 1)}
                              disabled={idx === selectedFiles.length - 1}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add more files button */}
                {(activeSubTab === 'merge' || activeSubTab === 'imagesToPdf' || activeSubTab === 'compare' || activeSubTab === 'overlay') && (
                  <label
                    htmlFor="pdfStudioFileInput"
                    className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium cursor-pointer pt-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.pdf.addFiles}</span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Operation Specific Controls */}
          {selectedFiles.length > 0 && activeSubTab !== 'metadata' && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                {language === 'bn' ? 'অ্যাকশন কনফিগারেশন' : 'Action Settings'}
              </h3>

              {/* Split / Extract / Delete Page Range Input */}
              {(activeSubTab === 'split' ||
                activeSubTab === 'extract' ||
                activeSubTab === 'delete') && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    {t.pdf.pageRange}
                  </label>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g. 1-3, 5, 8"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-teal-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    {activeSubTab === 'split' &&
                      (language === 'bn'
                        ? 'রেঞ্জ অনুযায়ী ফাইলটি নতুন পিডিএফে পৃথক হবে।'
                        : 'Specified pages will form the new output PDF.')}
                    {activeSubTab === 'extract' &&
                      (language === 'bn'
                        ? 'শুধু উল্লেখিত পৃষ্ঠাগুলো রেখে নতুন পিডিএফ তৈরি হবে।'
                        : 'Only specified pages will be extracted.')}
                    {activeSubTab === 'delete' &&
                      (language === 'bn'
                        ? 'উল্লেখিত পৃষ্ঠাগুলো বাদ দিয়ে নতুন পিডিএফ তৈরি হবে।'
                        : 'Specified pages will be removed from the document.')}
                  </p>
                </div>
              )}

              {/* Rotation Options */}
              {activeSubTab === 'rotate' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      {t.pdf.rotateAngle}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([90, 180, 270] as const).map((angle) => (
                        <button
                          key={angle}
                          type="button"
                          onClick={() => setRotateAngle(angle)}
                          className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                            rotateAngle === angle
                              ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          +{angle}°
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      {language === 'bn' ? 'ঘোরানোর পরিধি' : 'Scope'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRotateScope('all')}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                          rotateScope === 'all'
                            ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {language === 'bn' ? 'সব পৃষ্ঠা' : 'All Pages'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRotateScope('custom')}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                          rotateScope === 'custom'
                            ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {language === 'bn' ? 'নির্দিষ্ট পৃষ্ঠা' : 'Specific Pages'}
                      </button>
                    </div>

                    {rotateScope === 'custom' && (
                      <input
                        type="text"
                        value={rotatePagesInput}
                        onChange={(e) => setRotatePagesInput(e.target.value)}
                        placeholder="e.g. 1, 3"
                        className="mt-2 w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-teal-400"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Extract Images Options */}
              {activeSubTab === 'extractImages' && (
                <p className="text-[11px] text-slate-300">
                  {language === 'bn'
                    ? 'PDF-এর ভেতরের ছবিগুলো আসল মান ধরে ZIP হিসেবে নামবে (JPEG ও সাধারণ RGB/Gray ছবি)। মাস্ক, CMYK ও বিশেষ এনকোডিংয়ের ছবি বাদ যেতে পারে; বাদ গেলে সংখ্যা জানানো হবে।'
                    : 'Embedded pictures are saved at original quality in a ZIP (JPEG and plain RGB/Gray images). Masks, CMYK and special encodings may be skipped; the skipped count is shown.'}
                </p>
              )}

              {/* Add Text Options */}
              {activeSubTab === 'addText' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      {language === 'bn' ? 'যে লেখা বসাবেন (ইংরেজি; নতুন লাইনে Enter)' : 'Text to add (English; Enter for new line)'}
                    </label>
                    <textarea
                      value={addTextValue}
                      onChange={(e) => setAddTextValue(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-teal-400"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      [language === 'bn' ? 'পৃষ্ঠা' : 'Page', addTextPage, setAddTextPage, 1, 9999],
                      [language === 'bn' ? 'বাম থেকে %' : 'From left %', addTextX, setAddTextX, 0, 100],
                      [language === 'bn' ? 'উপর থেকে %' : 'From top %', addTextY, setAddTextY, 0, 100],
                    ] as const).map(([label, val, setter, min, max]) => (
                      <div key={label}>
                        <span className="text-[10px] text-slate-400 block mb-1">{label}</span>
                        <input
                          type="number"
                          min={min}
                          max={max}
                          value={val}
                          onChange={(e) => setter(Math.min(max, Math.max(min, parseInt(e.target.value, 10) || min)))}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">{language === 'bn' ? 'আকার' : 'Size'}</span>
                      <input
                        type="number"
                        min={6}
                        max={200}
                        value={addTextSize}
                        onChange={(e) => setAddTextSize(parseInt(e.target.value, 10) || 14)}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">{language === 'bn' ? 'রং' : 'Colour'}</span>
                      <input
                        type="color"
                        value={addTextColor}
                        onChange={(e) => setAddTextColor(e.target.value)}
                        className="w-full h-8 rounded-lg bg-slate-800 border border-slate-700"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn'
                      ? 'এটি বিদ্যমান লেখা বদলায় না, শুধু নতুন লেখা যোগ করে। বাংলা লেখা এখানে সমর্থিত নয়।'
                      : 'This adds new text on top; it does not edit existing text. Bengali text is not supported here.'}
                  </p>
                </div>
              )}

              {/* Overlay Options */}
              {activeSubTab === 'overlay' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-300">
                    {language === 'bn'
                      ? 'ঠিক দুটি PDF যোগ করুন: প্রথমটি মূল ফাইল, দ্বিতীয়টি ওভারলে (লেটারহেড, স্ট্যাম্প বা ফ্রেম)।'
                      : 'Add exactly two PDFs: the base first, the overlay (letterhead, stamp or frame) second.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['over', language === 'bn' ? 'মূল ফাইলের উপরে' : 'On top of base'],
                      ['under', language === 'bn' ? 'মূল ফাইলের নিচে (লেটারহেড)' : 'Behind base (letterhead)'],
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setOverlayPosition(id)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border ${overlayPosition === id ? 'bg-teal-500 text-slate-950 font-bold border-teal-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['first', language === 'bn' ? 'ওভারলের ১ম পৃষ্ঠা সব পৃষ্ঠায়' : 'Overlay page 1 on every page'],
                      ['match', language === 'bn' ? 'পৃষ্ঠা অনুযায়ী মিলিয়ে' : 'Match page by page'],
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setOverlayPageMode(id)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border ${overlayPageMode === id ? 'bg-teal-500 text-slate-950 font-bold border-teal-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Compare Options */}
              {activeSubTab === 'compare' && (
                <p className="text-[11px] text-slate-300">
                  {language === 'bn'
                    ? 'ঠিক দুটি PDF যোগ করুন: প্রথমটি আসল, দ্বিতীয়টি পরিবর্তিত। লেখা পৃষ্ঠা ধরে ধরে তুলনা করে একটি রিপোর্ট PDF দেওয়া হবে ("-" শুধু প্রথমটিতে, "+" শুধু দ্বিতীয়টিতে)। স্ক্যান করা (ছবি) PDF তুলনা করা যায় না।'
                    : 'Add exactly two PDFs: the original first, the changed one second. The text is compared page by page and you get a report PDF ("-" only in the first, "+" only in the second). Scanned (image-only) PDFs cannot be compared.'}
                </p>
              )}

              {/* Redact Options */}
              {activeSubTab === 'redact' && selectedFiles[0] && (
                <div className="space-y-2">
                  <RedactionEditor
                    file={selectedFiles[0]}
                    rects={redactRects}
                    onChange={setRedactRects}
                    language={language === 'bn' ? 'bn' : 'en'}
                  />
                  <p className="text-[11px] text-amber-300">
                    {language === 'bn'
                      ? 'স্থায়ীভাবে লুকানো: বাক্সসহ পৃষ্ঠাগুলো ছবিতে রূপান্তর হবে, নিচের লেখা আর থাকবে না ও ওই পৃষ্ঠার লেখা সিলেক্ট করা যাবে না। ফাইলের আকার বাড়তে পারে। আসল ফাইল অক্ষত থাকে।'
                      : 'Permanent: pages with boxes become images, so the hidden text is truly removed, but text on those pages can no longer be selected and the file may grow. Your original file is untouched.'}
                  </p>
                </div>
              )}

              {/* Sign PDF Options */}
              {activeSubTab === 'sign' && (
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    {(['draw', 'type', 'upload'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSignMode(m)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border ${
                          signMode === m
                            ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {m === 'draw'
                          ? language === 'bn' ? 'আঁকুন' : 'Draw'
                          : m === 'type'
                            ? language === 'bn' ? 'টাইপ' : 'Type'
                            : language === 'bn' ? 'ছবি আপলোড' : 'Upload'}
                      </button>
                    ))}
                  </div>

                  {signMode === 'draw' && (
                    <SignaturePad
                      onChange={(png) => setSignImage(png ? { bytes: png, mime: 'image/png' } : null)}
                      clearLabel={language === 'bn' ? 'মুছুন' : 'Clear'}
                      hint={language === 'bn' ? 'মাউস বা আঙুল দিয়ে সই আঁকুন' : 'Draw with mouse, finger or pen'}
                    />
                  )}

                  {signMode === 'type' && (
                    <div>
                      <input
                        type="text"
                        value={signText}
                        onChange={(e) => setSignText(e.target.value)}
                        placeholder={language === 'bn' ? 'নাম লিখুন (ইংরেজি)' : 'Type your name'}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-teal-400"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        {language === 'bn'
                          ? 'টাইপ করা সই শুধু ইংরেজি অক্ষরে। বাংলা সইয়ের জন্য "আঁকুন" বা "ছবি আপলোড" বেছে নিন।'
                          : 'Typed signatures support English letters only. For Bengali use Draw or Upload.'}
                      </p>
                    </div>
                  )}

                  {signMode === 'upload' && (
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) {
                          setSignImage(null);
                          return;
                        }
                        const mime = f.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
                        setSignImage({ bytes: new Uint8Array(await f.arrayBuffer()), mime });
                      }}
                      className="w-full text-xs text-slate-300"
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">{language === 'bn' ? 'কোন পৃষ্ঠায়' : 'Pages'}</span>
                      <select
                        value={signPages}
                        onChange={(e) => setSignPages(e.target.value as 'first' | 'last' | 'all')}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      >
                        <option value="last">{language === 'bn' ? 'শেষ পৃষ্ঠা' : 'Last page'}</option>
                        <option value="first">{language === 'bn' ? 'প্রথম পৃষ্ঠা' : 'First page'}</option>
                        <option value="all">{language === 'bn' ? 'সব পৃষ্ঠা' : 'All pages'}</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">{language === 'bn' ? 'অবস্থান' : 'Position'}</span>
                      <select
                        value={signPosition}
                        onChange={(e) => setSignPosition(e.target.value as SignaturePosition)}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      >
                        <option value="bottom-right">{language === 'bn' ? 'নিচে ডানে' : 'Bottom right'}</option>
                        <option value="bottom-left">{language === 'bn' ? 'নিচে বামে' : 'Bottom left'}</option>
                        <option value="bottom-center">{language === 'bn' ? 'নিচে মাঝখানে' : 'Bottom centre'}</option>
                        <option value="center">{language === 'bn' ? 'মাঝখানে' : 'Centre'}</option>
                        <option value="top-right">{language === 'bn' ? 'উপরে ডানে' : 'Top right'}</option>
                        <option value="top-left">{language === 'bn' ? 'উপরে বামে' : 'Top left'}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">
                      {language === 'bn' ? `সইয়ের আকার: পৃষ্ঠার প্রস্থের ${signWidth}%` : `Signature width: ${signWidth}% of page`}
                    </span>
                    <input
                      type="range"
                      min={8}
                      max={60}
                      value={signWidth}
                      onChange={(e) => setSignWidth(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn'
                      ? 'এটি ছবির মতো দৃশ্যমান সই, ক্রিপ্টোগ্রাফিক ডিজিটাল স্বাক্ষর নয়।'
                      : 'This is a visible image signature, not a cryptographic digital signature.'}
                  </p>
                </div>
              )}

              {/* Reorder Options */}
              {activeSubTab === 'reorder' && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium block">
                    {language === 'bn' ? 'নতুন পৃষ্ঠার ক্রম' : 'New page order'}
                  </label>
                  <input
                    type="text"
                    value={reorderInput}
                    onChange={(e) => setReorderInput(e.target.value)}
                    placeholder="e.g. 3, 1, 2"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-teal-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn'
                      ? 'প্রতিটি পৃষ্ঠা ঠিক একবার লিখুন। যেমন ৩ পৃষ্ঠার ফাইলে "3, 1, 2"। উল্টো ক্রমের জন্য "5-1" লেখা যায়।'
                      : 'List every page exactly once. For a 3-page file type "3, 1, 2". Use "5-1" for reverse order.'}
                  </p>
                </div>
              )}

              {/* Watermark Options */}
              {activeSubTab === 'watermark' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      {language === 'bn' ? 'ওয়াটারমার্ক লেখা (ইংরেজি)' : 'Watermark text'}
                    </label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-teal-400"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        {language === 'bn' ? 'স্বচ্ছতা %' : 'Opacity %'}
                      </span>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(parseInt(e.target.value, 10) || 25)}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        {language === 'bn' ? 'আকার' : 'Size'}
                      </span>
                      <input
                        type="number"
                        min={8}
                        max={200}
                        value={watermarkSize}
                        onChange={(e) => setWatermarkSize(parseInt(e.target.value, 10) || 56)}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        {language === 'bn' ? 'রং' : 'Colour'}
                      </span>
                      <input
                        type="color"
                        value={watermarkColor}
                        onChange={(e) => setWatermarkColor(e.target.value)}
                        className="w-full h-8 rounded-lg bg-slate-800 border border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Page Number Options */}
              {activeSubTab === 'pageNumbers' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      {language === 'bn' ? 'নম্বরের অবস্থান' : 'Position'}
                    </label>
                    <select
                      value={pageNumberPosition}
                      onChange={(e) => setPageNumberPosition(e.target.value as PageNumberPosition)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                    >
                      <option value="bottom-center">{language === 'bn' ? 'নিচে মাঝখানে' : 'Bottom centre'}</option>
                      <option value="bottom-right">{language === 'bn' ? 'নিচে ডানে' : 'Bottom right'}</option>
                      <option value="bottom-left">{language === 'bn' ? 'নিচে বামে' : 'Bottom left'}</option>
                      <option value="top-center">{language === 'bn' ? 'উপরে মাঝখানে' : 'Top centre'}</option>
                      <option value="top-right">{language === 'bn' ? 'উপরে ডানে' : 'Top right'}</option>
                      <option value="top-left">{language === 'bn' ? 'উপরে বামে' : 'Top left'}</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        {language === 'bn' ? 'শুরুর নম্বর' : 'Start at'}
                      </span>
                      <input
                        type="number"
                        value={pageNumberStart}
                        onChange={(e) => setPageNumberStart(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-300 pb-1.5">
                      <input
                        type="checkbox"
                        checked={pageNumberShowTotal}
                        onChange={(e) => setPageNumberShowTotal(e.target.checked)}
                      />
                      {language === 'bn' ? '"১ / ১০" ধরনে' : 'Show "1 / 10"'}
                    </label>
                  </div>
                </div>
              )}

              {/* Crop Controls */}
              {activeSubTab === 'crop' && (
                <div className="space-y-3">
                  <label className="text-xs text-slate-300 font-medium block">
                    {language === 'bn' ? 'মার্জিন ট্রিম / ক্রপ বক্স (pt)' : 'Crop Margins (pt)'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Top</span>
                      <input
                        type="number"
                        value={cropMargins.top}
                        onChange={(e) => setCropMargins((m) => ({ ...m, top: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Right</span>
                      <input
                        type="number"
                        value={cropMargins.right}
                        onChange={(e) => setCropMargins((m) => ({ ...m, right: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Bottom</span>
                      <input
                        type="number"
                        value={cropMargins.bottom}
                        onChange={(e) => setCropMargins((m) => ({ ...m, bottom: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Left</span>
                      <input
                        type="number"
                        value={cropMargins.left}
                        onChange={(e) => setCropMargins((m) => ({ ...m, left: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password Protection */}
              {activeSubTab === 'protect' && (
                <div className="space-y-3">
                  <label className="text-xs text-slate-300 font-medium block">
                    {language === 'bn' ? 'এনক্রিপশন পাসওয়ার্ড (AES-256)' : 'Encryption Password (AES-256)'}
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter secure password"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn'
                      ? 'ফাইলটি স্ট্যান্ডার্ড AES-256 পিডিএফ এনক্রিপশনে সুরক্ষিত হবে। Adobe, Chrome ও মোবাইলে পাসওয়ার্ড দিয়ে খোলা যাবে।'
                      : 'Standard AES-256 PDF encryption. Opens with the password in Acrobat, Chrome and mobile PDF apps.'}
                  </p>
                </div>
              )}

              {/* Password Unlock */}
              {activeSubTab === 'unlock' && (
                <div className="space-y-3">
                  <label className="text-xs text-slate-300 font-medium block">
                    {language === 'bn' ? 'আনলক পাসওয়ার্ড প্রদান করুন' : 'Enter Password to Decrypt'}
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter document password"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>
              )}

              {/* Repair Note */}
              {activeSubTab === 'repair' && (
                <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-300 space-y-1">
                  <span className="font-semibold block text-blue-200">
                    {language === 'bn' ? 'বেস্ট-এফোর্ট মেরামত ইঞ্জিন' : 'Best-Effort Repair Engine'}
                  </span>
                  <p className="text-blue-300/80 leading-relaxed">
                    {language === 'bn'
                      ? 'ক্ষতিগ্রস্ত এক্সরেফ টেবিল ও ভেঙে যাওয়া পিডিএফ অবজেক্ট ট্রি স্বয়ংক্রিয়ভাবে রিকনস্ট্রাক্ট করা হবে।'
                      : 'Reconstructs broken cross-reference tables and recovers uncorrupted page trees.'}
                  </p>
                </div>
              )}

              {/* PDF/A Archival Profile */}
              {activeSubTab === 'pdfa' && (
                <div className="space-y-3">
                  <label className="text-xs text-slate-300 font-medium block">
                    {language === 'bn' ? 'পিডিএফ/এ প্রোফাইল সিলেক্ট করুন' : 'PDF/A Conformance Profile'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['PDF/A-1b', 'PDF/A-2b'] as const).map((prof) => (
                      <button
                        key={prof}
                        type="button"
                        onClick={() => setPdfaProfile(prof)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          pdfaProfile === prof
                            ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {prof} (ISO 19005)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AcroForms Interactive Fill */}
              {activeSubTab === 'forms' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Field Name (ফিল্ডের নাম)</label>
                      <input
                        type="text"
                        value={formFieldName}
                        onChange={(e) => setFormFieldName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Field Value (তথ্য)</label>
                      <input
                        type="text"
                        value={formFieldValue}
                        onChange={(e) => setFormFieldValue(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={flattenForm}
                      onChange={(e) => setFlattenForm(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-teal-500"
                    />
                    <span>{language === 'bn' ? 'প্রিন্ট বা বিতরণের জন্য ফ্ল্যাটেন করুন (Flatten)' : 'Flatten form fields for printing'}</span>
                  </label>
                </div>
              )}

              {/* PDF to JPG / Images Controls */}
              {activeSubTab === 'pdfToImages' && (
                <div className="space-y-4">
                  {/* Format Choice: JPG vs PNG */}
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      {language === 'bn' ? 'ছবির ফরম্যাট নির্বাচন' : 'Output Image Format'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfImageFormat('image/jpeg')}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          pdfImageFormat === 'image/jpeg'
                            ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold shadow-xs'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        JPG (High Compression, Recommended)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfImageFormat('image/png')}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          pdfImageFormat === 'image/png'
                            ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold shadow-xs'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        PNG (Crisp Lossless)
                      </button>
                    </div>
                  </div>

                  {/* Resolution & Scale */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                      <label className="font-medium">{language === 'bn' ? 'রেজোলিউশন ও স্পষ্টতা' : 'Resolution & Sharpness'}</label>
                      <span className="text-teal-400 font-mono font-bold">
                        {pdfImageScale === 1.5 ? 'Standard (1.5x, 108 DPI)' : pdfImageScale === 2.0 ? 'Crisp HD (2.0x, 144 DPI)' : 'Ultra HD (3.0x, 216 DPI)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { scale: 1.5, label: 'Standard (1.5x)' },
                        { scale: 2.0, label: 'Crisp HD (2.0x)' },
                        { scale: 3.0, label: 'Ultra (3.0x)' },
                      ].map((opt) => (
                        <button
                          key={opt.scale}
                          type="button"
                          onClick={() => setPdfImageScale(opt.scale)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                            pdfImageScale === opt.scale
                              ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* JPG Quality Slider */}
                  {pdfImageFormat === 'image/jpeg' && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                        <span>{language === 'bn' ? 'জেপিজি কোয়ালিটি' : 'JPG Quality'}</span>
                        <span className="text-teal-400 font-mono font-bold">{pdfImageQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="100"
                        value={pdfImageQuality}
                        onChange={(e) => setPdfImageQuality(parseInt(e.target.value, 10))}
                        className="w-full accent-teal-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Page Scope Selection */}
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      {language === 'bn' ? 'পৃষ্ঠা নির্বাচন' : 'Pages to Convert'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfImagePageScope('all')}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          pdfImagePageScope === 'all'
                            ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {language === 'bn' ? 'সব পৃষ্ঠা (All Pages)' : 'All Pages'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfImagePageScope('custom')}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          pdfImagePageScope === 'custom'
                            ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {language === 'bn' ? 'নির্দিষ্ট পৃষ্ঠা' : 'Custom Page Range'}
                      </button>
                    </div>

                    {pdfImagePageScope === 'custom' && (
                      <input
                        type="text"
                        value={pdfImagePageRangeInput}
                        onChange={(e) => setPdfImagePageRangeInput(e.target.value)}
                        placeholder="e.g. 1-3, 5, 8"
                        className="mt-2 w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-teal-400"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Compression Note */}
              {activeSubTab === 'compress' && (
                <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-800/40 text-xs text-teal-300 space-y-1">
                  <span className="font-semibold block text-teal-200">
                    {language === 'bn'
                      ? 'সততা নিশ্চয়তা (Honest Compression)'
                      : 'Compression Honesty Guarantee'}
                  </span>
                  <p className="text-teal-300/80 leading-relaxed">
                    {language === 'bn'
                      ? 'অপ্রয়োজনীয় অবজেক্ট স্ট্রিম অপ্টিমাইজেশন করা হবে। যদি কোনো ফাইল আগে থেকেই অপ্টিমাইজ করা থাকে, তবে কৃত্রিম কম্প্রেশন ভান না করে তা সরাসরি জানিয়ে দেওয়া হবে।'
                      : 'Object stream compression strips redundant metadata. If the file is already optimal, we report real figures instead of pretending reduction.'}
                  </p>
                </div>
              )}

              {/* Error display */}
              {processingError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{processingError}</span>
                </div>
              )}

              {/* Execute Button */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={executePdfAction}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.pdf.processing}</span>
                  </>
                ) : (
                  <>
                    <span>{t.pdf.processBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Results & Metadata Inspector */}
        <div className="lg:col-span-5 space-y-5">
          {/* Metadata Display Tab */}
          {activeSubTab === 'metadata' && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-teal-400" />
                {t.pdf.metadata}
              </h3>

              {isLoadingMetadata && (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-400 mb-2" />
                  <span>Loading metadata...</span>
                </div>
              )}

              {!isLoadingMetadata && metadata && (
                <div className="space-y-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'মোট পৃষ্ঠা:' : 'Page Count:'}
                    </span>
                    <span className="text-teal-300 font-bold font-sans">
                      {metadata.pageCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'ফাইলের আকার:' : 'File Size:'}
                    </span>
                    <span className="text-white">
                      {formatFileSize(metadata.fileSize)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'শিরোনাম (Title):' : 'Title:'}
                    </span>
                    <span className="text-slate-300 truncate max-w-[180px]">
                      {metadata.title || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'লেখক (Author):' : 'Author:'}
                    </span>
                    <span className="text-slate-300 truncate max-w-[180px]">
                      {metadata.author || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'প্রডিউসার (Producer):' : 'Producer:'}
                    </span>
                    <span className="text-slate-300 truncate max-w-[180px]">
                      {metadata.producer || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'তৈরির তারিখ:' : 'Created:'}
                    </span>
                    <span className="text-slate-300">
                      {metadata.creationDate
                        ? metadata.creationDate.toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                </div>
              )}

              {!isLoadingMetadata && !metadata && selectedFiles.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">
                  {language === 'bn'
                    ? 'মেটাডাটা দেখতে বামপাশে একটি পিডিএফ নির্বাচন করুন'
                    : 'Select a PDF on the left to view its properties'}
                </p>
              )}
            </div>
          )}

          {/* Results Card */}
          {lastResult && (
            <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-950/20 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {activeSubTab === 'extractImages' && extractNote && (
                <p className="text-xs text-teal-200">{extractNote}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  <h3 className="text-sm font-bold text-white">
                    {language === 'bn'
                      ? 'ফলাফল প্রস্তুত!'
                      : 'Output Document Ready!'}
                  </h3>
                </div>
                <span className="text-xs font-mono text-teal-400">
                  {activeSubTab === 'extractImages'
                    ? `${lastResult.pageCount} ${language === 'bn' ? 'ছবি' : 'images'}`
                    : `${lastResult.pageCount} ${language === 'bn' ? 'পৃষ্ঠা' : 'pages'}`}
                </span>
              </div>

              {/* Size metrics */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>{t.pdf.originalSize}:</span>
                  <span>{formatFileSize(lastResult.originalSize)}</span>
                </div>
                <div className="flex justify-between text-teal-300 font-bold border-t border-slate-800 pt-1.5">
                  <span>{t.pdf.newSize}:</span>
                  <span>{formatFileSize(lastResult.newSize)}</span>
                </div>

                {lastResult.reductionPercentage !== undefined && (
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-slate-400">{t.pdf.reduction}:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        lastResult.reductionPercentage > 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {lastResult.reductionPercentage > 0
                        ? `-${lastResult.reductionPercentage}%`
                        : '0%'}
                    </span>
                  </div>
                )}
              </div>

              {/* Compression honesty note */}
              {activeSubTab === 'compress' && !lastResult.meaningfulReduction && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed">
                  <Info className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                  {t.pdf.noReductionNote}
                </div>
              )}

              {/* Download Action */}
              <button
                type="button"
                disabled={isDownloading}
                onClick={async () => {
                  if (isDownloading || !lastResult) return;
                  setIsDownloading(true);
                  try {
                    await downloadFileOnce(lastResult.blob, lastResult.filename);
                    showNotification(
                      language === 'bn' ? 'পিডিএফ ডাউনলোড সম্পন্ন হয়েছে' : 'PDF downloaded successfully'
                    );
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.common.download} ({lastResult.filename})</span>
              </button>

              {/* Gallery of converted pages for PDF to JPG / Images */}
              {activeSubTab === 'pdfToImages' && pdfConvertedPages.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-teal-400" />
                      <span>{language === 'bn' ? `রূপান্তরিত ছবির গ্যালারি (${pdfConvertedPages.length}টি পেজ)` : `Converted Image Gallery (${pdfConvertedPages.length} pages)`}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {language === 'bn' ? 'ক্লিক করে প্রিভিউ দেখুন' : 'Click to preview'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                    {pdfConvertedPages.map((page) => (
                      <div
                        key={page.pageNumber}
                        className="group relative rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden flex flex-col justify-between"
                      >
                        <div
                          className="relative aspect-3/4 bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden"
                          onClick={() => setPdfPreviewModalUrl(page.url)}
                        >
                          <img
                            src={page.url}
                            alt={`Page ${page.pageNumber}`}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 text-[10px] font-bold font-mono text-teal-300">
                            P.{page.pageNumber}
                          </span>
                          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs gap-1 font-bold">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </span>
                        </div>
                        <div className="p-2 flex items-center justify-between bg-slate-800/80 border-t border-slate-800">
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {formatFileSize(page.fileSize)}
                          </span>
                          <button
                            type="button"
                            onClick={() => downloadFileOnce(page.blob, page.filename)}
                            title={`Download ${page.filename}`}
                            className="p-1 rounded-md bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 transition-colors"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Zero-Fake Policy Banner */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              {language === 'bn' ? 'সততা ও গোপনীয়তা প্রতিশ্রুতি' : 'Integrity & Privacy Guarantee'}
            </span>
            <p className="leading-relaxed">
              {t.pdf.noFakeOcrNote}
            </p>
          </div>

          {/* Genuine Searchable SEO Guide & FAQ Section */}
          <ToolSeoGuide
            routePath={
              activeSubTab === 'merge'
                ? '/pdf-studio/merge'
                : activeSubTab === 'split'
                ? '/pdf-studio/split'
                : activeSubTab === 'compress'
                ? '/pdf-studio/compress'
                : activeSubTab === 'rotate'
                ? '/pdf-studio/organize'
                : activeSubTab === 'pdfToImages'
                ? '/pdf-studio/pdf-to-jpg'
                : '/pdf-studio/convert'
            }
          />

          {/* Tool Result Bottom Ad Slot (After Result Section) */}
          <AdSlot placement="tool-result-bottom" />
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      {pdfPreviewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPdfPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 p-2 overflow-hidden shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPdfPreviewModalUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-rose-600 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={pdfPreviewModalUrl}
              alt="Page Preview"
              className="max-h-[82vh] w-auto object-contain rounded-lg shadow-inner"
            />
          </div>
        </div>
      )}
    </div>
  );
};

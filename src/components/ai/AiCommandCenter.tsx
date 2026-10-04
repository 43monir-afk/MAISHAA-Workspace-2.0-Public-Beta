/**
 * MAISHAA WORKSPACE — Phase 4 Step 4D
 * MAISHAA AI COMMAND CENTER
 * 
 * Central AI intent analysis, structured planning, bilingual confirmation gating,
 * Office Pack integration, and Multi-file Batch Command Execution.
 * 
 * Crucial Constraints & Guarantees:
 * 1. Batch Selection: Multi-file selection with detection, size, and extraction readiness.
 * 2. Bilingual Bangla/English preview with explicit Confirm & Run; never runs automatically.
 * 3. Invalidation & Gating: Stale confirmation detection and synchronous execution lock.
 * 4. Reliable Queue: Sequential execution, per-file & overall progress, content isolation, text limit disclosure.
 * 5. Cancel & Retry: Immediate abort, late response discarding, failed-only retry, quota pause.
 * 6. Results & Exports: Separate editable text previews, safe unique ZIP filenames with batch_manifest.json.
 * 7. Metadata-Only Audit: No source text, instructions, generated content, or API keys logged.
 * 8. Non-Destructive: Original files are NEVER overwritten.
 */

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  AiCommandStatus,
  AiCommandPlan,
  AiCommandAuditMetadata,
  SuggestedOfficeOutput,
  AiExecutionStatus,
  AiExecutionProgress,
  AiExecutionAuditRecord,
  BatchFileItem,
  BatchExecutionProgress,
  BatchExecutionAuditRecord,
  BatchManifest,
  BatchManifestItem,
} from '../../types/aiCommand';
import {
  analyzeCommand,
  detectInputLanguage,
  sanitizeDisplayText,
  executeAiTextCommand,
  computeConfirmationFingerprint,
  computeBatchConfirmationFingerprint,
  recordExecutionAudit,
  recordBatchExecutionAudit,
  getSessionExecutionAuditTrail,
  getSessionBatchAuditTrail,
} from '../../services/aiCommandService';
import { isSourceFileSupported, buildOfficePackPlan } from '../../services/officePackPlanner';
import {
  executeOfficePackGeneration,
  validateAndExtractSourceContent,
  GeneratedPackFile,
  FormatStatusInfo,
} from '../../services/officePackGenerator';
import { OutputFormat, OfficePackType } from '../../types/officePack';
import { sanitizeFilename, formatFileSize } from '../../utils/fileDetection';
import {
  exportToDocx,
  exportToPdf,
  downloadExportBlob,
  PageOrientation,
  PageMargin,
  ExportFontSize,
} from '../../services/directExportService';
import { downloadFileOnce } from '../../utils/downloadHelper';

import {
  Sparkles,
  Send,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  FileText,
  Layers,
  ArrowRight,
  Info,
  Check,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Presentation,
  FileCheck2,
  HelpCircle,
  Play,
  XOctagon,
  Copy,
  Download,
  Archive,
  Edit3,
  FileDown,
  ShieldCheck,
  CheckSquare,
  Square,
  UploadCloud,
  RefreshCw,
  FolderArchive,
  PauseCircle,
  Files,
  Sliders,
} from 'lucide-react';

const MAX_SAFE_CHARS = 30000;

export const AiCommandCenter: React.FC = () => {
  const {
    language,
    activeDocumentName,
    activeDocumentText,
    stagedFiles,
    addStagedFiles,
    setActiveModule,
    requestAiConsent,
    showNotification,
  } = useWorkspace();

  // Mode state: 'single' file or 'batch' multi-file
  const [commandMode, setCommandMode] = useState<'single' | 'batch'>(
    stagedFiles.length > 1 ? 'batch' : 'single'
  );

  // Common instruction & analysis state
  const [instruction, setInstruction] = useState('');
  const [status, setStatus] = useState<AiCommandStatus>('READY');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<AiCommandPlan | null>(null);
  const [audit, setAudit] = useState<AiCommandAuditMetadata | null>(null);
  const [selectedOutputs, setSelectedOutputs] = useState<SuggestedOfficeOutput[]>([]);

  // Single-file execution state (Step 4B)
  const [executionStatus, setExecutionStatus] = useState<AiExecutionStatus>('IDLE');
  const [confirmedFingerprint, setConfirmedFingerprint] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<AiExecutionProgress | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [editableGeneratedText, setEditableGeneratedText] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedPackFile[]>([]);
  const [formatStatuses, setFormatStatuses] = useState<Record<OutputFormat, FormatStatusInfo> | null>(null);
  const [unsupportedNotice, setUnsupportedNotice] = useState<string | null>(null);
  const [lastExecutionAudit, setLastExecutionAudit] = useState<AiExecutionAuditRecord | null>(null);
  const [singleCopied, setSingleCopied] = useState(false);

  // Phase 4 Step 4D: Batch Multi-file State
  const [batchFiles, setBatchFiles] = useState<BatchFileItem[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [batchConfirmedFingerprint, setBatchConfirmedFingerprint] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchExecutionProgress | null>(null);
  const [lastBatchAudit, setLastBatchAudit] = useState<BatchExecutionAuditRecord | null>(null);
  const [copiedBatchId, setCopiedBatchId] = useState<string | null>(null);

  // Phase 4 Step 4C: Direct Document Export Formatting & Caching State
  const [exportTitle, setExportTitle] = useState('');
  const [exportOrientation, setExportOrientation] = useState<PageOrientation>('portrait');
  const [exportMargin, setExportMargin] = useState<PageMargin>('normal');
  const [exportFontSize, setExportFontSize] = useState<ExportFontSize>('normal');
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [directExportError, setDirectExportError] = useState<string | null>(null);
  const [exportingBatchId, setExportingBatchId] = useState<string | null>(null);

  // Cached exports for stale invalidation
  const [cachedSingleDocx, setCachedSingleDocx] = useState<{
    fingerprint: string;
    blob: Blob;
    filename: string;
  } | null>(null);
  const [cachedSinglePdf, setCachedSinglePdf] = useState<{
    fingerprint: string;
    blob: Blob;
    filename: string;
  } | null>(null);

  // Synchronous execution guards & abort controllers
  const isExecutingRef = useRef(false);
  const activeRunIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive active source file context for single file mode
  const currentSourceFile = stagedFiles.length > 0 ? stagedFiles[0] : null;
  const hasSourceContext = !!(currentSourceFile || activeDocumentName || activeDocumentText);
  const sourceName = currentSourceFile?.name || activeDocumentName || null;
  const sourceSize = currentSourceFile?.size || (activeDocumentText ? activeDocumentText.length : 0);
  const sourceType = currentSourceFile
    ? currentSourceFile.name.split('.').pop()?.toUpperCase() || 'FILE'
    : activeDocumentName
    ? activeDocumentName.split('.').pop()?.toUpperCase() || 'DOC'
    : 'NONE';

  // Sync stagedFiles into batchFiles list
  useEffect(() => {
    setBatchFiles((prev) => {
      const existingMap = new Map(prev.map((f) => [f.id, f]));
      return stagedFiles.map((file, idx) => {
        const fileId = `${file.name}_${file.size}_${file.lastModified || idx}`;
        if (existingMap.has(fileId)) {
          return existingMap.get(fileId)!;
        }

        const isSupported = isSourceFileSupported(file.name) && file.size > 0;
        let unsupportedReason: string | undefined;
        if (file.size === 0) {
          unsupportedReason =
            language === 'bn' ? 'ফাইলটি ফাঁকা (০ বাইট)' : 'File is empty (0 bytes).';
        } else if (!isSourceFileSupported(file.name)) {
          unsupportedReason =
            language === 'bn'
              ? 'অসমর্থিত ফরম্যাট। সমর্থিত: PDF, DOCX, TXT, MD, CSV, XLSX, PPTX'
              : 'Format unsupported. Supported: PDF, DOCX, TXT, MD, CSV, XLSX, PPTX';
        }

        return {
          id: fileId,
          file,
          name: file.name,
          size: file.size,
          type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
          isSupported,
          unsupportedReason,
          status: isSupported ? 'QUEUED' : 'UNSUPPORTED',
        };
      });
    });

    // Default select all supported files
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      stagedFiles.forEach((file, idx) => {
        const fileId = `${file.name}_${file.size}_${file.lastModified || idx}`;
        if (isSourceFileSupported(file.name) && file.size > 0) {
          next.add(fileId);
        }
      });
      return next;
    });
  }, [stagedFiles, language]);

  // Compute live single-file parameter fingerprint
  const currentFingerprint = computeConfirmationFingerprint(
    instruction,
    sourceName,
    sourceSize,
    plan?.intent,
    selectedOutputs
  );
  const isConfirmationStale =
    !!plan && !!confirmedFingerprint && confirmedFingerprint !== currentFingerprint;

  // Compute live batch parameter fingerprint
  const selectedBatchItems = batchFiles.filter((b) => selectedFileIds.has(b.id));
  const currentBatchFingerprint = computeBatchConfirmationFingerprint(
    instruction,
    selectedBatchItems.map((f) => ({ name: f.name, size: f.size })),
    plan?.intent,
    selectedOutputs
  );
  const isBatchConfirmationStale =
    !!plan &&
    !!batchConfirmedFingerprint &&
    batchConfirmedFingerprint !== currentBatchFingerprint;

  const exampleInstructions = [
    { id: 'ex1', text: 'Summarize this document' },
    { id: 'ex2', text: 'Create a professional report from this file' },
    { id: 'ex3', text: 'Make DOCX and PDF' },
    { id: 'ex4', text: 'Analyze this CSV' },
    { id: 'ex5', text: 'Create a presentation outline' },
    { id: 'ex6', text: 'Rewrite this in formal English' },
    { id: 'ex7', text: 'বাংলায় সংক্ষেপ করো' },
  ];

  // Toggle selected output formats
  const toggleOutputFormat = (format: SuggestedOfficeOutput) => {
    setSelectedOutputs((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  // Toggle batch file selection checkbox
  const toggleBatchFileSelection = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllBatch = () => {
    const allSupported = batchFiles.filter((f) => f.isSupported).map((f) => f.id);
    setSelectedFileIds(new Set(allSupported));
  };

  const handleDeselectAllBatch = () => {
    setSelectedFileIds(new Set());
  };

  // Step 4A Analyze command (Single or Batch)
  const handleAnalyze = async (customText?: string) => {
    const textToAnalyze = (customText ?? instruction).trim();
    if (!textToAnalyze) return;

    setStatus('ANALYZING');
    setErrorMessage(null);
    setExecutionError(null);
    setExecutionStatus('IDLE');
    setGeneratedFiles([]);
    setEditableGeneratedText('');
    setFormatStatuses(null);
    setUnsupportedNotice(null);

    const sourceContext =
      commandMode === 'single'
        ? hasSourceContext
          ? {
              fileName: sourceName || undefined,
              fileType: sourceType,
              fileSize: sourceSize,
              extractedSnippet: activeDocumentText ? activeDocumentText.slice(0, 5000) : undefined,
            }
          : undefined
        : {
            fileName: `${selectedBatchItems.length} batch files`,
            fileType: 'BATCH',
            fileSize: selectedBatchItems.reduce((acc, f) => acc + f.size, 0),
            extractedSnippet: `Batch analysis over ${selectedBatchItems.length} selected files`,
          };

    try {
      const result = await analyzeCommand({
        instruction: textToAnalyze,
        sourceContext,
      });

      setStatus(result.status);

      if (result.status === 'COMPLETE' && result.plan) {
        setPlan(result.plan);
        setAudit(result.audit || null);
        setErrorMessage(null);

        let initialOutputs: SuggestedOfficeOutput[] = [...result.plan.suggestedOutputs];
        if (
          initialOutputs.length === 0 &&
          ['document_plan', 'office_pack_plan', 'presentation_plan', 'spreadsheet_analysis'].includes(
            result.plan.intent
          )
        ) {
          initialOutputs = ['DOCX', 'PDF'];
        }
        setSelectedOutputs(initialOutputs);

        if (commandMode === 'single') {
          const fp = computeConfirmationFingerprint(
            textToAnalyze,
            sourceName,
            sourceSize,
            result.plan.intent,
            initialOutputs
          );
          setConfirmedFingerprint(fp);
          setExecutionStatus('AWAITING_CONFIRMATION');
        } else {
          const bfp = computeBatchConfirmationFingerprint(
            textToAnalyze,
            selectedBatchItems.map((f) => ({ name: f.name, size: f.size })),
            result.plan.intent,
            initialOutputs
          );
          setBatchConfirmedFingerprint(bfp);
          setBatchProgress({
            totalCount: selectedBatchItems.length,
            completedCount: 0,
            currentFileIndex: 0,
            overallPercent: 0,
            status: 'AWAITING_CONFIRMATION',
          });
        }
      } else {
        setPlan(null);
        setErrorMessage(result.message || 'Analysis could not be completed.');
        if (result.audit) setAudit(result.audit);
        setExecutionStatus('IDLE');
      }
    } catch (err: any) {
      setStatus('ERROR');
      setPlan(null);
      setErrorMessage(err?.message || 'An unexpected error occurred.');
      setExecutionStatus('IDLE');
    }
  };

  const handleClear = () => {
    setInstruction('');
    setStatus('READY');
    setErrorMessage(null);
    setExecutionError(null);
    setPlan(null);
    setAudit(null);
    setExecutionStatus('IDLE');
    setSelectedOutputs([]);
    setConfirmedFingerprint(null);
    setBatchConfirmedFingerprint(null);
    setGeneratedFiles([]);
    setEditableGeneratedText('');
    setFormatStatuses(null);
    setUnsupportedNotice(null);
    setExecutionProgress(null);
    setBatchProgress(null);
  };

  // =========================================================================
  // SINGLE FILE EXECUTION ROUTER (Step 4B)
  // =========================================================================
  const handleConfirmAndRunSingle = async () => {
    // Synchronous execution lock
    if (isExecutingRef.current || !plan) return;
    isExecutingRef.current = true;
    setIsExecuting(true);

    if (plan.intent === 'unsupported') {
      setUnsupportedNotice(
        language === 'bn'
          ? 'অসমর্থিত অ্যাকশন: এই নির্দেশনার জন্য অফিস প্যাক জেনারেটর বা টেক্সট ইঞ্জিন প্রযোজ্য নয়।'
          : 'Unsupported action: The requested operation is not supported.'
      );
      setExecutionStatus('FAILED');
      isExecutingRef.current = false;
      setIsExecuting(false);
      return;
    }

    setExecutionStatus('EXECUTING');
    setExecutionError(null);
    setUnsupportedNotice(null);
    const startTime = Date.now();

    const isOfficePackIntent = [
      'document_plan',
      'office_pack_plan',
      'presentation_plan',
      'spreadsheet_analysis',
    ].includes(plan.intent);

    if (isOfficePackIntent) {
      try {
        setExecutionProgress({
          step: 'Validating source document & parameters',
          stepBn: 'উৎস ডকুমেন্ট ও প্যারামিটার যাচাইকরণ',
          percent: 25,
        });

        const sourceForGen =
          currentSourceFile ||
          (activeDocumentText
            ? {
                name: activeDocumentName || 'document.txt',
                size: activeDocumentText.length,
                textContent: activeDocumentText,
              }
            : null);

        if (!sourceForGen) {
          throw new Error(
            language === 'bn'
              ? 'অফিস প্যাক তৈরির জন্য একটি ডকুমেন্ট ফাইল (PDF, DOCX, TXT, CSV) আপলোড করুন বা টেক্সট নির্বাচন করুন।'
              : 'A source document or staged file is required to generate Office Pack deliverables.'
          );
        }

        let packType: OfficePackType = 'project_report';
        if (plan.intent === 'spreadsheet_analysis') packType = 'business';
        if (plan.intent === 'presentation_plan') packType = 'meeting';

        const enabledOutputs = selectedOutputs.map((fmt) => ({
          id: fmt.toLowerCase(),
          format: fmt.toLowerCase() as OutputFormat,
          enabled: true,
          label: fmt,
          labelBn: fmt,
          description: fmt,
          descriptionBn: fmt,
        }));

        const officeWorkflow = buildOfficePackPlan(sourceForGen, packType, enabledOutputs, 'local');

        setExecutionProgress({
          step: 'Generating real client-side deliverables (DOCX, PDF, XLSX, PPTX)',
          stepBn: 'বাস্তব ডকুমেন্ট ফাইল জেনারেট হচ্ছে (DOCX, PDF, XLSX, PPTX)',
          percent: 75,
        });

        const genResult = await executeOfficePackGeneration(sourceForGen, officeWorkflow, language);

        setExecutionProgress({
          step: 'Finalizing quality validation',
          stepBn: 'গুণগত মান যাচাই সম্পন্ন',
          percent: 100,
        });

        setGeneratedFiles(genResult.files);
        setFormatStatuses(genResult.formatStatuses);

        const isSuccess = genResult.success || genResult.files.length > 0;
        setExecutionStatus(isSuccess ? 'SUCCESS' : 'FAILED');
        if (!isSuccess && genResult.error) {
          setExecutionError(genResult.error);
        }

        const execAudit: AiExecutionAuditRecord = {
          timestamp: new Date().toISOString(),
          intent: plan.intent,
          executionStatus: isSuccess ? 'SUCCESS' : 'FAILED',
          durationMs: Date.now() - startTime,
          outputFormats: selectedOutputs,
          filesCount: genResult.files.length,
          hasTextPreview: false,
          error: genResult.error,
        };
        recordExecutionAudit(execAudit);
        setLastExecutionAudit(execAudit);
      } catch (err: any) {
        setExecutionStatus('FAILED');
        setExecutionError(err?.message || 'Office Pack generation failed.');
      } finally {
        isExecutingRef.current = false;
        setIsExecuting(false);
      }
      return;
    }

    // AI Text router (summarize, rewrite, translate, extract, organize)
    const runServerAiExecution = async () => {
      try {
        setExecutionProgress({
          step: 'Connecting to AI Engine',
          stepBn: 'এআই সার্ভিসের সাথে সংযোগ স্থাপন',
          percent: 30,
        });

        const sourceText =
          activeDocumentText ||
          (currentSourceFile ? `[Attached file: ${currentSourceFile.name}]` : '');

        setExecutionProgress({
          step: 'Synthesizing grounded content via secure proxy',
          stepBn: 'সার্ভার-সাইড সুরক্ষিত প্রসেসিং চলমান',
          percent: 70,
        });

        const res = await executeAiTextCommand({
          action: (plan.intent as any) || 'summarize',
          instruction,
          sourceText,
          targetLanguage:
            plan.language === 'Bangla'
              ? 'Bangla'
              : plan.language === 'Mixed'
              ? 'Mixed'
              : 'English',
        });

        if (res.success && res.generatedText) {
          setEditableGeneratedText(res.generatedText);
          setExecutionProgress({
            step: 'Completed — Ready for review',
            stepBn: 'সম্পন্ন — টেক্সট প্রিভিউ প্রস্তুত',
            percent: 100,
          });
          setExecutionStatus('SUCCESS');

          const successAudit: AiExecutionAuditRecord = {
            timestamp: new Date().toISOString(),
            intent: plan.intent,
            executionStatus: 'SUCCESS',
            durationMs: Date.now() - startTime,
            outputFormats: selectedOutputs,
            filesCount: 0,
            hasTextPreview: true,
          };
          recordExecutionAudit(successAudit);
          setLastExecutionAudit(successAudit);
        } else {
          setExecutionStatus('FAILED');
          setExecutionError(res.error || 'AI text generation failed.');
        }
      } catch (err: any) {
        setExecutionStatus('FAILED');
        setExecutionError(err?.message || 'AI request failed');
      } finally {
        isExecutingRef.current = false;
        setIsExecuting(false);
      }
    };

    if (hasSourceContext && (activeDocumentText || currentSourceFile)) {
      requestAiConsent(() => {
        runServerAiExecution();
      });
    } else {
      runServerAiExecution();
    }
  };

  const handleCancelSingle = () => {
    isExecutingRef.current = false;
    setIsExecuting(false);
    setExecutionStatus('CANCELLED');
    setExecutionProgress(null);

    const cancelAudit: AiExecutionAuditRecord = {
      timestamp: new Date().toISOString(),
      intent: plan?.intent || 'unsupported',
      executionStatus: 'CANCELLED',
      durationMs: 0,
      outputFormats: selectedOutputs,
      filesCount: 0,
      hasTextPreview: false,
    };
    recordExecutionAudit(cancelAudit);
    setLastExecutionAudit(cancelAudit);
  };

  // =========================================================================
  // PHASE 4 STEP 4C: DIRECT DOCUMENT EXPORT HANDLERS & CACHE INVALIDATION
  // =========================================================================
  const getSingleExportFingerprint = () => {
    return `${editableGeneratedText}::${exportTitle}::${exportOrientation}::${exportMargin}::${exportFontSize}`;
  };

  // Invalidate cached single-file exports whenever text or formatting options change
  useEffect(() => {
    setCachedSingleDocx(null);
    setCachedSinglePdf(null);
    setDirectExportError(null);
  }, [editableGeneratedText, exportTitle, exportOrientation, exportMargin, exportFontSize]);

  const handleExportSingleDocx = async () => {
    if (isExportingDocx || isExportingPdf) return; // Prevent duplicate clicks
    if (!editableGeneratedText.trim()) {
      setDirectExportError(
        language === 'bn'
          ? 'এক্সপোর্ট করার জন্য কোনো টেক্সট নেই।'
          : 'Preview content is empty. Cannot export.'
      );
      return;
    }

    try {
      setIsExportingDocx(true);
      setDirectExportError(null);

      const fp = getSingleExportFingerprint();
      if (cachedSingleDocx && cachedSingleDocx.fingerprint === fp) {
        downloadExportBlob(cachedSingleDocx.blob, cachedSingleDocx.filename);
        showNotification(
          language === 'bn' ? 'DOCX ডাউনলোড সম্পন্ন হয়েছে' : 'DOCX downloaded successfully'
        );
        return;
      }

      const title = exportTitle.trim() || sourceName?.replace(/\.[^.]+$/, '') || 'Document Summary';
      const result = await exportToDocx(editableGeneratedText, {
        title,
        sourceFilename: sourceName || 'document',
        orientation: exportOrientation,
        margin: exportMargin,
        fontSize: exportFontSize,
      });

      setCachedSingleDocx({
        fingerprint: fp,
        blob: result.blob,
        filename: result.filename,
      });

      downloadExportBlob(result.blob, result.filename);
      showNotification(
        language === 'bn' ? 'DOCX তৈরি ও ডাউনলোড সম্পন্ন' : 'DOCX generated and downloaded'
      );
    } catch (err: any) {
      setDirectExportError(err?.message || 'DOCX export failed');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportSinglePdf = async () => {
    if (isExportingDocx || isExportingPdf) return; // Prevent duplicate clicks
    if (!editableGeneratedText.trim()) {
      setDirectExportError(
        language === 'bn'
          ? 'এক্সপোর্ট করার জন্য কোনো টেক্সট নেই।'
          : 'Preview content is empty. Cannot export.'
      );
      return;
    }

    try {
      setIsExportingPdf(true);
      setDirectExportError(null);

      const fp = getSingleExportFingerprint();
      if (cachedSinglePdf && cachedSinglePdf.fingerprint === fp) {
        downloadExportBlob(cachedSinglePdf.blob, cachedSinglePdf.filename);
        showNotification(
          language === 'bn' ? 'PDF ডাউনলোড সম্পন্ন হয়েছে' : 'PDF downloaded successfully'
        );
        return;
      }

      const title = exportTitle.trim() || sourceName?.replace(/\.[^.]+$/, '') || 'Document Summary';
      const result = await exportToPdf(editableGeneratedText, {
        title,
        sourceFilename: sourceName || 'document',
        orientation: exportOrientation,
        margin: exportMargin,
        fontSize: exportFontSize,
      });

      setCachedSinglePdf({
        fingerprint: fp,
        blob: result.blob,
        filename: result.filename,
      });

      downloadExportBlob(result.blob, result.filename);
      showNotification(
        language === 'bn' ? 'PDF তৈরি ও ডাউনলোড সম্পন্ন' : 'PDF generated and downloaded'
      );
    } catch (err: any) {
      setDirectExportError(err?.message || 'PDF export failed');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportBatchItemDocx = async (item: BatchFileItem) => {
    if (exportingBatchId) return; // Prevent duplicate clicks
    if (!item.generatedText?.trim()) return;

    try {
      setExportingBatchId(`${item.id}_docx`);
      const title = item.name.replace(/\.[^.]+$/, '');
      const result = await exportToDocx(item.generatedText, {
        title,
        sourceFilename: item.name,
        orientation: exportOrientation,
        margin: exportMargin,
        fontSize: exportFontSize,
      });
      downloadExportBlob(result.blob, result.filename);
      showNotification(
        language === 'bn' ? `${item.name} এর DOCX ডাউনলোড হয়েছে` : `Downloaded DOCX for ${item.name}`
      );
    } catch (err: any) {
      showNotification(`DOCX Export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setExportingBatchId(null);
    }
  };

  const handleExportBatchItemPdf = async (item: BatchFileItem) => {
    if (exportingBatchId) return; // Prevent duplicate clicks
    if (!item.generatedText?.trim()) return;

    try {
      setExportingBatchId(`${item.id}_pdf`);
      const title = item.name.replace(/\.[^.]+$/, '');
      const result = await exportToPdf(item.generatedText, {
        title,
        sourceFilename: item.name,
        orientation: exportOrientation,
        margin: exportMargin,
        fontSize: exportFontSize,
      });
      downloadExportBlob(result.blob, result.filename);
      showNotification(
        language === 'bn' ? `${item.name} এর PDF ডাউনলোড হয়েছে` : `Downloaded PDF for ${item.name}`
      );
    } catch (err: any) {
      showNotification(`PDF Export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setExportingBatchId(null);
    }
  };

  // =========================================================================
  // PHASE 4 STEP 4D: MULTI-FILE BATCH QUEUE & EXECUTION ROUTER
  // =========================================================================
  const handleConfirmAndRunBatch = async (onlyFailed = false) => {
    // Synchronous execution lock
    if (isExecutingRef.current || !plan) return;
    isExecutingRef.current = true;
    setIsExecuting(true);

    const itemsToProcess = batchFiles.filter((b) => {
      if (!selectedFileIds.has(b.id)) return false;
      if (onlyFailed) return b.status === 'FAILED' || b.status === 'CANCELLED';
      return b.isSupported;
    });

    if (itemsToProcess.length === 0) {
      isExecutingRef.current = false;
      setIsExecuting(false);
      showNotification(
        language === 'bn'
          ? 'প্রক্রিয়া করার জন্য কোনো সমর্থিত ফাইল নেই'
          : 'No supported files selected to process.'
      );
      return;
    }

    const runId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    activeRunIdRef.current = runId;
    abortControllerRef.current = new AbortController();
    const startTime = Date.now();

    // Mark queued files
    setBatchFiles((prev) =>
      prev.map((item) => {
        if (!selectedFileIds.has(item.id)) return item;
        if (onlyFailed && item.status === 'SUCCESS') return item;
        return {
          ...item,
          status: item.isSupported ? 'QUEUED' : 'UNSUPPORTED',
          error: undefined,
        };
      })
    );

    setBatchProgress({
      totalCount: itemsToProcess.length,
      completedCount: 0,
      currentFileIndex: 0,
      currentFileName: itemsToProcess[0]?.name,
      overallPercent: 0,
      status: 'RUNNING',
    });

    const isOfficePackIntent = [
      'document_plan',
      'office_pack_plan',
      'presentation_plan',
      'spreadsheet_analysis',
    ].includes(plan.intent);

    const startProcessingLoop = async () => {
      let completedCount = 0;

      for (let i = 0; i < itemsToProcess.length; i++) {
        // Check cancellation & discard late responses
        if (
          abortControllerRef.current?.signal.aborted ||
          activeRunIdRef.current !== runId
        ) {
          break;
        }

        const currentItem = itemsToProcess[i];

        // Update file to PROCESSING
        setBatchFiles((prev) =>
          prev.map((f) => (f.id === currentItem.id ? { ...f, status: 'PROCESSING' } : f))
        );

        setBatchProgress({
          totalCount: itemsToProcess.length,
          completedCount,
          currentFileIndex: i + 1,
          currentFileName: currentItem.name,
          overallPercent: Math.round((completedCount / itemsToProcess.length) * 100),
          status: 'RUNNING',
        });

        // 1. Process Office Pack Deliverables (DOCX, PDF, XLSX, PPTX)
        if (isOfficePackIntent) {
          try {
            let packType: OfficePackType = 'project_report';
            if (plan.intent === 'spreadsheet_analysis') packType = 'business';
            if (plan.intent === 'presentation_plan') packType = 'meeting';

            const enabledOutputs = selectedOutputs.map((fmt) => ({
              id: fmt.toLowerCase(),
              format: fmt.toLowerCase() as OutputFormat,
              enabled: true,
              label: fmt,
              labelBn: fmt,
              description: fmt,
              descriptionBn: fmt,
            }));

            const workflow = buildOfficePackPlan(currentItem.file, packType, enabledOutputs, 'local');
            const genResult = await executeOfficePackGeneration(currentItem.file, workflow, language);

            if (
              abortControllerRef.current?.signal.aborted ||
              activeRunIdRef.current !== runId
            ) {
              break;
            }

            const success = genResult.success || genResult.files.length > 0;
            setBatchFiles((prev) =>
              prev.map((f) =>
                f.id === currentItem.id
                  ? {
                      ...f,
                      status: success ? 'SUCCESS' : 'FAILED',
                      generatedFiles: genResult.files,
                      formatStatuses: genResult.formatStatuses,
                      error: success ? undefined : genResult.error || 'Generation failed',
                    }
                  : f
              )
            );
          } catch (err: any) {
            setBatchFiles((prev) =>
              prev.map((f) =>
                f.id === currentItem.id
                  ? { ...f, status: 'FAILED', error: err?.message || 'Processing failed' }
                  : f
              )
            );
          }
        }
        // 2. Process AI Text (summarize, rewrite, translate, extract, organize)
        else {
          try {
            // Extract text strictly from this file independently
            const validation = await validateAndExtractSourceContent(currentItem.file);
            let fileText = validation.extractedText || validation.normalized?.plainText || '';
            const charCount = fileText.length;
            let isTruncated = false;

            if (charCount > MAX_SAFE_CHARS) {
              isTruncated = true;
              fileText = fileText.slice(0, MAX_SAFE_CHARS);
            }

            const res = await executeAiTextCommand(
              {
                action: (plan.intent as any) || 'summarize',
                instruction,
                sourceText: fileText,
                targetLanguage:
                  plan.language === 'Bangla'
                    ? 'Bangla'
                    : plan.language === 'Mixed'
                    ? 'Mixed'
                    : 'English',
              },
              30000,
              abortControllerRef.current?.signal
            );

            if (
              abortControllerRef.current?.signal.aborted ||
              activeRunIdRef.current !== runId
            ) {
              break;
            }

            // PAUSE QUEUE ON QUOTA EXCEEDED
            if (res.status === 'QUOTA EXCEEDED') {
              setBatchFiles((prev) =>
                prev.map((f) =>
                  f.id === currentItem.id
                    ? {
                        ...f,
                        status: 'FAILED',
                        error:
                          res.error ||
                          'AI Provider quota exceeded. Offline tools remain operational.',
                      }
                    : f
                )
              );
              setBatchProgress((prev) => (prev ? { ...prev, status: 'PAUSED_QUOTA' } : null));
              showNotification(
                language === 'bn'
                  ? 'AI কোটা পূর্ণ হয়েছে — ব্যাচ সারিবদ্ধ রাখা হয়েছে (Queue Paused)'
                  : 'AI Provider quota exceeded — Batch queue paused.'
              );
              break; // Stop further AI calls
            }

            if (res.success && res.generatedText) {
              setBatchFiles((prev) =>
                prev.map((f) =>
                  f.id === currentItem.id
                    ? {
                        ...f,
                        status: 'SUCCESS',
                        generatedText: res.generatedText,
                        charCount,
                        isTruncated,
                      }
                    : f
                )
              );
            } else {
              setBatchFiles((prev) =>
                prev.map((f) =>
                  f.id === currentItem.id
                    ? { ...f, status: 'FAILED', error: res.error || 'AI request failed' }
                    : f
                )
              );
            }
          } catch (err: any) {
            setBatchFiles((prev) =>
              prev.map((f) =>
                f.id === currentItem.id
                  ? { ...f, status: 'FAILED', error: err?.message || 'AI request failed' }
                  : f
              )
            );
          }
        }

        completedCount++;
        setBatchProgress((prev) =>
          prev
            ? {
                ...prev,
                completedCount,
                overallPercent: Math.round((completedCount / itemsToProcess.length) * 100),
              }
            : null
        );
      }

      // Check if aborted
      const wasAborted =
        abortControllerRef.current?.signal.aborted || activeRunIdRef.current !== runId;

      if (wasAborted) {
        setBatchFiles((prev) =>
          prev.map((f) =>
            f.status === 'QUEUED' || f.status === 'PROCESSING'
              ? { ...f, status: 'CANCELLED' }
              : f
          )
        );
        setBatchProgress((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      } else {
        setBatchProgress((prev) => {
          if (!prev) return null;
          if (prev.status === 'PAUSED_QUOTA') return prev;
          return {
            ...prev,
            status: 'COMPLETED',
            overallPercent: 100,
          };
        });
      }

      // Record Metadata-only Batch Audit
      setBatchFiles((currentBatchState) => {
        const successes = currentBatchState.filter((f) => f.status === 'SUCCESS').length;
        const fails = currentBatchState.filter((f) => f.status === 'FAILED').length;
        const unsupports = currentBatchState.filter((f) => f.status === 'UNSUPPORTED').length;
        const cancels = currentBatchState.filter((f) => f.status === 'CANCELLED').length;

        const batchAudit: BatchExecutionAuditRecord = {
          runId,
          timestamp: new Date().toISOString(),
          intent: plan.intent,
          status: wasAborted
            ? 'CANCELLED'
            : successes === itemsToProcess.length
            ? 'SUCCESS'
            : successes > 0
            ? 'PARTIAL'
            : 'FAILED',
          durationMs: Date.now() - startTime,
          outputFormats: selectedOutputs,
          totalFiles: selectedBatchItems.length,
          successCount: successes,
          failedCount: fails,
          unsupportedCount: unsupports,
          cancelledCount: cancels,
        };
        recordBatchExecutionAudit(batchAudit);
        setLastBatchAudit(batchAudit);
        return currentBatchState;
      });

      isExecutingRef.current = false;
      setIsExecuting(false);
    };

    // Consent check before transmitting multiple files
    if (!isOfficePackIntent) {
      requestAiConsent(() => {
        startProcessingLoop();
      });
    } else {
      startProcessingLoop();
    }
  };

  const handleCancelBatch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    activeRunIdRef.current = null; // Invalidate runId to ignore late responses
    isExecutingRef.current = false;
    setIsExecuting(false);

    setBatchFiles((prev) =>
      prev.map((f) =>
        f.status === 'QUEUED' || f.status === 'PROCESSING'
          ? { ...f, status: 'CANCELLED' }
          : f
      )
    );
    setBatchProgress((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));

    const cancelAudit: BatchExecutionAuditRecord = {
      runId: activeRunIdRef.current || `cancel_${Date.now()}`,
      timestamp: new Date().toISOString(),
      intent: plan?.intent || 'unsupported',
      status: 'CANCELLED',
      durationMs: 0,
      outputFormats: selectedOutputs,
      totalFiles: selectedBatchItems.length,
      successCount: batchFiles.filter((f) => f.status === 'SUCCESS').length,
      failedCount: batchFiles.filter((f) => f.status === 'FAILED').length,
      unsupportedCount: batchFiles.filter((f) => f.status === 'UNSUPPORTED').length,
      cancelledCount: batchFiles.filter(
        (f) => f.status === 'QUEUED' || f.status === 'PROCESSING' || f.status === 'CANCELLED'
      ).length,
    };
    recordBatchExecutionAudit(cancelAudit);
    setLastBatchAudit(cancelAudit);
  };

  // Download All as Batch ZIP Package (with unique safe filenames and batch_manifest.json)
  const handleDownloadBatchZip = async () => {
    const successItems = batchFiles.filter((f) => f.status === 'SUCCESS');
    if (successItems.length === 0) return;

    const zip = new JSZip();

    // 1. Pack individual generated deliverables with collision-proof names
    const generatedFormatsPerFile: Record<string, string[]> = {};

    for (let idx = 0; idx < successItems.length; idx++) {
      const item = successItems[idx];
      const cleanBase = sanitizeFilename(item.name.replace(/\.[^.]+$/, ''));
      const prefix = `${String(idx + 1).padStart(2, '0')}_${cleanBase}`;
      const itemFormats: string[] = [];

      if (item.generatedFiles && item.generatedFiles.length > 0) {
        item.generatedFiles.forEach((gf) => {
          const uniqueFilename = `${prefix}_${gf.format}.${gf.format}`;
          zip.file(uniqueFilename, gf.blob);
          itemFormats.push(gf.format.toUpperCase());
        });
      }

      if (item.generatedText) {
        const uniqueTextFilename = `${prefix}_output.txt`;
        zip.file(uniqueTextFilename, item.generatedText);
        itemFormats.push('TXT');

        try {
          const docxRes = await exportToDocx(item.generatedText, {
            title: item.name.replace(/\.[^.]+$/, ''),
            sourceFilename: item.name,
            orientation: exportOrientation,
            margin: exportMargin,
            fontSize: exportFontSize,
          });
          zip.file(`${prefix}_report.docx`, docxRes.blob);
          itemFormats.push('DOCX');
        } catch {
          // Keep resilient
        }

        try {
          const pdfRes = await exportToPdf(item.generatedText, {
            title: item.name.replace(/\.[^.]+$/, ''),
            sourceFilename: item.name,
            orientation: exportOrientation,
            margin: exportMargin,
            fontSize: exportFontSize,
          });
          zip.file(`${prefix}_summary.pdf`, pdfRes.blob);
          itemFormats.push('PDF');
        } catch {
          // Keep resilient
        }
      }

      generatedFormatsPerFile[item.id] = itemFormats;
    }

    // 2. Add batch_manifest.json with run status & per-file breakdown (no private text or keys)
    const manifestItems: BatchManifestItem[] = batchFiles.map((f) => ({
      fileName: f.name,
      fileSize: f.size,
      status: f.status,
      outputFormatsGenerated:
        generatedFormatsPerFile[f.id] ||
        f.generatedFiles?.map((gf) => gf.format) ||
        (f.generatedText ? ['TXT'] : []),
      generatedFilesCount:
        generatedFormatsPerFile[f.id]?.length ||
        (f.generatedFiles?.length || 0) + (f.generatedText ? 1 : 0),
      hasTextPreview: !!f.generatedText,
      error: f.error,
    }));

    const manifest: BatchManifest = {
      manifestVersion: '1.0',
      runId: activeRunIdRef.current || `batch_${Date.now()}`,
      timestamp: new Date().toISOString(),
      totalFiles: batchFiles.length,
      successCount: batchFiles.filter((f) => f.status === 'SUCCESS').length,
      failedCount: batchFiles.filter((f) => f.status === 'FAILED').length,
      unsupportedCount: batchFiles.filter((f) => f.status === 'UNSUPPORTED').length,
      cancelledCount: batchFiles.filter((f) => f.status === 'CANCELLED').length,
      files: manifestItems,
    };

    zip.file('batch_manifest.json', JSON.stringify(manifest, null, 2));

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = `MAISHAA_Batch_${Date.now()}.zip`;
    await downloadFileOnce(zipBlob, filename);
    showNotification(
      language === 'bn' ? 'ব্যাচ জিপ ও ম্যানিফেস্ট ডাউনলোড সম্পন্ন' : 'Batch ZIP and manifest downloaded'
    );
  };

  // Text download helper
  const handleDownloadBatchItemText = async (item: BatchFileItem) => {
    if (!item.generatedText) return;
    const blob = new Blob([item.generatedText], { type: 'text/plain;charset=utf-8' });
    const filename = `${item.name.replace(/\.[^.]+$/, '')}_ai_output.txt`;
    await downloadFileOnce(blob, filename);
  };


  const handleCopyBatchText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBatchId(id);
    showNotification(language === 'bn' ? 'কপি করা হয়েছে' : 'Copied to clipboard');
    setTimeout(() => setCopiedBatchId(null), 2000);
  };

  const liveDetectedLang = detectInputLanguage(instruction);

  const getStatusBadge = () => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            READY
          </span>
        );
      case 'ANALYZING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            ANALYZING
          </span>
        );
      case 'COMPLETE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            COMPLETE
          </span>
        );
      case 'NOT CONFIGURED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            NOT CONFIGURED
          </span>
        );
      case 'QUOTA EXCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            QUOTA EXCEEDED
          </span>
        );
      case 'TIMEOUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            TIMEOUT
          </span>
        );
      case 'ERROR':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ERROR
          </span>
        );
    }
  };

  const renderOutputIcon = (out: SuggestedOfficeOutput) => {
    switch (out) {
      case 'DOCX':
        return <FileText className="w-3.5 h-3.5 text-sky-400" />;
      case 'PDF':
        return <FileCheck2 className="w-3.5 h-3.5 text-rose-400" />;
      case 'XLSX':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />;
      case 'PPTX':
        return <Presentation className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0b1329] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  MAISHAA AI COMMAND CENTER
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'bn'
                    ? 'এক ক্লিকে এআই কমান্ড, মাল্টি-ফাইল ব্যাচ ও অফিস প্যাক বাস্তবায়ন'
                    : 'Grounded single & multi-file batch execution with bilingual confirmation gating'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col sm:items-end">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                AI Engine Status
              </span>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs: Single Document vs Multi-file Batch */}
        <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCommandMode('single')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                commandMode === 'single'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{language === 'bn' ? 'একক ডকুমেন্ট (Single)' : 'Single Document'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCommandMode('batch')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                commandMode === 'batch'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Files className="w-4 h-4" />
              <span>
                {language === 'bn' ? 'মাল্টি-ফাইল ব্যাচ (Batch)' : 'Multi-file Batch'}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  commandMode === 'batch' ? 'bg-slate-900 text-teal-300' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {stagedFiles.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 pr-1">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  addStagedFiles(Array.from(e.target.files));
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5 text-teal-400" />
              <span>{language === 'bn' ? 'ফাইল যোগ করুন' : 'Add Files'}</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BATCH SELECTION CARD (When in Batch Mode) */}
        {/* ============================================================== */}
        {commandMode === 'batch' && (
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Files className="w-4 h-4 text-teal-400" />
                  <span>
                    {language === 'bn' ? 'ব্যাচ ফাইল নির্বাচন ও প্রস্তুতি' : 'Batch File Selection & Readiness'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedFileIds.size} of {batchFiles.length} files selected •{' '}
                  {language === 'bn'
                    ? 'প্রতিটি ফাইল স্বাধীনভাবে প্রসেস হবে'
                    : 'Each file is processed strictly independently'}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllBatch}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                >
                  {language === 'bn' ? 'সব নির্বাচন' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllBatch}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                >
                  {language === 'bn' ? 'সব বাতিল' : 'Deselect All'}
                </button>
              </div>
            </div>

            {/* Batch Files List */}
            {batchFiles.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
                <Files className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  {language === 'bn'
                    ? 'কোন ফাইল স্টেজ করা নেই। উপরে "ফাইল যোগ করুন" বাটনে ক্লিক করুন।'
                    : 'No files staged yet. Click "Add Files" above to select multiple documents.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {batchFiles.map((item) => {
                  const isChecked = selectedFileIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                        isChecked
                          ? 'bg-slate-900 border-teal-500/30'
                          : 'bg-slate-950/60 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleBatchFileSelection(item.id)}
                          className="text-slate-400 hover:text-teal-400 shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-teal-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200 truncate">
                              {item.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                              {item.type}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {formatFileSize(item.size)}
                          </span>
                        </div>
                      </div>

                      {/* Readiness / Unsupported Badge */}
                      <div className="shrink-0 flex items-center gap-2">
                        {item.isSupported ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>READY</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            title={item.unsupportedReason}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>UNSUPPORTED</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Text Limit Disclosure Notice (Requirement 3) */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300 block">
                  {language === 'bn'
                    ? 'টেক্সট সীমা প্রকাশ (Text Limit Disclosure):'
                    : 'Text Limit Disclosure:'}
                </strong>
                <span>
                  {language === 'bn'
                    ? 'প্রতিটি ফাইলের জন্য সর্বোচ্চ ৩০,০০০ ক্যারেক্টার প্রক্রিয়াজাত হবে। কোনো ফাইল নীরবে ট্রাঙ্কেট হবে না।'
                    : 'Each file is processed up to 30,000 characters. Content is never silently truncated without disclosure.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Single File Mode Source Banner */}
        {commandMode === 'single' && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-slate-800 text-teal-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                    Source Content
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                    {sourceType}
                  </span>
                </div>
                <p className="text-slate-400 truncate mt-0.5">
                  {sourceName ? (
                    <span className="text-slate-200 font-medium">{sourceName}</span>
                  ) : (
                    <span className="italic text-slate-500">
                      Source content unavailable; suggestions based purely on text instruction.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
              {sourceSize > 0 && (
                <span className="font-mono text-slate-400">
                  {formatFileSize(sourceSize)}
                </span>
              )}
              <button
                onClick={() => setActiveModule('office_pack')}
                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-3 h-3 text-teal-400" />
                <span>Office Pack Studio</span>
              </button>
            </div>
          </div>
        )}

        {/* Command Input Card */}
        <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <label
              htmlFor="ai-command-instruction"
              className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2"
            >
              <span>User Instruction</span>
              {liveDetectedLang !== 'Unknown' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-teal-300 border border-slate-700">
                  {liveDetectedLang} detected
                </span>
              )}
            </label>
            <span className="text-[11px] text-slate-500 font-mono">
              {instruction.length} characters
            </span>
          </div>

          <div className="relative">
            <textarea
              id="ai-command-instruction"
              aria-label="User Instruction"
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={
                commandMode === 'batch'
                  ? 'Enter unified batch command, e.g. "Summarize all selected documents", "Generate DOCX and PDF reports", "বাংলায় সারসংক্ষেপ তৈরি করো"'
                  : 'Enter command, e.g. "Summarize this document", "Make DOCX and PDF", "বাংলায় সংক্ষেপ করো"'
              }
              disabled={status === 'ANALYZING' || isExecuting}
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-hidden focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 transition-all resize-y min-h-[90px]"
            />
          </div>

          {/* Quick Example Instructions */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-3 h-3 text-teal-400" />
              <span>Quick Example Instructions:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {exampleInstructions.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    setInstruction(ex.text);
                    handleAnalyze(ex.text);
                  }}
                  disabled={status === 'ANALYZING' || isExecuting}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-800 bg-slate-800/40 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all disabled:opacity-50"
                >
                  {ex.text}
                </button>
              ))}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={status === 'ANALYZING' || isExecuting || !instruction.trim()}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {status === 'ANALYZING' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Analyzing Intent...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit / Analyze</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={
                  status === 'ANALYZING' ||
                  isExecuting ||
                  (!instruction && !plan && !errorMessage && !executionError)
                }
                className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            {/* Retry Button on Error / Quota / Timeout */}
            {(status === 'QUOTA EXCEEDED' || status === 'TIMEOUT' || status === 'ERROR') && (
              <button
                type="button"
                onClick={() => handleAnalyze()}
                className="px-4 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 border border-orange-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-orange-300" />
                <span>Retry Analysis</span>
              </button>
            )}
          </div>
        </div>

        {/* Error / Quota Notice Banner */}
        {(errorMessage || executionError) && (
          <div
            className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 animate-in fade-in duration-200 ${
              status === 'QUOTA EXCEEDED'
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                : status === 'NOT CONFIGURED'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block uppercase tracking-wider text-[11px]">
                {status === 'QUOTA EXCEEDED'
                  ? 'QUOTA EXCEEDED'
                  : status === 'NOT CONFIGURED'
                  ? 'NOT CONFIGURED'
                  : 'EXECUTION NOTICE'}
              </span>
              <p>{errorMessage || executionError}</p>
              {status === 'QUOTA EXCEEDED' && (
                <p className="text-[11px] text-orange-400/90 pt-1">
                  Note: Offline Office Pack creation (DOCX, PDF, XLSX, PPTX) and local file processing remain 100% available without quota limits.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STRUCTURED PLAN & CONFIRMATION AREA */}
        {/* ============================================================== */}
        {plan && (
          <div className="p-6 rounded-2xl border border-teal-500/30 bg-slate-900/90 shadow-2xl space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">Suggested Action Plan</h2>
                  <p className="text-xs text-slate-400">
                    Structured analysis formulated by AI engine
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold">
                <Check className="w-4 h-4 text-teal-400" />
                <span>Confirmation Required: true</span>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Detected Intent
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-teal-300 font-mono">
                    {plan.intent}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {(plan.confidence * 100).toFixed(0)}% conf
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Detected Language
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-sky-300">{plan.language}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                    Preserved
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 sm:col-span-2 lg:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Suggested Outputs
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {plan.suggestedOutputs.length > 0 ? (
                    plan.suggestedOutputs.map((out) => (
                      <span
                        key={out}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-200"
                      >
                        {renderOutputIcon(out)}
                        {out}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">None suggested</span>
                  )}
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                AI Summary
              </span>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                {sanitizeDisplayText(plan.summary)}
              </div>
            </div>

            {/* Suggested Actions Area */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Suggested Actions
              </span>
              <div className="space-y-2">
                {plan.suggestedActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3 text-xs sm:text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-300 leading-relaxed">
                      {sanitizeDisplayText(action)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {plan.warnings && plan.warnings.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Warnings & Distinctions
                </span>
                <div className="space-y-1.5">
                  {plan.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5"
                    >
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{sanitizeDisplayText(w)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* BILINGUAL CONFIRMATION PREVIEW (Single vs Batch) */}
            {/* ============================================================== */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950/90 to-slate-900/90 border-2 border-teal-500/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <span>
                        {commandMode === 'batch'
                          ? 'মাল্টি-ফাইল ব্যাচ নিশ্চিতকরণ প্রিভিউ'
                          : 'পরিকল্পনা নিশ্চিতকরণ প্রিভিউ'}
                      </span>
                      <span className="text-slate-500 font-normal">|</span>
                      <span className="text-slate-300 font-medium">
                        {commandMode === 'batch'
                          ? 'Multi-file Batch Confirmation'
                          : 'Confirmation & Execution Preview'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'পর্যালোচনা করুন এবং বাস্তবায়ন শুরু করার স্পষ্ট সম্মতি দিন'
                        : 'Review and confirm execution parameters'}
                    </p>
                  </div>
                </div>

                {/* Stale Warning */}
                {(commandMode === 'batch' ? isBatchConfirmationStale : isConfirmationStale) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>প্যারামিটার পরিবর্তিত হয়েছে (Parameters Changed)</span>
                  </span>
                )}
              </div>

              {/* Grid: Instruction, Source / Files, Action, Formats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {language === 'bn' ? 'ইউজার নির্দেশনা (User Instruction)' : 'User Instruction'}
                  </span>
                  <p className="text-slate-200 font-medium italic">"{instruction}"</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {commandMode === 'batch'
                      ? language === 'bn'
                        ? 'নির্বাচিত ব্যাচ ফাইলসমূহ (Selected Batch Files)'
                        : 'Selected Batch Files'
                      : language === 'bn'
                      ? 'উৎস ডকুমেন্ট (Source Document)'
                      : 'Source Document'}
                  </span>
                  {commandMode === 'batch' ? (
                    <div className="space-y-1">
                      <span className="text-slate-200 font-medium block">
                        {selectedBatchItems.length} files selected ({selectedBatchItems.filter((f) => f.isSupported).length} ready)
                      </span>
                      <div className="text-[11px] text-slate-400 truncate">
                        {selectedBatchItems.map((f) => f.name).join(', ')}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200 font-medium truncate">
                        {sourceName || (language === 'bn' ? 'কোন উৎস ফাইল নেই' : 'No source file')}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {sourceSize > 0 ? formatFileSize(sourceSize) : '0 KB'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {language === 'bn' ? 'পরিকল্পিত কাজ (Intended Action)' : 'Intended Action'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-teal-300 font-mono">
                      {plan.intent}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                    {language === 'bn' ? 'আউটপুট ফরম্যাট (Select Formats)' : 'Selected Output Formats'}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['DOCX', 'PDF', 'XLSX', 'PPTX'] as SuggestedOfficeOutput[]).map((fmt) => {
                      const isSelected = selectedOutputs.includes(fmt);
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => toggleOutputFormat(fmt)}
                          disabled={isExecuting}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                            isSelected
                              ? 'bg-teal-500/20 border-teal-500/40 text-teal-200'
                              : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {renderOutputIcon(fmt)}
                          <span>{fmt}</span>
                          {isSelected ? <Check className="w-3 h-3 text-teal-400 ml-0.5" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Non-Destructive Guarantee */}
              <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs text-teal-300 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-teal-200 block">
                    {language === 'bn'
                      ? 'অ-ধ্বংসাত্মক নিশ্চয়তা (Non-Destructive Guarantee):'
                      : 'Non-Destructive Guarantee:'}
                  </span>
                  <p className="text-teal-300/80 leading-relaxed">
                    {language === 'bn'
                      ? 'মূল ফাইলগুলো কখনো ওভাররাইট করা হবে না। প্রতিটি আউটপুট সম্পূর্ণ নতুন ডেলিভারেবল হিসেবে তৈরি হবে।'
                      : 'Original files will NEVER be overwritten. Generated deliverables are produced as independent new files for your review.'}
                  </p>
                </div>
              </div>

              {/* Progress Bar (Single File) */}
              {commandMode === 'single' && isExecuting && executionProgress && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-sky-500/30 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-300 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                      <span>{language === 'bn' ? executionProgress.stepBn : executionProgress.step}</span>
                    </span>
                    <span className="font-mono text-sky-400 font-bold">
                      {executionProgress.percent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-sky-400 transition-all duration-300 rounded-full"
                      style={{ width: `${executionProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Progress Bar (Batch Queue) */}
              {commandMode === 'batch' && batchProgress && batchProgress.status === 'RUNNING' && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-sky-500/30 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-300 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                      <span>
                        Processing file {batchProgress.currentFileIndex} of {batchProgress.totalCount}:{' '}
                        <strong className="text-white">{batchProgress.currentFileName}</strong>
                      </span>
                    </span>
                    <span className="font-mono text-sky-400 font-bold">
                      {batchProgress.overallPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-sky-400 transition-all duration-300 rounded-full"
                      style={{ width: `${batchProgress.overallPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Controls: Confirm & Run, Cancel, Retry */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      commandMode === 'batch'
                        ? handleConfirmAndRunBatch()
                        : handleConfirmAndRunSingle()
                    }
                    disabled={
                      isExecuting ||
                      plan.intent === 'unsupported' ||
                      (commandMode === 'batch' && selectedBatchItems.length === 0)
                    }
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>{language === 'bn' ? 'বাস্তবায়ন হচ্ছে...' : 'Executing...'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                        <span>
                          {commandMode === 'batch'
                            ? language === 'bn'
                              ? `ব্যাচ বাস্তবায়ন নিশ্চিত করুন (Confirm & Run Batch) (${selectedBatchItems.length} ফাইল)`
                              : `Confirm & Run Batch (${selectedBatchItems.length} files)`
                            : language === 'bn'
                            ? 'বাস্তবায়ন নিশ্চিত করুন (Confirm & Run)'
                            : 'Confirm & Run'}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      commandMode === 'batch' ? handleCancelBatch() : handleCancelSingle()
                    }
                    disabled={!isExecuting && executionStatus !== 'AWAITING_CONFIRMATION'}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                  >
                    <XOctagon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{language === 'bn' ? 'বাতিল (Cancel)' : 'Cancel'}</span>
                  </button>
                </div>

                {/* Retry Failed Batch button (Phase 4 Step 4D) */}
                {commandMode === 'batch' &&
                  batchFiles.some((f) => f.status === 'FAILED') &&
                  !isExecuting && (
                    <button
                      type="button"
                      onClick={() => handleConfirmAndRunBatch(true)}
                      className="px-4 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 border border-orange-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-orange-300" />
                      <span>
                        {language === 'bn'
                          ? 'ব্যর্থ ফাইলগুলো পুনরায় চেষ্টা করুন (Retry Failed Files)'
                          : 'Retry Failed Files'}
                      </span>
                    </button>
                  )}
              </div>
            </div>

            {/* ============================================================== */}
            {/* SINGLE FILE DELIVERABLES (When in Single Mode) */}
            {/* ============================================================== */}
            {commandMode === 'single' && executionStatus === 'SUCCESS' && (
              <div className="p-6 rounded-2xl bg-slate-950/90 border-2 border-emerald-500/40 shadow-2xl space-y-5 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{language === 'bn' ? 'বাস্তবায়িত ফলাফল' : 'Generated Deliverables'}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Ready for Review
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {language === 'bn'
                          ? 'ফলাফল পর্যালোচনা করুন এবং ফাইল ডাউনলোড করুন।'
                          : 'Review generated outputs below. You can edit text content or download deliverables.'}
                      </p>
                    </div>
                  </div>
                </div>

                {generatedFiles.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Generated Office Files:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {generatedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-slate-800 shrink-0">
                              {renderOutputIcon(file.format.toUpperCase() as SuggestedOfficeOutput)}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-200 block truncate">
                                {file.filename}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {formatFileSize(file.size)} • {file.format.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadFileOnce(file.blob, file.filename)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>

                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editableGeneratedText && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-teal-400" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          {language === 'bn' ? 'সম্পাদনাযোগ্য টেক্সট প্রিভিউ' : 'Editable Text Preview'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {editableGeneratedText.length} chars
                      </span>
                    </div>

                    {/* Step 4C: Direct Document Export Formatting Toolbar */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-teal-400" />
                          <span>
                            {language === 'bn'
                              ? 'ডকুমেন্ট ফরম্যাটিং ও এক্সপোর্ট সেটিংস'
                              : 'Document Formatting & Direct Export'}
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-teal-300 border border-slate-700">
                          A4 Standard Page
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                            {language === 'bn' ? 'শিরোনাম (Title)' : 'Document Title'}
                          </label>
                          <input
                            type="text"
                            value={exportTitle}
                            onChange={(e) => setExportTitle(e.target.value)}
                            placeholder={sourceName?.replace(/\.[^.]+$/, '') || 'Document Title'}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-teal-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                            {language === 'bn' ? 'ওরিয়েন্টেশন' : 'Orientation'}
                          </label>
                          <select
                            value={exportOrientation}
                            onChange={(e) => setExportOrientation(e.target.value as PageOrientation)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-teal-400"
                          >
                            <option value="portrait">Portrait (লম্বালম্বি)</option>
                            <option value="landscape">Landscape (আড়াআড়ি)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                            {language === 'bn' ? 'মার্জিন' : 'Margins'}
                          </label>
                          <select
                            value={exportMargin}
                            onChange={(e) => setExportMargin(e.target.value as PageMargin)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-teal-400"
                          >
                            <option value="normal">Normal (স্বাভাবিক - 25.4mm / 1.0")</option>
                            <option value="narrow">Narrow (সংকীর্ণ - 12.7mm / 0.5")</option>
                            <option value="wide">Wide (প্রশস্ত - 38.1mm / 1.5")</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                            {language === 'bn' ? 'হরফের আকার' : 'Font Size'}
                          </label>
                          <select
                            value={exportFontSize}
                            onChange={(e) => setExportFontSize(e.target.value as ExportFontSize)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-teal-400"
                          >
                            <option value="normal">Normal (11pt / স্বাভাবিক)</option>
                            <option value="small">Small (9pt / ছোট)</option>
                            <option value="large">Large (13pt / বড়)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <textarea
                      rows={8}
                      value={editableGeneratedText}
                      onChange={(e) => setEditableGeneratedText(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm leading-relaxed focus:outline-hidden focus:border-teal-400 font-sans"
                    />

                    {directExportError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{directExportError}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Direct DOCX Export */}
                        <button
                          type="button"
                          onClick={handleExportSingleDocx}
                          disabled={isExportingDocx || isExportingPdf || !editableGeneratedText.trim()}
                          className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {isExportingDocx ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                          )}
                          <span>{isExportingDocx ? 'Generating DOCX...' : 'Download DOCX'}</span>
                        </button>

                        {/* Direct PDF Export */}
                        <button
                          type="button"
                          onClick={handleExportSinglePdf}
                          disabled={isExportingDocx || isExportingPdf || !editableGeneratedText.trim()}
                          className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {isExportingPdf ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileDown className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
                        </button>

                        {/* Copy Text */}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(editableGeneratedText);
                            setSingleCopied(true);
                            setTimeout(() => setSingleCopied(false), 2000);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                        >
                          {singleCopied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{singleCopied ? 'Copied!' : 'Copy Text'}</span>
                        </button>

                        {/* Save as .txt */}
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([editableGeneratedText], {
                              type: 'text/plain;charset=utf-8',
                            });
                            const filename = `${sourceName ? sourceName.replace(/\.[^.]+$/, '') : 'document'}_ai_output.txt`;
                            downloadFileOnce(blob, filename);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Save as .txt</span>
                        </button>

                      </div>

                      <span className="text-[11px] text-slate-500 font-mono">
                        Markdown & Unicode formatting preserved
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* PHASE 4 STEP 4D: MULTI-FILE BATCH DELIVERABLES & PREVIEWS */}
            {/* ============================================================== */}
            {commandMode === 'batch' &&
              batchFiles.some((f) => f.status === 'SUCCESS' || f.status === 'FAILED') && (
                <div className="p-6 rounded-2xl bg-slate-950/90 border-2 border-teal-500/40 shadow-2xl space-y-5 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <FolderArchive className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span>
                            {language === 'bn' ? 'ব্যাচ ফলাফল ও ডেলিভারেবলসমূহ' : 'Batch Deliverables & Results'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            {batchFiles.filter((f) => f.status === 'SUCCESS').length} of {batchFiles.length} Completed
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {language === 'bn'
                            ? 'প্রতিটি ফাইলের প্রিভিউ আলাদাভাবে দেখুন অথবা সব ফাইল জিপ আকারে নামিয়ে নিন।'
                            : 'Review separate editable outputs for each file or export all as a ZIP package with manifest.'}
                        </p>
                      </div>
                    </div>

                    {batchFiles.some((f) => f.status === 'SUCCESS') && (
                      <button
                        type="button"
                        onClick={handleDownloadBatchZip}
                        className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-md transition-all shrink-0"
                      >
                        <Archive className="w-4 h-4" />
                        <span>
                          {language === 'bn'
                            ? 'ব্যাচ জিপ ও ম্যানিফেস্ট ডাউনলোড (.zip)'
                            : 'Download All ZIP + Manifest'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Individual Batch File Result Cards */}
                  <div className="space-y-4">
                    {batchFiles
                      .filter((f) => selectedFileIds.has(f.id))
                      .map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-300 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-200 text-xs truncate">
                                {item.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                ({formatFileSize(item.size)})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {item.isTruncated && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                  First 30,000 chars analyzed
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  item.status === 'SUCCESS'
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : item.status === 'PROCESSING'
                                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                    : item.status === 'FAILED'
                                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                    : item.status === 'UNSUPPORTED'
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                          </div>

                          {/* Failure explanation */}
                          {item.error && (
                            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.error}</span>
                            </div>
                          )}

                          {/* Separate Editable Text Preview */}
                          {item.generatedText && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>Editable Text Output:</span>
                                <span>{item.generatedText.length} characters</span>
                              </div>
                              <textarea
                                rows={4}
                                value={item.generatedText}
                                onChange={(e) => {
                                  const newText = e.target.value;
                                  setBatchFiles((prev) =>
                                    prev.map((f) =>
                                      f.id === item.id ? { ...f, generatedText: newText } : f
                                    )
                                  );
                                }}
                                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-hidden focus:border-teal-400 resize-y font-sans"
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleExportBatchItemDocx(item)}
                                  disabled={exportingBatchId === `${item.id}_docx`}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  {exportingBatchId === `${item.id}_docx` ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <FileText className="w-3 h-3 text-blue-400" />
                                  )}
                                  <span>DOCX</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExportBatchItemPdf(item)}
                                  disabled={exportingBatchId === `${item.id}_pdf`}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  {exportingBatchId === `${item.id}_pdf` ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <FileDown className="w-3 h-3 text-rose-400" />
                                  )}
                                  <span>PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyBatchText(item.id, item.generatedText!)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                                >
                                  {copiedBatchId === item.id ? (
                                    <Check className="w-3 h-3 text-teal-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>{copiedBatchId === item.id ? 'Copied' : 'Copy Text'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadBatchItemText(item)}
                                  className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download .txt</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Office Pack Deliverables for this item */}
                          {item.generatedFiles && item.generatedFiles.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-semibold text-slate-400 block">
                                Generated Deliverables:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {item.generatedFiles.map((gf, gIdx) => (
                                  <button
                                    key={gIdx}
                                    type="button"
                                    onClick={() => downloadFileOnce(gf.blob, gf.filename)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Download className="w-3 h-3 text-teal-400" />
                                    <span>{gf.format.toUpperCase()}</span>
                                    <span className="text-slate-500 text-[10px]">
                                      ({formatFileSize(gf.size)})
                                    </span>
                                  </button>
                                ))}

                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Phase 4 Step 4D: Metadata-Only Batch Audit Records */}
        {commandMode === 'batch' && lastBatchAudit && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                <strong className="text-slate-300">Batch Run ID:</strong> {lastBatchAudit.runId}
              </span>
              <span>
                <strong className="text-slate-300">Status:</strong>{' '}
                <span
                  className={
                    lastBatchAudit.status === 'SUCCESS'
                      ? 'text-emerald-400 font-bold'
                      : lastBatchAudit.status === 'PARTIAL'
                      ? 'text-teal-400 font-bold'
                      : lastBatchAudit.status === 'CANCELLED'
                      ? 'text-slate-400'
                      : 'text-rose-400 font-bold'
                  }
                >
                  {lastBatchAudit.status}
                </span>
              </span>
              <span>
                <strong className="text-slate-300">Files:</strong> {lastBatchAudit.successCount} /{' '}
                {lastBatchAudit.totalFiles} succeeded
              </span>
              <span>
                <strong className="text-slate-300">Duration:</strong> {lastBatchAudit.durationMs}ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                Metadata-Only Audit • No Private Content Stored
              </span>
            </div>
          </div>
        )}

        {/* Single-file execution audit record */}
        {commandMode === 'single' && lastExecutionAudit && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                <strong className="text-slate-300">Execution Audit:</strong>{' '}
                {new Date(lastExecutionAudit.timestamp).toLocaleTimeString()}
              </span>
              <span>
                <strong className="text-slate-300">Intent:</strong> {lastExecutionAudit.intent}
              </span>
              <span>
                <strong className="text-slate-300">Status:</strong>{' '}
                <span
                  className={
                    lastExecutionAudit.executionStatus === 'SUCCESS'
                      ? 'text-emerald-400 font-bold'
                      : lastExecutionAudit.executionStatus === 'CANCELLED'
                      ? 'text-slate-400'
                      : 'text-rose-400 font-bold'
                  }
                >
                  {lastExecutionAudit.executionStatus}
                </span>
              </span>
              <span>
                <strong className="text-slate-300">Duration:</strong> {lastExecutionAudit.durationMs}ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                Audit Metadata Only • No Private Content Stored
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

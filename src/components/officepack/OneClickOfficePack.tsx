import React, { useState, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  OfficePackType,
  PlannedOutput,
  AiProcessingMode,
  OfficePackWorkflowPlan,
  BatchSourceItem,
  BatchItemStatus,
  OutputFormat,
} from '../../types/officePack';
import { OFFICE_PACKS, getPackConfig } from '../../data/officePacks';
import { buildOfficePackPlan } from '../../services/officePackPlanner';
import {
  executeOfficePackGeneration,
  executeOfficePackBatch,
  processOfficePackBatchItem,
  createOfficePackZipBundle,
  createOfficePackBatchZipBundle,
  validateAndExtractSourceContent,
  generateCollisionSafeFilename,
  GeneratedPackFile,
  OfficePackGenerationResult,
  SourceValidationResult,
} from '../../services/officePackGenerator';
import { formatFileSize, sanitizeFilename } from '../../utils/fileDetection';
import { downloadFileOnce } from '../../utils/downloadHelper';
import {
  Package,
  UploadCloud,
  FileText,
  FileCheck,
  CheckSquare,
  Square,
  ShieldCheck,
  Cloud,
  Cpu,
  Layers,
  ArrowRight,
  X,
  FileSpreadsheet,
  Presentation,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  ChevronLeft,
  CheckCheck,
  ShieldAlert,
  ListOrdered,
  FileCheck2,
  Clock,
  Settings2,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  RotateCcw,
  Archive,
  FolderArchive,
  StopCircle,
  Files,
} from 'lucide-react';

export const OneClickOfficePack: React.FC = () => {
  const { language, showNotification } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View mode: 'configure' or 'plan'
  const [viewMode, setViewMode] = useState<'configure' | 'plan'>('configure');

  // 1. Source file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 2. Chosen pack type
  const [activePackType, setActivePackType] = useState<OfficePackType>('project_report');

  // 3. Planned output checklist state (keyed by packType -> outputId -> enabled)
  const [outputsState, setOutputsState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    OFFICE_PACKS.forEach((pack) => {
      pack.defaultOutputs.forEach((out) => {
        initial[`${pack.id}_${out.id}`] = out.enabled;
      });
    });
    return initial;
  });

  // 4. LOCAL / CLOUD AI indicator placeholder state
  const [aiMode, setAiMode] = useState<AiProcessingMode>('local');

  // 5. Workflow Plan & Confirmation State
  const [workflowPlan, setWorkflowPlan] = useState<OfficePackWorkflowPlan | null>(null);
  const [isPlanConfirmed, setIsPlanConfirmed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 6. Generated deliverables state (Phase 3 Step 3C-3G)
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedPackFile[]>([]);
  const [generationResult, setGenerationResult] = useState<OfficePackGenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);

  // 7. Source Validation and Extraction state (Phase 3 Step 3G)
  const [sourceValidation, setSourceValidation] = useState<SourceValidationResult | null>(null);
  const [isValidatingSource, setIsValidatingSource] = useState(false);

  // 8. Quality Issues Viewer state (Phase 3 Step 3H)
  const [activeIssueFormat, setActiveIssueFormat] = useState<OutputFormat | null>(null);

  // 9. Batch Processing State (Phase 3 Step 3I)
  const [batchItems, setBatchItems] = useState<BatchSourceItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isBatchZipping, setIsBatchZipping] = useState(false);
  const [downloadingFileNames, setDownloadingFileNames] = useState<Set<string>>(new Set());
  const [isDownloadingItemZip, setIsDownloadingItemZip] = useState<string | null>(null);
  const isCancelledRef = useRef(false);

  const activeBatchUrlsRef = useRef<string[]>([]);

  // Cleanup object URLs to prevent browser memory leaks
  const cleanupUrls = () => {
    activeBatchUrlsRef.current.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch (_) {}
    });
    activeBatchUrlsRef.current = [];
  };

  React.useEffect(() => {
    return () => {
      cleanupUrls();
    };
  }, []);

  // Validate and extract source content whenever selectedFile changes
  React.useEffect(() => {
    let isCancelled = false;
    if (selectedFile) {
      setIsValidatingSource(true);
      validateAndExtractSourceContent(selectedFile)
        .then((res) => {
          if (!isCancelled) {
            setSourceValidation(res);
            setIsValidatingSource(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setIsValidatingSource(false);
          }
        });
    } else {
      setSourceValidation(null);
      setIsValidatingSource(false);
    }
    return () => {
      isCancelled = true;
    };
  }, [selectedFile]);

  const activePack = getPackConfig(activePackType);

  // Handle file drop / selection (single or batch)
  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (fileArray.length === 1) {
      // Single file workflow
      const file = fileArray[0];
      setSelectedFile(file);
      setBatchItems([]);
      setValidationError(null);
      setWorkflowPlan(null);
      setIsPlanConfirmed(false);
      setGeneratedFiles([]);
      setGenerationNotice(null);
      showNotification(
        language === 'bn'
          ? `উৎস ফাইল যুক্ত হয়েছে: ${file.name}`
          : `Source file selected: ${file.name}`
      );
    } else {
      // Multi-file batch workflow (Phase 3 Step 3I)
      const existingNames = new Set<string>();
      const newItems: BatchSourceItem[] = fileArray.map((f, idx) => {
        const rawSafeName = sanitizeFilename(f.name, `document_${idx + 1}`);
        const safeName = generateCollisionSafeFilename(rawSafeName, existingNames);
        const ext = safeName.toLowerCase().split('.').pop() || '';
        let st: any = 'unsupported';
        if (['txt', 'md', 'csv', 'docx', 'pdf'].includes(ext)) {
          st = ext;
        }

        return {
          id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          file: f,
          originalFilename: f.name,
          safeFilename: safeName,
          sourceType: st,
          status: 'QUEUED',
          selectedOutputs: [],
          generatedFiles: [],
        };
      });

      setSelectedFile(fileArray[0]); // Primary file for plan preview
      setBatchItems(newItems);
      setValidationError(null);
      setWorkflowPlan(null);
      setIsPlanConfirmed(false);
      setGeneratedFiles([]);
      setGenerationNotice(null);

      showNotification(
        language === 'bn'
          ? `${fileArray.length}টি ফাইল ব্যাচে যুক্ত হয়েছে`
          : `Batch created with ${fileArray.length} source files`
      );
    }
  };

  const handleFileSelect = (file: File) => {
    handleFilesSelected([file]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Toggle output enabled/disabled
  const toggleOutput = (outputId: string) => {
    const key = `${activePackType}_${outputId}`;
    setOutputsState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setWorkflowPlan(null);
    setIsPlanConfirmed(false);
  };

  // Determine current active outputs
  const currentOutputs = activePack.defaultOutputs.map((out) => ({
    ...out,
    enabled: outputsState[`${activePackType}_${out.id}`] ?? out.enabled,
  }));

  const enabledOutputsCount = currentOutputs.filter((o) => o.enabled).length;

  // Handle "Create Office Pack" / Generate Visible Workflow Plan
  const handleGeneratePlan = () => {
    setValidationError(null);

    // Validation 1: Source file required
    if (!selectedFile) {
      const err =
        language === 'bn'
          ? 'অনুগ্রহ করে প্রথমে একটি উৎস ফাইল আপলোড বা নির্বাচন করুন।'
          : 'Please upload or select a source file first.';
      setValidationError(err);
      return;
    }

    // Validation 2: At least one output must be enabled
    if (enabledOutputsCount === 0) {
      const err =
        language === 'bn'
          ? 'প্যাক তৈরির জন্য অন্তত একটি আউটপুট ফরম্যাট সক্রিয় থাকতে হবে।'
          : 'At least one output format must be enabled in the checklist.';
      setValidationError(err);
      return;
    }

    // Build the visible workflow plan
    const plan = buildOfficePackPlan(
      selectedFile,
      activePackType,
      currentOutputs,
      aiMode
    );

    setWorkflowPlan(plan);
    setIsPlanConfirmed(false);
    setViewMode('plan');

    showNotification(
      language === 'bn'
        ? `"${activePack.nameBn}" এর কার্যপরিকল্পনা প্রস্তুত হয়েছে (${plan.totalSteps}টি ধাপ)`
        : `Workflow plan generated for ${activePack.name} (${plan.totalSteps} steps)`
    );
  };

  // Handle "Confirm Plan"
  const handleConfirmPlan = () => {
    if (!workflowPlan) return;
    setIsPlanConfirmed(true);
    setWorkflowPlan((prev) => (prev ? { ...prev, isConfirmed: true } : null));

    const msg =
      language === 'bn'
        ? 'কার্যপরিকল্পনা নিশ্চিত করা হয়েছে। পরবর্তী ধাপে পাইপলাইন এক্সিকিউশন সক্রিয় হবে।'
        : 'Workflow plan confirmed. Execution pipeline staged for next step.';
    showNotification(msg);
  };

  // Handle "Back / Edit"
  const handleBackToEdit = () => {
    setViewMode('configure');
    setIsPlanConfirmed(false);
    setGeneratedFiles([]);
    setGenerationResult(null);
    setGenerationNotice(null);
  };

  // Execute real document generation for all selected outputs (Phase 3 Step 3F)
  const handleGenerateDeliverables = async () => {
    // Prevent duplicate generation clicks while generation is running
    if (isGenerating || !selectedFile || !workflowPlan) return;
    setIsGenerating(true);
    setGenerationNotice(null);

    try {
      const res = await executeOfficePackGeneration(selectedFile, workflowPlan, language);
      setGenerationResult(res);
      setGeneratedFiles(res.files);

      if (!res.success) {
        setGenerationNotice(res.unsupportedNotice || res.error || 'NOT SUPPORTED: Source extraction is unsupported.');
        showNotification(res.unsupportedNotice || 'NOT SUPPORTED');
      } else {
        const count = res.files.length;
        if (res.isPartialSuccess) {
          const msg =
            language === 'bn'
              ? `আংশিক সম্পন্ন: ${count}টি ডকুমেন্ট তৈরি হয়েছে, কিছু ফরম্যাট ব্যর্থ হয়েছে।`
              : `Partial Success: Generated ${count} deliverable(s), some formats failed.`;
          showNotification(msg);
        } else {
          const msg =
            language === 'bn'
              ? `${count}টি অফিস ডকুমেন্ট সফলভাবে তৈরি হয়েছে!`
              : `Successfully generated ${count} office deliverable(s)!`;
          showNotification(msg);
        }
      }
    } catch (err: any) {
      const errMsg = `NOT SUPPORTED: ${err.message || 'Generation error'}`;
      setGenerationNotice(errMsg);
      showNotification(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to process a single batch item sequentially using deterministic service
  const processBatchItem = async (
    item: BatchSourceItem,
    targetOutputs: PlannedOutput[]
  ): Promise<BatchSourceItem> => {
    return processOfficePackBatchItem({
      item,
      packType: activePackType,
      targetOutputs,
      language,
      onStageChange: (stage) => {
        setBatchItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: stage } : it))
        );
      },
    });
  };

  // Execute Batch Processing sequentially with isolation and cancel support
  const handleStartBatchProcessing = async () => {
    if (isBatchProcessing || batchItems.length === 0) return;
    setIsBatchProcessing(true);
    isCancelledRef.current = false;

    showNotification(
      language === 'bn'
        ? `ব্যাচ প্রসেসিং শুরু হয়েছে: মোট ${batchItems.length}টি ফাইল`
        : `Batch processing started for ${batchItems.length} files`
    );

    const activeOutputs = currentOutputs.filter((o) => o.enabled);

    try {
      await executeOfficePackBatch({
        items: batchItems,
        packType: activePackType,
        targetOutputs: activeOutputs,
        language,
        shouldCancel: () => isCancelledRef.current,
        onItemProgress: (index, updatedItem) => {
          setBatchItems((prev) => {
            const next = [...prev];
            next[index] = updatedItem;
            return next;
          });
        },
      });
    } finally {
      setIsBatchProcessing(false);
      showNotification(
        language === 'bn'
          ? 'ব্যাচ প্রসেসিং সম্পন্ন হয়েছে।'
          : 'Batch processing execution completed.'
      );
    }
  };

  // Cancel Batch Execution
  const handleCancelBatch = () => {
    isCancelledRef.current = true;
    showNotification(
      language === 'bn' ? 'ব্যাচ প্রসেসিং বন্ধ করা হচ্ছে...' : 'Stopping batch processing...'
    );
  };

  // Retry a single failed/partial source item
  const handleRetryItem = async (itemId: string) => {
    const itemIndex = batchItems.findIndex((it) => it.id === itemId);
    if (itemIndex === -1 || isBatchProcessing) return;

    const item = batchItems[itemIndex];
    if (
      item.status !== 'FAILED' &&
      item.status !== 'PARTIAL' &&
      item.status !== 'CANCELLED' &&
      item.status !== 'NOT SUPPORTED'
    ) {
      return;
    }

    setBatchItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status: 'GENERATING', error: undefined } : it))
    );

    const activeOutputs = currentOutputs.filter((o) => o.enabled);
    const updated = await processBatchItem(item, activeOutputs);

    setBatchItems((prev) =>
      prev.map((it) => (it.id === itemId ? updated : it))
    );

    showNotification(
      language === 'bn'
        ? `পুনরায় চেষ্টা সম্পন্ন: ${item.originalFilename}`
        : `Retry completed: ${item.originalFilename}`
    );
  };

  // Download All as consolidated ZIP bundle (only active when >= 2 outputs generated)
  const handleDownloadAllZip = async () => {
    if (generatedFiles.length < 2 || !workflowPlan || isZipping) return;
    setIsZipping(true);
    try {
      const { filename, blob } = await createOfficePackZipBundle(
        generatedFiles,
        workflowPlan.sourceFileName,
        workflowPlan.packType
      );
      await downloadFileOnce(blob, filename);
      showNotification(
        language === 'bn'
          ? `সকল ফাইল ZIP আকারে ডাউনলোড সম্পন্ন: ${filename}`
          : `All files downloaded as ZIP: ${filename}`
      );
    } catch (err: any) {
      showNotification(`ZIP error: ${err.message || 'Failed to create zip bundle'}`);
    } finally {
      setIsZipping(false);
    }
  };

  // Download single item bundle ZIP (per-file Download All in batch mode)
  const handleDownloadItemZip = async (item: BatchSourceItem) => {
    const validFiles = (item.generatedFiles || []).filter(
      (f) => !f.qualityReport || f.qualityReport.status !== 'FAILED'
    );
    if (validFiles.length < 2 || isDownloadingItemZip === item.id) return;
    setIsDownloadingItemZip(item.id);

    try {
      const { filename, blob } = await createOfficePackZipBundle(
        validFiles,
        item.safeFilename,
        activePackType
      );
      await downloadFileOnce(blob, filename);
      showNotification(
        language === 'bn'
          ? `${item.safeFilename} এর সকল ফাইল ডাউনলোড সম্পন্ন`
          : `Downloaded all files for ${item.safeFilename}`
      );
    } catch (err: any) {
      showNotification(`ZIP error: ${err.message}`);
    } finally {
      setIsDownloadingItemZip(null);
    }
  };

  // Master Download Batch ZIP
  const handleDownloadBatchZip = async () => {
    if (batchItems.length === 0 || isBatchZipping) return;
    setIsBatchZipping(true);

    try {
      const { filename, blob, fileCount } = await createOfficePackBatchZipBundle(
        batchItems,
        activePackType
      );

      if (fileCount === 0) {
        showNotification(
          language === 'bn'
            ? 'ডাউনলোডযোগ্য কোনো সফল ফাইল নেই।'
            : 'No valid generated files available to download.'
        );
        return;
      }

      await downloadFileOnce(blob, filename);
      showNotification(
        language === 'bn'
          ? `সম্পূর্ণ ব্যাচ ZIP ডাউনলোড সম্পন্ন (${fileCount}টি ফাইল)`
          : `Full batch downloaded (${fileCount} files in ZIP)`
      );
    } catch (err: any) {
      showNotification(`Batch ZIP error: ${err.message || 'Failed to create batch ZIP'}`);
    } finally {
      setIsBatchZipping(false);
    }
  };

  const handleDownloadFile = async (file: GeneratedPackFile) => {
    if (downloadingFileNames.has(file.filename)) return;
    setDownloadingFileNames((prev) => new Set(prev).add(file.filename));
    try {
      await downloadFileOnce(file.blob, file.filename);
      showNotification(
        language === 'bn'
          ? `ডাউনলোড সম্পন্ন হয়েছে: ${file.filename}`
          : `Download completed: ${file.filename}`
      );
    } finally {
      setDownloadingFileNames((prev) => {
        const next = new Set(prev);
        next.delete(file.filename);
        return next;
      });
    }
  };


  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'docx':
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>DOCX</span>
          </span>
        );
      case 'pdf':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>PDF</span>
          </span>
        );
      case 'xlsx':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
            <FileSpreadsheet className="w-3 h-3" />
            <span>XLSX</span>
          </span>
        );
      case 'pptx':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
            <Presentation className="w-3 h-3" />
            <span>PPTX</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Hero Banner Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d1e40] via-[#0b1733] to-[#070e24] border border-slate-700/80 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Package className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ফেজ ৩ — ওয়ান-ক্লিক প্যাক' : 'Phase 3 — One-Click Pack'}</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 text-xs font-semibold font-mono">
                {viewMode === 'plan'
                  ? language === 'bn' ? 'ওয়ার্কফ্লো প্ল্যানার' : 'Workflow Planner'
                  : language === 'bn' ? 'মাল্টি-ডকুমেন্ট স্যুট' : 'Multi-Document Suite'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {language === 'bn'
                ? 'ওয়ান-ক্লিক অফিস প্যাক (One-Click Office Pack)'
                : 'One-Click Office Pack'}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {viewMode === 'plan'
                ? language === 'bn'
                  ? 'নির্ধারিত প্যাক ও সক্রিয় আউটপুটের জন্য ধাপে ধাপে দৃশ্যমান কার্যপরিকল্পনা। কোন ধাপে লোকাল এবং কোন ধাপে ক্লাউড AI প্রয়োজন তা স্বচ্ছভাবে যাচাই করুন।'
                  : 'Transparent step-by-step execution plan for the selected pack and target outputs. Verify local vs cloud execution tiers and privacy guarantees.'
                : language === 'bn'
                  ? 'একটি উৎস ফাইল নির্বাচন করে এক ক্লিকেই সম্পূর্ণ ডকুমেন্ট প্যাক তৈরি করুন। রিপোর্ট, সামারি, ডেটা শিট এবং প্রেজেন্টেশন স্লাইড সহ সমন্বিত অফিস প্যাকেজ।'
                  : 'Transform a single source file into a complete multi-format office package. Configures coordinated DOCX, PDF, XLSX, and PPTX deliverables.'}
            </p>
          </div>

          {/* AI Processing Mode Indicator Placeholder */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 shrink-0 space-y-2.5 min-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-teal-400" />
                <span>{language === 'bn' ? 'AI প্রসেসিং মোড' : 'AI Engine Mode'}</span>
              </span>
              <span className="text-[10px] text-teal-400 font-mono font-bold">
                {language === 'bn' ? 'প্লেসহোল্ডার' : 'Placeholder'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/70 rounded-lg border border-slate-800">
              <button
                onClick={() => setAiMode('local')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  aiMode === 'local'
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>LOCAL AI</span>
              </button>
              <button
                onClick={() => setAiMode('cloud')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  aiMode === 'cloud'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cloud className="w-3 h-3" />
                <span>CLOUD AI</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              {aiMode === 'local'
                ? language === 'bn'
                  ? '• লোকাল মোড: ব্রাউজার স্যান্ডবক্স ও অফলাইন প্রাইভেসি।'
                  : '• Local Sandbox: Client-side privacy guaranteed.'
                : language === 'bn'
                  ? '• ক্লাউড মোড: ঐচ্ছিক উচ্চক্ষমতাসম্পন্ন এন্টারপ্রাইজ পাইপলাইন।'
                  : '• Cloud Mode: Optional enterprise pipeline.'}
            </p>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: CONFIGURE INPUTS & PACK */}
      {viewMode === 'configure' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Side: Upload & Choose Pack Type */}
          <div className="lg:col-span-5 space-y-6">
            {/* Step 1: Upload / Select Source File */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-xs font-black">
                    1
                  </span>
                  <span>{language === 'bn' ? 'উৎস ফাইল আপলোড / নির্বাচন' : 'Source File Selection'}</span>
                </h2>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-teal-400 bg-teal-500/10'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesSelected(e.target.files);
                    }
                  }}
                />

                <div className="w-10 h-10 mx-auto mb-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>

                <p className="text-xs font-semibold text-slate-200">
                  {language === 'bn'
                    ? 'ফাইল ড্রপ করুন অথবা ব্রাউজ করতে ক্লিক করুন (এক বা একাধিক)'
                    : 'Drag & drop source file(s) or click to browse'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {language === 'bn'
                    ? 'সমর্থিত ফরম্যাট: DOCX, PDF, XLSX, PPTX, TXT, CSV'
                    : 'Supported formats: DOCX, PDF, XLSX, PPTX, TXT, CSV'}
                </p>
              </div>

              {/* Batch Source Files Summary Card */}
              {batchItems.length > 1 ? (
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-teal-500/40 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
                        <Files className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {language === 'bn'
                            ? `ব্যাচ: ${batchItems.length}টি ফাইল নির্বাচিত`
                            : `Batch: ${batchItems.length} files selected`}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {batchItems.reduce((acc, it) => acc + (it.file.size || 0), 0) > 0
                            ? formatFileSize(batchItems.reduce((acc, it) => acc + (it.file.size || 0), 0))
                            : `${batchItems.length} sources`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setBatchItems([]);
                        setWorkflowPlan(null);
                        cleanupUrls();
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors cursor-pointer"
                      title={language === 'bn' ? 'ব্যাচ মুছুন' : 'Clear batch'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {batchItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/70 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">{idx + 1}.</span>
                          <span className="truncate text-slate-200 text-xs font-medium" title={item.originalFilename}>
                            {item.originalFilename}
                          </span>
                          {item.safeFilename !== item.originalFilename && (
                            <span className="text-[10px] text-slate-400 font-mono" title="Collision-safe name">
                              ({item.safeFilename})
                            </span>
                          )}
                        </div>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono font-bold uppercase text-slate-300">
                          {item.sourceType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-teal-500/40 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate" title={selectedFile.name}>
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setWorkflowPlan(null);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors cursor-pointer"
                      title={language === 'bn' ? 'ফাইল মুছুন' : 'Remove file'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Small Source Status & Extraction Metrics (Phase 3 Step 3G) */}
                  {sourceValidation && (
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            sourceValidation.status === 'READY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : sourceValidation.status === 'EMPTY'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : sourceValidation.status === 'NOT SUPPORTED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {sourceValidation.status === 'READY'
                            ? language === 'bn'
                              ? 'Source Ready (উৎস প্রস্তুত)'
                              : 'Source Ready'
                            : sourceValidation.status === 'EMPTY'
                            ? language === 'bn'
                              ? 'Empty Source (ফাঁকা উৎস)'
                              : 'Empty Source'
                            : sourceValidation.status === 'NOT SUPPORTED'
                            ? 'NOT SUPPORTED'
                            : language === 'bn'
                            ? 'Extraction Failed (এক্সট্রাকশন ব্যর্থ)'
                            : 'Extraction Failed'}
                        </span>

                        <span className="text-[11px] text-slate-400 font-mono">
                          {language === 'bn' ? 'টাইপ:' : 'Type:'}{' '}
                          <strong className="text-slate-200 uppercase">
                            {sourceValidation.normalized?.sourceType || 'FILE'}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-mono">
                        {sourceValidation.normalized && sourceValidation.normalized.charCount > 0 && (
                          <span>
                            {language === 'bn' ? 'অক্ষর:' : 'Chars:'}{' '}
                            <strong className="text-slate-200">
                              {sourceValidation.normalized.charCount.toLocaleString()}
                            </strong>
                          </span>
                        )}
                        {sourceValidation.normalized && sourceValidation.normalized.paragraphCount > 0 && (
                          <span>
                            {language === 'bn' ? 'অনুচ্ছেদ:' : 'Paragraphs:'}{' '}
                            <strong className="text-slate-200">
                              {sourceValidation.normalized.paragraphCount}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Step 2: Choose Pack Type */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-xs font-black">
                  2
                </span>
                <span>{language === 'bn' ? 'প্যাকের ধরন নির্বাচন করুন' : 'Choose Pack Type'}</span>
              </h2>

              <div className="space-y-2.5">
                {OFFICE_PACKS.map((pack) => {
                  const isSelected = activePackType === pack.id;
                  return (
                    <button
                      key={pack.id}
                      onClick={() => {
                        setActivePackType(pack.id);
                        setWorkflowPlan(null);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'border-teal-400 bg-teal-950/20 ring-1 ring-teal-400 shadow-md'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-teal-300' : 'text-white'}`}>
                          {language === 'bn' ? `${pack.nameBn} (${pack.name})` : pack.name}
                        </span>
                        <span className="px-2 py-0.2 rounded-md bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-medium">
                          {language === 'bn' ? pack.badgeBn : pack.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {language === 'bn' ? pack.taglineBn : pack.tagline}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Side: Planned Output Checklist & Action */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-xs font-black">
                      3
                    </span>
                    <span>{language === 'bn' ? 'পরিকল্পিত আউটপুট চেকলিস্ট' : 'Planned Outputs Checklist'}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? `নির্বাচিত প্যাক: ${activePack.nameBn}`
                      : `Active Pack: ${activePack.name}`}
                  </p>
                </div>

                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 self-start sm:self-center">
                  {enabledOutputsCount} / {currentOutputs.length}{' '}
                  {language === 'bn' ? 'সক্রিয়' : 'Enabled'}
                </span>
              </div>

              {/* Checklist items */}
              <div className="space-y-3">
                {currentOutputs.map((output) => {
                  return (
                    <div
                      key={output.id}
                      onClick={() => toggleOutput(output.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        output.enabled
                          ? 'border-slate-700 bg-slate-900/90 shadow-sm'
                          : 'border-slate-800/60 bg-slate-950/30 opacity-60'
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-teal-400 hover:text-teal-300 transition-colors"
                      >
                        {output.enabled ? (
                          <CheckSquare className="w-4 h-4 text-teal-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${output.enabled ? 'text-white' : 'text-slate-400'}`}>
                              {language === 'bn' ? `${output.labelBn} (${output.label})` : output.label}
                            </span>
                            {getFormatBadge(output.format)}
                          </div>

                          <span className="text-[10px] text-teal-400/80 font-mono">
                            {output.enabled
                              ? language === 'bn' ? 'পরিকল্পিত' : 'Planned'
                              : language === 'bn' ? 'নিষ্ক্রিয়' : 'Disabled'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {language === 'bn' ? output.descriptionBn : output.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Validation Error Banner */}
              {validationError && (
                <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Bottom Action Footer */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {language === 'bn'
                      ? 'ধাপ ৩B: দৃশ্যমান কার্যপরিকল্পনা প্রস্তুত করতে বাটন চাপুন।'
                      : 'Step 3B: Click to generate visible multi-step execution plan.'}
                  </span>
                </div>

                {/* “Create Office Pack” button (Generates visible workflow plan) */}
                <button
                  onClick={handleGeneratePlan}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer self-stretch sm:self-auto"
                >
                  <Package className="w-4 h-4" />
                  <span>
                    {language === 'bn'
                      ? 'Create Office Pack (পরিকল্পনা তৈরি করুন)'
                      : 'Create Office Pack'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: VISIBLE WORKFLOW PLAN */}
      {viewMode === 'plan' && workflowPlan && (
        batchItems.length > 1 ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Batch Header Card */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleBackToEdit}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{language === 'bn' ? 'Back/Edit' : 'Back/Edit'}</span>
                    </button>

                    <span className="px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-semibold">
                      {language === 'bn' ? workflowPlan.packNameBn : workflowPlan.packName}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/30 text-xs font-mono font-bold">
                      {language === 'bn' ? `ব্যাচ: ${batchItems.length}টি ফাইল` : `Batch: ${batchItems.length} files`}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 pt-1">
                    <Files className="w-5 h-5 text-teal-400" />
                    <span>
                      {language === 'bn'
                        ? 'অফিস প্যাক ব্যাচ প্রসেসিং (Office Pack Batch Processing)'
                        : 'Office Pack Batch Orchestration'}
                    </span>
                  </h2>
                </div>

                {/* Batch Download Button if any files completed */}
                {batchItems.some((i) => (i.generatedFiles || []).filter((f) => !f.qualityReport || f.qualityReport.status !== 'FAILED').length > 0) && (
                  <button
                    type="button"
                    onClick={handleDownloadBatchZip}
                    disabled={isBatchZipping}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >

                    {isBatchZipping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>{language === 'bn' ? 'ব্যাচ ZIP তৈরি হচ্ছে...' : 'Bundling Batch ZIP...'}</span>
                      </>
                    ) : (
                      <>
                        <FolderArchive className="w-4 h-4 text-slate-950" />
                        <span>{language === 'bn' ? 'Download Batch (সম্পূর্ণ ব্যাচ ZIP)' : 'Download Batch'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Progress and Orchestration Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>
                      {language === 'bn'
                        ? `অগ্রগতি: ${batchItems.length}টির মধ্যে ${batchItems.filter((i) => ['COMPLETED', 'PARTIAL', 'NOT SUPPORTED', 'FAILED', 'CANCELLED'].includes(i.status)).length}টি ফাইল সম্পন্ন`
                        : `Progress: ${batchItems.filter((i) => ['COMPLETED', 'PARTIAL', 'NOT SUPPORTED', 'FAILED', 'CANCELLED'].includes(i.status)).length} of ${batchItems.length} files completed`}
                    </span>
                  </span>
                  <span className="font-mono text-slate-400">
                    {Math.round(
                      (batchItems.filter((i) =>
                        ['COMPLETED', 'PARTIAL', 'NOT SUPPORTED', 'FAILED', 'CANCELLED'].includes(i.status)
                      ).length /
                        batchItems.length) *
                        100
                    )}
                    %
                  </span>
                </div>

                {/* Real Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (batchItems.filter((i) =>
                          ['COMPLETED', 'PARTIAL', 'NOT SUPPORTED', 'FAILED', 'CANCELLED'].includes(i.status)
                        ).length /
                          batchItems.length) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Action Controls for Batch */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {!isPlanConfirmed ? (
                  <button
                    onClick={handleConfirmPlan}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>{language === 'bn' ? 'Confirm Batch Plan (পরিকল্পনা নিশ্চিত করুন)' : 'Confirm Batch Plan'}</span>
                  </button>
                ) : (
                  <>
                    {!isBatchProcessing ? (
                      <button
                        onClick={handleStartBatchProcessing}
                        className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg hover:shadow-teal-500/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>{language === 'bn' ? 'Start Batch Processing (ব্যাচ শুরু করুন)' : 'Start Batch Processing'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleCancelBatch}
                        className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <StopCircle className="w-4 h-4" />
                        <span>{language === 'bn' ? 'Cancel Batch (ব্যাচ থামান)' : 'Cancel Batch'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Batch Items List */}
            <div className="space-y-3.5">
              {batchItems.map((item, idx) => {
                const validFiles = (item.generatedFiles || []).filter(
                  (f) => !f.qualityReport || f.qualityReport.status !== 'FAILED'
                );
                const isItemProcessing =
                  item.status === 'EXTRACTING' || item.status === 'GENERATING' || item.status === 'VALIDATING';
                const canRetry =
                  (item.status === 'FAILED' ||
                    item.status === 'PARTIAL' ||
                    item.status === 'CANCELLED' ||
                    item.status === 'NOT SUPPORTED') &&
                  !isBatchProcessing;

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3 transition-all"
                  >
                    {/* Top Row: Status badge, filename, format, size */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-white truncate" title={item.originalFilename}>
                              {item.originalFilename}
                            </p>
                            {item.safeFilename !== item.originalFilename && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({item.safeFilename})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span className="uppercase font-bold text-slate-300">{item.sourceType}</span>
                            {item.file.size > 0 && <span>• {formatFileSize(item.file.size)}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : item.status === 'PARTIAL'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : item.status === 'NOT SUPPORTED'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : item.status === 'FAILED'
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : isItemProcessing
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse'
                              : item.status === 'CANCELLED'
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>

                        {/* Retry Button if applicable */}
                        {canRetry && (
                          <button
                            onClick={() => handleRetryItem(item.id)}
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                            title={language === 'bn' ? 'পুনরায় চেষ্টা করুন' : 'Retry'}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{language === 'bn' ? 'রিট্রাই' : 'Retry'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Output Formats Status Grid */}
                    {item.formatStatuses && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['docx', 'pdf', 'xlsx', 'pptx'] as OutputFormat[]).map((fmt) => {
                          const info = item.formatStatuses?.[fmt];
                          const qStatus = info?.qualityStatus || (info?.status === 'Generated' ? 'VALID' : undefined);
                          return (
                            <div
                              key={fmt}
                              className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                            >
                              <span className="font-mono font-bold uppercase text-slate-300">{fmt}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  qStatus === 'VALID'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : qStatus === 'WARNING'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : qStatus === 'FAILED' || info?.status === 'Failed'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {qStatus || info?.status || 'Not Selected'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Error / Warning Notice */}
                    {item.error && (
                      <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span className="truncate">{item.error}</span>
                      </div>
                    )}

                    {item.warningSummary && (
                      <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span className="truncate">{item.warningSummary}</span>
                      </div>
                    )}

                    {/* Output Actions: Individual Downloads & Per-file Download All */}
                    {validFiles.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {validFiles.map((file) => (
                          <button
                            key={file.filename}
                            type="button"
                            disabled={downloadingFileNames.has(file.filename)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFile(file);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-teal-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download {file.format.toUpperCase()}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({formatFileSize(file.size)})</span>
                          </button>
                        ))}

                        {validFiles.length >= 2 && (
                          <button
                            type="button"
                            disabled={isDownloadingItemZip === item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadItemZip(item);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Archive className="w-3 h-3 text-slate-950" />
                            <span>Download All (ZIP)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleBackToEdit}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{language === 'bn' ? 'Back/Edit' : 'Back/Edit'}</span>
              </button>

              {batchItems.some((i) => (i.generatedFiles || []).filter((f) => !f.qualityReport || f.qualityReport.status !== 'FAILED').length > 0) && (
                <button
                  type="button"
                  onClick={handleDownloadBatchZip}
                  disabled={isBatchZipping}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FolderArchive className="w-4 h-4 text-slate-950" />
                  <span>{language === 'bn' ? 'Download Batch (ZIP)' : 'Download Batch'}</span>
                </button>
              )}

            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Plan Header Card */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleBackToEdit}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{language === 'bn' ? 'Back/Edit' : 'Back/Edit'}</span>
                  </button>

                  <span className="px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-semibold">
                    {language === 'bn' ? workflowPlan.packNameBn : workflowPlan.packName}
                  </span>

                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono">
                    {workflowPlan.totalSteps} {language === 'bn' ? 'টি ধাপ' : 'Steps Total'}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 pt-1">
                  <ListOrdered className="w-5 h-5 text-teal-400" />
                  <span>
                    {language === 'bn'
                      ? 'অফিস প্যাক কার্যপরিকল্পনা (Office Pack Workflow Plan)'
                      : 'Office Pack Workflow Plan'}
                  </span>
                </h2>
              </div>

              {/* Source file info snippet */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-right space-y-1">
                <div className="text-[11px] text-slate-400">
                  {language === 'bn' ? 'নির্বাচিত উৎস ফাইল:' : 'Selected Source File:'}
                </div>
                <div className="text-xs font-bold text-white flex items-center justify-end gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span className="truncate max-w-[220px]" title={workflowPlan.sourceFileName}>
                    {workflowPlan.sourceFileName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({formatFileSize(workflowPlan.sourceFileSize)})
                  </span>
                </div>
                {sourceValidation && (
                  <div className="flex items-center justify-end gap-2 text-[10px]">
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        sourceValidation.status === 'READY'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : sourceValidation.status === 'EMPTY'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {sourceValidation.status === 'READY'
                        ? 'Source Ready'
                        : sourceValidation.status === 'EMPTY'
                        ? 'Empty Source'
                        : 'NOT SUPPORTED'}
                    </span>
                    <span className="text-slate-400 font-mono uppercase">
                      {sourceValidation.normalized?.sourceType || 'DOC'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Consent requirement notice banner before cloud steps */}
            {workflowPlan.hasCloudAiStep && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">
                    {language === 'bn'
                      ? 'AI সম্মতি আবশ্যক (AI Consent Requirement)'
                      : 'AI Consent Required Prior to Cloud Execution'}
                  </p>
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    {language === 'bn'
                      ? 'এই কার্যপরিকল্পনায় একটি ক্লাউড AI ধাপ অন্তর্ভুক্ত রয়েছে। ক্লাউড মডেল ব্যবহারের পূর্বে ব্যবহারকারীর সুস্পষ্ট সম্মতি আবশ্যক। অন্যথায় ডেটা সম্পূর্ণ লোকাল ব্রাউজারে সংরক্ষিত থাকবে।'
                      : 'This plan includes a Cloud AI enrichment step. Explicit user consent is mandatory prior to sending document extracts to cloud models. All other steps execute inside your secure local sandbox.'}
                  </p>
                </div>
              </div>
            )}

            {/* Unsupported source file warning */}
            {!workflowPlan.isSourceSupported && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <div>
                  <span className="font-bold uppercase tracking-wider mr-1">
                    NOT SUPPORTED:
                  </span>
                  <span>{workflowPlan.unsupportedReason}</span>
                </div>
              </div>
            )}
          </div>

          {/* Planned Steps List */}
          <div className="space-y-3">
            {workflowPlan.steps.map((step) => {
              const isLocal = step.tier === 'LOCAL';
              const isReady = step.status === 'READY';
              const isPlanned = step.status === 'PLANNED';
              const isUnsupported = step.status === 'NOT SUPPORTED';

              return (
                <div
                  key={step.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isUnsupported
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : isReady
                      ? 'bg-slate-900/90 border-slate-700/80 shadow-sm'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 text-teal-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {step.stepNumber}
                      </span>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white">
                            {step.title}
                          </h3>
                          <span className="text-xs text-slate-400">
                            • {step.titleBn}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                          {language === 'bn' ? step.descriptionBn : step.description}
                        </p>
                      </div>
                    </div>

                    {/* Tier and Status Badges */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                      {/* LOCAL / CLOUD AI Tier Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
                          isLocal
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                            : 'bg-sky-950/40 text-sky-300 border-sky-500/30'
                        }`}
                      >
                        {step.tier}
                      </span>

                      {/* AI Consent requirement badge */}
                      {step.requiresAiConsent && (
                        <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-amber-400" />
                          <span>
                            {language === 'bn' ? 'সম্মতি আবশ্যক' : 'Consent Required'}
                          </span>
                        </span>
                      )}

                      {/* Ready / Planned / NOT SUPPORTED Status */}
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${
                          isUnsupported
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                            : isReady
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confirmed Plan Feedback Banner */}
          {isPlanConfirmed && (
            <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/50 text-teal-200 text-xs flex items-center gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <div>
                <p className="font-bold text-teal-300">
                  {language === 'bn'
                    ? 'কার্যপরিকল্পনা সফলভাবে নিশ্চিত করা হয়েছে (Plan Confirmed)'
                    : 'Workflow Plan Confirmed by User'}
                </p>
                <p className="text-[11px] text-teal-200/90 mt-0.5">
                  {language === 'bn'
                    ? 'সকল নির্ধারিত ধাপ সঠিকভাবে প্রস্তুত রয়েছে। এবার নিচে বাটন চেপে DOCX ও PDF ফাইল তৈরি করুন।'
                    : 'All planned steps are coordinated and staged. Click below to generate genuine DOCX and PDF deliverables.'}
                </p>
              </div>
            </div>
          )}

          {/* NOT SUPPORTED or Error Notice */}
          {generationNotice && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold text-rose-200 uppercase tracking-wide">
                  {generationNotice.includes('NOT SUPPORTED') ? 'NOT SUPPORTED' : 'Error'}
                </p>
                <p className="text-[11px] text-rose-300/90 mt-0.5">{generationNotice}</p>
              </div>
            </div>
          )}

          {/* Generated Deliverables Section with Download Buttons & Download All */}
          {generatedFiles.length > 0 && (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/95 border border-teal-500/40 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span>
                      {language === 'bn'
                        ? `প্রস্তুতকৃত অফিস ডকুমেন্টস (${generatedFiles.length}টি)`
                        : `Generated Deliverables (${generatedFiles.length})`}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'ব্রাউজার স্যান্ডবক্সে নির্বাচিত সকল অফিস ফাইল তৈরি সম্পন্ন হয়েছে।'
                      : 'Genuine deliverables generated cleanly in your local browser sandbox.'}
                  </p>
                </div>

                {/* "Download All" button only when 2 or more outputs were generated */}
                {generatedFiles.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleDownloadAllZip}
                    disabled={isZipping}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >

                    {isZipping ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{language === 'bn' ? 'ZIP তৈরি হচ্ছে...' : 'Bundling ZIP...'}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          {language === 'bn' ? 'Download All (সকল ফাইল ZIP)' : 'Download All (ZIP)'}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Partial Success Notice if applicable */}
              {generationResult?.isPartialSuccess && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {language === 'bn'
                      ? 'আংশিক সম্পন্ন: কিছু ফরম্যাট সফলভাবে তৈরি হয়েছে, কিন্তু কয়েকটি ব্যর্থ হয়েছে। সফল ফাইলগুলো ডাউনলোডযোগ্য।'
                      : 'Partial Success: Some formats were generated successfully while others failed. Successful deliverables are ready for download.'}
                  </span>
                </div>
              )}

              {/* Per-Format Output Status Grid & Quality Report */}
              {generationResult && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {language === 'bn' ? 'আউটপুট ও মান নিয়ন্ত্রণ (Output & Quality):' : 'Output & Quality Validation:'}
                    </span>
                    {generationResult.isPartialSuccess && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {language === 'bn' ? 'আংশিক সম্পন্ন (Partial Success)' : 'Partial Success'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {(['docx', 'pdf', 'xlsx', 'pptx'] as OutputFormat[]).map((fmt) => {
                      const info = generationResult.formatStatuses?.[fmt];
                      const qStatus = info?.qualityStatus || (info?.status === 'Generated' ? 'VALID' : undefined);
                      const qReport = info?.qualityReport;
                      const hasIssues = qReport && qReport.issues.length > 0;
                      const isExpanded = activeIssueFormat === fmt;

                      return (
                        <div
                          key={fmt}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between gap-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-mono font-bold uppercase text-slate-200">
                              {fmt}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {qStatus ? (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    qStatus === 'VALID'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : qStatus === 'WARNING'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}
                                >
                                  {qStatus}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                  {info?.status || 'Not Selected'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Issues button / toggle if warnings or failures exist */}
                          {hasIssues && (
                            <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400">
                                {qReport.issues.length} {language === 'bn' ? 'টি সমস্যা' : 'issue(s)'}
                              </span>
                              <button
                                onClick={() => setActiveIssueFormat(isExpanded ? null : fmt)}
                                className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-0.5 font-semibold cursor-pointer"
                              >
                                <span>{isExpanded ? (language === 'bn' ? 'লুকান' : 'Hide') : (language === 'bn' ? 'বিস্তারিত' : 'View')}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>
                          )}

                          {/* Expanded issues list */}
                          {isExpanded && hasIssues && (
                            <div className="mt-1 p-2 rounded bg-slate-950 border border-slate-800 text-[10px] space-y-1">
                              {qReport.issues.map((iss, iIdx) => (
                                <div
                                  key={iIdx}
                                  className={`flex items-start gap-1 ${
                                    iss.severity === 'FAILED' ? 'text-rose-300' : 'text-amber-300'
                                  }`}
                                >
                                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                  <span>{iss.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Individual File Download Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {generatedFiles.map((file) => (
                  <div
                    key={file.filename}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
                        {file.format === 'docx' ? (
                          <FileText className="w-5 h-5 text-blue-400" />
                        ) : file.format === 'pdf' ? (
                          <FileText className="w-5 h-5 text-rose-400" />
                        ) : file.format === 'xlsx' ? (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Presentation className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          {getFormatBadge(file.format)}
                          {file.qualityReport && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                file.qualityReport.status === 'VALID'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : file.qualityReport.status === 'WARNING'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {file.qualityReport.status}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <p
                          className="text-xs font-bold text-white truncate"
                          title={file.filename}
                        >
                          {file.filename}
                        </p>
                      </div>
                    </div>

                    {file.qualityReport?.status === 'FAILED' ? (
                      <div className="w-full py-2 px-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>{language === 'bn' ? 'ডাউনলোড অনুপলব্ধ (Failed Quality Check)' : 'Download Unavailable (Quality Check Failed)'}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={downloadingFileNames.has(file.filename)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFile(file);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          {language === 'bn'
                            ? `${file.format.toUpperCase()} ডাউনলোড করুন (Download)`
                            : `Download ${file.format.toUpperCase()}`}
                        </span>
                      </button>
                    )}

                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons: Confirm Plan, Generate, and Back/Edit */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={handleBackToEdit}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>
                {language === 'bn' ? 'Back/Edit (পুনরায় সম্পাদনা)' : 'Back/Edit'}
              </span>
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
              <button
                onClick={handleConfirmPlan}
                disabled={isPlanConfirmed || !workflowPlan.isSourceSupported}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
              >
                {isPlanConfirmed ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-teal-400" />
                    <span>
                      {language === 'bn' ? 'Plan Confirmed (নিশ্চিত হয়েছে)' : 'Plan Confirmed'}
                    </span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {language === 'bn' ? 'Confirm Plan (পরিকল্পনা নিশ্চিত করুন)' : 'Confirm Plan'}
                    </span>
                  </>
                )}
              </button>

              {isPlanConfirmed && (
                <button
                  onClick={handleGenerateDeliverables}
                  disabled={isGenerating || !workflowPlan.isSourceSupported}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>
                        {language === 'bn'
                          ? 'ডকুমেন্ট তৈরি হচ্ছে...'
                          : 'Generating Office Pack...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>
                        {language === 'bn'
                          ? 'Generate Office Pack (ফাইলসমূহ তৈরি করুন)'
                          : 'Generate Office Pack'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
        )
      )}
    </div>
  );
};

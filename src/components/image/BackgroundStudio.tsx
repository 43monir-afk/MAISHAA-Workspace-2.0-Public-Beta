import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  BgImageItem,
  BgDesignSettings,
  BgRemovalOptions,
  CropPresetType,
  ShadowType,
  ProductPresetType,
  ProviderStatus,
} from '../../types/bgRemover';
import {
  validateImageFile,
  checkProviderStatus,
  removeBackground,
  applyManualBrushStroke,
  compositeFinalImage,
  generateAiBackground,
  exportBatchZip,
  loadImageFromFile,
} from '../../services/bgRemoverService';
import { downloadFileOnce } from '../../utils/downloadHelper';
import { formatFileSize, generateSafeOutputFilename } from '../../utils/fileDetection';
import { ToolSeoGuide } from '../common/ToolSeoGuide';
import { AdSlot } from '../common/AdSlot';
import {
  Upload,
  Scissors,
  Download,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Layers,
  Sparkles,
  Eraser,
  Undo2,
  Redo2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  FolderArchive,
  Palette,
  SunMedium,
  Grid,
  ShieldCheck,
  Cpu,
  ChevronRight,
  Info,
  Check,
  Crop,
  ArrowRightLeft,
  X,
  FileImage,
} from 'lucide-react';

const DEFAULT_SETTINGS: BgDesignSettings = {
  backgroundType: 'transparent',
  solidColor: '#ffffff',
  gradientPreset: 'studio_blue',
  blurLevel: 16,
  customBgUrl: null,
  customBgBlob: null,
  presetName: 'luxury_marble',
  aiPrompt: 'luxury marble podium with warm spotlight and soft shadows',
  aiGeneratedBgUrl: null,

  shadowType: 'none',
  shadowOpacity: 0.35,
  shadowBlur: 20,
  shadowDistance: 15,
  shadowAngle: 90,

  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  sharpness: 0,

  productPreset: 'none',
  cropPreset: 'original',
  alignment: 'center',
  paddingPercent: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  watermark: false,

  exportFormat: 'image/png',
  exportQuality: 92,
  exportFilenamePrefix: 'bg_removed',
};

export const BackgroundStudio: React.FC = () => {
  const { t, language, setActiveModule, setIsAiDrawerOpen, showNotification } = useWorkspace();

  // Images state
  const [items, setItems] = useState<BgImageItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Settings & options state
  const [settings, setSettings] = useState<BgDesignSettings>(DEFAULT_SETTINGS);
  const [removalOptions, setRemovalOptions] = useState<BgRemovalOptions>({
    tolerance: 38,
    featherRadius: 2,
    smartAlpha: true,
    provider: 'local',
  });

  // Active UI Controls
  const [activeTab, setActiveTab] = useState<'removal' | 'background' | 'product' | 'shadow' | 'export'>('removal');
  const [viewMode, setViewMode] = useState<'slider' | 'side_by_side' | 'result' | 'original'>('slider');
  const [backdrop, setBackdrop] = useState<'checkerboard' | 'white' | 'dark'>('checkerboard');
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0-100

  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Manual Brush Editor State
  const [brushMode, setBrushMode] = useState<'none' | 'erase' | 'restore'>('none');
  const [brushRadius, setBrushRadius] = useState<number>(24);
  const [brushHardness, setBrushHardness] = useState<number>(0.6);
  const [isBrushing, setIsBrushing] = useState(false);
  const brushStrokeRef = useRef<Array<{ x: number; y: number }>>([]);

  // Processing & Download Guard
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [cancelController, setCancelController] = useState<AbortController | null>(null);

  // Provider Status
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    removeBgAvailable: false,
    geminiAvailable: false,
    activeProvider: 'local',
    message: 'Local High-Performance Processor Active',
  });

  // Canvas Viewport Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sliderDividerRef = useRef<HTMLDivElement>(null);

  // Load provider status on mount
  useEffect(() => {
    checkProviderStatus().then((status) => {
      setProviderStatus(status);
      if (status.removeBgAvailable) {
        setRemovalOptions((prev) => ({ ...prev, provider: 'cloud_removebg' }));
      }
    });
  }, []);

  // Update browser URL to /image-studio/background-remover
  useEffect(() => {
    if (window.location.pathname !== '/image-studio/background-remover') {
      window.history.pushState({ module: 'bg_remover' }, '', '/image-studio/background-remover');
    }
  }, []);

  // Sync selected item
  const activeItem = items.find((i) => i.id === selectedItemId) || items[0] || null;

  // Clipboard Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;
      const pastedFiles: File[] = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) pastedFiles.push(f);
        }
      }
      if (pastedFiles.length > 0) {
        handleUploadFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [items]);

  // Handle uploaded files
  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newItems: BgImageItem[] = [];
    for (const f of fileArray) {
      // Prevent duplicates
      const isDuplicate = items.some((item) => item.name === f.name && item.size === f.size);
      if (isDuplicate) {
        showNotification(`'${f.name}' is already uploaded.`);
        continue;
      }

      const val = await validateImageFile(f);
      if (!val.isValid || !val.dimensions || !val.imgElement) {
        showNotification(val.error || `Invalid image: ${f.name}`);
        continue;
      }

      const id = `bg_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const url = URL.createObjectURL(f);

      newItems.push({
        id,
        file: f,
        name: f.name,
        size: f.size,
        dimensions: val.dimensions,
        originalUrl: url,
        originalImage: val.imgElement,
        alphaMask: null,
        maskCanvas: null,
        cutoutCanvas: null,
        resultBlob: null,
        resultUrl: null,
        status: 'IDLE',
        progress: 0,
        history: [],
        historyIndex: -1,
      });
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      if (!selectedItemId) {
        setSelectedItemId(newItems[0].id);
      }
      showNotification(`${newItems.length} image(s) loaded.`);
    }
  };

  // Run Background Removal for a single item
  const processItemRemoval = async (item: BgImageItem) => {
    if (!item.originalImage) return;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'PROCESSING', progress: 30, errorMessage: undefined } : i))
    );

    try {
      const res = await removeBackground(item.file, item.originalImage, removalOptions);

      // Create pristine snapshot of cutout for brush history
      const ctx = res.cutoutCanvas.getContext('2d');
      const initialSnapshot = ctx ? ctx.getImageData(0, 0, res.cutoutCanvas.width, res.cutoutCanvas.height) : null;

      const resultUrl = URL.createObjectURL(res.blob);

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'SUCCESS',
                progress: 100,
                cutoutCanvas: res.cutoutCanvas,
                maskCanvas: res.maskCanvas,
                alphaMask: res.alphaMask,
                resultBlob: res.blob,
                resultUrl,
                providerUsed: res.providerUsed,
                history: initialSnapshot ? [initialSnapshot] : [],
                historyIndex: 0,
              }
            : i
        )
      );

      showNotification(`Background removed for '${item.name}'`);
    } catch (err: any) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'FAILED', progress: 0, errorMessage: err.message || 'Removal failed.' }
            : i
        )
      );
      showNotification(`Failed to remove background for '${item.name}'`);
    }
  };

  // Process all items in batch
  const processAllBatch = async () => {
    if (isProcessingAll) return;
    setIsProcessingAll(true);
    const controller = new AbortController();
    setCancelController(controller);

    const pending = items.filter((i) => i.status !== 'SUCCESS');
    for (const item of pending) {
      if (controller.signal.aborted) break;
      await processItemRemoval(item);
    }

    setIsProcessingAll(false);
    setCancelController(null);
  };

  // Cancel active batch
  const cancelBatch = () => {
    if (cancelController) {
      cancelController.abort();
      setCancelController(null);
    }
    setIsProcessingAll(false);
    setItems((prev) =>
      prev.map((i) => (i.status === 'PROCESSING' ? { ...i, status: 'CANCELLED', progress: 0 } : i))
    );
    showNotification('Batch processing cancelled.');
  };

  // Single Item Download with double-click guard
  const handleDownloadSingle = async () => {
    if (!activeItem || activeItem.status !== 'SUCCESS' || isDownloading) return;
    setIsDownloading(true);

    try {
      const { blob } = await compositeFinalImage(activeItem, settings);
      const ext = settings.exportFormat === 'image/jpeg' ? 'jpg' : settings.exportFormat === 'image/webp' ? 'webp' : 'png';
      const outFilename = generateSafeOutputFilename(activeItem.name, settings.exportFilenamePrefix || 'bg_removed', ext);

      downloadFileOnce(blob, outFilename);
      showNotification(`Downloaded: ${outFilename}`);
    } catch (err: any) {
      showNotification(err.message || 'Download failed');
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  };

  // Batch ZIP Download with manifest
  const handleDownloadZip = async () => {
    if (isZipping || items.length === 0) return;
    setIsZipping(true);

    try {
      const zipBlob = await exportBatchZip(items, settings, (completed, total) => {
        // progress
      });

      downloadFileOnce(zipBlob, `MAISHAA_BG_Removed_Batch_${Date.now()}.zip`);
      showNotification('Batch ZIP download complete with manifest.json.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to create ZIP');
    } finally {
      setIsZipping(false);
    }
  };

  // AI Background Generation
  const handleGenerateAiBg = async () => {
    if (!settings.aiPrompt.trim() || isAiGenerating) return;
    setIsAiGenerating(true);

    try {
      const imgUrl = await generateAiBackground(settings.aiPrompt);
      setSettings((prev) => ({
        ...prev,
        backgroundType: 'ai_generated',
        aiGeneratedBgUrl: imgUrl,
      }));
      showNotification('AI background generated successfully!');
    } catch (err: any) {
      showNotification(err.message || 'AI generation unavailable.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Manual Brush Canvas event handlers
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (brushMode === 'none' || !activeItem?.cutoutCanvas || !activeItem.originalImage || !activeItem.alphaMask) {
      return;
    }

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = activeItem.cutoutCanvas.width / rect.width;
    const scaleY = activeItem.cutoutCanvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsBrushing(true);
    brushStrokeRef.current = [{ x, y }];
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isBrushing || brushMode === 'none' || !activeItem?.cutoutCanvas || !activeItem.originalImage || !activeItem.alphaMask) {
      return;
    }

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = activeItem.cutoutCanvas.width / rect.width;
    const scaleY = activeItem.cutoutCanvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    brushStrokeRef.current.push({ x, y });

    // Apply incremental stroke
    applyManualBrushStroke(activeItem.cutoutCanvas, activeItem.originalImage, activeItem.alphaMask, {
      type: brushMode,
      points: [{ x, y }],
      radius: brushRadius,
      hardness: brushHardness,
    });

    // Request redraw on active canvas
    renderActiveCanvas();
  };

  const handleCanvasPointerUp = () => {
    if (!isBrushing || !activeItem?.cutoutCanvas) return;
    setIsBrushing(false);

    // Save history snapshot for Undo/Redo
    const ctx = activeItem.cutoutCanvas.getContext('2d');
    if (ctx) {
      const snapshot = ctx.getImageData(0, 0, activeItem.cutoutCanvas.width, activeItem.cutoutCanvas.height);
      const newHistory = activeItem.history.slice(0, activeItem.historyIndex + 1);
      newHistory.push(snapshot);

      setItems((prev) =>
        prev.map((i) =>
          i.id === activeItem.id
            ? { ...i, history: newHistory, historyIndex: newHistory.length - 1 }
            : i
        )
      );
    }
  };

  // Undo manual brush stroke
  const handleUndo = () => {
    if (!activeItem?.cutoutCanvas || activeItem.historyIndex <= 0) return;
    const newIdx = activeItem.historyIndex - 1;
    const snapshot = activeItem.history[newIdx];
    const ctx = activeItem.cutoutCanvas.getContext('2d');
    if (ctx && snapshot) {
      ctx.putImageData(snapshot, 0, 0);
      setItems((prev) =>
        prev.map((i) => (i.id === activeItem.id ? { ...i, historyIndex: newIdx } : i))
      );
      renderActiveCanvas();
    }
  };

  // Redo manual brush stroke
  const handleRedo = () => {
    if (!activeItem?.cutoutCanvas || activeItem.historyIndex >= activeItem.history.length - 1) return;
    const newIdx = activeItem.historyIndex + 1;
    const snapshot = activeItem.history[newIdx];
    const ctx = activeItem.cutoutCanvas.getContext('2d');
    if (ctx && snapshot) {
      ctx.putImageData(snapshot, 0, 0);
      setItems((prev) =>
        prev.map((i) => (i.id === activeItem.id ? { ...i, historyIndex: newIdx } : i))
      );
      renderActiveCanvas();
    }
  };

  // Restore Original (reset cutout to original full image)
  const handleRestoreOriginal = () => {
    if (!activeItem?.cutoutCanvas || !activeItem.originalImage || !activeItem.alphaMask) return;
    const ctx = activeItem.cutoutCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(activeItem.originalImage, 0, 0);
      activeItem.alphaMask.fill(255);
      const snapshot = ctx.getImageData(0, 0, activeItem.cutoutCanvas.width, activeItem.cutoutCanvas.height);
      setItems((prev) =>
        prev.map((i) =>
          i.id === activeItem.id
            ? { ...i, history: [snapshot], historyIndex: 0 }
            : i
        )
      );
      renderActiveCanvas();
      showNotification('Original image restored.');
    }
  };

  // Render composite to preview canvas
  const renderActiveCanvas = useCallback(async () => {
    if (!canvasRef.current || !activeItem) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeItem.status === 'SUCCESS' && activeItem.cutoutCanvas) {
      const { blob } = await compositeFinalImage(activeItem, settings);
      const compImg = await loadImageFromFile(blob);
      canvas.width = compImg.naturalWidth;
      canvas.height = compImg.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(compImg, 0, 0);
    } else if (activeItem.originalImage) {
      canvas.width = activeItem.originalImage.naturalWidth;
      canvas.height = activeItem.originalImage.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(activeItem.originalImage, 0, 0);
    }
  }, [activeItem, settings]);

  useEffect(() => {
    renderActiveCanvas();
  }, [renderActiveCanvas]);

  // Load sample test image
  const loadSampleImage = (type: 'portrait' | 'product') => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (type === 'portrait') {
      // Warm studio background with human silhouette
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, 600, 600);

      // Person head & shoulders
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(300, 240, 110, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(300, 480, 200, 160, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Clean white background with product bottle
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 600, 600);

      // Product container
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(220, 180, 160, 280, 24);
      ctx.fill();

      // Cap
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(260, 130, 80, 50, 8);
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `sample_${type}.png`, { type: 'image/png' });
        handleUploadFiles([file]);
      }
    }, 'image/png');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070e1e] text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800 bg-[#0b1428] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveModule('image')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <FileImage className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.nav.imageStudio}</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-wide text-white flex items-center gap-1.5">
              <Scissors className="w-4 h-4 text-teal-400" />
              <span>{language === 'bn' ? 'ব্যাকগ্রাউন্ড রিমুভ স্টুডিও' : 'BG REMOVE STUDIO'}</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              PRO
            </span>
          </div>
        </div>

        {/* Center / Right Status Badges & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Provider Status Pill */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              providerStatus.removeBgAvailable || providerStatus.geminiAvailable
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{providerStatus.message}</span>
          </div>

          {/* Ask AI Assistant Shortcut */}
          <button
            onClick={() => setIsAiDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-purple-500 hover:to-indigo-500 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      {items.length === 0 ? (
        /* Empty Upload Workspace */
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files);
              }}
              className="relative rounded-3xl border-2 border-dashed border-teal-500/40 hover:border-teal-400 bg-slate-900/60 hover:bg-slate-900/90 p-8 sm:p-12 text-center transition-all duration-200 shadow-2xl flex flex-col items-center group cursor-pointer"
            >
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-sky-500/20 border border-teal-500/30 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform shadow-lg">
                <Scissors className="w-10 h-10 text-teal-400" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
                {language === 'bn' ? 'ছবি ড্র্যাগ ও ড্রপ করুন' : 'Drag & Drop Images Here'}
              </h2>
              <p className="text-sm text-slate-400 mb-6 max-w-md">
                {language === 'bn'
                  ? 'স্বয়ংক্রিয় ব্যাকগ্রাউন্ড অপসারণ, পণ্য ফটো এডিটিং ও এআই ব্যাকগ্রাউন্ড সংযোজন।'
                  : 'Automatic background removal, product photo framing, and AI background synthesis.'}
              </p>

              <button className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all">
                <Upload className="w-4 h-4" />
                <span>{language === 'bn' ? 'ফাইল নির্বাচন করুন' : 'Browse Files'}</span>
              </button>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 border-t border-slate-800/80 pt-6 w-full">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>JPG, PNG, WebP up to 25MB</span>
                </span>
                <span>•</span>
                <span>Paste from clipboard (Ctrl+V)</span>
                <span>•</span>
                <span>Multi-Image Batch Mode</span>
              </div>
            </div>

            {/* Quick Sample Photos */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="text-xs text-slate-500 font-medium">Or test with sample:</span>
              <button
                onClick={() => loadSampleImage('portrait')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700 transition-colors"
              >
                Sample Portrait
              </button>
              <button
                onClick={() => loadSampleImage('product')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700 transition-colors"
              >
                Sample Product
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active Editor Studio */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Main Canvas Viewport Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative bg-[#040814]">
            {/* Viewport Toolbar: View Modes, Zoom, Slider */}
            <div className="h-11 border-b border-slate-800 bg-[#091224] px-3 flex items-center justify-between shrink-0 text-xs z-10">
              {/* Left: View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode('slider')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewMode === 'slider' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Before / After Slider
                </button>
                <button
                  onClick={() => setViewMode('side_by_side')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewMode === 'side_by_side' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  onClick={() => setViewMode('result')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewMode === 'result' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Result Only
                </button>
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewMode === 'original' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Original
                </button>
              </div>

              {/* Center / Right: Backdrop and Zoom */}
              <div className="flex items-center gap-2">
                {/* Backdrop Toggle */}
                <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setBackdrop('checkerboard')}
                    title="Checkerboard Transparent"
                    className={`px-2 py-1 rounded text-[11px] ${backdrop === 'checkerboard' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Checker
                  </button>
                  <button
                    onClick={() => setBackdrop('white')}
                    title="White Background"
                    className={`px-2 py-1 rounded text-[11px] ${backdrop === 'white' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'}`}
                  >
                    White
                  </button>
                  <button
                    onClick={() => setBackdrop('dark')}
                    title="Dark Slate Background"
                    className={`px-2 py-1 rounded text-[11px] ${backdrop === 'dark' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Dark
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.2, z - 0.2))}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono text-[11px] text-slate-300">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setZoomLevel(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    title="Reset to 100%"
                    className="p-1 text-slate-400 hover:text-white border-l border-slate-800 ml-0.5"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Manual Brush Controls (when cutout is available) */}
            {activeItem?.status === 'SUCCESS' && (
              <div className="absolute top-14 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs">
                <button
                  onClick={() => setBrushMode(brushMode === 'erase' ? 'none' : 'erase')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    brushMode === 'erase'
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Erase Cutout</span>
                </button>
                <button
                  onClick={() => setBrushMode(brushMode === 'restore' ? 'none' : 'restore')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    brushMode === 'restore'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Subject</span>
                </button>

                {brushMode !== 'none' && (
                  <div className="flex items-center gap-3 border-l border-slate-700 pl-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-[11px]">Size:</span>
                      <input
                        type="range"
                        min="4"
                        max="80"
                        value={brushRadius}
                        onChange={(e) => setBrushRadius(Number(e.target.value))}
                        className="w-16 accent-teal-400"
                      />
                      <span className="font-mono text-[11px] text-teal-300 w-5">{brushRadius}</span>
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
                      <button
                        onClick={handleUndo}
                        disabled={!activeItem || activeItem.historyIndex <= 0}
                        title="Undo brush stroke"
                        className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleRedo}
                        disabled={!activeItem || activeItem.historyIndex >= activeItem.history.length - 1}
                        title="Redo brush stroke"
                        className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
                      >
                        <Redo2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleRestoreOriginal}
                        title="Reset all cutout edits"
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                      >
                        Reset All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Viewport Canvas Display Area */}
            <div
              ref={containerRef}
              className={`flex-1 flex items-center justify-center overflow-hidden p-6 relative ${
                backdrop === 'checkerboard'
                  ? 'bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-[#070d1d]'
                  : backdrop === 'white'
                  ? 'bg-slate-100'
                  : 'bg-slate-950'
              }`}
            >
              {activeItem && (
                <div
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                  }}
                  className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden border border-slate-700/50"
                >
                  {/* Slider Mode */}
                  {viewMode === 'slider' && activeItem.status === 'SUCCESS' && (
                    <div className="relative overflow-hidden select-none">
                      {/* Processed Result on Bottom */}
                      <canvas
                        ref={canvasRef}
                        onPointerDown={handleCanvasPointerDown}
                        onPointerMove={handleCanvasPointerMove}
                        onPointerUp={handleCanvasPointerUp}
                        className={`block max-h-[70vh] object-contain ${
                          brushMode !== 'none' ? 'cursor-crosshair' : 'cursor-default'
                        }`}
                      />

                      {/* Original Image on Top Clip-path */}
                      {activeItem.originalImage && (
                        <div
                          style={{
                            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                          }}
                          className="absolute inset-0 pointer-events-none"
                        >
                          <img
                            src={activeItem.originalUrl}
                            alt="Original"
                            className="w-full h-full object-contain block max-h-[70vh]"
                          />
                        </div>
                      )}

                      {/* Draggable Divider Bar */}
                      <div
                        style={{ left: `${sliderPosition}%` }}
                        className="absolute inset-y-0 w-0.5 bg-teal-400 cursor-ew-resize z-10 flex items-center justify-center -translate-x-1/2"
                      >
                        <div className="w-7 h-7 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center shadow-lg border border-white/50 text-[10px] font-bold">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Slider Invisible Range input for exact drag control */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sliderPosition}
                        onChange={(e) => setSliderPosition(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                      />
                    </div>
                  )}

                  {/* Side-by-Side Mode */}
                  {viewMode === 'side_by_side' && (
                    <div className="flex items-center gap-4 p-2 bg-slate-900/60 rounded-xl">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] text-slate-400 font-bold mb-1">ORIGINAL</span>
                        <img
                          src={activeItem.originalUrl}
                          alt="Original"
                          className="max-h-[65vh] object-contain rounded border border-slate-800"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] text-teal-400 font-bold mb-1">CUTOUT / RESULT</span>
                        <canvas
                          ref={canvasRef}
                          className="max-h-[65vh] object-contain rounded border border-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  {/* Single View Modes */}
                  {(viewMode === 'result' || (viewMode === 'slider' && activeItem.status !== 'SUCCESS')) && (
                    <canvas
                      ref={canvasRef}
                      onPointerDown={handleCanvasPointerDown}
                      onPointerMove={handleCanvasPointerMove}
                      onPointerUp={handleCanvasPointerUp}
                      className={`block max-h-[70vh] object-contain ${
                        brushMode !== 'none' ? 'cursor-crosshair' : 'cursor-default'
                      }`}
                    />
                  )}

                  {viewMode === 'original' && (
                    <img
                      src={activeItem.originalUrl}
                      alt="Original"
                      className="block max-h-[70vh] object-contain"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Bottom Multi-Image Batch Strip */}
            <div className="h-20 border-t border-slate-800 bg-[#091224] px-4 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3 overflow-x-auto py-2 no-scrollbar max-w-2xl">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`relative w-14 h-14 rounded-xl border-2 shrink-0 cursor-pointer overflow-hidden transition-all group ${
                      selectedItemId === item.id
                        ? 'border-teal-400 ring-2 ring-teal-400/20 scale-105'
                        : 'border-slate-700 hover:border-slate-500 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={item.originalUrl} alt={item.name} className="w-full h-full object-cover" />

                    {/* Status Pill Indicator */}
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 py-0.5 text-center text-[9px] font-bold">
                      {item.status === 'SUCCESS' && <span className="text-emerald-400">DONE</span>}
                      {item.status === 'PROCESSING' && <span className="text-amber-400 animate-pulse">RUN</span>}
                      {item.status === 'FAILED' && <span className="text-rose-400">ERR</span>}
                      {item.status === 'IDLE' && <span className="text-slate-400">READY</span>}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItems((prev) => prev.filter((i) => i.id !== item.id));
                        if (selectedItemId === item.id) {
                          const remaining = items.filter((i) => i.id !== item.id);
                          setSelectedItemId(remaining[0]?.id || null);
                        }
                      }}
                      className="absolute top-1 right-1 p-0.5 rounded bg-slate-900/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add more files button */}
                <label className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-400 flex flex-col items-center justify-center shrink-0 cursor-pointer text-slate-400 hover:text-teal-400 transition-colors">
                  <Plus className="w-5 h-5" />
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Batch Actions Right Side */}
              <div className="flex items-center gap-2">
                {isProcessingAll ? (
                  <button
                    onClick={cancelBatch}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Batch</span>
                  </button>
                ) : (
                  <button
                    onClick={processAllBatch}
                    disabled={items.length === 0}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Process All ({items.length})</span>
                  </button>
                )}

                <button
                  onClick={handleDownloadZip}
                  disabled={isZipping || !items.some((i) => i.status === 'SUCCESS')}
                  className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  {isZipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderArchive className="w-3.5 h-3.5" />}
                  <span>Download ZIP</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Controls Panel (Tabs for Removal, Backgrounds, Framing, Shadows, Export) */}
          <div className="w-full md:w-80 lg:w-96 border-l border-slate-800 bg-[#091224] flex flex-col shrink-0 overflow-hidden">
            {/* Control Tabs */}
            <div className="h-12 border-b border-slate-800 bg-[#070e1e] flex items-center px-1 overflow-x-auto no-scrollbar shrink-0">
              <button
                onClick={() => setActiveTab('removal')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeTab === 'removal' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Removal</span>
              </button>
              <button
                onClick={() => setActiveTab('background')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeTab === 'background' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Background</span>
              </button>
              <button
                onClick={() => setActiveTab('product')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeTab === 'product' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Framing</span>
              </button>
              <button
                onClick={() => setActiveTab('shadow')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeTab === 'shadow' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <SunMedium className="w-3.5 h-3.5" />
                <span>Shadows</span>
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeTab === 'export' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

            {/* Controls Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
              {/* TAB 1: REMOVAL */}
              {activeTab === 'removal' && (
                <div className="space-y-4">
                  {/* Primary One-Click Action */}
                  <button
                    onClick={() => activeItem && processItemRemoval(activeItem)}
                    disabled={!activeItem || activeItem.status === 'PROCESSING'}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {activeItem?.status === 'PROCESSING' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Background...</span>
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4" />
                        <span>REMOVE BACKGROUND</span>
                      </>
                    )}
                  </button>

                  {/* Provider Selector */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Segmentation Provider
                    </label>
                    <select
                      value={removalOptions.provider}
                      onChange={(e) =>
                        setRemovalOptions((prev) => ({
                          ...prev,
                          provider: e.target.value as any,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-teal-500"
                    >
                      <option value="local">Local — simple backgrounds (Privacy Guaranteed)</option>
                      {providerStatus.removeBgAvailable && <option value="cloud_removebg">remove.bg Cloud AI (Connected)</option>}
                      {providerStatus.geminiAvailable && <option value="cloud_gemini">Google Gemini Vision AI (Connected)</option>}
                    </select>
                    <p className="text-[10px] text-slate-500">
                      Color-based local removal preserves complete privacy and works offline.
                    </p>
                  </div>

                  {/* Sliders: Tolerance, Feather, Smart Alpha */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-300">Color Tolerance</span>
                        <span className="font-mono text-teal-400 font-bold">{removalOptions.tolerance}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={removalOptions.tolerance}
                        onChange={(e) =>
                          setRemovalOptions((prev) => ({ ...prev, tolerance: Number(e.target.value) }))
                        }
                        className="w-full accent-teal-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-300">Edge Feathering</span>
                        <span className="font-mono text-teal-400 font-bold">{removalOptions.featherRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="8"
                        value={removalOptions.featherRadius}
                        onChange={(e) =>
                          setRemovalOptions((prev) => ({ ...prev, featherRadius: Number(e.target.value) }))
                        }
                        className="w-full accent-teal-400"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <div>
                        <span className="font-semibold text-slate-300 block">Smart Alpha Matting</span>
                        <span className="text-[10px] text-slate-500">Prevents interior holes in subject</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={removalOptions.smartAlpha}
                        onChange={(e) =>
                          setRemovalOptions((prev) => ({ ...prev, smartAlpha: e.target.checked }))
                        }
                        className="w-4 h-4 rounded accent-teal-400"
                      />
                    </div>
                  </div>

                  {/* Current Image Details */}
                  {activeItem && (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Filename:</span>
                        <span className="font-mono text-slate-200 truncate max-w-[150px]">{activeItem.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dimensions:</span>
                        <span className="font-mono text-slate-200">
                          {activeItem.dimensions.width} × {activeItem.dimensions.height} px
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>File Size:</span>
                        <span className="font-mono text-slate-200">{formatFileSize(activeItem.size)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BACKGROUNDS */}
              {activeTab === 'background' && (
                <div className="space-y-4">
                  {/* Background Type Selector */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-900/70 p-1 rounded-xl border border-slate-800">
                    {[
                      { id: 'transparent', label: 'Transparent' },
                      { id: 'color', label: 'Solid Color' },
                      { id: 'gradient', label: 'Gradient' },
                      { id: 'blur', label: 'Blur Original' },
                      { id: 'preset', label: 'Studio Presets' },
                      { id: 'ai_generated', label: 'AI Generated' },
                    ].map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => setSettings((s) => ({ ...s, backgroundType: bg.id as any }))}
                        className={`py-1.5 px-2 rounded-lg text-center font-bold text-[11px] transition-all ${
                          settings.backgroundType === bg.id
                            ? 'bg-teal-500 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>

                  {/* Solid Color Options */}
                  {settings.backgroundType === 'color' && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-3">
                      <span className="font-bold text-slate-300 block">Preset Palette</span>
                      <div className="flex flex-wrap gap-2">
                        {['#ffffff', '#000000', '#f1f5f9', '#1e293b', '#2563eb', '#10b981', '#f59e0b', '#ec4899'].map((c) => (
                          <button
                            key={c}
                            onClick={() => setSettings((s) => ({ ...s, solidColor: c }))}
                            style={{ backgroundColor: c }}
                            className={`w-7 h-7 rounded-lg border transition-transform ${
                              settings.solidColor === c ? 'scale-110 border-teal-400 ring-2 ring-teal-400/30' : 'border-slate-700'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        <span className="text-slate-400">Custom HEX:</span>
                        <input
                          type="color"
                          value={settings.solidColor}
                          onChange={(e) => setSettings((s) => ({ ...s, solidColor: e.target.value }))}
                          className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.solidColor}
                          onChange={(e) => setSettings((s) => ({ ...s, solidColor: e.target.value }))}
                          className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 font-mono text-slate-200"
                        />
                      </div>
                    </div>
                  )}

                  {/* Gradient Presets */}
                  {settings.backgroundType === 'gradient' && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                      <span className="font-bold text-slate-300 block">Gradient Presets</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'studio_blue', label: 'Studio Navy', grad: 'from-blue-900 to-sky-600' },
                          { id: 'sunset', label: 'Warm Sunset', grad: 'from-orange-500 to-pink-500' },
                          { id: 'mint', label: 'Emerald Mint', grad: 'from-teal-800 to-emerald-500' },
                          { id: 'cyber', label: 'Cyber Purple', grad: 'from-purple-900 to-cyan-500' },
                          { id: 'warm_glow', label: 'Soft Glow', grad: 'from-orange-100 to-amber-200' },
                          { id: 'neutral', label: 'Neutral Studio', grad: 'from-slate-700 to-slate-900' },
                        ].map((g) => (
                          <button
                            key={g.id}
                            onClick={() => setSettings((s) => ({ ...s, gradientPreset: g.id }))}
                            className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 ${
                              settings.gradientPreset === g.id
                                ? 'border-teal-400 bg-slate-800'
                                : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${g.grad}`} />
                            <span className="font-semibold text-[11px] text-slate-200">{g.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blur Original Background */}
                  {settings.backgroundType === 'blur' && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-300">Background Blur Depth</span>
                        <span className="font-mono text-teal-400 font-bold">{settings.blurLevel}px</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="40"
                        value={settings.blurLevel}
                        onChange={(e) => setSettings((s) => ({ ...s, blurLevel: Number(e.target.value) }))}
                        className="w-full accent-teal-400"
                      />
                    </div>
                  )}

                  {/* Built-in Studio Presets */}
                  {settings.backgroundType === 'preset' && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                      <span className="font-bold text-slate-300 block">Commercial Studio Environments</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'luxury_marble', label: 'Luxury Marble' },
                          { id: 'product_podium', label: 'Product Podium' },
                          { id: 'modern_office', label: 'Modern Office' },
                          { id: 'clean_gray', label: 'Clean Studio' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setSettings((s) => ({ ...s, presetName: p.id }))}
                            className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                              settings.presetName === p.id
                                ? 'border-teal-400 bg-teal-500/10 text-teal-300'
                                : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Generated Background */}
                  {settings.backgroundType === 'ai_generated' && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-3">
                      <div className="flex items-center gap-1.5 text-teal-300 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Studio Backdrop Synthesis</span>
                      </div>

                      <textarea
                        rows={3}
                        value={settings.aiPrompt}
                        onChange={(e) => setSettings((s) => ({ ...s, aiPrompt: e.target.value }))}
                        placeholder="Describe environment e.g. luxury marble podium with morning sunlight..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-teal-500 resize-none"
                      />

                      {/* Suggested prompts */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400">Suggested:</span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            'Minimalist wooden table with soft shadow',
                            'Modern sleek tech workstation bokeh',
                            'Tropical palm leaves sunlit background',
                          ].map((sPrompt) => (
                            <button
                              key={sPrompt}
                              onClick={() => setSettings((s) => ({ ...s, aiPrompt: sPrompt }))}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 truncate max-w-[200px]"
                            >
                              {sPrompt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateAiBg}
                        disabled={isAiGenerating || !settings.aiPrompt.trim()}
                        className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all disabled:opacity-40"
                      >
                        {isAiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>Generate Backdrop</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PRODUCT & FRAMING */}
              {activeTab === 'product' && (
                <div className="space-y-4">
                  {/* Commercial Presets */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                    <span className="font-bold text-slate-300 block">E-Commerce & Product Presets</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          id: 'white_product',
                          label: 'White Product',
                          desc: 'Amazon / eBay 1:1 Clean',
                          action: () =>
                            setSettings((s) => ({
                              ...s,
                              backgroundType: 'color',
                              solidColor: '#ffffff',
                              cropPreset: '1_1',
                              paddingPercent: 12,
                              shadowType: 'soft',
                            })),
                        },
                        {
                          id: 'transparent_product',
                          label: 'Transparent Cutout',
                          desc: 'PNG with padding',
                          action: () =>
                            setSettings((s) => ({
                              ...s,
                              backgroundType: 'transparent',
                              cropPreset: 'auto_subject',
                              paddingPercent: 8,
                            })),
                        },
                        {
                          id: 'catalog',
                          label: 'Marketplace Catalog',
                          desc: 'Centered with podium',
                          action: () =>
                            setSettings((s) => ({
                              ...s,
                              backgroundType: 'preset',
                              presetName: 'product_podium',
                              cropPreset: '1_1',
                              paddingPercent: 15,
                              shadowType: 'floating',
                            })),
                        },
                        {
                          id: 'marketplace',
                          label: 'Social Showcase',
                          desc: '1200x630 Facebook',
                          action: () =>
                            setSettings((s) => ({
                              ...s,
                              backgroundType: 'gradient',
                              gradientPreset: 'studio_blue',
                              cropPreset: 'fb_post',
                              paddingPercent: 10,
                              shadowType: 'studio',
                            })),
                        },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={preset.action}
                          className="p-2.5 rounded-xl border border-slate-800 hover:border-teal-500 bg-slate-900/60 hover:bg-slate-800/80 text-left transition-all group"
                        >
                          <span className="font-bold text-xs text-white group-hover:text-teal-300 block">
                            {preset.label}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{preset.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crop & Aspect Ratio Presets */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                    <span className="font-bold text-slate-300 block">Crop & Aspect Ratio</span>
                    <select
                      value={settings.cropPreset}
                      onChange={(e) => setSettings((s) => ({ ...s, cropPreset: e.target.value as CropPresetType }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-teal-500"
                    >
                      <option value="original">Original Aspect Ratio</option>
                      <option value="auto_subject">Auto-Crop Tight to Subject</option>
                      <option value="1_1">1:1 Square (1080 × 1080)</option>
                      <option value="4_3">4:3 Standard</option>
                      <option value="16_9">16:9 Landscape</option>
                      <option value="9_16">9:16 Portrait</option>
                      <option value="fb_post">Facebook Post (1200 × 630)</option>
                      <option value="ig_story">Instagram Story / Reel (1080 × 1920)</option>
                      <option value="yt_thumb">YouTube Thumbnail (1280 × 720)</option>
                      <option value="web_banner">Website Banner (1200 × 400)</option>
                      <option value="avatar">Profile Avatar (600 × 600)</option>
                    </select>
                  </div>

                  {/* Alignment & Padding */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-3">
                    <div>
                      <span className="font-bold text-slate-300 block mb-1">Subject Alignment</span>
                      <div className="grid grid-cols-5 gap-1">
                        {(['left', 'center', 'right', 'top', 'bottom'] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => setSettings((s) => ({ ...s, alignment: align }))}
                            className={`py-1 rounded font-bold capitalize text-[11px] transition-all ${
                              settings.alignment === align
                                ? 'bg-teal-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-300">Safe Padding / Margins</span>
                        <span className="font-mono text-teal-400 font-bold">{settings.paddingPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="40"
                        value={settings.paddingPercent}
                        onChange={(e) => setSettings((s) => ({ ...s, paddingPercent: Number(e.target.value) }))}
                        className="w-full accent-teal-400"
                      />
                    </div>

                    {/* Rotation and Flip */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setSettings((s) => ({ ...s, rotation: ((s.rotation + 90) % 360) }))
                          }
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                          title="Rotate 90° Clockwise"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>{settings.rotation}°</span>
                        </button>
                        <button
                          onClick={() => setSettings((s) => ({ ...s, flipH: !s.flipH }))}
                          className={`p-1.5 rounded-lg border flex items-center gap-1 ${
                            settings.flipH ? 'border-teal-400 bg-teal-500/20 text-teal-300' : 'border-slate-700 bg-slate-800 text-slate-300'
                          }`}
                          title="Flip Horizontal"
                        >
                          <FlipHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSettings((s) => ({ ...s, flipV: !s.flipV }))}
                          className={`p-1.5 rounded-lg border flex items-center gap-1 ${
                            settings.flipV ? 'border-teal-400 bg-teal-500/20 text-teal-300' : 'border-slate-700 bg-slate-800 text-slate-300'
                          }`}
                          title="Flip Vertical"
                        >
                          <FlipVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SHADOWS & ADJUSTMENTS */}
              {activeTab === 'shadow' && (
                <div className="space-y-4">
                  {/* Shadow Preset Selector */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                    <span className="font-bold text-slate-300 block">3D & Cast Shadow Styles</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'soft', label: 'Soft Drop Shadow' },
                        { id: 'natural', label: 'Natural Ground Shadow' },
                        { id: 'studio', label: 'Studio Silhouette' },
                        { id: 'floating', label: '3D Floating Shadow' },
                      ].map((sh) => (
                        <button
                          key={sh.id}
                          onClick={() => setSettings((s) => ({ ...s, shadowType: sh.id as ShadowType }))}
                          className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all ${
                            settings.shadowType === sh.id
                              ? 'border-teal-400 bg-teal-500/10 text-teal-300'
                              : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300'
                          }`}
                        >
                          {sh.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shadow Fine Tuning */}
                  {settings.shadowType !== 'none' && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-400">Opacity</span>
                          <span className="font-mono text-teal-300">{Math.round(settings.shadowOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          value={Math.round(settings.shadowOpacity * 100)}
                          onChange={(e) => setSettings((s) => ({ ...s, shadowOpacity: Number(e.target.value) / 100 }))}
                          className="w-full accent-teal-400"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-400">Blur Radius</span>
                          <span className="font-mono text-teal-300">{settings.shadowBlur}px</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="50"
                          value={settings.shadowBlur}
                          onChange={(e) => setSettings((s) => ({ ...s, shadowBlur: Number(e.target.value) }))}
                          className="w-full accent-teal-400"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-400">Distance</span>
                          <span className="font-mono text-teal-300">{settings.shadowDistance}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={settings.shadowDistance}
                          onChange={(e) => setSettings((s) => ({ ...s, shadowDistance: Number(e.target.value) }))}
                          className="w-full accent-teal-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Subject Color Adjustments */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
                    <span className="font-bold text-slate-300 block">Subject Adjustments (Alpha Preserved)</span>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400">Brightness</span>
                        <span className="font-mono text-teal-300">{settings.brightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={settings.brightness}
                        onChange={(e) => setSettings((s) => ({ ...s, brightness: Number(e.target.value) }))}
                        className="w-full accent-teal-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400">Contrast</span>
                        <span className="font-mono text-teal-300">{settings.contrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={settings.contrast}
                        onChange={(e) => setSettings((s) => ({ ...s, contrast: Number(e.target.value) }))}
                        className="w-full accent-teal-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400">Saturation</span>
                        <span className="font-mono text-teal-300">{settings.saturation}</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={settings.saturation}
                        onChange={(e) => setSettings((s) => ({ ...s, saturation: Number(e.target.value) }))}
                        className="w-full accent-teal-400"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-slate-300">MAISHAA Studio Watermark</span>
                      <input
                        type="checkbox"
                        checked={settings.watermark}
                        onChange={(e) => setSettings((s) => ({ ...s, watermark: e.target.checked }))}
                        className="w-4 h-4 rounded accent-teal-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: EXPORT */}
              {activeTab === 'export' && (
                <div className="space-y-4">
                  {/* Format Selector */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                    <span className="font-bold text-slate-300 block">Export Format</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'image/png', label: 'PNG', desc: 'Transparent' },
                        { id: 'image/jpeg', label: 'JPG', desc: 'Solid Matte' },
                        { id: 'image/webp', label: 'WebP', desc: 'Compact' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => setSettings((s) => ({ ...s, exportFormat: fmt.id as any }))}
                          className={`p-2 rounded-xl text-center border transition-all ${
                            settings.exportFormat === fmt.id
                              ? 'border-teal-400 bg-teal-500/10 text-teal-300 font-bold'
                              : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300'
                          }`}
                        >
                          <span className="block text-xs">{fmt.label}</span>
                          <span className="text-[10px] text-slate-500">{fmt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Slider */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-300">Export Quality</span>
                      <span className="font-mono text-teal-400 font-bold">{settings.exportQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={settings.exportQuality}
                      onChange={(e) => setSettings((s) => ({ ...s, exportQuality: Number(e.target.value) }))}
                      className="w-full accent-teal-400"
                    />
                  </div>

                  {/* Single Download Button */}
                  <button
                    onClick={handleDownloadSingle}
                    disabled={!activeItem || activeItem.status !== 'SUCCESS' || isDownloading}
                    className="w-full py-3.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Download Processed Image</span>
                  </button>

                  {/* Batch ZIP Export */}
                  {items.length > 1 && (
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <span className="text-[11px] text-slate-400 font-bold block">Batch Operations</span>
                      <button
                        onClick={handleDownloadZip}
                        disabled={isZipping || !items.some((i) => i.status === 'SUCCESS')}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                      >
                        {isZipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderArchive className="w-3.5 h-3.5" />}
                        <span>Export All ({items.length}) as ZIP</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Genuine Searchable SEO Guide & FAQ Section */}
          <div className="px-4 pb-8 max-w-5xl mx-auto w-full">
            <ToolSeoGuide routePath="/image-studio/background-remover" />
            <AdSlot placement="tool-result-bottom" />
          </div>
        </div>
      )}
    </div>
  );
};

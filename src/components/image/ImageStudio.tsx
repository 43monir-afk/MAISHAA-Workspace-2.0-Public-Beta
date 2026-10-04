import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  resizeImage,
  compressImage,
  cropImage,
  rotateImage,
  flipImage,
  convertImage,
  removeImageBackground,
  superResolutionImage,
  smartObjectErase,
  getImageDimensions,
  retouchImage,
  generateImagePromptFromAi,
  ImageProcessResult,
  ImagePromptResult,
} from '../../services/imageService';
import { formatFileSize, generateSafeOutputFilename } from '../../utils/fileDetection';
import { createManagedObjectUrl } from '../../utils/privacy';
import { downloadFileOnce } from '../../utils/downloadHelper';
import {
  Image as ImageIcon,
  Upload,
  Maximize2,
  Minimize2,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ArrowRightLeft,
  Sparkles,
  Download,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  Sliders,
  Scissors,
  Zap,
  Eraser,
  Copy,
  RotateCcw,
  SlidersHorizontal,
  Wand2,
  Palette,
  Check,
  Info,
} from 'lucide-react';

export type ImageSubTab =
  | 'retouch'
  | 'image_to_prompt'
  | 'manual_prompt'
  | 'bg_remove'
  | 'super_res'
  | 'resize'
  | 'compress'
  | 'crop'
  | 'transform'
  | 'convert'
  | 'object_erase';

export const ImageStudio: React.FC = () => {
  const {
    t,
    language,
    stagedFiles,
    addJob,
    updateJob,
    showNotification,
  } = useWorkspace();

  const [activeSubTab, setActiveSubTab] = useState<ImageSubTab>('retouch');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  // Resize settings
  const [targetWidth, setTargetWidth] = useState<number>(800);
  const [targetHeight, setTargetHeight] = useState<number>(600);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [scalePreset, setScalePreset] = useState<number>(100);

  // Compress settings
  const [quality, setQuality] = useState<number>(80);
  const [compressFormat, setCompressFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp');

  // Convert settings
  const [targetFormat, setTargetFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/png');

  // Crop settings
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 300, height: 300 });

  // Background Removal settings
  const [bgTolerance, setBgTolerance] = useState<number>(38);
  const [bgFeather, setBgFeather] = useState<number>(2);

  // Super-Resolution settings
  const [superResScale, setSuperResScale] = useState<2 | 4>(2);
  const [superResSharpness, setSuperResSharpness] = useState<'moderate' | 'high' | 'ultra'>('high');

  // Local Retouch settings
  const [brightness, setBrightness] = useState<number>(0); // -100 to 100
  const [contrast, setContrast] = useState<number>(0); // -100 to 100
  const [saturation, setSaturation] = useState<number>(0); // -100 to 100
  const [warmth, setWarmth] = useState<number>(0); // -100 to 100
  const [isComparingOriginal, setIsComparingOriginal] = useState<boolean>(false);

  // Image -> AI Prompt settings
  const [isPromptGenerating, setIsPromptGenerating] = useState(false);
  const [showAiConsentPrompt, setShowAiConsentPrompt] = useState(false);
  const [customPromptInstruction, setCustomPromptInstruction] = useState('');
  const [promptResult, setPromptResult] = useState<ImagePromptResult | null>(null);
  const [editablePromptText, setEditablePromptText] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);

  // Quota-free Manual Prompt Builder
  const [manualSubject, setManualSubject] = useState(
    'A high-tech productivity office workspace with multi-display monitors and ergonomic ambient lighting'
  );
  const [manualStyle, setManualStyle] = useState('Photorealistic 8K UHD, ultra-detailed textures');
  const [manualLighting, setManualLighting] = useState('Soft volumetric daylight with warm amber rim light');
  const [manualCamera, setManualCamera] = useState('Sony A7R V 50mm f/1.4 lens, shallow depth of field, sharp focus');
  const [manualMood, setManualMood] = useState('Clean, elegant, inspiring and cinematic');
  const [manualCustomNotes, setManualCustomNotes] = useState('Crisp architectural geometry, rich material finish');
  const [manualCopied, setManualCopied] = useState(false);

  // Output Result
  const [result, setResult] = useState<ImageProcessResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');

  // Staged files integration
  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      const img = stagedFiles.find((f) => f.type.startsWith('image/'));
      if (img) loadFile(img);
    }
  }, [stagedFiles]);

  const loadFile = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setResult(null);
    setResultUrl(null);
    setPromptResult(null);

    try {
      const dims = await getImageDimensions(file);
      setOriginalDimensions(dims);
      setTargetWidth(dims.width);
      setTargetHeight(dims.height);
      setCropBox({
        x: Math.round(dims.width * 0.1),
        y: Math.round(dims.height * 0.1),
        width: Math.round(dims.width * 0.8),
        height: Math.round(dims.height * 0.8),
      });

      const url = createManagedObjectUrl(file);
      setPreviewUrl(url);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to inspect image');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadFile(e.target.files[0]);
    }
  };

  const handleWidthChange = (val: number) => {
    setTargetWidth(val);
    if (maintainAspect && originalDimensions && originalDimensions.width > 0) {
      const ratio = originalDimensions.height / originalDimensions.width;
      setTargetHeight(Math.round(val * ratio));
    }
  };

  const handleHeightChange = (val: number) => {
    setTargetHeight(val);
    if (maintainAspect && originalDimensions && originalDimensions.height > 0) {
      const ratio = originalDimensions.width / originalDimensions.height;
      setTargetWidth(Math.round(val * ratio));
    }
  };

  const applyScalePreset = (percent: number) => {
    setScalePreset(percent);
    if (originalDimensions) {
      const scale = percent / 100;
      setTargetWidth(Math.round(originalDimensions.width * scale));
      setTargetHeight(Math.round(originalDimensions.height * scale));
    }
  };

  const resetRetouch = () => {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setWarmth(0);
    showNotification(language === 'bn' ? 'রিটাচ সেটিংস রিসেট করা হয়েছে' : 'Retouch sliders reset');
  };

  const executeProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const jobId = addJob({
      toolType: `IMAGE: ${activeSubTab.toUpperCase()}`,
      fileNames: [selectedFile.name],
      originalSize: selectedFile.size,
      status: 'PROCESSING',
    });

    try {
      let res: ImageProcessResult;
      let outName = '';

      switch (activeSubTab) {
        case 'retouch': {
          res = await retouchImage(selectedFile, {
            brightness,
            contrast,
            saturation,
            warmth,
          });
          outName = generateSafeOutputFilename(selectedFile.name, 'retouched', 'png');
          break;
        }

        case 'resize': {
          res = await resizeImage(selectedFile, {
            targetWidth,
            targetHeight,
            maintainAspectRatio: maintainAspect,
            quality: 0.9,
          });
          outName = generateSafeOutputFilename(
            selectedFile.name,
            `resized_${targetWidth}x${targetHeight}`
          );
          break;
        }

        case 'compress': {
          res = await compressImage(selectedFile, quality / 100, compressFormat);
          const ext = compressFormat === 'image/webp' ? 'webp' : compressFormat === 'image/png' ? 'png' : 'jpg';
          outName = generateSafeOutputFilename(
            selectedFile.name,
            `compressed_q${quality}`,
            ext
          );
          break;
        }

        case 'crop': {
          res = await cropImage(selectedFile, cropBox, undefined, 0.92);
          outName = generateSafeOutputFilename(selectedFile.name, 'cropped');
          break;
        }

        case 'convert': {
          res = await convertImage(selectedFile, targetFormat, 0.92);
          const ext = targetFormat === 'image/webp' ? 'webp' : targetFormat === 'image/png' ? 'png' : 'jpg';
          outName = generateSafeOutputFilename(selectedFile.name, 'converted', ext);
          break;
        }

        case 'bg_remove': {
          res = await removeImageBackground(selectedFile, {
            tolerance: bgTolerance,
            featherRadius: bgFeather,
          });
          outName = generateSafeOutputFilename(selectedFile.name, 'nobg', 'png');
          break;
        }

        case 'super_res': {
          res = await superResolutionImage(selectedFile, {
            scale: superResScale,
            sharpnessLevel: superResSharpness,
          });
          const ext = selectedFile.type === 'image/png' ? 'png' : 'jpg';
          outName = generateSafeOutputFilename(
            selectedFile.name,
            `upscaled_${superResScale}x`,
            ext
          );
          break;
        }

        case 'object_erase': {
          res = await smartObjectErase(selectedFile, cropBox);
          const ext = selectedFile.type === 'image/png' ? 'png' : 'jpg';
          outName = generateSafeOutputFilename(selectedFile.name, 'inpainted', ext);
          break;
        }

        default:
          throw new Error('Unsupported mode');
      }

      const url = createManagedObjectUrl(res.blob);
      setResult(res);
      setResultUrl(url);
      setOutputFilename(outName);

      updateJob(jobId, {
        status: 'COMPLETED',
        outputSize: res.newSize,
        outputUrl: url,
        outputFilename: outName,
        reductionPercentage: res.reductionPercentage,
      });

      showNotification(
        language === 'bn'
          ? 'ছবি সফলভাবে তৈরি হয়েছে!'
          : 'Image processed successfully!'
      );
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Processing failed';
      setErrorMessage(msg);
      updateJob(jobId, {
        status: 'FAILED',
        errorState: msg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotate = async (degrees: 90 | 180 | 270) => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const res = await rotateImage(selectedFile, degrees);
      const outName = generateSafeOutputFilename(selectedFile.name, `rotated_${degrees}deg`);
      const url = createManagedObjectUrl(res.blob);
      setResult(res);
      setResultUrl(url);
      setOutputFilename(outName);
      showNotification(`Rotated ${degrees}°`);
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlip = async (dir: 'horizontal' | 'vertical') => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const res = await flipImage(selectedFile, dir);
      const outName = generateSafeOutputFilename(selectedFile.name, `flipped_${dir}`);
      const url = createManagedObjectUrl(res.blob);
      setResult(res);
      setResultUrl(url);
      setOutputFilename(outName);
      showNotification(`Flipped ${dir}`);
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePromptWithConsent = async () => {
    if (!selectedFile) return;
    setIsPromptGenerating(true);
    setErrorMessage(null);
    try {
      const promptRes = await generateImagePromptFromAi(selectedFile, customPromptInstruction);
      setPromptResult(promptRes);
      setEditablePromptText(promptRes.prompt);
      setShowAiConsentPrompt(false);
      showNotification(
        language === 'bn' ? 'এআই প্রম্পট সফলভাবে তৈরি হয়েছে!' : 'AI Prompt generated successfully!'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Prompt generation failed');
    } finally {
      setIsPromptGenerating(false);
    }
  };

  const copyPrompt = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setPromptCopied(true);
    showNotification(language === 'bn' ? 'প্রম্পট কপি হয়েছে' : 'Prompt copied to clipboard');
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const getAssembledManualPrompt = () => {
    return `${manualSubject}, ${manualStyle}, ${manualLighting}, ${manualCamera}, ${manualMood}. ${manualCustomNotes}`.trim();
  };

  const copyManualPrompt = () => {
    navigator.clipboard.writeText(getAssembledManualPrompt());
    setManualCopied(true);
    showNotification(language === 'bn' ? 'কপি হয়েছে' : 'Copied to clipboard');
    setTimeout(() => setManualCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Studio Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
            <ImageIcon className="w-5 h-5" />
          </span>
          <span className="text-xs font-semibold text-teal-400 font-mono">
            IMAGE STUDIO • RETOUCH, PROMPT & CONVERSION
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          {t.image.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          {language === 'bn'
            ? 'লোকাল ফটো রিটাচ, ইমেজ থেকে এআই প্রম্পট জেনারেটর, কোটামুক্ত ম্যানুয়াল প্রম্পট বিল্ডার, ব্যাকগ্রাউন্ড অপসারণ এবং সুপার রেজোলিউশন।'
            : 'Lossless photo retouch, Image-to-AI Prompt generator, Quota-free prompt builder, client-side background removal, and multi-pass upscaling.'}
        </p>
      </div>

      {/* Subtab Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80 no-scrollbar">
        {[
          { id: 'retouch', labelBn: 'লোকাল রিটাচ', labelEn: 'Local Retouch', icon: SlidersHorizontal },
          { id: 'image_to_prompt', labelBn: 'ছবি → এআই প্রম্পট', labelEn: 'Image → Prompt', icon: Wand2 },
          { id: 'manual_prompt', labelBn: 'কোটামুক্ত প্রম্পট বিল্ডার', labelEn: 'Manual Prompt', icon: Palette },
          { id: 'bg_remove', labelBn: 'ব্যাকগ্রাউন্ড অপসারণ', labelEn: 'BG Removal', icon: Scissors },
          { id: 'super_res', labelBn: 'সুপার রেজোলিউশন', labelEn: 'Super-Res 2x-4x', icon: Zap },
          { id: 'resize', labelBn: 'সাইজ পরিবর্তন', labelEn: 'Resize', icon: Maximize2 },
          { id: 'compress', labelBn: 'কম্প্রেশন', labelEn: 'Compress', icon: Minimize2 },
          { id: 'crop', labelBn: 'ক্রপ', labelEn: 'Crop', icon: Crop },
          { id: 'convert', labelBn: 'ফরম্যাট পরিবর্তন', labelEn: 'Convert', icon: ArrowRightLeft },
          { id: 'transform', labelBn: 'ঘোরান ও ফ্লিপ', labelEn: 'Rotate & Flip', icon: RotateCw },
          { id: 'object_erase', labelBn: 'অবজেক্ট ইরেজ', labelEn: 'Object Erase', icon: Eraser },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as ImageSubTab)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? tab.labelBn : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Selector & Config Controls */}
        <div className="lg:col-span-6 space-y-5">
          {/* File Picker (only required for image operations, not manual prompt) */}
          {activeSubTab !== 'manual_prompt' && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <input
                id="imageStudioFileInput"
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {!selectedFile ? (
                <label
                  htmlFor="imageStudioFileInput"
                  className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-800/20 hover:bg-slate-800/40 cursor-pointer transition-all"
                >
                  <Upload className="w-8 h-8 text-teal-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-200">
                    {language === 'bn' ? 'ছবি নির্বাচন বা ড্রপ করুন' : 'Select or Drop Image'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    PNG, JPEG, WebP (Original Resolution & Alpha Preserved)
                  </span>
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-800/50">
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-xs truncate max-w-[220px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {formatFileSize(selectedFile.size)}
                      {originalDimensions &&
                        ` • ${originalDimensions.width}×${originalDimensions.height}px`}
                    </p>
                  </div>

                  <label
                    htmlFor="imageStudioFileInput"
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/60 text-xs font-medium cursor-pointer transition-colors"
                  >
                    {language === 'bn' ? 'পরিবর্তন করুন' : 'Change'}
                  </label>
                </div>
              )}
            </div>
          )}

          {/* 1. Local Retouch Panel */}
          {activeSubTab === 'retouch' && selectedFile && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-teal-400" />
                  <span>{language === 'bn' ? 'কালার টিউনিং ও রিটাচ' : 'Color Tuning & Retouch'}</span>
                </h3>
                <button
                  type="button"
                  onClick={resetRetouch}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 border border-slate-700 rounded-lg px-2.5 py-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{language === 'bn' ? 'রিসেট' : 'Reset'}</span>
                </button>
              </div>

              {/* Sliders */}
              <div className="space-y-3.5 text-xs">
                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{language === 'bn' ? 'উজ্জ্বলতা (Brightness)' : 'Brightness'}</span>
                    <span className="font-mono text-teal-400">{brightness > 0 ? `+${brightness}` : brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{language === 'bn' ? 'কন্ট্রাস্ট (Contrast)' : 'Contrast'}</span>
                    <span className="font-mono text-teal-400">{contrast > 0 ? `+${contrast}` : contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{language === 'bn' ? 'স্যাচুরেশন (Saturation)' : 'Saturation'}</span>
                    <span className="font-mono text-teal-400">{saturation > 0 ? `+${saturation}` : saturation}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>

                {/* Warmth */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{language === 'bn' ? 'ওয়ার্মথ / কুল টোন (Temperature)' : 'Color Warmth'}</span>
                    <span className="font-mono text-teal-400">{warmth > 0 ? `+${warmth} (Warm)` : warmth < 0 ? `${warmth} (Cool)` : '0'}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={warmth}
                    onChange={(e) => setWarmth(parseInt(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Compare Button */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onMouseDown={() => setIsComparingOriginal(true)}
                  onMouseUp={() => setIsComparingOriginal(false)}
                  onTouchStart={() => setIsComparingOriginal(true)}
                  onTouchEnd={() => setIsComparingOriginal(false)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isComparingOriginal
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {isComparingOriginal
                      ? (language === 'bn' ? 'আসল ছবি প্রদর্শিত হচ্ছে' : 'Showing Original')
                      : (language === 'bn' ? 'হোল্ড করে আসল ছবি দেখুন' : 'Hold to View Original')}
                  </span>
                </button>

                <span className="text-[11px] text-teal-400/90 font-mono">
                  Lossless 32-bit Float
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'কোনো ডাউনস্যাম্পলিং ছাড়াই আসল রেজোলিউশন ও আলফা ট্রান্সপারেন্সি অক্ষুণ্ণ রেখে পিএনজি আউটপুট হবে।'
                  : 'Preserves original resolution and transparency without lossy compression or silent downsampling.'}
              </p>
            </div>
          )}

          {/* 2. Image -> AI Prompt Panel */}
          {activeSubTab === 'image_to_prompt' && selectedFile && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-teal-400" />
                  <span>{language === 'bn' ? 'ছবি থেকে এআই প্রম্পট রিভার্স-ইঞ্জিনিয়ার' : 'Image to AI Prompt'}</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Gemini Vision
                </span>
              </div>

              <p className="text-xs text-slate-300">
                {language === 'bn'
                  ? 'আপনার আপলোডকৃত ছবি বিশ্লেষণ করে Midjourney, Flux বা Stable Diffusion-এর জন্য উপযুক্ত বিশদ জেনারেটিভ প্রম্পট তৈরি করুন।'
                  : 'Extract detailed generative image prompts capturing subjects, lighting, composition, camera settings, and style.'}
              </p>

              {/* Custom extra focus */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium block">
                  {language === 'bn' ? 'ঐচ্ছিক নির্দেশনা (যেমন: আর্ট স্টাইলের ওপর জোর দিন)' : 'Custom focus / style instructions (optional)'}
                </label>
                <input
                  type="text"
                  value={customPromptInstruction}
                  onChange={(e) => setCustomPromptInstruction(e.target.value)}
                  placeholder="e.g. Focus on cinematic 35mm film mood and color grading..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-teal-400"
                />
              </div>

              {/* Explicit Consent Notice Modal / Toggle */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-teal-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>{language === 'bn' ? 'এআই আপলোড ও প্রাইভেসি সম্মতি' : 'AI Analysis & Privacy Consent'}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'bn'
                    ? 'এই ফিচারটি ব্যবহার করলে ছবির একটি সিকিউর থাম্বনেইল সার্ভার-সাইড প্রক্সির মাধ্যমে গুগল জেমিনি ভিশন এপিআই-তে পাঠানো হবে।'
                    : 'Reverse-prompting analyzes this image server-side via Google Gemini Vision API under your explicit consent.'}
                </p>
              </div>

              <button
                type="button"
                disabled={isPromptGenerating}
                onClick={handleGeneratePromptWithConsent}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPromptGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'bn' ? 'এআই বিশ্লেষণ চলছে...' : 'Analyzing Image...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{language === 'bn' ? 'সম্মতি দিয়ে প্রম্পট তৈরি করুন' : 'Confirm & Generate Prompt'}</span>
                  </>
                )}
              </button>

              {/* Editable Prompt Output */}
              {promptResult && (
                <div className="pt-3 border-t border-slate-800 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-teal-300">
                      {promptResult.shortTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyPrompt(editablePromptText)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-teal-400" />
                      <span>{promptCopied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={editablePromptText}
                    onChange={(e) => setEditablePromptText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-hidden focus:border-teal-400"
                  />

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {promptResult.styleTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-teal-300 font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Quota-Free Manual Prompt Builder Panel */}
          {activeSubTab === 'manual_prompt' && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-teal-400" />
                  <span>{language === 'bn' ? 'কোটামুক্ত ম্যানুয়াল প্রম্পট বিল্ডার' : 'Quota-Free Manual Prompt Builder'}</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  100% Offline • Zero Quota
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'bn'
                  ? 'কোনো এপিআই কী বা ইন্টারনেট কোটা ছাড়াই পেশাদার এআই ইমেজ প্রম্পট অ্যাসেম্বল করুন।'
                  : 'Assemble studio-grade generative prompts with intuitive category controls without consuming any API quota.'}
              </p>

              {/* Subject Presets */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium block">
                  {language === 'bn' ? '১. বিষয়বস্তু (Subject)' : '1. Subject / Core Theme'}
                </label>
                <input
                  type="text"
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-hidden focus:border-teal-400"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    'Futuristic Dhaka Smart City with Maglev train',
                    'Traditional Bangladeshi rural tea garden during monsoon',
                    'Executive portrait in high-end minimalist corporate boardroom',
                    'Cyberpunk tea stall with neon lights and digital rain',
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setManualSubject(preset)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      {preset.slice(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Presets */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium block">
                  {language === 'bn' ? '২. আর্ট স্টাইল ও মিডিয়াম (Medium & Style)' : '2. Art Style & Medium'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    'Photorealistic 8K UHD, ultra-detailed',
                    'Cinematic 35mm Analog Film, Kodak Portra 400',
                    'Digital Concept Art, matte painting by artstation pro',
                    'Oil on textured canvas with expressive brush strokes',
                  ].map((st, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setManualStyle(st)}
                      className={`p-2 rounded-xl border text-left text-xs transition-colors ${
                        manualStyle === st
                          ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lighting Presets */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium block">
                  {language === 'bn' ? '৩. আলোকসজ্জা (Lighting)' : '3. Lighting'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    'Golden Hour warm natural sunlight, long dramatic shadows',
                    'Studio softbox key lighting, clean specular highlights',
                    'Neon cyberpunk rim lighting with cyan and magenta accents',
                    'Soft diffused overcast window daylight',
                  ].map((lt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setManualLighting(lt)}
                      className={`p-2 rounded-xl border text-left text-xs transition-colors ${
                        manualLighting === lt
                          ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {lt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera & Lens Presets */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium block">
                  {language === 'bn' ? '৪. ক্যামেরা ও লেন্স (Camera & Lens)' : '4. Camera & Lens'}
                </label>
                <input
                  type="text"
                  value={manualCamera}
                  onChange={(e) => setManualCamera(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-hidden focus:border-teal-400"
                />
              </div>

              {/* Mood */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium block">
                  {language === 'bn' ? '৫. মেজাজ ও পরিবেশ (Mood)' : '5. Mood & Atmosphere'}
                </label>
                <input
                  type="text"
                  value={manualMood}
                  onChange={(e) => setManualMood(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-teal-400"
                />
              </div>

              {/* Assembled Output Box */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-teal-300">
                    {language === 'bn' ? 'একত্রিত চূড়ান্ত প্রম্পট' : 'Assembled Prompt String'}
                  </span>
                  <button
                    type="button"
                    onClick={copyManualPrompt}
                    className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{manualCopied ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed select-all">
                  {getAssembledManualPrompt()}
                </div>
              </div>
            </div>
          )}

          {/* Standard Tools (Resize, Compress, Crop, Convert, Transform, BG Remove, Super Res, Object Erase) */}
          {activeSubTab !== 'manual_prompt' && activeSubTab !== 'retouch' && activeSubTab !== 'image_to_prompt' && selectedFile && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              {/* Resize Mode */}
              {activeSubTab === 'resize' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      {t.image.resize}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setMaintainAspect(!maintainAspect)}
                      className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors ${
                        maintainAspect
                          ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {maintainAspect ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>{t.image.lockAspect}</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Free Aspect</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Percentage Presets */}
                  <div>
                    <span className="text-xs text-slate-400 font-medium block mb-1.5">
                      {language === 'bn' ? 'স্কেল প্রিসেট' : 'Scale Presets'}
                    </span>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[25, 50, 75, 100, 150, 200].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => applyScalePreset(pct)}
                          className={`py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                            scalePreset === pct
                              ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Width & Height Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">
                        {t.image.width} (px)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="8000"
                        value={targetWidth}
                        onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-teal-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">
                        {t.image.height} (px)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="8000"
                        value={targetHeight}
                        onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-teal-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Compress Mode */}
              {activeSubTab === 'compress' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      {t.image.compress}
                    </h3>
                    <span className="text-xs font-mono font-bold text-teal-300">
                      {quality}%
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{t.image.quality}</span>
                      <span>1% — 100%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={(e) => setQuality(parseInt(e.target.value))}
                      className="w-full accent-teal-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium block">
                      {language === 'bn' ? 'আউটপুট ফরম্যাট' : 'Output Target Format'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['image/webp', 'image/jpeg', 'image/png'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setCompressFormat(fmt)}
                          className={`py-2 px-3 rounded-xl text-xs font-mono font-medium border transition-all ${
                            compressFormat === fmt
                              ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {fmt.replace('image/', '').toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Crop Mode */}
              {activeSubTab === 'crop' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    {t.image.crop}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">X শুরু (px)</label>
                      <input
                        type="number"
                        min="0"
                        value={cropBox.x}
                        onChange={(e) =>
                          setCropBox({ ...cropBox, x: Math.max(0, parseInt(e.target.value) || 0) })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Y শুরু (px)</label>
                      <input
                        type="number"
                        min="0"
                        value={cropBox.y}
                        onChange={(e) =>
                          setCropBox({ ...cropBox, y: Math.max(0, parseInt(e.target.value) || 0) })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">প্রস্থ (Width)</label>
                      <input
                        type="number"
                        min="10"
                        value={cropBox.width}
                        onChange={(e) =>
                          setCropBox({ ...cropBox, width: Math.max(10, parseInt(e.target.value) || 10) })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">উচ্চতা (Height)</label>
                      <input
                        type="number"
                        min="10"
                        value={cropBox.height}
                        onChange={(e) =>
                          setCropBox({ ...cropBox, height: Math.max(10, parseInt(e.target.value) || 10) })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Transform Mode */}
              {activeSubTab === 'transform' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">
                    {language === 'bn' ? 'ঘোরান ও ফ্লিপ অ্যাকশন' : 'Rotate & Flip Actions'}
                  </h3>

                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 block">
                      {language === 'bn' ? 'ঘোরান (Rotate)' : 'Rotate'}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {([90, 180, 270] as const).map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => handleRotate(deg)}
                          className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <RotateCw className="w-3.5 h-3.5 text-teal-400" />
                          <span>+{deg}°</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-xs text-slate-400 block">
                      {language === 'bn' ? 'ফ্লিপ (Flip)' : 'Mirror Flip'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleFlip('horizontal')}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FlipHorizontal className="w-4 h-4 text-teal-400" />
                        <span>{language === 'bn' ? 'আড়াআড়ি (Horizontal)' : 'Horizontal'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFlip('vertical')}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FlipVertical className="w-4 h-4 text-teal-400" />
                        <span>{language === 'bn' ? 'লম্বালম্বি (Vertical)' : 'Vertical'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Convert Format Mode */}
              {activeSubTab === 'convert' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    {t.image.convertFormat}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(['image/png', 'image/jpeg', 'image/webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setTargetFormat(fmt)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                          targetFormat === fmt
                            ? 'bg-teal-500 text-slate-950 border-teal-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {fmt.replace('image/', '').toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Background Removal Mode */}
              {activeSubTab === 'bg_remove' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-teal-400" />
                      <span>{language === 'bn' ? 'ব্যাকগ্রাউন্ড অপসারণ সেটিংস' : 'Background Removal Settings'}</span>
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      Smart Alpha Mask
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>{language === 'bn' ? 'কালার সহনশীলতা (Tolerance)' : 'Color Tolerance'}</span>
                        <span className="font-mono text-teal-400">{bgTolerance}</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="80"
                        value={bgTolerance}
                        onChange={(e) => setBgTolerance(parseInt(e.target.value))}
                        className="w-full accent-teal-400 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>{language === 'bn' ? 'এজ ফেদারিং (Edge Feather)' : 'Edge Feathering'}</span>
                        <span className="font-mono text-teal-400">{bgFeather}px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={bgFeather}
                        onChange={(e) => setBgFeather(parseInt(e.target.value))}
                        className="w-full accent-teal-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Super-Resolution Mode */}
              {activeSubTab === 'super_res' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-teal-400" />
                      <span>{language === 'bn' ? 'সুপার রেজোলিউশন এনহ্যান্সার' : 'Super-Resolution Upscaling'}</span>
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      Bicubic & Laplacian Matrix
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-300 font-medium block">
                      {language === 'bn' ? 'এনহ্যান্সমেন্ট স্কেল' : 'Scale Multiplier'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSuperResScale(2)}
                        className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                          superResScale === 2
                            ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        2x Resolution ({originalDimensions ? `${originalDimensions.width * 2}×${originalDimensions.height * 2}` : '2x'})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuperResScale(4)}
                        className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                          superResScale === 4
                            ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        4x Resolution ({originalDimensions ? `${originalDimensions.width * 4}×${originalDimensions.height * 4}` : '4x'})
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-300 font-medium block">
                      {language === 'bn' ? 'শার্পনেস লেভেল' : 'Sharpness & Micro-Contrast'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['moderate', 'high', 'ultra'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSuperResSharpness(lvl)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-medium border capitalize transition-all ${
                            superResSharpness === lvl
                              ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-sm'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Object Inpainting Mode */}
              {activeSubTab === 'object_erase' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Eraser className="w-4 h-4 text-teal-400" />
                      <span>{language === 'bn' ? 'স্মার্ট অবজেক্ট ইরেজ' : 'Smart Object Erase'}</span>
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      Patch Inpainting
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
                    <p>Selection Box: {cropBox.width}×{cropBox.height} at ({cropBox.x}, {cropBox.y})</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Execute Button for non-transform and non-manual-prompt tabs */}
          {activeSubTab !== 'transform' && activeSubTab !== 'manual_prompt' && activeSubTab !== 'image_to_prompt' && selectedFile && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={executeProcess}
              className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'bn' ? 'প্রসেস হচ্ছে...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {activeSubTab === 'retouch'
                      ? (language === 'bn' ? 'রিটাচ সম্পন্ন করে ডাউনলোড প্রস্তুত করুন' : 'Apply Retouch & Export PNG')
                      : t.image.processBtn}
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Column: Visual Preview & Live Output */}
        <div className="lg:col-span-6 space-y-5">
          {/* Visual Canvas Preview */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-teal-400" />
                <span>
                  {result
                    ? t.image.beforeAfter
                    : isComparingOriginal
                    ? (language === 'bn' ? 'আসল ছবি' : 'Original Source')
                    : (language === 'bn' ? 'লাইভ প্রিভিউ' : 'Live Preview')}
                </span>
              </h3>

              {selectedFile && (
                <span className="text-xs font-mono text-slate-400">
                  {formatFileSize(selectedFile.size)}
                </span>
              )}
            </div>

            <div className="w-full h-72 sm:h-80 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-center overflow-hidden p-3 relative">
              {resultUrl && !isComparingOriginal ? (
                <img
                  src={resultUrl}
                  alt="Processed Output"
                  className="max-h-full max-w-full object-contain rounded shadow-lg"
                />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Source"
                  style={
                    activeSubTab === 'retouch' && !isComparingOriginal && !resultUrl
                      ? {
                          filter: `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100}) saturate(${1 + saturation / 100})`,
                        }
                      : undefined
                  }
                  className="max-h-full max-w-full object-contain rounded transition-all duration-150"
                />
              ) : (
                <div className="text-center text-slate-500 text-xs">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <span>{language === 'bn' ? 'কোনো ছবি নির্বাচিত নেই' : 'No image loaded'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Result Stats & Download */}
          {result && resultUrl && (
            <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-950/20 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  <h3 className="text-sm font-bold text-white">
                    {language === 'bn' ? 'ছবি তৈরি সম্পন্ন!' : 'Image Ready!'}
                  </h3>
                </div>
                <span className="text-xs font-mono text-teal-300 font-bold">
                  {result.width}×{result.height}px
                </span>
              </div>

              {/* Honest Size Comparison */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>{language === 'bn' ? 'আসল সাইজ:' : 'Original Size:'}</span>
                  <span>{formatFileSize(result.originalSize)}</span>
                </div>
                <div className="flex justify-between text-teal-300 font-bold border-t border-slate-800 pt-1.5">
                  <span>{language === 'bn' ? 'নতুন সাইজ:' : 'New Size:'}</span>
                  <span>{formatFileSize(result.newSize)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={isDownloading}
                onClick={async () => {
                  if (isDownloading || !result) return;
                  setIsDownloading(true);
                  try {
                    await downloadFileOnce(result.blob, outputFilename);
                    showNotification(
                      language === 'bn' ? 'ছবি ডাউনলোড সম্পন্ন হয়েছে' : 'Image downloaded successfully'
                    );
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.common.download} ({outputFilename})</span>
              </button>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

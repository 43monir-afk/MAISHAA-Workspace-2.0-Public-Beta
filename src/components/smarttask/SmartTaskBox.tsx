import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  planSmartTask,
  generateSmartSuggestions,
} from '../../services/taskRouter';
import { SmartTask, WorkflowStep } from '../../types/task';
import { formatFileSize, detectMultipleFiles } from '../../utils/fileDetection';
import {
  Sparkles,
  ArrowRight,
  Upload,
  FileText,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  Cpu,
  UserCheck,
  RotateCcw,
  Play,
  X,
  ShieldCheck,
  HelpCircle,
  FileSearch,
  ExternalLink,
} from 'lucide-react';

interface SmartTaskBoxProps {
  onWorkflowExecute?: (task: SmartTask) => void;
}

export const SmartTaskBox: React.FC<SmartTaskBoxProps> = ({ onWorkflowExecute }) => {
  const {
    t,
    language,
    stagedFiles,
    setStagedFiles,
    setActiveModule,
    showNotification,
    openAiAssistantWithContext,
    setIsAiConsentModalOpen,
  } = useWorkspace();

  const [instruction, setInstruction] = useState('');
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTask, setCurrentTask] = useState<SmartTask | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync staged files if pre-loaded in workspace context
  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0 && localFiles.length === 0) {
      setLocalFiles(stagedFiles);
    }
  }, [stagedFiles]);

  // Update planning when files or instruction changes if user presses Run
  const handleFiles = (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const added = Array.from(files);
    const combined = [...localFiles, ...added];
    setLocalFiles(combined);
    setStagedFiles(combined);
    // Clear current planned task so user can re-plan with new files
    setCurrentTask(null);

    showNotification(
      language === 'bn'
        ? `${added.length}টি ফাইল যুক্ত হয়েছে`
        : `${added.length} file(s) added`
    );
  };

  const removeFile = (index: number) => {
    const updated = localFiles.filter((_, i) => i !== index);
    setLocalFiles(updated);
    setStagedFiles(updated);
    setCurrentTask(null);
  };

  const clearAllFiles = () => {
    setLocalFiles([]);
    setStagedFiles([]);
    setCurrentTask(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePlanTask = async (customPrompt?: string) => {
    const promptToUse = (customPrompt !== undefined ? customPrompt : instruction).trim();
    if (!promptToUse && localFiles.length === 0) {
      showNotification(
        language === 'bn'
          ? 'অনুগ্রহ করে ফাইল আপলোড করুন অথবা আপনার কাজ লিখুন'
          : 'Please add files or type an instruction'
      );
      return;
    }

    setIsPlanning(true);
    try {
      const task = await planSmartTask(promptToUse, localFiles);
      setCurrentTask(task);
      if (customPrompt !== undefined) setInstruction(customPrompt);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to plan task');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExecuteWorkflow = (task: SmartTask) => {
    // If onWorkflowExecute is passed, call it
    if (onWorkflowExecute) {
      onWorkflowExecute(task);
      return;
    }

    // Default execution routing based on first actionable step or detected intent
    const firstStep = task.workflowSteps.find((s) => s.targetModule);
    const targetModule = firstStep?.targetModule || 'universal';

    // Ensure files are staged in workspace context
    setStagedFiles(task.files);

    // If Cloud AI step is dominant or user chose AI task, open AI Assistant with context
    if (task.hasCloudAiStep) {
      openAiAssistantWithContext(
        task.files[0]?.name || 'Document',
        `Instruction: ${task.instruction}\nDetected Intent: ${task.detectedIntent}`
      );
    }

    // Route to the corresponding studio
    setActiveModule(targetModule);

    showNotification(
      language === 'bn'
        ? `কার্যপ্রণালী শুরু হয়েছে: ${task.detectedIntent}`
        : `Workflow activated: ${task.detectedIntent}`
    );
  };

  const suggestions = generateSmartSuggestions(localFiles);

  const starterChips = [
    { label: 'এই PDF থেকে summary বানাও', text: 'এই PDF থেকে summary বানাও' },
    { label: 'এই scan OCR করে editable text দাও', text: 'এই scan OCR করে editable text দাও' },
    { label: 'সব JPG 500KB-এর নিচে করো', text: 'সব JPG 500KB-এর নিচে করো' },
    { label: 'এই invoice Excel-এ বের করো', text: 'এই invoice Excel-এ বের করো' },
    { label: 'এই files merge করে ZIP দাও', text: 'এই files merge করে ZIP দাও' },
    { label: 'এই report থেকে presentation বানাও', text: 'এই report থেকে presentation বানাও' },
  ];

  return (
    <div className="w-full rounded-2xl bg-gradient-to-b from-[#0e1d3d] to-[#0a152d] border border-slate-700/80 shadow-2xl p-5 sm:p-7 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {language === 'bn' ? 'আপনি কী কাজ করতে চান?' : 'What do you want to do?'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            {language === 'bn'
              ? 'যেকোনো ফাইল আপলোড করুন → কাজের নির্দেশনা দিন → মায়িশা স্বয়ংক্রিয় কার্যপ্রণালী সাজিয়ে দেবে।'
              : 'Upload anything → Tell MAISHAA what you need → MAISHAA plans the workflow and runs the tools.'}
          </p>
        </div>

        {/* Local / Cloud Privacy Indicator Placeholder */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{language === 'bn' ? '🟢 লোকাল প্রসেসিং' : '🟢 Local Processing'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-500/30 bg-sky-950/40 text-sky-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>{language === 'bn' ? '☁ ক্লাউড এআই (ঐচ্ছিক)' : '☁ Cloud AI (Optional)'}</span>
          </div>
        </div>
      </div>

      {/* Task Input Box */}
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handlePlanTask();
              }
            }}
            placeholder={
              language === 'bn'
                ? 'যেমন: এই PDF থেকে summary বানাও, এই scan OCR করে টেক্সট দাও, সব ছবি 500KB-এর নিচে করো...'
                : 'e.g. Summarize this PDF, OCR this scanned invoice to text, compress all JPGs under 500KB, merge files into ZIP...'
            }
            rows={3}
            className="w-full px-4 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 text-slate-100 placeholder-slate-500 text-sm leading-relaxed outline-hidden transition-all resize-none shadow-inner"
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {instruction && (
              <button
                onClick={() => setInstruction('')}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handlePlanTask()}
              disabled={isPlanning || (!instruction.trim() && localFiles.length === 0)}
              className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <span>{language === 'bn' ? 'কার্যপ্রণালী দেখুন (Run Task)' : 'Run Task'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Natural Language Starter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs text-slate-400 shrink-0 font-medium">
            {language === 'bn' ? 'উদাহরণ:' : 'Quick examples:'}
          </span>
          {starterChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInstruction(chip.text);
                handlePlanTask(chip.text);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs whitespace-nowrap transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop File Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-teal-400 bg-teal-500/10'
            : 'border-slate-700/90 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />

        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-teal-400 shadow-inner">
          <Upload className="w-5 h-5" />
        </div>

        <div className="text-xs sm:text-sm text-slate-200 font-medium">
          <span className="text-teal-400 font-semibold underline underline-offset-4">
            {language === 'bn' ? 'ফাইল নির্বাচন করুন' : 'Click to browse files'}
          </span>{' '}
          {language === 'bn'
            ? 'অথবা এখানে ড্র্যাগ ও ড্রপ করুন'
            : 'or drag and drop your files here'}
        </div>
        <p className="text-[11px] text-slate-400">
          PDF, JPEG, PNG, WebP, DOCX, XLSX, CSV, PPTX, TXT
        </p>
      </div>

      {/* Selected Files Badge & Classification Bar */}
      {localFiles.length > 0 && (
        <div className="space-y-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                {language === 'bn'
                  ? `${localFiles.length}টি ফাইল নির্বাচিত:`
                  : `${localFiles.length} Selected File(s):`}
              </span>
              <span className="text-[11px] font-mono text-teal-400">
                ({formatFileSize(localFiles.reduce((acc, f) => acc + f.size, 0))})
              </span>
            </div>

            <button
              onClick={clearAllFiles}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 self-start sm:self-center"
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'সব ফাইল মুছুন' : 'Clear All'}</span>
            </button>
          </div>

          {/* File Pills List */}
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            {localFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs text-slate-200"
              >
                <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate max-w-[180px] font-mono text-[11px]">
                  {file.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatFileSize(file.size)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="text-slate-400 hover:text-rose-400 transition-colors ml-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Document Intelligence Classification Display */}
          {currentTask?.classification && currentTask.classification.type !== 'UNKNOWN' && (
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">
                  {language === 'bn' ? 'শনাক্তকৃত ডকুমেন্ট ধরন:' : 'Document Classification:'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20 text-[11px]">
                  {language === 'bn'
                    ? currentTask.classification.labelBn
                    : currentTask.classification.label}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({Math.round(currentTask.classification.confidence * 100)}% {language === 'bn' ? 'নিশ্চিত' : 'confidence'})
                </span>
              </div>

              {currentTask.classification.reasonsBn?.[0] && (
                <span className="text-[11px] text-slate-400 italic">
                  {language === 'bn'
                    ? currentTask.classification.reasonsBn[0]
                    : currentTask.classification.reasons[0]}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Smart Contextual Suggestions based on Uploaded Files */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-slate-400 font-medium block">
            {language === 'bn'
              ? 'নির্বাচিত ফাইলের জন্য সম্ভাব্য দ্রুত কাজসমূহ:'
              : 'Smart suggestions for selected files:'}
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug) => (
              <button
                key={sug.id}
                onClick={() => {
                  const textToFill =
                    language === 'bn'
                      ? sug.promptTemplateBn || sug.promptTemplate
                      : sug.promptTemplate;
                  setInstruction(textToFill);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-teal-500/40 text-slate-200 text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>{language === 'bn' ? sug.labelBn : sug.label}</span>
                {sug.isCloudAi ? (
                  <span title="Cloud AI">
                    <Cloud className="w-3 h-3 text-sky-400" />
                  </span>
                ) : (
                  <span title="Local Browser">
                    <Cpu className="w-3 h-3 text-teal-400" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WORKFLOW PLANNER VIEW (When task is planned) */}
      {currentTask && (
        <div className="pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-teal-500/20 text-teal-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">
                {language === 'bn' ? 'প্রস্তাবিত কার্যপ্রণালী (Workflow Preview)' : 'Workflow Preview'}
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono text-[10px] text-teal-300 font-bold">
                {currentTask.detectedIntent}
              </span>
            </div>

            {/* Cancel & Continue Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCurrentTask(null);
                  showNotification(
                    language === 'bn' ? 'কার্যপ্রণালী বাতিল করা হয়েছে' : 'Workflow preview cancelled'
                  );
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'Cancel (বাতিল)' : 'Cancel'}</span>
              </button>

              <button
                onClick={() => {
                  showNotification(
                    language === 'bn'
                      ? 'কার্যপ্রণালী যাচাই সম্পন্ন। পরবর্তী নির্দেশের জন্য প্রস্তুত।'
                      : 'Workflow preview confirmed and ready.'
                  );
                }}
                className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{language === 'bn' ? 'Continue (এগিয়ে যান)' : 'Continue'}</span>
              </button>
            </div>
          </div>

          {/* Workflow Steps List */}
          <div className="space-y-2.5">
            {currentTask.workflowSteps.map((step) => (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  step.supportStatus === 'NOT_YET_SUPPORTED'
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step.stepNumber}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-white">
                        {language === 'bn' ? step.titleBn : step.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {language === 'bn' ? step.descriptionBn : step.description}
                      </p>
                    </div>
                  </div>

                  {/* Mode & Status Badges */}
                  <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center pl-7 sm:pl-0 flex-wrap">
                    {/* Execution Mode: LOCAL or CLOUD AI */}
                    {step.mode === 'LOCAL' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-semibold">
                        <Cpu className="w-3 h-3" />
                        <span>LOCAL</span>
                      </span>
                    )}

                    {step.mode === 'CLOUD_AI' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[10px] font-semibold">
                        <Cloud className="w-3 h-3" />
                        <span>CLOUD AI</span>
                      </span>
                    )}

                    {step.mode === 'USER_CONFIRMATION' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                        <UserCheck className="w-3 h-3" />
                        <span>CONFIRMATION</span>
                      </span>
                    )}

                    {/* Step Status: planned / ready */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase border ${
                        step.stepStatus === 'ready'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {step.stepStatus || 'planned'}
                    </span>

                    {/* Support Status */}
                    {step.supportStatus === 'NOT_YET_SUPPORTED' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>NOT YET SUPPORTED</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* If Not Supported, Show Honest Explanation & Alternative */}
                {step.supportStatus === 'NOT_YET_SUPPORTED' && (
                  <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 text-[11px] text-amber-200/90 space-y-1">
                    <p className="font-medium">
                      ⚠️ {language === 'bn' ? step.unsupportedReasonBn : step.unsupportedReason}
                    </p>
                    {step.alternativeProposalBn && (
                      <p className="text-slate-300">
                        <strong className="text-teal-400">
                          {language === 'bn' ? 'বিকল্প কার্যপ্রণালী: ' : 'Alternative Proposal: '}
                        </strong>
                        {language === 'bn'
                          ? step.alternativeProposalBn
                          : step.alternativeProposal}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Warnings Bar if any */}
          {currentTask.warningsBn.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {language === 'bn'
                  ? currentTask.warningsBn.join(' ')
                  : currentTask.warnings.join(' ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

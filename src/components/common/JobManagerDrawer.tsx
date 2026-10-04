import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatFileSize } from '../../utils/fileDetection';
import { downloadFileOnce } from '../../utils/downloadHelper';

import {
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Download,
  Trash2,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const JobManagerDrawer: React.FC = () => {
  const {
    jobs,
    isJobDrawerOpen,
    setIsJobDrawerOpen,
    removeJob,
    clearJobs,
    t,
    language,
  } = useWorkspace();

  if (!isJobDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                {t.nav.jobs}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? `${jobs.length}টি প্রসেসিং কাজ রেকর্ড করা আছে`
                  : `${jobs.length} jobs in queue/history`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {jobs.length > 0 && (
              <button
                onClick={clearJobs}
                className="text-xs px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors flex items-center gap-1"
                title="Clear finished jobs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t.common.clearAll}
              </button>
            )}
            <button
              onClick={() => setIsJobDrawerOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {jobs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 p-6">
              <Clock className="w-10 h-10 text-slate-600 mb-3" />
              <p className="font-medium text-slate-300">
                {language === 'bn'
                  ? 'কোন সক্রিয় কাজ নেই'
                  : 'No active or recent jobs'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {language === 'bn'
                  ? 'ইউনিভার্সাল ওয়ার্কস্পেস বা স্টুডিও থেকে কোনো অ্যাকশন চালালে এখানে দেখতে পাবেন।'
                  : 'Start an action from Universal Workspace or any Studio to track progress.'}
              </p>
            </div>
          ) : (
            jobs.map((job) => {
              const isCompleted = job.status === 'COMPLETED';
              const isFailed = job.status === 'FAILED';
              const isProcessing = job.status === 'PROCESSING';

              return (
                <div
                  key={job.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/70 transition-all flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/20">
                          {job.toolType}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(job.startedTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 mt-1 truncate max-w-[260px]">
                        {job.fileNames.join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-[11px] text-teal-400 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                          {t.common.completed}
                        </span>
                      )}
                      {isFailed && (
                        <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          {t.common.failed}
                        </span>
                      )}
                      {isProcessing && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                          {t.common.processing}
                        </span>
                      )}
                      <button
                        onClick={() => removeJob(job.id)}
                        className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-700/50"
                        title={t.common.remove}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Size stats */}
                  <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-700/50 pt-2">
                    <div>
                      {language === 'bn' ? 'আসল:' : 'Orig:'}{' '}
                      <span className="text-slate-300 font-semibold">
                        {formatFileSize(job.originalSize)}
                      </span>
                    </div>

                    {job.outputSize !== undefined && (
                      <div className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span>
                          {language === 'bn' ? 'ফলাফল:' : 'New:'}{' '}
                          <span className="text-teal-300 font-semibold">
                            {formatFileSize(job.outputSize)}
                          </span>
                        </span>
                        {job.reductionPercentage !== undefined && (
                          <span
                            className={`ml-1 px-1.5 py-0.2 rounded text-[10px] ${
                              job.reductionPercentage > 0
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {job.reductionPercentage > 0
                              ? `-${job.reductionPercentage}%`
                              : '0%'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error display */}
                  {job.errorState && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                      {job.errorState}
                    </div>
                  )}

                  {/* Notes / Honesty messages */}
                  {job.notes && (
                    <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                      {job.notes}
                    </div>
                  )}

                  {/* Download button if completed */}
                  {isCompleted && job.outputUrl && (
                    <button
                      type="button"
                      onClick={() => downloadFileOnce(job.outputUrl!, job.outputFilename || 'processed_file')}
                      className="mt-1 w-full py-2 px-3 rounded-lg bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t.common.download} ({job.outputFilename})
                    </button>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatFileSize } from '../../utils/fileDetection';
import {
  X,
  History,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const SessionHistoryModal: React.FC = () => {
  const {
    history,
    clearHistory,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    t,
    language,
  } = useWorkspace();

  if (!isHistoryModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                {t.nav.recent}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'বর্তমান ব্রাউজার সেশনে প্রসেস করা ফাইলসমূহের মেটাডাটা রেকর্ড'
                  : 'Metadata record for files processed in this browser session'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t.common.clearHistory}
              </button>
            )}
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational Privacy notice */}
        <div className="px-5 py-2.5 bg-teal-950/40 border-b border-teal-900/30 flex items-center gap-2 text-xs text-teal-300">
          <Info className="w-4 h-4 shrink-0 text-teal-400" />
          <span>
            {language === 'bn'
              ? 'নিরাপত্তা নিশ্চয়তা: এই সেশন হিস্ট্রি ব্রাউজারের মেমরিতে থাকে এবং ব্রাউজার রিলোড বা বন্ধ করলে মুছে যায়।'
              : 'Privacy guarantee: This session log is in-memory only and is wiped when you close or reload the browser.'}
          </span>
        </div>

        {/* Modal Content / Table */}
        <div className="p-5 overflow-y-auto flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <History className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="font-medium text-slate-300">
                {t.common.emptyHistory}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {language === 'bn'
                  ? 'আপনি যখন কোনো ফাইল প্রসেস করবেন, তার তথ্য এখানে লিপিবদ্ধ থাকবে।'
                  : 'Processed files will show here with their size reduction and status.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 font-medium">
                      {language === 'bn' ? 'সময়' : 'Time'}
                    </th>
                    <th className="pb-2.5 font-medium">
                      {language === 'bn' ? 'টুল' : 'Tool'}
                    </th>
                    <th className="pb-2.5 font-medium">
                      {language === 'bn' ? 'ফাইলের নাম' : 'Filename'}
                    </th>
                    <th className="pb-2.5 font-medium">
                      {language === 'bn' ? 'আসল সাইজ' : 'Orig Size'}
                    </th>
                    <th className="pb-2.5 font-medium">
                      {language === 'bn' ? 'ফলাফল' : 'New Size'}
                    </th>
                    <th className="pb-2.5 font-medium text-right">
                      {language === 'bn' ? 'স্ট্যাটাস' : 'Status'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {item.time}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20">
                            {item.toolUsed}
                          </span>
                          {item.processingMode === 'CLOUD_AI' ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              CLOUD AI
                            </span>
                          ) : item.processingMode === 'LOCAL' ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              LOCAL
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5 font-sans font-medium text-slate-200 truncate max-w-[160px]">
                        {item.filename}
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {formatFileSize(item.sizeBefore)}
                      </td>
                      <td className="py-2.5 text-teal-300">
                        {item.sizeAfter !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <span>{formatFileSize(item.sizeAfter)}</span>
                            {item.reductionPct !== undefined && (
                              <span
                                className={`text-[10px] px-1 py-0.2 rounded font-sans ${
                                  item.reductionPct > 0
                                    ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                                    : 'text-slate-500'
                                }`}
                              >
                                {item.reductionPct > 0
                                  ? `-${item.reductionPct}%`
                                  : '0%'}
                              </span>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 text-right font-sans">
                        {item.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.common.completed}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {t.common.failed}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={() => setIsHistoryModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            {t.privacyModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};

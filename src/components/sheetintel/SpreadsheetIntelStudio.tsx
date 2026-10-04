import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  parseSpreadsheet,
  exportSheetToCsvBlob,
  cleanSpreadsheetRows,
  WorkbookAnalysisResult,
  SheetAnalysis,
} from '../../services/sheetIntelService';
import { PrivacyIndicator } from '../common/PrivacyIndicator';
import { formatFileSize, generateSafeOutputFilename } from '../../utils/fileDetection';
import {
  Table,
  Upload,
  Download,
  Sparkles,
  AlertTriangle,
  Loader2,
  Trash2,
  CheckCircle2,
  Columns,
  Hash,
} from 'lucide-react';

import { downloadFileOnce } from '../../utils/downloadHelper';

export const SpreadsheetIntelStudio: React.FC = () => {
  const {
    t,
    language,
    stagedFiles,
    addJob,
    updateJob,
    showNotification,
    openAiAssistantWithContext,
  } = useWorkspace();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<WorkbookAnalysisResult | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cleanedRows, setCleanedRows] = useState<Array<Record<string, any>> | null>(null);


  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      const sheet = stagedFiles.find(
        (f) =>
          f.name.endsWith('.xlsx') ||
          f.name.endsWith('.xls') ||
          f.name.endsWith('.csv') ||
          f.type.includes('spreadsheet') ||
          f.type.includes('csv')
      );
      if (sheet) loadWorkbook(sheet);
    }
  }, [stagedFiles]);

  const loadWorkbook = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setErrorMessage(null);
    setCleanedRows(null);

    const jobId = addJob({
      toolType: 'SHEET INTEL',
      fileNames: [file.name],
      originalSize: file.size,
      status: 'PROCESSING',
    });

    try {
      const res = await parseSpreadsheet(file);
      setWorkbook(res);
      setActiveSheetName(res.sheetNames[0]);

      updateJob(jobId, {
        status: 'COMPLETED',
        outputSize: res.activeSheet.rowCount,
        notes: `Sheets: ${res.sheetNames.length} | Rows: ${res.activeSheet.rowCount}`,
      });

      showNotification(
        language === 'bn'
          ? `স্প্রেডশিট সফলভাবে লোড হয়েছে (${res.sheetNames.length}টি শিট)`
          : `Spreadsheet loaded (${res.sheetNames.length} sheets)`
      );
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to read spreadsheet';
      setErrorMessage(msg);
      updateJob(jobId, {
        status: 'FAILED',
        errorState: msg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentSheet: SheetAnalysis | undefined =
    workbook && activeSheetName ? workbook.allSheets[activeSheetName] : undefined;

  const handleExportCsv = async () => {
    if (!selectedFile || !activeSheetName || isDownloading) return;
    try {
      setIsDownloading(true);
      const blob = await exportSheetToCsvBlob(selectedFile, activeSheetName);
      const filename = generateSafeOutputFilename(
        selectedFile.name,
        `sheet_${activeSheetName.replace(/\s+/g, '_')}`,
        'csv'
      );
      await downloadFileOnce(blob, filename);
      showNotification(language === 'bn' ? 'CSV ডাউনলোড সম্পন্ন হয়েছে' : 'CSV downloaded successfully');
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsDownloading(false);
    }
  };


  const handleCleanDuplicates = () => {
    if (!currentSheet) return;
    const cleaned = cleanSpreadsheetRows(currentSheet.sampleRows);
    setCleanedRows(cleaned);
    showNotification(
      language === 'bn'
        ? `${currentSheet.duplicateRowCount}টি ডুপ্লিকেট রো প্রিভিউ থেকে অপসারণ করা হয়েছে`
        : `Removed duplicates from view`
    );
  };

  const rowsToDisplay = cleanedRows || (currentSheet ? currentSheet.sampleRows : []);

  const launchAiWithSheetContext = () => {
    if (!currentSheet) return;
    const summaryText = `SPREADSHEET SUMMARY (${activeSheetName}):
Total Rows: ${currentSheet.rowCount}
Total Columns: ${currentSheet.columnCount}
Headers: ${currentSheet.headers.join(', ')}
Column Data Types: ${JSON.stringify(currentSheet.columnTypes, null, 2)}
Sample Data Rows (First 15):
${JSON.stringify(currentSheet.sampleRows.slice(0, 15), null, 2)}`;

    openAiAssistantWithContext(
      summaryText,
      selectedFile ? `${selectedFile.name} [${activeSheetName}]` : 'Spreadsheet Data'
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Table className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold text-teal-400 font-mono">
              SPREADSHEET INTELLIGENCE STUDIO (XLSX / CSV)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t.sheetIntel.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {t.sheetIntel.subtitle}
          </p>
        </div>

        <PrivacyIndicator mode="LOCAL" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Loader & Metrics */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <input
              id="sheetIntelFileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  loadWorkbook(e.target.files[0]);
                }
              }}
            />

            {!selectedFile ? (
              <label
                htmlFor="sheetIntelFileInput"
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-800/20 hover:bg-slate-800/40 cursor-pointer transition-all"
              >
                <Upload className="w-8 h-8 text-teal-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  {language === 'bn'
                    ? 'এক্সেল বা সিএসভি ফাইল নির্বাচন করুন'
                    : 'Select Excel or CSV File (XLSX, CSV)'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  XLSX, XLS, CSV
                </span>
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-800/50">
                <div className="min-w-0">
                  <p className="font-semibold text-white text-xs truncate max-w-[180px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <label
                  htmlFor="sheetIntelFileInput"
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/60 text-xs font-medium cursor-pointer"
                >
                  {language === 'bn' ? 'পরিবর্তন' : 'Change'}
                </label>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                <span>{language === 'bn' ? 'স্প্রেডশিট লোড হচ্ছে...' : 'Analyzing workbook sheets...'}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Sheet Selector & Metrics */}
          {workbook && currentSheet && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {t.sheetIntel.sheets}
                </h3>
                <button
                  type="button"
                  onClick={launchAiWithSheetContext}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask MAISHAA</span>
                </button>
              </div>

              {/* Sheet Switcher */}
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {workbook.sheetNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setActiveSheetName(name);
                      setCleanedRows(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      activeSheetName === name
                        ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {/* Sheet Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">{t.sheetIntel.rows}</span>
                  <span className="text-base font-bold text-teal-300 font-mono">
                    {currentSheet.rowCount.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">{t.sheetIntel.cols}</span>
                  <span className="text-base font-bold text-white font-mono">
                    {currentSheet.columnCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">{t.sheetIntel.emptyRows}</span>
                  <span className="text-sm font-semibold text-slate-400 font-mono">
                    {currentSheet.emptyRowCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">{t.sheetIntel.duplicates}</span>
                  <span
                    className={`text-sm font-bold font-mono ${
                      currentSheet.duplicateRowCount > 0 ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {currentSheet.duplicateRowCount}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                {currentSheet.duplicateRowCount > 0 && !cleanedRows && (
                  <button
                    type="button"
                    onClick={handleCleanDuplicates}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.sheetIntel.cleanDuplicates}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={isDownloading}
                  className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.sheetIntel.exportCsv}</span>
                </button>

              </div>
            </div>
          )}
        </div>

        {/* Right Column: Table Preview */}
        <div className="lg:col-span-8 space-y-5">
          {currentSheet ? (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Columns className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-bold text-white">
                    {activeSheetName} — Table Preview (100 Rows)
                  </h3>
                </div>
                {cleanedRows && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                    Duplicates Removed
                  </span>
                )}
              </div>

              {/* Table Container */}
              <div className="w-full overflow-x-auto max-h-[500px] rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-800 border-b border-slate-700 text-slate-300">
                    <tr>
                      <th className="p-2.5 font-mono text-[11px] text-slate-500 w-12 text-center">#</th>
                      {currentSheet.headers.map((hdr) => (
                        <th key={hdr} className="p-2.5 font-semibold text-slate-200 whitespace-nowrap">
                          <div>{hdr}</div>
                          <span className="text-[10px] text-teal-400 font-mono font-normal">
                            {currentSheet.columnTypes[hdr]}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {rowsToDisplay.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40">
                        <td className="p-2 text-slate-500 text-center text-[10px]">{rIdx + 1}</td>
                        {currentSheet.headers.map((hdr) => (
                          <td key={hdr} className="p-2 text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                            {String(row[hdr] !== undefined ? row[hdr] : '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
              <Table className="w-12 h-12 text-slate-700 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">
                {language === 'bn' ? 'স্প্রেডশিট লোড করুন' : 'Load Spreadsheet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {language === 'bn'
                  ? 'এক্সেল বা সিএসভি ফাইল আপলোড করলে স্বয়ংক্রিয়ভাবে টেবিল প্রিভিউ এবং কলাম ডেটা টাইপ দেখা যাবে।'
                  : 'Upload XLSX or CSV to inspect sheets, data types, duplicate rows, and export clean CSVs.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

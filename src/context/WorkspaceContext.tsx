import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ToolCategory,
  LanguageMode,
  ProcessedJob,
  SessionHistoryItem,
} from '../types/workspace';
import { translations, Translations } from '../i18n/translations';
import { revokeManagedObjectUrl, revokeAllManagedObjectUrls } from '../utils/privacy';

interface WorkspaceContextType {
  activeModule: ToolCategory;
  setActiveModule: (mod: ToolCategory) => void;
  language: LanguageMode;
  setLanguage: (lang: LanguageMode) => void;
  t: Translations;

  // Staged files from Universal Workspace
  stagedFiles: File[];
  setStagedFiles: (files: File[]) => void;
  addStagedFiles: (files: File[]) => void;
  clearStagedFiles: () => void;

  // Active Document Text Context for AI & Intelligence
  activeDocumentText: string;
  setActiveDocumentText: (text: string) => void;
  activeDocumentName: string;
  setActiveDocumentName: (name: string) => void;
  openAiAssistantWithContext: (text: string, filename: string) => void;

  // AI Assistant State & Consent
  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: (open: boolean) => void;
  isAiConsentModalOpen: boolean;
  setIsAiConsentModalOpen: (open: boolean) => void;
  hasUserConsentedToAi: boolean;
  setHasUserConsentedToAi: (consented: boolean) => void;
  requestAiConsent: (onConsentGranted: () => void) => void;
  executePendingAiAction: () => void;

  // Jobs Manager
  jobs: ProcessedJob[];
  addJob: (job: Omit<ProcessedJob, 'id' | 'startedTime'>) => string;
  updateJob: (id: string, updates: Partial<ProcessedJob>) => void;
  removeJob: (id: string) => void;
  clearJobs: () => void;
  isJobDrawerOpen: boolean;
  setIsJobDrawerOpen: (open: boolean) => void;

  // Session History (In-memory for current browser session)
  history: SessionHistoryItem[];
  addHistoryItem: (item: Omit<SessionHistoryItem, 'id' | 'time'>) => void;
  clearHistory: () => void;
  isHistoryModalOpen: boolean;
  setIsHistoryModalOpen: (open: boolean) => void;

  // Modals
  isPrivacyModalOpen: boolean;
  setIsPrivacyModalOpen: (open: boolean) => void;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (open: boolean) => void;
  futureModalData: { isOpen: boolean; title: string; desc: string; type: string } | null;
  openFutureModal: (title: string, desc: string, type: string) => void;
  closeFutureModal: () => void;

  // Quick Notification
  notification: string | null;
  showNotification: (msg: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModule] = useState<ToolCategory>('universal');
  const [language, setLanguage] = useState<LanguageMode>('bn');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [jobs, setJobs] = useState<ProcessedJob[]>([]);
  const [isJobDrawerOpen, setIsJobDrawerOpen] = useState(false);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [futureModalData, setFutureModalData] = useState<{
    isOpen: boolean;
    title: string;
    desc: string;
    type: string;
  } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Phase 2 AI & Document Context State
  const [activeDocumentText, setActiveDocumentText] = useState<string>('');
  const [activeDocumentName, setActiveDocumentName] = useState<string>('');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isAiConsentModalOpen, setIsAiConsentModalOpen] = useState<boolean>(false);
  const [hasUserConsentedToAi, setHasUserConsentedToAi] = useState<boolean>(false);
  const [pendingConsentCallback, setPendingConsentCallback] = useState<(() => void) | null>(null);

  const t = translations[language];

  // Clean memory on window unload
  useEffect(() => {
    const handleUnload = () => {
      revokeAllManagedObjectUrls();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const addStagedFiles = (newFiles: File[]) => {
    setStagedFiles((prev) => [...prev, ...newFiles]);
  };

  const clearStagedFiles = () => {
    setStagedFiles([]);
  };

  const openAiAssistantWithContext = (text: string, filename: string) => {
    setActiveDocumentText(text);
    setActiveDocumentName(filename);
    setIsAiDrawerOpen(true);
  };

  const requestAiConsent = (onConsentGranted: () => void) => {
    if (hasUserConsentedToAi) {
      onConsentGranted();
    } else {
      setPendingConsentCallback(() => onConsentGranted);
      setIsAiConsentModalOpen(true);
    }
  };

  const executePendingAiAction = () => {
    setHasUserConsentedToAi(true);
    setIsAiConsentModalOpen(false);
    if (pendingConsentCallback) {
      pendingConsentCallback();
      setPendingConsentCallback(null);
    }
  };

  const addJob = (jobData: Omit<ProcessedJob, 'id' | 'startedTime'>): string => {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newJob: ProcessedJob = {
      ...jobData,
      id,
      startedTime: Date.now(),
    };
    setJobs((prev) => [newJob, ...prev]);
    return id;
  };

  const updateJob = (id: string, updates: Partial<ProcessedJob>) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id === id) {
          const updated = { ...job, ...updates };
          if (updates.status === 'COMPLETED' || updates.status === 'FAILED') {
            updated.completedTime = Date.now();
            // Automatically record in session history (metadata only)
            addHistoryItem({
              toolUsed: updated.toolType,
              filename: updated.fileNames.join(', '),
              status: updates.status,
              sizeBefore: updated.originalSize,
              sizeAfter: updated.outputSize,
              reductionPct: updated.reductionPercentage,
              workflowSteps: updated.workflowSteps,
              processingMode: updated.processingMode,
              outputFilename: updated.outputFilename,
            });
          }
          return updated;
        }
        return job;
      })
    );
  };

  const removeJob = (id: string) => {
    setJobs((prev) => {
      const target = prev.find((j) => j.id === id);
      if (target?.outputUrl) {
        revokeManagedObjectUrl(target.outputUrl);
      }
      return prev.filter((j) => j.id !== id);
    });
  };

  const clearJobs = () => {
    jobs.forEach((j) => {
      if (j.outputUrl) revokeManagedObjectUrl(j.outputUrl);
    });
    setJobs([]);
  };

  const addHistoryItem = (item: Omit<SessionHistoryItem, 'id' | 'time'>) => {
    const newItem: SessionHistoryItem = {
      ...item,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHistory((prev) => [newItem, ...prev]);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const openFutureModal = (title: string, desc: string, type: string) => {
    setFutureModalData({ isOpen: true, title, desc, type });
  };

  const closeFutureModal = () => {
    setFutureModalData(null);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeModule,
        setActiveModule,
        language,
        setLanguage,
        t,
        stagedFiles,
        setStagedFiles,
        addStagedFiles,
        clearStagedFiles,
        activeDocumentText,
        setActiveDocumentText,
        activeDocumentName,
        setActiveDocumentName,
        openAiAssistantWithContext,
        isAiDrawerOpen,
        setIsAiDrawerOpen,
        isAiConsentModalOpen,
        setIsAiConsentModalOpen,
        hasUserConsentedToAi,
        setHasUserConsentedToAi,
        requestAiConsent,
        executePendingAiAction,
        jobs,
        addJob,
        updateJob,
        removeJob,
        clearJobs,
        isJobDrawerOpen,
        setIsJobDrawerOpen,
        history,
        addHistoryItem,
        clearHistory,
        isHistoryModalOpen,
        setIsHistoryModalOpen,
        isPrivacyModalOpen,
        setIsPrivacyModalOpen,
        isHelpModalOpen,
        setIsHelpModalOpen,
        futureModalData,
        openFutureModal,
        closeFutureModal,
        notification,
        showNotification,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

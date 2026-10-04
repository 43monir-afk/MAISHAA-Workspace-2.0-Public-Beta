import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { checkAiStatus, requestDocumentAi, AiStatusResult } from '../../services/aiService';
import { PrivacyIndicator } from '../common/PrivacyIndicator';
import {
  Sparkles,
  X,
  Send,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  FileText,
  Loader2,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { AiChatMessage } from '../../types/workspace';

export const AiAssistantDrawer: React.FC = () => {
  const {
    isAiDrawerOpen,
    setIsAiDrawerOpen,
    activeDocumentText,
    activeDocumentName,
    requestAiConsent,
    t,
    language,
    showNotification,
  } = useWorkspace();

  const [aiStatus, setAiStatus] = useState<AiStatusResult>({
    configured: false,
    status: 'NOT_CONFIGURED',
  });
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAiDrawerOpen) {
      checkAiStatus().then(setAiStatus);
    }
  }, [isAiDrawerOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isAiDrawerOpen) return null;

  const handleSend = async (promptToSend?: string) => {
    const prompt = (promptToSend || inputText).trim();
    if (!prompt) return;

    setErrorMessage(null);

    // If server is NOT_CONFIGURED, report immediately without fake simulation
    if (aiStatus.status === 'NOT_CONFIGURED') {
      setErrorMessage(t.aiAssistant.notConfigured);
      return;
    }

    // Require explicit consent before transmitting document text
    requestAiConsent(async () => {
      const userMsg: AiChatMessage = {
        id: `msg_${Date.now()}_u`,
        sender: 'user',
        text: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsGenerating(true);

      try {
        const response = await requestDocumentAi(
          prompt,
          activeDocumentText,
          'document_analysis',
          language
        );

        const aiMsg: AiChatMessage = {
          id: `msg_${Date.now()}_a`,
          sender: 'assistant',
          text: response.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAiOutput: true,
          groundedInDocument: true,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        setErrorMessage(err.message || 'AI request failed');
      } finally {
        setIsGenerating(false);
      }
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showNotification(language === 'bn' ? 'কপি করা হয়েছে' : 'Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setErrorMessage(null);
  };

  const chips = [
    { id: 'summarize', label: t.aiAssistant.chips.summarize },
    { id: 'explain', label: t.aiAssistant.chips.explain },
    { id: 'dates', label: t.aiAssistant.chips.dates },
    { id: 'actions', label: t.aiAssistant.chips.actions },
    { id: 'translate', label: t.aiAssistant.chips.translate },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-purple-500/20 flex items-center justify-between bg-slate-900/95 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 text-purple-300 border border-purple-500/35 shadow-[0_2px_12px_rgba(168,85,247,0.2)]">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  {t.aiAssistant.title}
                </h3>
                <PrivacyIndicator mode="CLOUD_AI" compact />
              </div>
              <p className="text-[11px] text-purple-300/80 mt-0.5">
                {language === 'bn'
                  ? 'ডকুমেন্ট-ভিত্তিক তথ্য বিশ্লেষণ ও সারসংক্ষেপ'
                  : 'Grounded Document Intelligence Assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Clear Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAiDrawerOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selected Context File Badge */}
        <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-slate-300 font-medium truncate max-w-[240px]">
              {activeDocumentName || (language === 'bn' ? 'কোনো নির্দিষ্ট ফাইল সক্রিয় নেই' : 'No active file selected')}
            </span>
          </div>
          {activeDocumentText && (
            <span className="text-[11px] font-mono text-slate-500 shrink-0">
              {activeDocumentText.length.toLocaleString()} {t.common.bytes}
            </span>
          )}
        </div>

        {/* Not Configured Banner if API key absent */}
        {!aiStatus.configured && (
          <div className="p-4 m-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{language === 'bn' ? 'এআই সার্ভার স্ট্যাটাস' : 'AI Server Configuration'}</span>
            </div>
            <p className="leading-relaxed">
              {t.aiAssistant.notConfigured}
            </p>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-200 text-sm">
                  {language === 'bn'
                    ? 'ডকুমেন্ট সম্পর্কে কীভাবে সাহায্য করতে পারি?'
                    : 'How can I assist with this document?'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {t.aiAssistant.subtitle}
                </p>
              </div>

              {/* Suggested quick chips */}
              <div className="pt-2 flex flex-col gap-2 max-w-sm mx-auto">
                {chips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleSend(chip.label)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-purple-950/20 hover:border-purple-500/40 text-left text-xs text-slate-300 hover:text-purple-200 transition-all flex items-center justify-between group"
                  >
                    <span>{chip.label}</span>
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-teal-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none space-y-2'
                  }`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-1.5 mb-1.5 text-[11px] text-teal-400">
                      <span className="font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Output
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Copy"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 font-mono px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))
          )}

          {isGenerating && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              <span>{language === 'bn' ? 'ডকুমেন্ট বিশ্লেষণ ও উত্তর তৈরি হচ্ছে...' : 'Analyzing document context...'}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.aiAssistant.askPlaceholder}
              disabled={isGenerating}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-teal-400 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={isGenerating || !inputText.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold transition-all shadow-[0_2px_12px_rgba(139,92,246,0.3)] active:translate-y-0.5"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{language === 'bn' ? 'ফলাফল সম্পূর্ণ ডকুমেন্টে গ্রাউন্ডেড' : 'Grounded in document context only'}</span>
            <span className="font-mono">gemini-3.8-flash</span>
          </div>
        </div>
      </div>
    </div>
  );
};

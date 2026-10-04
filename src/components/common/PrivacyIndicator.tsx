import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ShieldCheck, Cloud, Cpu } from 'lucide-react';

interface PrivacyIndicatorProps {
  mode: 'LOCAL' | 'CLOUD_AI';
  compact?: boolean;
}

export const PrivacyIndicator: React.FC<PrivacyIndicatorProps> = ({ mode, compact = false }) => {
  const { t, language } = useWorkspace();

  if (mode === 'LOCAL') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full font-mono text-[11px] font-semibold border ${
          compact
            ? 'px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'px-3 py-1 bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
        }`}
        title={t.privacyModes.local}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <Cpu className="w-3 h-3 text-emerald-400" />
        <span>
          {compact
            ? language === 'bn'
              ? 'লোকাল'
              : 'Local'
            : language === 'bn'
            ? '🟢 স্থানীয় প্রসেসিং'
            : '🟢 Local Processing'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-mono text-[11px] font-semibold border ${
        compact
          ? 'px-2 py-0.5 bg-sky-500/10 text-sky-400 border-sky-500/20'
          : 'px-3 py-1 bg-sky-950/40 text-sky-300 border-sky-800/40'
      }`}
      title={t.privacyModes.cloudAi}
    >
      <Cloud className="w-3.5 h-3.5 text-sky-400" />
      <span>
        {compact
          ? language === 'bn'
            ? 'ক্লাউড এআই'
            : 'Cloud AI'
          : language === 'bn'
          ? '☁ ক্লাউড এআই — অনুমতি প্রয়োজন'
          : '☁ Cloud AI — Consent Required'}
      </span>
    </div>
  );
};

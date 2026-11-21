import React, { useEffect, useState } from 'react';
import { Download, Monitor, KeyRound, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { SiteInfo, fetchSite, formatDate } from '../../services/authService';
import { Card, GhostButton, Notice, PageShell } from './ui';

export const DownloadPage: React.FC = () => {
  const { setActiveModule, language } = useWorkspace();
  const bn = language === 'bn';
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchSite().then((r) => (r.ok ? setSite(r.data) : setFailed(true)));
  }, []);

  const d = site?.desktop;
  const platforms = [
    { id: 'win', label: 'Windows 10 / 11 (64-bit)', url: d?.windowsUrl || '', primary: true },
    { id: 'mac', label: 'macOS', url: d?.macUrl || '', primary: false },
    { id: 'linux', label: 'Linux', url: d?.linuxUrl || '', primary: false },
  ].filter((p) => p.url || p.id === 'win');

  const steps = [
    { icon: Download, bn: 'ইনস্টলার ডাউনলোড করে চালান।', en: 'Download and run the installer.' },
    { icon: Monitor, bn: 'অ্যাপ খুলুন — ফ্রি মোডে সরাসরি ব্যবহার করা যায়।', en: 'Open the app — it works in Free mode right away.' },
    { icon: KeyRound, bn: 'মেনু থেকে "Activate Pro" বেছে Pro কী বসান।', en: 'Choose "Activate Pro" and enter your key.' },
    { icon: ShieldCheck, bn: 'একটি কী নির্দিষ্টসংখ্যক পিসিতে চলে; পিসি বদলালে অ্যাপ থেকে Deactivate করুন।', en: 'A key works on a limited number of PCs; use Deactivate when you change PC.' },
  ];

  return (
    <PageShell
      title={bn ? 'পিসি অ্যাপ ডাউনলোড' : 'Download the desktop app'}
      subtitle={
        bn
          ? 'মায়িশা ওয়ার্কস্পেস এখন উইন্ডোজ অ্যাপ হিসেবেও। ফ্রি মোডে চালান অথবা Pro কী দিয়ে সব ফিচার আনলক করুন।'
          : 'MAISHAA WORKSPACE as a Windows app. Run it in Free mode, or unlock every feature with a Pro key.'
      }
    >
      <Card>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          {d?.version && <span>{bn ? 'সংস্করণ' : 'Version'} <b className="text-slate-200">{d.version}</b></span>}
          {d?.updatedAt && <span>{bn ? 'আপডেট' : 'Updated'} {formatDate(d.updatedAt, language)}</span>}
        </div>
        <div className="mt-4 space-y-3">
          {platforms.map((p) =>
            p.url ? (
              <a
                key={p.id}
                href={p.url}
                rel="noopener noreferrer"
                className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                  p.primary ? 'bg-teal-500 hover:bg-teal-400 text-slate-950' : 'border border-slate-700 hover:bg-slate-800 text-slate-100'
                }`}
              >
                <span className="flex items-center gap-2"><Download className="w-4 h-4" />{bn ? 'ডাউনলোড' : 'Download'} — {p.label}</span>
              </a>
            ) : (
              <div key={p.id} className="rounded-xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-400">
                {p.label}: {bn ? 'ইনস্টলার এখনো আপলোড হয়নি — শীঘ্রই আসছে।' : 'installer not published yet — coming soon.'}
              </div>
            )
          )}
        </div>
        {d?.releaseNotes && <p className="mt-4 text-xs text-slate-400 whitespace-pre-line">{d.releaseNotes}</p>}
        {failed && <div className="mt-4"><Notice kind="error">{bn ? 'ডাউনলোড তথ্য লোড করা যায়নি।' : 'Could not load download info.'}</Notice></div>}
      </Card>

      <Card className="mt-5">
        <h2 className="text-sm font-bold text-white">{bn ? 'কীভাবে Pro চালু করবেন' : 'How to activate Pro'}</h2>
        <ol className="mt-3 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 w-7 h-7 shrink-0 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                <s.icon className="w-4 h-4 text-teal-300" />
              </span>
              <span className="pt-1">{bn ? s.bn : s.en}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <GhostButton onClick={() => setActiveModule('pricing')}>{bn ? 'Pro প্ল্যান দেখুন' : 'See Pro plan'}</GhostButton>
          <GhostButton onClick={() => setActiveModule('contact')}>{bn ? 'কী কিনতে যোগাযোগ' : 'Contact to buy a key'}</GhostButton>
        </div>
        <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
          {bn
            ? 'নোট: এই সংস্করণ অনলাইন ওয়ার্কস্পেস লোড করে (ইন্টারনেট লাগবে)। ফাইল প্রসেসিং আপনার পিসিতেই হয়।'
            : 'Note: this version loads the online workspace (internet required). File processing still happens on your PC.'}
        </p>
      </Card>
    </PageShell>
  );
};

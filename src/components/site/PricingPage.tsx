import React, { useEffect, useState } from 'react';
import { Check, Minus, Crown, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PLAN_COMPARISON } from '../../config/plans';
import { fetchSite } from '../../services/authService';
import { Card, GhostButton, PageShell, PlanBadge, PrimaryButton } from './ui';

const Cell: React.FC<{ v: string | boolean }> = ({ v }) =>
  v === true ? (
    <Check className="w-4 h-4 text-emerald-400 mx-auto" aria-label="Included" />
  ) : v === false ? (
    <Minus className="w-4 h-4 text-slate-600 mx-auto" aria-label="Not included" />
  ) : (
    <span className="text-xs text-slate-200">{v}</span>
  );

export const PricingPage: React.FC = () => {
  const { setActiveModule, language } = useWorkspace();
  const { user, plan } = useAuth();
  const bn = language === 'bn';
  const [howToBuy, setHowToBuy] = useState('');

  useEffect(() => {
    fetchSite().then((r) => r.ok && setHowToBuy(r.data.howToBuy || ''));
  }, []);

  return (
    <PageShell
      wide
      title={bn ? 'ফ্রি ও Pro প্ল্যান' : 'Free & Pro plans'}
      subtitle={
        bn
          ? 'বেশিরভাগ টুল সবার জন্য ফ্রি। এআই কমান্ড সেন্টার, ব্যাচ প্রসেসিং, উন্নত পিডিএফ টুল এবং বেশি এআই সীমা Pro-তে।'
          : 'Most tools are free for everyone. The AI Command Center, batch processing, advanced PDF tools and higher AI limits are in Pro.'
      }
    >
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white">Free</h2>
            <PlanBadge plan="free" />
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {bn ? 'প্রতিদিনের অফিস কাজের জন্য যথেষ্ট।' : 'Everything you need for everyday office work.'}
          </p>
          <div className="mt-5">
            {user ? (
              plan === 'free' && <p className="text-xs text-teal-300 font-semibold">{bn ? 'আপনার বর্তমান প্ল্যান' : 'Your current plan'}</p>
            ) : (
              <PrimaryButton onClick={() => setActiveModule('signin')}>{bn ? 'ফ্রি অ্যাকাউন্ট খুলুন' : 'Create free account'}</PrimaryButton>
            )}
          </div>
        </Card>

        <Card className="border-amber-400/40 bg-gradient-to-b from-amber-400/10 to-slate-900/70">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-300" /> Pro
            </h2>
            <PlanBadge plan="pro" />
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {bn ? 'সব ফিচার + পিসি অ্যাপে সম্পূর্ণ আনলক। লাইসেন্স কী দিয়ে চালু হয়।' : 'Every feature, plus the full desktop app. Activated with a licence key.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {plan === 'pro' ? (
              <p className="text-xs text-amber-300 font-semibold">{bn ? 'আপনার Pro সক্রিয় আছে' : 'Your Pro plan is active'}</p>
            ) : (
              <>
                <PrimaryButton onClick={() => setActiveModule('contact')}>{bn ? 'Pro কী কিনুন' : 'Get a Pro key'}</PrimaryButton>
                <GhostButton onClick={() => setActiveModule(user ? 'account' : 'signin')}>{bn ? 'কী আছে? সক্রিয় করুন' : 'Have a key? Activate'}</GhostButton>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto p-0 sm:p-0">
        <table className="w-full text-left min-w-[560px]">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold">{bn ? 'ফিচার' : 'Feature'}</th>
              <th className="px-5 py-3 font-semibold text-center w-40">Free</th>
              <th className="px-5 py-3 font-semibold text-center w-40 text-amber-300">Pro</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARISON.map((row) => (
              <tr key={row.labelEn} className="border-b border-slate-800/70 last:border-0">
                <td className="px-5 py-3 text-sm text-slate-200">{bn ? row.labelBn : row.labelEn}</td>
                <td className="px-5 py-3 text-center"><Cell v={row.free} /></td>
                <td className="px-5 py-3 text-center bg-amber-400/5"><Cell v={row.pro} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-6 grid md:grid-cols-2 gap-5">
        <Card>
          <h3 className="text-sm font-bold text-white">{bn ? 'কীভাবে Pro কিনবেন' : 'How to buy Pro'}</h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed whitespace-pre-line">{howToBuy}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-bold text-white">{bn ? 'পিসি অ্যাপ' : 'Desktop app'}</h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            {bn ? 'অ্যাপটি ডাউনলোড করে ফ্রি মোডে চালান, তারপর Pro কী বসিয়ে সব আনলক করুন।' : 'Download the app, use it in Free mode, then enter your Pro key to unlock everything.'}
          </p>
          <GhostButton className="mt-4" onClick={() => setActiveModule('download')}>
            <Download className="w-4 h-4" />
            {bn ? 'ডাউনলোড পেজ' : 'Download page'}
          </GhostButton>
        </Card>
      </div>
    </PageShell>
  );
};

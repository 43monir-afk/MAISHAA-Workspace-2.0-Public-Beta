import React, { useEffect, useState } from 'react';
import { Crown, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AI_FEATURES } from '../../config/plans';
import { UsageInfo, changePassword, fetchUsage, formatDate } from '../../services/authService';
import { Card, Field, GhostButton, Notice, PageShell, PlanBadge, PrimaryButton } from './ui';

export const AccountPage: React.FC = () => {
  const { user, plan, loading, logout, redeem, refresh, isAdmin } = useAuth();
  const { setActiveModule, language, showNotification } = useWorkspace();
  const bn = language === 'bn';
  const [key, setKey] = useState('');
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  useEffect(() => {
    if (user) fetchUsage().then((r) => r.ok && setUsage(r.data));
  }, [user, plan]);

  if (loading) return <PageShell title={bn ? 'আমার অ্যাকাউন্ট' : 'My account'}><div aria-busy="true" /></PageShell>;
  if (!user) {
    return (
      <PageShell title={bn ? 'আমার অ্যাকাউন্ট' : 'My account'}>
        <Card>
          <p className="text-sm text-slate-300">{bn ? 'অ্যাকাউন্ট দেখতে সাইন ইন করুন।' : 'Sign in to see your account.'}</p>
          <PrimaryButton className="mt-4" onClick={() => setActiveModule('signin')}>{bn ? 'সাইন ইন' : 'Sign in'}</PrimaryButton>
        </Card>
      </PageShell>
    );
  }

  const submitKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyBusy(true);
    setKeyMsg(null);
    const res = await redeem(key);
    setKeyBusy(false);
    if (res.ok) {
      setKey('');
      setKeyMsg({ kind: 'ok', text: bn ? 'Pro সক্রিয় হয়েছে! সব ফিচার এখন খোলা।' : 'Pro activated! All features are unlocked.' });
      showNotification(bn ? 'Pro সক্রিয় হয়েছে' : 'Pro activated');
    } else setKeyMsg({ kind: 'error', text: res.error || 'Error' });
  };

  const submitPw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwBusy(true);
    setPwMsg(null);
    const res = await changePassword(cur, next);
    setPwBusy(false);
    if (res.ok) {
      setCur('');
      setNext('');
      setPwMsg({ kind: 'ok', text: bn ? 'পাসওয়ার্ড বদলানো হয়েছে।' : 'Password changed.' });
      refresh();
    } else setPwMsg({ kind: 'error', text: res.error || 'Error' });
  };

  const lic = user.license;

  return (
    <PageShell title={bn ? 'আমার অ্যাকাউন্ট' : 'My account'}>
      <div className="space-y-5">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold text-white">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <PlanBadge plan={plan} />
              {isAdmin && <GhostButton onClick={() => setActiveModule('admin')}>{bn ? 'অ্যাডমিন প্যানেল' : 'Admin panel'}</GhostButton>}
              <GhostButton onClick={async () => { await logout(); setActiveModule('universal'); }}>
                <LogOut className="w-4 h-4" />
                {bn ? 'সাইন আউট' : 'Sign out'}
              </GhostButton>
            </div>
          </div>
          {lic && (
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div><dt className="text-slate-500">{bn ? 'কী' : 'Key'}</dt><dd className="font-mono text-slate-200">…{lic.hint}</dd></div>
              <div><dt className="text-slate-500">{bn ? 'অবস্থা' : 'Status'}</dt><dd className="text-slate-200 capitalize">{lic.status}</dd></div>
              <div><dt className="text-slate-500">{bn ? 'মেয়াদ' : 'Expires'}</dt><dd className="text-slate-200">{lic.expiresAt ? formatDate(lic.expiresAt, language) : bn ? 'আজীবন' : 'Lifetime'}</dd></div>
              <div><dt className="text-slate-500">{bn ? 'পিসি' : 'PCs'}</dt><dd className="text-slate-200">{lic.devices}/{lic.maxDevices}</dd></div>
            </dl>
          )}
        </Card>

        {plan === 'free' && (
          <Card className="border-amber-400/30">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white"><KeyRound className="w-4 h-4 text-amber-300" />{bn ? 'Pro কী সক্রিয় করুন' : 'Activate a Pro key'}</h2>
            <form onSubmit={submitKey} className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <Field label={bn ? 'লাইসেন্স কী' : 'Licence key'} value={key} onChange={setKey} placeholder="MSHA-XXXXX-XXXXX-XXXXX-XXXXX" autoComplete="off" />
              </div>
              <PrimaryButton type="submit" busy={keyBusy} disabled={key.trim().length < 8}>{bn ? 'সক্রিয় করুন' : 'Activate'}</PrimaryButton>
            </form>
            {keyMsg && <div className="mt-3"><Notice kind={keyMsg.kind}>{keyMsg.text}</Notice></div>}
            <p className="mt-3 text-xs text-slate-500">
              {bn ? 'কী নেই? ' : 'No key? '}
              <button className="text-teal-300 underline" onClick={() => setActiveModule('contact')}>{bn ? 'কিনতে যোগাযোগ করুন' : 'Contact us to buy one'}</button>
            </p>
          </Card>
        )}
        {plan === 'pro' && !isAdmin && keyMsg && <Notice kind={keyMsg.kind}>{keyMsg.text}</Notice>}

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Crown className="w-4 h-4 text-teal-300" />{bn ? 'আজকের এআই ব্যবহার' : 'AI usage today'}</h2>
          <ul className="mt-3 divide-y divide-slate-800">
            {usage && (Object.keys(AI_FEATURES) as (keyof typeof AI_FEATURES)[]).map((f) => {
              const u = usage.features[f];
              const cfg = AI_FEATURES[f];
              return (
                <li key={f} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-slate-300">{bn ? cfg.labelBn : cfg.labelEn}</span>
                  <span className="text-xs font-mono text-slate-400">
                    {u && u.daily > 0 ? `${u.used} / ${u.daily}` : <span className="text-amber-300">Pro</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">{bn ? 'প্রতিদিন UTC মধ্যরাতে (বাংলাদেশ সময় সকাল ৬টা) রিসেট হয়।' : 'Resets daily at 00:00 UTC (06:00 Bangladesh time).'}</p>
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-white">{bn ? 'পাসওয়ার্ড বদলান' : 'Change password'}</h2>
          <form onSubmit={submitPw} className="mt-4 grid sm:grid-cols-2 gap-4 items-end">
            <Field label={bn ? 'বর্তমান পাসওয়ার্ড' : 'Current password'} type="password" value={cur} onChange={setCur} autoComplete="current-password" />
            <Field label={bn ? 'নতুন পাসওয়ার্ড' : 'New password'} type="password" value={next} onChange={setNext} autoComplete="new-password" hint={bn ? 'কমপক্ষে ৮ অক্ষর' : 'At least 8 characters'} />
            <div className="sm:col-span-2 flex items-center gap-3">
              <PrimaryButton type="submit" busy={pwBusy} disabled={!cur || next.length < 8}>{bn ? 'বদলান' : 'Update'}</PrimaryButton>
              {pwMsg && <Notice kind={pwMsg.kind}>{pwMsg.text}</Notice>}
            </div>
          </form>
        </Card>
      </div>
    </PageShell>
  );
};

import React from 'react';
import { Lock, Crown, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { GhostButton, PrimaryButton } from './ui';

/**
 * Wraps a Pro-only module / tab. Free and signed-out users see an upgrade card instead.
 * (Browser-side tools can only be soft-locked; AI endpoints are enforced on the server.)
 */
export const ProGate: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => {
  const { isPro, user, loading } = useAuth();
  const { setActiveModule, language } = useWorkspace();
  const bn = language === 'bn';

  if (isPro) return <>{children}</>;
  if (loading) return <div className="flex-1" aria-busy="true" />;

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center rounded-3xl border border-amber-400/30 bg-gradient-to-b from-amber-400/10 to-slate-900/80 p-8 shadow-2xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center">
          <Lock className="w-6 h-6 text-amber-300" />
        </div>
        <h2 className="mt-5 text-xl font-black text-white">
          {name} <span className="text-amber-300">· Pro</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          {bn
            ? 'এই ফিচারটি Pro প্ল্যানে পাওয়া যায়। Pro কী দিয়ে আনলক করুন।'
            : 'This feature is part of the Pro plan. Unlock it with a Pro licence key.'}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
          <PrimaryButton onClick={() => setActiveModule('pricing')}>
            <Crown className="w-4 h-4" />
            {bn ? 'প্ল্যান দেখুন' : 'See plans'}
          </PrimaryButton>
          {user ? (
            <GhostButton onClick={() => setActiveModule('account')}>{bn ? 'কী বসান' : 'Enter key'}</GhostButton>
          ) : (
            <GhostButton onClick={() => setActiveModule('signin')}>
              <LogIn className="w-4 h-4" />
              {bn ? 'সাইন ইন' : 'Sign in'}
            </GhostButton>
          )}
        </div>
      </div>
    </div>
  );
};

/** Small lock marker for tab/sidebar labels. */
export const ProMark: React.FC = () => (
  <span className="ml-1 inline-flex items-center rounded bg-amber-400 px-1 text-[9px] font-black leading-4 text-slate-950">PRO</span>
);

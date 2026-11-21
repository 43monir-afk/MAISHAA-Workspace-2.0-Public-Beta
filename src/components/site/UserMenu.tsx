import React, { useEffect, useRef, useState } from 'react';
import { Crown, LogIn, LogOut, Settings, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

/** Header account area: Sign in button, or avatar menu with plan badge. */
export const UserMenu: React.FC = () => {
  const { user, plan, isAdmin, logout, source } = useAuth();
  const { setActiveModule, language } = useWorkspace();
  const bn = language === 'bn';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (m: Parameters<typeof setActiveModule>[0]) => {
    setOpen(false);
    setActiveModule(m);
  };

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        {plan === 'pro' && source === 'device' && (
          <span className="hidden sm:inline-flex px-2 py-1 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black">PRO</span>
        )}
        <button
          onClick={() => setActiveModule('signin')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0a192f] hover:bg-[#12284a] text-white text-xs font-bold transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>{bn ? 'সাইন ইন' : 'Sign in'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-1.5" ref={ref}>
      {plan === 'free' && (
        <button
          onClick={() => setActiveModule('pricing')}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors"
        >
          <Crown className="w-3.5 h-3.5 text-amber-600" />
          <span>{bn ? 'Pro নিন' : 'Go Pro'}</span>
        </button>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={bn ? 'অ্যাকাউন্ট মেনু' : 'Account menu'}
        className="relative w-8 h-8 rounded-full bg-[#0a192f] text-white flex items-center justify-center font-bold text-xs shadow-xs ml-1"
      >
        {(user.name || user.email).charAt(0).toUpperCase()}
        {plan === 'pro' && <span className="absolute -bottom-1 -right-1 px-1 rounded bg-amber-400 text-slate-950 text-[8px] font-black leading-3">PRO</span>}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-slate-200 bg-white shadow-2xl py-1.5 text-slate-800">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-sm font-bold truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
          <button role="menuitem" onClick={() => go('account')} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-slate-50">
            <UserIcon className="w-4 h-4 text-slate-500" />{bn ? 'আমার অ্যাকাউন্ট' : 'My account'}
          </button>
          {plan === 'free' && (
            <button role="menuitem" onClick={() => go('pricing')} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-slate-50">
              <Crown className="w-4 h-4 text-amber-500" />{bn ? 'Pro প্ল্যান' : 'Upgrade to Pro'}
            </button>
          )}
          {isAdmin && (
            <button role="menuitem" onClick={() => go('admin')} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-slate-50">
              <ShieldCheck className="w-4 h-4 text-teal-600" />{bn ? 'অ্যাডমিন প্যানেল' : 'Admin panel'}
            </button>
          )}
          <button role="menuitem" onClick={() => go('contact')} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-slate-50">
            <Settings className="w-4 h-4 text-slate-500" />{bn ? 'যোগাযোগ' : 'Contact support'}
          </button>
          <button
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
              setActiveModule('universal');
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border-t border-slate-100 mt-1"
          >
            <LogOut className="w-4 h-4" />{bn ? 'সাইন আউট' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
};

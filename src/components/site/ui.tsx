import React from 'react';

/** Scrolling page container shared by all website pages (Pricing, Contact, Account...). */
export const PageShell: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }> = ({
  title,
  subtitle,
  children,
  wide,
}) => (
  <div className="flex-1 overflow-y-auto">
    <div className={`mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">{title}</h1>
      {subtitle && <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </div>
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 ${className}`}>{children}</div>
);

export const Field: React.FC<{
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
}> = ({ label, type = 'text', value, onChange, autoComplete, required, placeholder, maxLength, hint }) => {
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-300 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
      />
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
};

export const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }
> = ({ busy, children, className = '', disabled, ...rest }) => (
  <button
    {...rest}
    disabled={disabled || busy}
    className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-teal-300 ${className}`}
  >
    {busy ? '…' : children}
  </button>
);

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-colors disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

export const Notice: React.FC<{ kind: 'error' | 'ok' | 'info'; children: React.ReactNode }> = ({ kind, children }) => {
  const style =
    kind === 'error'
      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
      : kind === 'ok'
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      : 'bg-sky-500/10 border-sky-500/30 text-sky-300';
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${style}`}>
      {children}
    </div>
  );
};

export const PlanBadge: React.FC<{ plan: 'free' | 'pro' }> = ({ plan }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
      plan === 'pro' ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-200'
    }`}
  >
    {plan}
  </span>
);

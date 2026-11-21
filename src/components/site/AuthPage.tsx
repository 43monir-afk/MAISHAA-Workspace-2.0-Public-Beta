import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Card, Field, Notice, PageShell, PrimaryButton } from './ui';

export const AuthPage: React.FC = () => {
  const { login, register, user } = useAuth();
  const { setActiveModule, language } = useWorkspace();
  const bn = language === 'bn';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return (
      <PageShell title={bn ? 'আপনি সাইন ইন করা আছেন' : 'You are signed in'}>
        <Card>
          <p className="text-sm text-slate-300">{user.email}</p>
          <PrimaryButton className="mt-4" onClick={() => setActiveModule('account')}>
            {bn ? 'আমার অ্যাকাউন্ট' : 'Go to my account'}
          </PrimaryButton>
        </Card>
      </PageShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = mode === 'login' ? await login(email, password) : await register(email, password, name);
    setBusy(false);
    if (res.ok) setActiveModule('account');
    else setError(res.error || (bn ? 'কিছু একটা ভুল হয়েছে।' : 'Something went wrong.'));
  };

  return (
    <PageShell
      title={mode === 'login' ? (bn ? 'সাইন ইন' : 'Sign in') : bn ? 'ফ্রি অ্যাকাউন্ট খুলুন' : 'Create a free account'}
      subtitle={
        bn
          ? 'অ্যাকাউন্ট থাকলে এআই ফিচার (ডকুমেন্ট প্রশ্নোত্তর, অনুবাদ) ব্যবহার করা যায় এবং Pro কী সক্রিয় করা যায়।'
          : 'An account unlocks AI features (document Q&A, translate) and lets you activate a Pro key.'
      }
    >
      <div className="max-w-md">
        <Card>
          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <Field label={bn ? 'আপনার নাম' : 'Your name'} value={name} onChange={setName} autoComplete="name" maxLength={80} />
            )}
            <Field label={bn ? 'ইমেইল' : 'Email'} type="email" value={email} onChange={setEmail} autoComplete="email" required />
            <Field
              label={bn ? 'পাসওয়ার্ড' : 'Password'}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              hint={mode === 'register' ? (bn ? 'কমপক্ষে ৮ অক্ষর' : 'At least 8 characters') : undefined}
            />
            {error && <Notice kind="error">{error}</Notice>}
            <PrimaryButton type="submit" busy={busy} className="w-full">
              {mode === 'login' ? (bn ? 'সাইন ইন' : 'Sign in') : bn ? 'অ্যাকাউন্ট খুলুন' : 'Create account'}
            </PrimaryButton>
          </form>
          <p className="mt-5 text-xs text-slate-400">
            {mode === 'login' ? (bn ? 'নতুন? ' : 'New here? ') : bn ? 'আগে থেকেই অ্যাকাউন্ট আছে? ' : 'Already have an account? '}
            <button
              type="button"
              className="text-teal-300 font-semibold hover:underline"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
            >
              {mode === 'login' ? (bn ? 'অ্যাকাউন্ট খুলুন' : 'Create an account') : bn ? 'সাইন ইন করুন' : 'Sign in'}
            </button>
          </p>
          {mode === 'login' && (
            <p className="mt-2 text-[11px] text-slate-500">
              {bn ? 'পাসওয়ার্ড ভুলে গেলে ' : 'Forgot your password? '}
              <button type="button" className="text-slate-300 underline" onClick={() => setActiveModule('contact')}>
                {bn ? 'যোগাযোগ করুন' : 'Contact us'}
              </button>
              {bn ? ' — আমরা রিসেট করে দেব।' : ' and we will reset it for you.'}
            </p>
          )}
        </Card>
      </div>
    </PageShell>
  );
};

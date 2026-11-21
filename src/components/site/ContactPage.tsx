import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { fetchSite, sendContact } from '../../services/authService';
import { Card, Field, Notice, PageShell, PrimaryButton } from './ui';

export const ContactPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useWorkspace();
  const bn = language === 'bn';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, must stay empty
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (user) {
      setName((n) => n || user.name);
      setEmail((e) => e || user.email);
    }
  }, [user]);

  useEffect(() => {
    fetchSite().then((r) => r.ok && setContactEmail(r.data.contactEmail || ''));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await sendContact({ name, email, subject, message, website });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setMessage('');
      setSubject('');
    } else setError(res.error || 'Error');
  };

  return (
    <PageShell
      title={bn ? 'যোগাযোগ করুন' : 'Contact us'}
      subtitle={
        bn
          ? 'প্রশ্ন, সমস্যা, ফিচার পরামর্শ বা Pro কী কেনার জন্য মেসেজ পাঠান। আমরা সাধারণত ১–২ কর্মদিবসে উত্তর দিই।'
          : 'Questions, bug reports, feature ideas or buying a Pro key — send us a message. We usually reply within 1–2 working days.'
      }
    >
      <Card>
        {done ? (
          <div className="space-y-3">
            <Notice kind="ok">{bn ? 'ধন্যবাদ! আপনার মেসেজ পৌঁছে গেছে। আমরা ইমেইলে উত্তর দেব।' : 'Thank you! Your message was received. We will reply by email.'}</Notice>
            <button className="text-xs text-teal-300 underline" onClick={() => setDone(false)}>
              {bn ? 'আরেকটি মেসেজ পাঠান' : 'Send another message'}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={bn ? 'নাম' : 'Name'} value={name} onChange={setName} autoComplete="name" required maxLength={100} />
              <Field label={bn ? 'ইমেইল' : 'Email'} type="email" value={email} onChange={setEmail} autoComplete="email" required />
            </div>
            <Field label={bn ? 'বিষয়' : 'Subject'} value={subject} onChange={setSubject} maxLength={150} placeholder={bn ? 'যেমন: Pro কী কিনতে চাই' : 'e.g. I want to buy a Pro key'} />
            <div>
              <label htmlFor="contact-msg" className="block text-xs font-semibold text-slate-300 mb-1.5">
                {bn ? 'আপনার মেসেজ' : 'Your message'}
              </label>
              <textarea
                id="contact-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={5000}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
              />
            </div>
            {/* honeypot: hidden from people, bots fill it */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>
            {error && <Notice kind="error">{error}</Notice>}
            <PrimaryButton type="submit" busy={busy}>
              {bn ? 'মেসেজ পাঠান' : 'Send message'}
            </PrimaryButton>
          </form>
        )}
      </Card>
      {contactEmail && (
        <p className="mt-4 text-xs text-slate-400">
          {bn ? 'সরাসরি ইমেইল: ' : 'Or email us directly: '}
          <a className="text-teal-300 underline" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
        </p>
      )}
    </PageShell>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Mail, MailOpen, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch, formatDate } from '../../services/authService';
import { Card, Field, GhostButton, Notice, PageShell, PlanBadge, PrimaryButton } from './ui';

type Tab = 'overview' | 'users' | 'licenses' | 'messages' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'licenses', label: 'Licence keys' },
  { id: 'messages', label: 'Messages' },
  { id: 'settings', label: 'Settings' },
];

const th = 'px-3 py-2 text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold whitespace-nowrap';
const td = 'px-3 py-2.5 text-xs text-slate-200 align-top';

function useLoad<T>(path: string, pick: (d: any) => T, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const r = await apiFetch(path);
    if (r.ok) {
      setData(pick(r.data));
      setError(null);
    } else setError(r.error || 'Failed to load');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, reload };
}

// ── Overview ──
const Overview: React.FC = () => {
  const { data, error, reload } = useLoad<Record<string, number>>('/api/admin/stats', (d) => d, {});
  const items: [string, string][] = [
    ['users', 'Users'],
    ['proUsers', 'Pro users'],
    ['licensesUnused', 'Unused keys'],
    ['licensesInUse', 'Keys in use'],
    ['unreadMessages', 'Unread messages'],
    ['aiRequestsToday', 'AI requests today'],
  ];
  return (
    <div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(([k, label]) => (
          <Card key={k} className="p-4 sm:p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-1 text-3xl font-black text-white">{data[k] ?? '–'}</p>
          </Card>
        ))}
      </div>
      <GhostButton className="mt-4" onClick={reload}><RefreshCw className="w-4 h-4" />Refresh</GhostButton>
    </div>
  );
};

// ── Users ──
interface AdminUser { id: string; email: string; name: string; role: string; plan: 'free' | 'pro'; disabled: boolean; createdAt: number; lastLoginAt: number | null; license: { expiresAt: number | null; status: string } | null }

const Users: React.FC = () => {
  const { data, error, reload } = useLoad<AdminUser[]>('/api/admin/users', (d) => d.users, []);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const act = async (path: string, method = 'POST', body: unknown = {}, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const r = await apiFetch(path, method, body);
    setMsg(r.ok ? 'Done.' : r.error || 'Failed');
    reload();
  };

  const rows = data.filter((u) => !filter || u.email.includes(filter.toLowerCase()) || u.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end">
        <div className="flex-1 max-w-xs"><Field label="Search" value={filter} onChange={setFilter} placeholder="email or name" /></div>
        <GhostButton onClick={reload}><RefreshCw className="w-4 h-4" /></GhostButton>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {msg && <Notice kind="info">{msg}</Notice>}
      <Card className="p-0 sm:p-0 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead><tr className="border-b border-slate-800"><th className={th}>User</th><th className={th}>Plan</th><th className={th}>Joined</th><th className={th}>Last login</th><th className={th}>Actions</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/60 last:border-0">
                <td className={td}><div className="font-semibold">{u.name}{u.role === 'admin' && <span className="ml-1 text-[10px] text-teal-300">ADMIN</span>}{u.disabled && <span className="ml-1 text-[10px] text-rose-300">DISABLED</span>}</div><div className="text-slate-400">{u.email}</div></td>
                <td className={td}><PlanBadge plan={u.plan} />{u.license?.expiresAt && <div className="mt-1 text-slate-500">until {formatDate(u.license.expiresAt)}</div>}</td>
                <td className={td}>{formatDate(u.createdAt)}</td>
                <td className={td}>{formatDate(u.lastLoginAt)}</td>
                <td className={td}>
                  {u.role !== 'admin' && (
                    <div className="flex flex-wrap gap-1.5">
                      {u.plan === 'free' ? (
                        <>
                          <button className="px-2 py-1 rounded-md bg-amber-400/15 text-amber-300 hover:bg-amber-400/25" onClick={() => act(`/api/admin/users/${u.id}/grant-pro`, 'POST', { durationDays: 30 })}>Grant Pro 30d</button>
                          <button className="px-2 py-1 rounded-md bg-amber-400/15 text-amber-300 hover:bg-amber-400/25" onClick={() => act(`/api/admin/users/${u.id}/grant-pro`, 'POST', { durationDays: 365 })}>1 year</button>
                          <button className="px-2 py-1 rounded-md bg-amber-400/15 text-amber-300 hover:bg-amber-400/25" onClick={() => act(`/api/admin/users/${u.id}/grant-pro`, 'POST', { durationDays: null })}>Lifetime</button>
                        </>
                      ) : (
                        <button className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600" onClick={() => act(`/api/admin/users/${u.id}/revoke-pro`, 'POST', {}, `Remove Pro from ${u.email}?`)}>Remove Pro</button>
                      )}
                      <button className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600" onClick={() => {
                        const pw = window.prompt(`New password for ${u.email} (min 8 chars). Tell the user privately.`);
                        if (pw) act(`/api/admin/users/${u.id}/reset-password`, 'POST', { password: pw });
                      }}>Reset password</button>
                      <button className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600" onClick={() => act(`/api/admin/users/${u.id}/disable`, 'POST', { disabled: !u.disabled })}>{u.disabled ? 'Enable' : 'Disable'}</button>
                      <button className="px-2 py-1 rounded-md bg-rose-500/15 text-rose-300 hover:bg-rose-500/25" onClick={() => act(`/api/admin/users/${u.id}`, 'DELETE', undefined, `Delete ${u.email}? This cannot be undone.`)}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className={td} colSpan={5}>No users.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ── Licences ──
interface AdminLicense { id: string; hint: string; durationDays: number | null; maxDevices: number; note: string; status: string; createdAt: number; activatedAt: number | null; expiresAt: number | null; redeemedBy: string | null; devices: { name: string; lastSeenAt: number }[] }

const Licenses: React.FC = () => {
  const { data, error, reload } = useLoad<AdminLicense[]>('/api/admin/licenses', (d) => d.licenses, []);
  const [count, setCount] = useState('1');
  const [days, setDays] = useState('365');
  const [devices, setDevices] = useState('2');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [newKeys, setNewKeys] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await apiFetch<{ keys: string[] }>('/api/admin/licenses', 'POST', {
      count: Number(count),
      durationDays: days.trim() === '' ? null : Number(days),
      maxDevices: Number(devices),
      note,
    });
    setBusy(false);
    if (r.ok) {
      setNewKeys(r.data.keys);
      setNote('');
      reload();
    } else setMsg(r.error || 'Failed');
  };

  const act = async (id: string, action: 'revoke' | 'restore' | 'reset-devices') => {
    await apiFetch(`/api/admin/licenses/${id}/${action}`, 'POST', {});
    reload();
  };

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="text-sm font-bold text-white">Create keys</h3>
        <form onSubmit={create} className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <Field label="How many" type="number" value={count} onChange={setCount} />
          <Field label="Days (empty = lifetime)" type="number" value={days} onChange={setDays} />
          <Field label="Max PCs" type="number" value={devices} onChange={setDevices} />
          <div className="col-span-2 sm:col-span-1"><Field label="Note (e.g. bKash 01xxx)" value={note} onChange={setNote} maxLength={200} /></div>
          <PrimaryButton type="submit" busy={busy}>Create</PrimaryButton>
        </form>
        {msg && <div className="mt-3"><Notice kind="error">{msg}</Notice></div>}
        {newKeys.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/5 p-4">
            <p className="text-xs font-semibold text-amber-300">Copy these keys now — they are shown only once and cannot be recovered later.</p>
            <pre className="mt-2 text-sm font-mono text-white whitespace-pre-wrap select-all">{newKeys.join('\n')}</pre>
            <GhostButton className="mt-3" onClick={() => navigator.clipboard?.writeText(newKeys.join('\n'))}><Copy className="w-4 h-4" />Copy all</GhostButton>
          </div>
        )}
      </Card>
      {error && <Notice kind="error">{error}</Notice>}
      <Card className="p-0 sm:p-0 overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead><tr className="border-b border-slate-800"><th className={th}>Key</th><th className={th}>Status</th><th className={th}>Term</th><th className={th}>Used by</th><th className={th}>PCs</th><th className={th}>Actions</th></tr></thead>
          <tbody>
            {data.map((l) => (
              <tr key={l.id} className="border-b border-slate-800/60 last:border-0">
                <td className={td}><span className="font-mono">MSHA-…{l.hint}</span>{l.note && <div className="text-slate-500">{l.note}</div>}</td>
                <td className={td}>{l.status}</td>
                <td className={td}>{l.durationDays ? `${l.durationDays} days` : 'Lifetime'}{l.expiresAt && <div className="text-slate-500">ends {formatDate(l.expiresAt)}</div>}</td>
                <td className={td}>{l.redeemedBy || (l.devices.length ? 'desktop only' : '—')}</td>
                <td className={td}>{l.devices.length}/{l.maxDevices}{l.devices.map((d, i) => <div key={i} className="text-slate-500">{d.name}</div>)}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1.5">
                    {l.status === 'revoked' ? (
                      <button className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600" onClick={() => act(l.id, 'restore')}>Restore</button>
                    ) : (
                      <button className="px-2 py-1 rounded-md bg-rose-500/15 text-rose-300 hover:bg-rose-500/25" onClick={() => window.confirm('Revoke this key? Pro stops working for everyone using it.') && act(l.id, 'revoke')}>Revoke</button>
                    )}
                    {l.devices.length > 0 && <button className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600" onClick={() => act(l.id, 'reset-devices')}>Reset PCs</button>}
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td className={td} colSpan={6}>No keys yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ── Messages ──
interface Msg { id: string; name: string; email: string; subject: string; message: string; createdAt: number; read: boolean }

const Messages: React.FC = () => {
  const { data, error, reload } = useLoad<Msg[]>('/api/admin/contacts', (d) => d.messages, []);
  const mark = async (m: Msg) => { await apiFetch(`/api/admin/contacts/${m.id}/read`, 'POST', { read: !m.read }); reload(); };
  const del = async (m: Msg) => { if (window.confirm('Delete this message?')) { await apiFetch(`/api/admin/contacts/${m.id}`, 'DELETE'); reload(); } };
  return (
    <div className="space-y-3">
      {error && <Notice kind="error">{error}</Notice>}
      {data.length === 0 && <Card><p className="text-sm text-slate-400">No messages yet.</p></Card>}
      {data.map((m) => (
        <Card key={m.id} className={m.read ? 'opacity-70' : 'border-teal-500/40'}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">{m.subject}</p>
              <p className="text-xs text-slate-400">{m.name} · <a className="text-teal-300 underline" href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}>{m.email}</a> · {new Date(m.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex gap-1.5">
              <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700" title={m.read ? 'Mark unread' : 'Mark read'} onClick={() => mark(m)}>{m.read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}</button>
              <button className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-300" title="Delete" onClick={() => del(m)}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-200 whitespace-pre-wrap break-words">{m.message}</p>
        </Card>
      ))}
    </div>
  );
};

// ── Settings ──
const Settings: React.FC = () => {
  const { data, error, reload } = useLoad<any>('/api/admin/settings', (d) => d.settings, null);
  const [f, setF] = useState<any>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  useEffect(() => { if (data) setF(data); }, [data]);
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!f) return <div aria-busy="true" />;
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const setD = (k: string, v: string) => setF({ ...f, desktop: { ...f.desktop, [k]: v } });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await apiFetch('/api/admin/settings', 'PUT', f);
    setMsg(r.ok ? { kind: 'ok', text: 'Saved.' } : { kind: 'error', text: r.error || 'Failed' });
    if (r.ok) reload();
  };
  return (
    <form onSubmit={save} className="space-y-5">
      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-white">Website</h3>
        <Field label="Site name" value={f.siteName} onChange={(v) => set('siteName', v)} />
        <Field label="Public contact email (shown on Contact page)" type="email" value={f.contactEmail} onChange={(v) => set('contactEmail', v)} />
        <div>
          <label htmlFor="howtobuy" className="block text-xs font-semibold text-slate-300 mb-1.5">How to buy Pro (shown on Pricing page — put your bKash / Nagad / bank details here)</label>
          <textarea id="howtobuy" rows={4} value={f.howToBuy} onChange={(e) => set('howToBuy', e.target.value)} maxLength={2000}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-teal-400" />
        </div>
      </Card>
      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-white">Desktop app download</h3>
        <p className="text-xs text-slate-400">Build the installer (see desktop/README.md), upload it to GitHub Releases (or any https host) and paste the direct link here.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Version" value={f.desktop.version} onChange={(v) => setD('version', v)} placeholder="1.0.0" />
          <Field label="Windows installer (https://…)" value={f.desktop.windowsUrl} onChange={(v) => setD('windowsUrl', v)} />
          <Field label="macOS (optional)" value={f.desktop.macUrl} onChange={(v) => setD('macUrl', v)} />
          <Field label="Linux (optional)" value={f.desktop.linuxUrl} onChange={(v) => setD('linuxUrl', v)} />
        </div>
        <Field label="Release notes" value={f.desktop.releaseNotes} onChange={(v) => setD('releaseNotes', v)} />
      </Card>
      <div className="flex items-center gap-3">
        <PrimaryButton type="submit">Save settings</PrimaryButton>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      </div>
    </form>
  );
};

export const AdminPage: React.FC = () => {
  const { user, isAdmin, loading } = useAuth();
  const { setActiveModule } = useWorkspace();
  const [tab, setTab] = useState<Tab>('overview');

  if (loading) return <PageShell title="Admin"><div aria-busy="true" /></PageShell>;
  if (!user || !isAdmin) {
    return (
      <PageShell title="Admin">
        <Card>
          <p className="text-sm text-slate-300">{user ? 'This area is for administrators only.' : 'Sign in with an administrator account.'}</p>
          {!user && <PrimaryButton className="mt-4" onClick={() => setActiveModule('signin')}>Sign in</PrimaryButton>}
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell wide title="Admin panel" subtitle="Users, Pro licence keys, contact messages and site settings.">
      <div role="tablist" className="mb-6 flex gap-1.5 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${tab === t.id ? 'bg-teal-500 text-slate-950' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users />}
      {tab === 'licenses' && <Licenses />}
      {tab === 'messages' && <Messages />}
      {tab === 'settings' && <Settings />}
    </PageShell>
  );
};

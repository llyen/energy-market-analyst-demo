import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import {
  createNote,
  deleteNote,
  listCommodities,
  listNotes,
  type CommodityRow,
  type NoteRow,
} from '@/services/marketService';

const SENTIMENTS: { key: string; label: string; icon: string; cls: string }[] = [
  { key: 'bullish', label: 'Wzrostowy', icon: '🟢', cls: 'bg-emerald-100 text-emerald-700' },
  { key: 'neutral', label: 'Neutralny', icon: '⚪', cls: 'bg-slate-100 text-slate-600' },
  { key: 'bearish', label: 'Spadkowy', icon: '🔴', cls: 'bg-red-100 text-red-700' },
];

export function NotesTab() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [commodities, setCommodities] = useState<CommodityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sentiment, setSentiment] = useState('neutral');
  const [commodityId, setCommodityId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [n, c] = await Promise.all([listNotes(user.id), listCommodities()]);
      setNotes(n);
      setCommodities(c);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      await createNote({
        title: title.trim(),
        body: body.trim(),
        sentiment,
        commodityId: commodityId || null,
        authorName: user.name,
        userId: user.id,
      });
      setTitle('');
      setBody('');
      setCommodityId('');
      setSentiment('neutral');
      await refresh();
    } catch (err) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    await refresh();
  };

  const sentimentMeta = (key: string) => SENTIMENTS.find((s) => s.key === key) ?? SENTIMENTS[1];

  if (loading) return <div className="text-slate-500">Ładowanie...</div>;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <form
        onSubmit={(e) => void handleCreate(e)}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1"
      >
        <h3 className="text-sm font-semibold text-slate-900">Nowa notatka analityczna</h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tytuł"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Treść analizy..."
          required
          rows={5}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <select
          value={commodityId}
          onChange={(e) => setCommodityId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="">— bez instrumentu —</option>
          {commodities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.symbol} — {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          {SENTIMENTS.map((s) => (
            <button
              type="button"
              key={s.key}
              onClick={() => setSentiment(s.key)}
              className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium ${
                sentiment === s.key ? 'border-emerald-500 ' + s.cls : 'border-slate-200 text-slate-500'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? '...' : '📝 Zapisz notatkę'}
        </button>
      </form>

      <div className="lg:col-span-2">
        {notes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Brak notatek. Zapisz pierwszą analizę po lewej stronie.
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => {
              const s = sentimentMeta(n.sentiment);
              return (
                <li key={n.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
                          {s.icon} {s.label}
                        </span>
                        {n.commoditySymbol && (
                          <span className="font-mono text-xs font-semibold text-slate-600">{n.commoditySymbol}</span>
                        )}
                      </div>
                      <h4 className="mt-2 text-base font-semibold text-slate-900">{n.title}</h4>
                    </div>
                    <button
                      onClick={() => void handleDelete(n.id)}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Usuń
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>
                  <div className="mt-3 text-xs text-slate-400">
                    {n.authorName} · {n.createdAt.toLocaleString('pl-PL')}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

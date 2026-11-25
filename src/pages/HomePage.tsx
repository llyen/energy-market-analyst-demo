import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import {
  getDashboardStats,
  isDatabaseEmpty,
  seedDemoData,
  wipeAllData,
  type DashboardStats,
} from '@/services/marketService';
import { PricesTab } from './tabs/PricesTab';
import { AlertsTab } from './tabs/AlertsTab';
import { NotesTab } from './tabs/NotesTab';

type Tab = 'dashboard' | 'prices' | 'alerts' | 'notes';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'prices', label: 'Ceny rynkowe', icon: '💹' },
  { key: 'alerts', label: 'Alerty', icon: '🔔' },
  { key: 'notes', label: 'Notatki', icon: '📝' },
];

const fmtNum = (n: number) =>
  n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function HomePage() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const e = await isDatabaseEmpty();
      setEmpty(e);
      setStats(e ? null : await getDashboardStats());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSeed = async () => {
    setBusy(true);
    try {
      const r = await seedDemoData();
      alert(`✅ Wygenerowano dane demo:\n${r.commodities} instrumentów, ${r.observations} notowań.`);
      await refresh();
    } catch (err) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleWipe = async () => {
    if (!confirm('Usunąć WSZYSTKIE dane (instrumenty, notowania, alerty, notatki)?')) return;
    setBusy(true);
    try {
      await wipeAllData();
      await refresh();
    } catch (err) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              📈
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-900">Analityk Rynku</h1>
              <p className="text-xs leading-tight text-slate-500">Energy Market Analytics</p>
            </div>
          </div>
          <div className="flex-1" />
          {!empty && (
            <button
              onClick={() => void handleWipe()}
              disabled={busy}
              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              🗑 Wyczyść
            </button>
          )}
          <button
            onClick={() => void handleSeed()}
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-medium text-white shadow hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Pracuję...' : empty ? '🌱 Wygeneruj dane demo' : '➕ Dodaj notowania'}
          </button>
          <div className="text-right">
            <div className="text-xs text-slate-500">Zalogowany jako</div>
            <div className="text-sm font-medium text-slate-900">{user?.name}</div>
          </div>
          <button
            onClick={() => void signOut()}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Wyloguj
          </button>
        </div>
        <div className="mx-auto max-w-7xl px-4">
          <nav className="-mb-px flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === 'dashboard' && (
          <DashboardView stats={stats} loading={loading} empty={empty} onSeed={() => void handleSeed()} busy={busy} />
        )}
        {tab === 'prices' && <PricesTab onChange={() => void refresh()} />}
        {tab === 'alerts' && <AlertsTab />}
        {tab === 'notes' && <NotesTab />}
      </main>
    </div>
  );
}

function DashboardView({
  stats,
  loading,
  empty,
  onSeed,
  busy,
}: {
  stats: DashboardStats | null;
  loading: boolean;
  empty: boolean;
  onSeed: () => void;
  busy: boolean;
}) {
  if (loading) return <div className="text-slate-500">Ładowanie metryk...</div>;
  if (empty)
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mb-3 text-5xl">📈</div>
        <h2 className="text-lg font-semibold text-slate-900">Brak danych rynkowych</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Wygeneruj zestaw demonstracyjny (carbon, gaz TTF, energia DE/PL, węgiel, ropa)
          z 3-tygodniową historią notowań.
        </p>
        <button
          onClick={onSeed}
          disabled={busy}
          className="mt-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:brightness-110 disabled:opacity-50"
        >
          🌱 Wygeneruj dane demo
        </button>
      </div>
    );
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Instrumenty" value={stats.totalCommodities} icon="🛢️" />
        <StatCard label="Notowania" value={stats.totalObservations} icon="💹" />
        <StatCard
          label="Ostatnia aktualizacja"
          value={stats.lastUpdated ? stats.lastUpdated.toLocaleDateString('pl-PL') : '—'}
          icon="🕒"
        />
        <StatCard
          label="Największy ruch"
          value={
            stats.topMovers[0]
              ? `${stats.topMovers[0].changePct >= 0 ? '+' : ''}${stats.topMovers[0].changePct.toFixed(2)}%`
              : '—'
          }
          icon="📊"
          accent={stats.topMovers[0] ? (stats.topMovers[0].changePct >= 0 ? 'green' : 'red') : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Przegląd rynku</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 pr-3">Instrument</th>
                  <th className="py-2 pr-3 text-right">Cena</th>
                  <th className="py-2 pr-3 text-right">Zmiana</th>
                </tr>
              </thead>
              <tbody>
                {stats.commodities.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs font-semibold text-slate-700">{c.symbol}</td>
                    <td className="py-2 pr-3 text-slate-700">
                      {c.name}
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {c.category}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-900">
                      {c.latestPrice != null ? `${fmtNum(c.latestPrice)} ${c.unit}` : '—'}
                    </td>
                    <td className={`py-2 pr-3 text-right font-medium tabular-nums ${changeColor(c.changePct)}`}>
                      {c.changePct != null
                        ? `${c.changePct >= 0 ? '▲' : '▼'} ${Math.abs(c.changePct).toFixed(2)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Top movers</h3>
          {stats.topMovers.length === 0 ? (
            <p className="text-sm text-slate-500">Brak danych.</p>
          ) : (
            <ul className="space-y-3">
              {stats.topMovers.map((m) => (
                <li key={m.symbol} className="flex items-center gap-3">
                  <span className="w-16 font-mono text-xs font-semibold text-slate-700">{m.symbol}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${m.changePct >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.abs(m.changePct) * 6)}%` }}
                    />
                  </div>
                  <span className={`w-16 text-right text-sm font-medium tabular-nums ${changeColor(m.changePct)}`}>
                    {m.changePct >= 0 ? '+' : ''}
                    {m.changePct.toFixed(2)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function changeColor(pct: number | null): string {
  if (pct == null) return 'text-slate-400';
  return pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-slate-500';
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: 'green' | 'red';
}) {
  const accentClass =
    accent === 'green' ? 'text-emerald-600' : accent === 'red' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-bold ${accentClass}`}>{value}</div>
    </div>
  );
}

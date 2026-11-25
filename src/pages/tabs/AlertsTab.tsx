import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import {
  createAlert,
  deleteAlert,
  listAlerts,
  listCommoditiesWithPrice,
  type AlertRow,
  type CommodityWithPrice,
} from '@/services/marketService';

export function AlertsTab() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [commodities, setCommodities] = useState<CommodityWithPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const [commodityId, setCommodityId] = useState('');
  const [direction, setDirection] = useState('above');
  const [threshold, setThreshold] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [a, c] = await Promise.all([listAlerts(user.id), listCommoditiesWithPrice()]);
      setAlerts(a);
      setCommodities(c);
      setCommodityId((cur) => cur || c[0]?.id || '');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const latestById = new Map(commodities.map((c) => [c.id, c]));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commodityId) return;
    const value = Number(threshold);
    if (!Number.isFinite(value) || value <= 0) return;
    setSubmitting(true);
    try {
      await createAlert({ commodityId, direction, threshold: value, note: note.trim() || undefined, userId: user.id });
      setThreshold('');
      setNote('');
      await refresh();
    } catch (err) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAlert(id);
    await refresh();
  };

  const isTriggered = (a: AlertRow): boolean => {
    const c = latestById.get(a.commodity_id);
    if (!c || c.latestPrice == null) return false;
    return a.direction === 'above' ? c.latestPrice >= a.threshold : c.latestPrice <= a.threshold;
  };

  if (loading) return <div className="text-slate-500">Ładowanie...</div>;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <form
        onSubmit={(e) => void handleCreate(e)}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1"
      >
        <h3 className="text-sm font-semibold text-slate-900">Nowy alert cenowy</h3>
        {commodities.length === 0 ? (
          <p className="text-sm text-slate-500">Najpierw dodaj instrumenty w zakładce „Ceny rynkowe”.</p>
        ) : (
          <>
            <select
              value={commodityId}
              onChange={(e) => setCommodityId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              {commodities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.symbol} — {c.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="above">powyżej ≥</option>
                <option value="below">poniżej ≤</option>
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="Próg"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notatka (opcjonalnie)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? '...' : '🔔 Utwórz alert'}
            </button>
          </>
        )}
      </form>

      <div className="lg:col-span-2">
        {alerts.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Brak alertów. Utwórz pierwszy po lewej stronie.
          </div>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => {
              const triggered = isTriggered(a);
              const c = latestById.get(a.commodity_id);
              return (
                <li
                  key={a.id}
                  className={`flex items-center justify-between rounded-2xl border p-4 ${
                    triggered ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-700">{a.commoditySymbol}</span>
                      <span className="text-sm text-slate-700">{a.commodityName}</span>
                      {triggered && (
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          ⚠ WYZWOLONY
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Cena {a.direction === 'above' ? '≥' : '≤'}{' '}
                      <strong>
                        {a.threshold.toLocaleString('pl-PL')} {a.commodityUnit}
                      </strong>
                      {c?.latestPrice != null && (
                        <span className="text-slate-400">
                          {' '}
                          · obecnie {c.latestPrice.toLocaleString('pl-PL')} {a.commodityUnit}
                        </span>
                      )}
                    </div>
                    {a.note && <div className="mt-1 text-xs text-slate-500">„{a.note}”</div>}
                  </div>
                  <button
                    onClick={() => void handleDelete(a.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Usuń
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

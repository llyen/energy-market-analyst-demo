import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addPriceObservation,
  createCommodity,
  listCommoditiesWithPrice,
  listPricesForCommodity,
  type CommodityWithPrice,
  type PriceRow,
} from '@/services/marketService';

const CATEGORIES = ['Power', 'Gas', 'Coal', 'Carbon', 'Oil'];

const fmt = (n: number) =>
  n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PricesTab({ onChange }: { onChange: () => void }) {
  const [commodities, setCommodities] = useState<CommodityWithPrice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCommoditiesWithPrice();
      setCommodities(rows);
      setSelectedId((cur) => cur ?? rows[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadHistory = useCallback(async (id: string) => {
    setHistory(await listPricesForCommodity(id));
  }, []);

  useEffect(() => {
    if (selectedId) void loadHistory(selectedId);
  }, [selectedId, loadHistory]);

  const selected = commodities.find((c) => c.id === selectedId) ?? null;

  if (loading) return <div className="text-slate-500">Ładowanie...</div>;

  if (commodities.length === 0)
    return (
      <div className="space-y-4">
        <NewCommodityForm
          open={showNew}
          onOpen={() => setShowNew(true)}
          onClose={() => setShowNew(false)}
          onCreated={async () => {
            setShowNew(false);
            await refresh();
            onChange();
          }}
        />
        <p className="text-sm text-slate-500">Brak instrumentów. Dodaj pierwszy powyżej.</p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-1">
        <NewCommodityForm
          open={showNew}
          onOpen={() => setShowNew(true)}
          onClose={() => setShowNew(false)}
          onCreated={async () => {
            setShowNew(false);
            await refresh();
            onChange();
          }}
        />
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {commodities.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${
                selectedId === c.id ? 'bg-emerald-50' : ''
              }`}
            >
              <div>
                <div className="font-mono text-xs font-semibold text-slate-700">{c.symbol}</div>
                <div className="text-xs text-slate-500">{c.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-900">
                  {c.latestPrice != null ? fmt(c.latestPrice) : '—'}
                </div>
                <div
                  className={`text-xs ${
                    c.changePct == null
                      ? 'text-slate-400'
                      : c.changePct >= 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                  }`}
                >
                  {c.changePct != null ? `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selected && (
          <CommodityDetail
            commodity={selected}
            history={history}
            onAdded={async () => {
              await refresh();
              if (selectedId) await loadHistory(selectedId);
              onChange();
            }}
          />
        )}
      </div>
    </div>
  );
}

function CommodityDetail({
  commodity,
  history,
  onAdded,
}: {
  commodity: CommodityWithPrice;
  history: PriceRow[];
  onAdded: () => void;
}) {
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const spark = useMemo(() => buildSparkline([...history].reverse().map((h) => h.price)), [history]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) return;
    setSubmitting(true);
    try {
      await addPriceObservation({
        commodityId: commodity.id,
        price: value,
        source: 'Manual',
        previousPrice: commodity.latestPrice,
      });
      setPrice('');
      onAdded();
    } catch (err) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{commodity.name}</h2>
            <p className="text-xs text-slate-500">
              <span className="font-mono">{commodity.symbol}</span> · {commodity.category} · {commodity.unit}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">
              {commodity.latestPrice != null ? `${fmt(commodity.latestPrice)}` : '—'}
            </div>
            <div className="text-xs text-slate-500">{commodity.unit}</div>
          </div>
        </div>
        {spark && (
          <svg viewBox="0 0 300 60" className="mt-4 h-16 w-full" preserveAspectRatio="none">
            <polyline
              points={spark}
              fill="none"
              stroke={(commodity.changePct ?? 0) >= 0 ? '#10b981' : '#ef4444'}
              strokeWidth="2"
            />
          </svg>
        )}
      </div>

      <form onSubmit={(e) => void handleAdd(e)} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Dodaj notowanie</h3>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={`Cena (${commodity.unit})`}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? '...' : 'Zapisz'}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Historia notowań</h3>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">Brak notowań.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3 text-right">Cena</th>
                  <th className="py-2 pr-3 text-right">Zmiana</th>
                  <th className="py-2 pr-3">Źródło</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-600">{h.observedAt.toLocaleDateString('pl-PL')}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-900">{fmt(h.price)}</td>
                    <td
                      className={`py-2 pr-3 text-right tabular-nums ${
                        h.changePct >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {h.changePct >= 0 ? '+' : ''}
                      {h.changePct.toFixed(2)}%
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-500">{h.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function NewCommodityForm({
  open,
  onOpen,
  onClose,
  onCreated,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [unit, setUnit] = useState('EUR/MWh');
  const [submitting, setSubmitting] = useState(false);

  if (!open)
    return (
      <button
        onClick={onOpen}
        className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
      >
        ➕ Nowy instrument
      </button>
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      await createCommodity({ symbol: symbol.trim(), name: name.trim(), category, unit: unit.trim() });
      setSymbol('');
      setName('');
      onCreated();
    } catch (err) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="Symbol (np. TTF)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nazwa instrumentu"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Jednostka"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? '...' : 'Dodaj'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Anuluj
        </button>
      </div>
    </form>
  );
}

function buildSparkline(values: number[]): string | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 300;
  const h = 60;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

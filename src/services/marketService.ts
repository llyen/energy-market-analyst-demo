import { getRayfinClient } from './rayfinClient';
import type { AuthUser } from './IAuthService';

const uuid = () => crypto.randomUUID();
const toDate = (v: string | Date): Date => (v instanceof Date ? v : new Date(v));
const num = (v: number | string): number => (typeof v === 'number' ? v : Number(v));

// ---------------- Types ----------------

export interface CommodityRow {
  id: string;
  symbol: string;
  name: string;
  category: string;
  unit: string;
}

export interface CommodityWithPrice extends CommodityRow {
  latestPrice: number | null;
  changePct: number | null;
  observedAt: Date | null;
  observationCount: number;
}

export interface PriceRow {
  id: string;
  price: number;
  changePct: number;
  volume: number | null;
  source: string;
  observedAt: Date;
  commodity_id: string;
}

export interface AlertRow {
  id: string;
  direction: string;
  threshold: number;
  note: string | null;
  createdAt: Date;
  commodity_id: string;
  commoditySymbol: string;
  commodityName: string;
  commodityUnit: string;
}

export interface NoteRow {
  id: string;
  title: string;
  body: string;
  sentiment: string;
  authorName: string;
  createdAt: Date;
  commodity_id: string | null;
  commoditySymbol: string | null;
}

interface RawCommodity {
  id: string;
  symbol: string;
  name: string;
  category: string;
  unit: string;
}
interface RawPrice {
  id: string;
  price: number | string;
  changePct: number | string;
  volume?: number | string | null;
  source: string;
  observedAt: string | Date;
  commodity?: { id?: string; symbol?: string; name?: string; unit?: string };
}
interface RawAlert {
  id: string;
  direction: string;
  threshold: number | string;
  note?: string | null;
  createdAt: string | Date;
  commodity?: { id?: string; symbol?: string; name?: string; unit?: string };
}
interface RawNote {
  id: string;
  title: string;
  body: string;
  sentiment: string;
  authorName: string;
  createdAt: string | Date;
  commodity?: { id?: string; symbol?: string } | null;
}

// ---------------- Commodities ----------------

export async function listCommodities(): Promise<CommodityRow[]> {
  const c = getRayfinClient();
  const rows = (await c.data.Commodity
    .select(['id', 'symbol', 'name', 'category', 'unit'])
    .orderBy({ symbol: 'asc' })
    .execute()) as unknown as RawCommodity[];
  return rows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    name: r.name,
    category: r.category,
    unit: r.unit,
  }));
}

/** Commodities decorated with their most recent price observation. */
export async function listCommoditiesWithPrice(): Promise<CommodityWithPrice[]> {
  const [commodities, prices] = await Promise.all([
    listCommodities(),
    listAllPrices(),
  ]);

  const byCommodity = new Map<string, PriceRow[]>();
  for (const p of prices) {
    const arr = byCommodity.get(p.commodity_id) ?? [];
    arr.push(p);
    byCommodity.set(p.commodity_id, arr);
  }

  return commodities.map((com) => {
    const ps = (byCommodity.get(com.id) ?? []).sort(
      (a, b) => b.observedAt.getTime() - a.observedAt.getTime()
    );
    const latest = ps[0];
    return {
      ...com,
      latestPrice: latest ? latest.price : null,
      changePct: latest ? latest.changePct : null,
      observedAt: latest ? latest.observedAt : null,
      observationCount: ps.length,
    };
  });
}

export async function createCommodity(input: {
  symbol: string;
  name: string;
  category: string;
  unit: string;
}): Promise<string> {
  const c = getRayfinClient();
  const id = uuid();
  await c.data.Commodity.create({
    id,
    symbol: input.symbol,
    name: input.name,
    category: input.category,
    unit: input.unit,
    createdAt: new Date(),
  });
  return id;
}

// ---------------- Prices ----------------

async function listAllPrices(): Promise<PriceRow[]> {
  const c = getRayfinClient();
  const rows = (await c.data.PriceObservation
    .select([
      'id', 'price', 'changePct', 'volume', 'source', 'observedAt',
      'commodity.id',
    ])
    .orderBy({ observedAt: 'desc' })
    .execute()) as unknown as RawPrice[];
  return rows.map(mapPrice);
}

function mapPrice(r: RawPrice): PriceRow {
  return {
    id: r.id,
    price: num(r.price),
    changePct: num(r.changePct),
    volume: r.volume == null ? null : num(r.volume),
    source: r.source,
    observedAt: toDate(r.observedAt),
    commodity_id: r.commodity?.id ?? '',
  };
}

export async function listPricesForCommodity(
  commodityId: string,
  limit = 60
): Promise<PriceRow[]> {
  const c = getRayfinClient();
  const page = await c.data.PriceObservation
    .select([
      'id', 'price', 'changePct', 'volume', 'source', 'observedAt',
      'commodity.id',
    ])
    .where({ commodity: { id: { eq: commodityId } } })
    .orderBy({ observedAt: 'desc' })
    .first(limit)
    .executePaginated();
  return (page.items as unknown as RawPrice[]).map(mapPrice);
}

export async function addPriceObservation(input: {
  commodityId: string;
  price: number;
  source: string;
  previousPrice?: number | null;
  observedAt?: Date;
}): Promise<void> {
  const c = getRayfinClient();
  const changePct =
    input.previousPrice && input.previousPrice !== 0
      ? ((input.price - input.previousPrice) / input.previousPrice) * 100
      : 0;
  await c.data.PriceObservation.create({
    id: uuid(),
    commodity: { id: input.commodityId },
    price: input.price,
    changePct: Number(changePct.toFixed(2)),
    source: input.source,
    observedAt: input.observedAt ?? new Date(),
  });
}

// ---------------- Alerts ----------------

export async function listAlerts(userId: string): Promise<AlertRow[]> {
  const c = getRayfinClient();
  const rows = (await c.data.PriceAlert
    .select([
      'id', 'direction', 'threshold', 'note', 'createdAt',
      'commodity.id', 'commodity.symbol', 'commodity.name', 'commodity.unit',
    ])
    .where({ user_id: { eq: userId } })
    .orderBy({ createdAt: 'desc' })
    .execute()) as unknown as RawAlert[];
  return rows.map((r) => ({
    id: r.id,
    direction: r.direction,
    threshold: num(r.threshold),
    note: r.note ?? null,
    createdAt: toDate(r.createdAt),
    commodity_id: r.commodity?.id ?? '',
    commoditySymbol: r.commodity?.symbol ?? '',
    commodityName: r.commodity?.name ?? '',
    commodityUnit: r.commodity?.unit ?? '',
  }));
}

export async function createAlert(input: {
  commodityId: string;
  direction: string;
  threshold: number;
  note?: string;
  userId: string;
}): Promise<void> {
  const c = getRayfinClient();
  await c.data.PriceAlert.create({
    id: uuid(),
    commodity: { id: input.commodityId },
    direction: input.direction,
    threshold: input.threshold,
    note: input.note,
    user_id: input.userId,
    createdAt: new Date(),
  });
}

export async function deleteAlert(alertId: string): Promise<void> {
  const c = getRayfinClient();
  await c.data.PriceAlert.delete({ id: alertId });
}

// ---------------- Notes ----------------

export async function listNotes(userId: string): Promise<NoteRow[]> {
  const c = getRayfinClient();
  const rows = (await c.data.AnalysisNote
    .select([
      'id', 'title', 'body', 'sentiment', 'authorName', 'createdAt',
      'commodity.id', 'commodity.symbol',
    ])
    .where({ user_id: { eq: userId } })
    .orderBy({ createdAt: 'desc' })
    .execute()) as unknown as RawNote[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    sentiment: r.sentiment,
    authorName: r.authorName,
    createdAt: toDate(r.createdAt),
    commodity_id: r.commodity?.id ?? null,
    commoditySymbol: r.commodity?.symbol ?? null,
  }));
}

export async function createNote(input: {
  title: string;
  body: string;
  sentiment: string;
  commodityId?: string | null;
  authorName: string;
  userId: string;
}): Promise<void> {
  const c = getRayfinClient();
  await c.data.AnalysisNote.create({
    id: uuid(),
    ...(input.commodityId ? { commodity: { id: input.commodityId } } : {}),
    title: input.title,
    body: input.body,
    sentiment: input.sentiment,
    authorName: input.authorName,
    user_id: input.userId,
    createdAt: new Date(),
  });
}

export async function deleteNote(noteId: string): Promise<void> {
  const c = getRayfinClient();
  await c.data.AnalysisNote.delete({ id: noteId });
}

// ---------------- Dashboard ----------------

export interface DashboardStats {
  totalCommodities: number;
  totalObservations: number;
  lastUpdated: Date | null;
  topMovers: { symbol: string; name: string; changePct: number; unit: string; price: number }[];
  commodities: CommodityWithPrice[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const commodities = await listCommoditiesWithPrice();
  const totalObservations = commodities.reduce((s, c) => s + c.observationCount, 0);
  const dates = commodities
    .map((c) => c.observedAt)
    .filter((d): d is Date => d != null)
    .map((d) => d.getTime());
  const lastUpdated = dates.length ? new Date(Math.max(...dates)) : null;

  const topMovers = commodities
    .filter((c) => c.latestPrice != null && c.changePct != null)
    .sort((a, b) => Math.abs(b.changePct!) - Math.abs(a.changePct!))
    .slice(0, 5)
    .map((c) => ({
      symbol: c.symbol,
      name: c.name,
      changePct: c.changePct!,
      unit: c.unit,
      price: c.latestPrice!,
    }));

  return {
    totalCommodities: commodities.length,
    totalObservations,
    lastUpdated,
    topMovers,
    commodities,
  };
}

export async function isDatabaseEmpty(): Promise<boolean> {
  const c = getRayfinClient();
  const rows = (await c.data.Commodity.select(['id']).first(1).executePaginated()).items;
  return rows.length === 0;
}

// ---------------- Seed / wipe ----------------

interface SeedDef {
  symbol: string;
  name: string;
  category: string;
  unit: string;
  base: number;
  vol: number; // daily volatility fraction
}

const SEED_COMMODITIES: SeedDef[] = [
  { symbol: 'EUA', name: 'EU ETS Carbon Allowance', category: 'Carbon', unit: 'EUR/t', base: 72, vol: 0.03 },
  { symbol: 'TTF', name: 'Dutch TTF Natural Gas (front-month)', category: 'Gas', unit: 'EUR/MWh', base: 34, vol: 0.05 },
  { symbol: 'DE-BASE', name: 'German Power Baseload (Cal+1)', category: 'Power', unit: 'EUR/MWh', base: 88, vol: 0.04 },
  { symbol: 'PL-BASE', name: 'Polish Power Baseload (TGE)', category: 'Power', unit: 'PLN/MWh', base: 470, vol: 0.035 },
  { symbol: 'API2', name: 'API2 Rotterdam Coal', category: 'Coal', unit: 'USD/t', base: 112, vol: 0.025 },
  { symbol: 'BRENT', name: 'Brent Crude Oil (front-month)', category: 'Oil', unit: 'USD/bbl', base: 79, vol: 0.02 },
];

export interface SeedResult {
  commodities: number;
  observations: number;
}

export async function seedDemoData(): Promise<SeedResult> {
  const days = 21;
  let observations = 0;

  for (const def of SEED_COMMODITIES) {
    const commodityId = await createCommodity({
      symbol: def.symbol,
      name: def.name,
      category: def.category,
      unit: def.unit,
    });

    let price = def.base;
    let prev = price;
    for (let d = days; d >= 0; d--) {
      const drift = (Math.random() - 0.48) * def.vol;
      price = Math.max(0.01, price * (1 + drift));
      const observedAt = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
      await addPriceObservation({
        commodityId,
        price: Number(price.toFixed(2)),
        source: 'Demo feed',
        previousPrice: prev,
        observedAt,
      });
      prev = price;
      observations++;
    }
  }

  return { commodities: SEED_COMMODITIES.length, observations };
}

async function deleteAll(
  loader: () => Promise<{ id: string }[]>,
  remover: (id: string) => Promise<void>
) {
  const rows = await loader();
  await Promise.all(rows.map((r) => remover(r.id)));
}

export async function wipeAllData(): Promise<void> {
  const c = getRayfinClient();

  await deleteAll(
    async () => (await c.data.PriceObservation.select(['id']).execute()) as { id: string }[],
    async (id) => void (await c.data.PriceObservation.delete({ id }))
  );
  await deleteAll(
    async () => (await c.data.PriceAlert.select(['id']).execute()) as { id: string }[],
    async (id) => void (await c.data.PriceAlert.delete({ id }))
  );
  await deleteAll(
    async () => (await c.data.AnalysisNote.select(['id']).execute()) as { id: string }[],
    async (id) => void (await c.data.AnalysisNote.delete({ id }))
  );
  await deleteAll(
    async () => (await c.data.Commodity.select(['id']).execute()) as { id: string }[],
    async (id) => void (await c.data.Commodity.delete({ id }))
  );
}

export type { AuthUser };

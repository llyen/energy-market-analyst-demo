import { entity, role, text, date, uuid, one } from '@microsoft/rayfin-core';
import { Commodity } from './Commodity.js';

/** An analyst's market note, optionally tied to a commodity. */
@entity()
@role('authenticated', '*')
export class AnalysisNote {
  @uuid() id!: string;
  @one(() => Commodity, { optional: true }) commodity?: Commodity;

  @text({ min: 1, max: 200 }) title!: string;
  @text({ max: 4000 }) body!: string;
  /** "bullish" | "bearish" | "neutral" */
  @text({ max: 12 }) sentiment!: string;
  @text({ max: 200 }) authorName!: string;
  /** Owner — claims.sub of the creating user. */
  @text({ max: 200 }) user_id!: string;
  @date() createdAt!: Date;
}

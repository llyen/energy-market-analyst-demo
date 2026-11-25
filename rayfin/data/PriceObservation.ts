import { entity, role, text, decimal, date, uuid, one } from '@microsoft/rayfin-core';
import { Commodity } from './Commodity.js';

/** A single price point for a commodity at a moment in time. */
@entity()
@role('authenticated', '*')
export class PriceObservation {
  @uuid() id!: string;
  @one(() => Commodity) commodity!: Commodity;

  @decimal({ precision: 14, scale: 4 }) price!: number;
  @decimal({ precision: 8, scale: 2 }) changePct!: number;
  @decimal({ precision: 18, scale: 2, optional: true }) volume?: number;
  @text({ max: 80 }) source!: string;
  @date() observedAt!: Date;
}

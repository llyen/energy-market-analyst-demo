import { entity, role, text, decimal, date, uuid, one } from '@microsoft/rayfin-core';
import { Commodity } from './Commodity.js';

/** A user-defined price threshold alert for a commodity. */
@entity()
@role('authenticated', '*')
export class PriceAlert {
  @uuid() id!: string;
  @one(() => Commodity) commodity!: Commodity;

  /** "above" | "below" */
  @text({ max: 10 }) direction!: string;
  @decimal({ precision: 14, scale: 4 }) threshold!: number;
  @text({ max: 300, optional: true }) note?: string;
  /** Owner — claims.sub of the creating user. */
  @text({ max: 200 }) user_id!: string;
  @date() createdAt!: Date;
}

import { entity, role, text, date, uuid } from '@microsoft/rayfin-core';

/** A tradable energy commodity / market index tracked by the analyst. */
@entity()
@role('authenticated', '*')
export class Commodity {
  @uuid() id!: string;
  @text({ min: 1, max: 40 }) symbol!: string;
  @text({ min: 1, max: 160 }) name!: string;
  /** Power | Gas | Coal | Carbon | Oil */
  @text({ max: 40 }) category!: string;
  /** Quoting unit, e.g. "EUR/MWh", "EUR/t", "USD/bbl". */
  @text({ max: 40 }) unit!: string;
  @date() createdAt!: Date;
}

import { Commodity } from './Commodity.js';
import { PriceObservation } from './PriceObservation.js';
import { PriceAlert } from './PriceAlert.js';
import { AnalysisNote } from './AnalysisNote.js';

export type MarketAppSchema = {
  Commodity: Commodity;
  PriceObservation: PriceObservation;
  PriceAlert: PriceAlert;
  AnalysisNote: AnalysisNote;
};

export const schema = [Commodity, PriceObservation, PriceAlert, AnalysisNote];

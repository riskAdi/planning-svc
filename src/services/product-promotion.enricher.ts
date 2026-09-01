import { Injectable } from '@nestjs/common';
import {
  type EnrichmentContext,
  type EnrichableRecord,
  type ResponseEnricher,
} from './response-enricher.types';

@Injectable()
export class ProductPromotionEnricher implements ResponseEnricher {
  supports(context: EnrichmentContext): boolean {
    void context;
    return false;
  }

  enrich(
    records: EnrichableRecord[],
    context: EnrichmentContext,
  ): Promise<EnrichableRecord[]> {
    void context;
    return Promise.resolve(records);
  }
}

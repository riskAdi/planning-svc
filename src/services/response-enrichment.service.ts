import { Injectable } from '@nestjs/common';

import { ProductPromotionEnricher } from './product-promotion.enricher';
import {
  type EnrichmentContext,
  isEnrichableRecord,
  type ResponseEnricher,
} from './response-enricher.types';

@Injectable()
export class ResponseEnrichmentService {
  private readonly enrichers: ResponseEnricher[];

  constructor(productPromotionEnricher: ProductPromotionEnricher) {
    this.enrichers = [productPromotionEnricher];
  }

  async enrichMany(
    records: unknown[],
    context: EnrichmentContext,
  ): Promise<unknown[]> {
    if (!records.every((record) => isEnrichableRecord(record))) {
      return records;
    }

    const normalized = records;

    let nextRecords = normalized;
    for (const enricher of this.enrichers) {
      if (!enricher.supports(context)) {
        continue;
      }

      nextRecords = await enricher.enrich(nextRecords, context);
    }

    return nextRecords;
  }

  async enrichOne(
    record: unknown,
    context: EnrichmentContext,
  ): Promise<unknown> {
    const enriched = await this.enrichMany([record], context);
    return enriched[0] ?? record;
  }
}

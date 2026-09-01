export type EnrichableRecord = Record<string, unknown>;

export type EnrichmentContext = {
  formName: string;
  userRole?: string;
};

export interface ResponseEnricher {
  supports(context: EnrichmentContext): boolean;
  enrich(
    records: EnrichableRecord[],
    context: EnrichmentContext,
  ): Promise<EnrichableRecord[]>;
}

export function isEnrichableRecord(value: unknown): value is EnrichableRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

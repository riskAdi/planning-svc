import { BadRequestException, Injectable } from '@nestjs/common';

type Primitive = string | number | boolean | null;
type MongoFilter = Record<string, unknown>;

function coercePrimitive(raw: string): Primitive {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && `${asNumber}` === trimmed) return asNumber;
  return trimmed;
}

@Injectable()
export class QueryBuilderService {
  /**
   * Accepts either:
   * - JSON object string: `{"status":"active"}`
   * - KV string: `status:active,name:john`
   */
  parseSearch(search: unknown): MongoFilter {
    if (search === undefined || search === null) return {};
    if (typeof search !== 'string') {
      throw new BadRequestException('search must be a string');
    }

    const trimmed = search.trim();
    if (trimmed === '') return {};

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('search JSON must be an object');
        }
        return parsed as MongoFilter;
      } catch {
        throw new BadRequestException('Invalid search JSON');
      }
    }

    const filter: MongoFilter = {};
    const parts = trimmed
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    for (const part of parts) {
      const idx = part.indexOf(':');
      if (idx <= 0) {
        throw new BadRequestException(
          `Invalid search token "${part}" (expected field:value)`,
        );
      }
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (!key) {
        throw new BadRequestException(
          `Invalid search token "${part}" (empty field)`,
        );
      }
      filter[key] = coercePrimitive(value);
    }

    return filter;
  }
}

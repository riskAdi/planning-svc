import { BadRequestException, Injectable } from '@nestjs/common';
import type { FormModelDefinition } from '../form-model.registry';

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
  buildFilter(
    definition: FormModelDefinition,
    query: Record<string, string | string[] | undefined>,
  ): MongoFilter {
    const filter: MongoFilter = {};

    for (const [key, rawValue] of Object.entries(query)) {
      if (key === 'search' || key === 'include') {
        continue;
      }

      if (rawValue === undefined) {
        continue;
      }

      if (Array.isArray(rawValue)) {
        filter[key] = { $in: rawValue.map((value) => coercePrimitive(value)) };
      } else {
        filter[key] = coercePrimitive(rawValue);
      }
    }

    const rawSearch = query.search;
    const search = Array.isArray(rawSearch) ? rawSearch[0] : rawSearch;

    if (search && typeof search === 'string' && search.trim() !== '') {
      const trimmed = search.trim();
      if (trimmed.startsWith('{') || trimmed.includes(':')) {
        Object.assign(filter, this.parseSearch(trimmed));
      } else if (definition.searchableFields.length > 0) {
        filter.$or = definition.searchableFields.map((field) => ({
          [field]: {
            $regex: trimmed,
            $options: 'i',
          },
        }));
      }
    }

    return filter;
  }

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

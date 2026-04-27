import { Injectable } from '@nestjs/common';

import type { FormModelDefinition } from '../form-model.registry';

const RESERVED_QUERY_KEYS = new Set(['include', 'search']);

@Injectable()
export class QueryBuilderService {
  buildFilter(
    definition: FormModelDefinition,
    query: Record<string, string | string[] | undefined>,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    const search = this.getSingleValue(query.search);

    if (search) {
      const pattern = this.escapeRegex(search);
      const searchFields = definition.searchableFields.length
        ? definition.searchableFields
        : ['_id'];

      filter['$or'] = searchFields.map((field) => ({
        [field]: {
          $regex: pattern,
          $options: 'i',
        },
      }));
    }

    Object.entries(query).forEach(([key, rawValue]) => {
      if (RESERVED_QUERY_KEYS.has(key)) {
        return;
      }

      const value = this.getSingleValue(rawValue);
      if (!value) {
        return;
      }

      filter[key] = this.coerceValue(value);
    });

    return filter;
  }

  private getSingleValue(
    value: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private coerceValue(value: string): boolean | number | string | null {
    if (value === 'null') {
      return null;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }

    return value;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
